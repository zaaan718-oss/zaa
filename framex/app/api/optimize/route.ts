import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdtemp } from "fs/promises";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";
import ffmpegStaticExport from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { UPLOAD_LIMITS_MB, FPS_USAGE_LIMITS, getUserById, incrementFpsUsage } from "@/lib/db";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

const TARGET_FPS = 120;
const MAX_INPUT_DURATION_SECONDS = 20;
const FFMPEG_TIMEOUT_MS = 4 * 60 * 1000;

// ffmpeg-static kadang nge-export path yang salah kalau ke-"bekukan" pas
// proses build Next.js (khususnya di deployment dengan folder project
// ternested kayak punya kita). Jadi kita hitung sendiri path yang
// SEHARUSNYA berdasarkan process.cwd() saat ini, dan cuma pakai path
// bawaan package sebagai fallback kalau ternyata computed path gak ada.
const computedFfmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
const ffmpegBinaryPath = fs.existsSync(computedFfmpegPath)
  ? computedFfmpegPath
  : (ffmpegStaticExport as string);

function getDuration(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(
      ffprobeStatic.path,
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
      (err, stdout) => {
        if (err) return resolve(null);
        const seconds = parseFloat(stdout.trim());
        resolve(Number.isFinite(seconds) ? seconds : null);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  // Ambil data user LANGSUNG dari database (bukan dari token session yang
  // bisa basi) - supaya cek kuota & status ban selalu berdasarkan angka
  // paling baru, bukan cache lama dari waktu login.
  const dbUser = getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }
  if (dbUser.banned) {
    return NextResponse.json({ error: "Akun kamu sedang dinonaktifkan." }, { status: 403 });
  }

  const usageLimit = FPS_USAGE_LIMITS[dbUser.plan] ?? FPS_USAGE_LIMITS.free;
  if (dbUser.fpsUsage >= usageLimit) {
    return NextResponse.json(
      {
        error: `Kuota fitur optimasi FPS untuk paket ${dbUser.plan} sudah habis (${dbUser.fpsUsage}/${
          usageLimit === Infinity ? "∞" : usageLimit
        }). Upgrade paket untuk kuota lebih banyak.`,
      },
      { status: 403 }
    );
  }

  const maxSizeMb = UPLOAD_LIMITS_MB[dbUser.plan] ?? UPLOAD_LIMITS_MB.free;
  const maxSize = maxSizeMb * 1024 * 1024;

  const formData = await req.formData();
  const file = formData.get("video") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });
  }
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        error: `Ukuran video maksimal ${maxSizeMb}MB untuk paket ${dbUser.plan}. File kamu ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB.`,
      },
      { status: 413 }
    );
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "File harus berupa video." }, { status: 400 });
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "framex-fps-"));
  const inputPath = path.join(workDir, "input.mp4");
  const outputPath = path.join(workDir, "output.mp4");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    const duration = await getDuration(inputPath);
    if (duration && duration > MAX_INPUT_DURATION_SECONDS) {
      return NextResponse.json(
        {
          error: `Video kamu ${duration.toFixed(
            0
          )} detik. Untuk interpolasi ke ${TARGET_FPS} FPS, durasi maksimal saat ini ${MAX_INPUT_DURATION_SECONDS} detik. Coba potong videonya dulu.`,
        },
        { status: 413 }
      );
    }

    // Cuma naikkan fps (motion-compensated interpolation) - TANPA upscale
    // resolusi, itu fitur terpisah sekarang (lihat /api/upscale).
    await execFileAsync(
      ffmpegBinaryPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `minterpolate=fps=${TARGET_FPS}:mi_mode=mci:mc_mode=obmc`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-c:a",
        "copy",
        outputPath,
      ],
      { maxBuffer: 1024 * 1024 * 50, timeout: FFMPEG_TIMEOUT_MS, killSignal: "SIGKILL" }
    );

    const output = await readFile(outputPath);
    incrementFpsUsage(dbUser.id);

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="framex-120fps.mp4"`,
      },
    });
  } catch (err: unknown) {
    console.error(err);
    const isTimeout =
      typeof err === "object" && err !== null && "killed" in err && (err as { killed?: boolean }).killed;
    return NextResponse.json(
      {
        error: isTimeout
          ? "Proses kelamaan dan dihentikan otomatis. Coba video yang lebih pendek."
          : "Gagal memproses video. Pastikan file video valid.",
      },
      { status: 500 }
    );
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
