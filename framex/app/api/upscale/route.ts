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
import { UPLOAD_LIMITS_MB, UPSCALE_USAGE_LIMITS, getUserById, incrementUpscaleUsage } from "@/lib/db";

const execFileAsync = promisify(execFile);

export const maxDuration = 180;

// Upscale resolusi doang (tanpa interpolasi frame) jauh lebih ringan
// daripada fitur FPS, jadi durasi yang diizinkan bisa lebih panjang
// dan timeout-nya gak perlu selonggar fitur FPS.
const MAX_INPUT_DURATION_SECONDS = 60;
const FFMPEG_TIMEOUT_MS = 2 * 60 * 1000;

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

  const dbUser = getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }
  if (dbUser.banned) {
    return NextResponse.json({ error: "Akun kamu sedang dinonaktifkan." }, { status: 403 });
  }

  const usageLimit = UPSCALE_USAGE_LIMITS[dbUser.plan] ?? UPSCALE_USAGE_LIMITS.free;
  if (dbUser.upscaleUsage >= usageLimit) {
    return NextResponse.json(
      {
        error: `Kuota fitur upgrade kualitas untuk paket ${dbUser.plan} sudah habis (${
          dbUser.upscaleUsage
        }/${usageLimit === Infinity ? "∞" : usageLimit}). Upgrade paket untuk kuota lebih banyak.`,
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

  const workDir = await mkdtemp(path.join(tmpdir(), "framex-up-"));
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
          )} detik. Durasi maksimal untuk fitur ini ${MAX_INPUT_DURATION_SECONDS} detik.`,
        },
        { status: 413 }
      );
    }

    // Upscale ke 1080p doang, gak ada interpolasi frame - jauh lebih cepat.
    await execFileAsync(
      ffmpegBinaryPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        "scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "19",
        "-c:a",
        "copy",
        outputPath,
      ],
      { maxBuffer: 1024 * 1024 * 50, timeout: FFMPEG_TIMEOUT_MS, killSignal: "SIGKILL" }
    );

    const output = await readFile(outputPath);
    incrementUpscaleUsage(dbUser.id);

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="framex-1080p.mp4"`,
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
