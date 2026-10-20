import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import ffprobeStatic from "ffprobe-static";
import { incrementTiktokUsage } from "@/lib/db";

const execFileAsync = promisify(execFile);

interface TikwmData {
  title: string;
  cover: string;
  origin_cover?: string;
  play: string; // video tanpa watermark
  hdplay?: string; // versi HD tanpa watermark (kalau tersedia)
  duration: number;
  play_count: number;
  digg_count: number; // likes
  comment_count: number;
  share_count: number;
  author?: { nickname?: string; unique_id?: string; avatar?: string };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  if (session.user.banned) {
    return NextResponse.json({ error: "Akun kamu sedang dinonaktifkan." }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string" || !url.includes("tiktok.com")) {
    return NextResponse.json({ error: "Link TikTok tidak valid." }, { status: 400 });
  }

  let tempFile: string | null = null;

  try {
    // 1. Ambil data video (no-watermark url, judul, stats) dari layanan publik tikwm
    const apiRes = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: "Layanan pengambil data TikTok sedang bermasalah." },
        { status: 502 }
      );
    }

    const apiData: { code: number; msg: string; data?: TikwmData } = await apiRes.json();

    if (apiData.code !== 0 || !apiData.data) {
      return NextResponse.json(
        { error: apiData.msg || "Video tidak ditemukan atau bersifat privat." },
        { status: 404 }
      );
    }

    const data = apiData.data;
    const noWatermarkUrl = data.hdplay || data.play;

    // 2. Download videonya pakai fetch (bukan lewat network stack ffprobe sendiri -
    //    beberapa environment container gak punya CA certificate lengkap buat ffprobe
    //    akses HTTPS langsung, jadi selalu gagal diam-diam). fetch() Node.js sudah
    //    terbukti jalan di atas karena baru dipakai buat manggil API tikwm.
    let fps: number | null = null;
    try {
      const videoRes = await fetch(noWatermarkUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tikwm.com/" },
      });

      if (videoRes.ok) {
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        tempFile = path.join(tmpdir(), `framex-tt-${randomUUID()}.mp4`);
        await writeFile(tempFile, buffer);

        const { stdout } = await execFileAsync(ffprobeStatic.path, [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=r_frame_rate",
          "-of",
          "csv=p=0",
          tempFile,
        ]);
        const [num, den] = stdout.trim().split("/").map(Number);
        if (num && den) fps = Math.round((num / den) * 10) / 10;
      }
    } catch (probeErr) {
      console.error("Gagal deteksi fps TikTok:", probeErr);
      fps = null; // gagal deteksi, tetap tampilkan data lain
    }

    if (session.user.id) incrementTiktokUsage(session.user.id);

    return NextResponse.json({
      title: data.title,
      cover: data.origin_cover || data.cover,
      previewUrl: noWatermarkUrl,
      downloadUrl: `/api/tiktok/download?src=${encodeURIComponent(noWatermarkUrl)}&title=${encodeURIComponent(data.title || "framex-tiktok")}`,
      author: {
        name: data.author?.nickname ?? data.author?.unique_id ?? "-",
        username: data.author?.unique_id ?? "-",
        avatar: data.author?.avatar ?? "",
      },
      stats: {
        views: data.play_count,
        likes: data.digg_count,
        comments: data.comment_count,
        shares: data.share_count,
      },
      duration: data.duration,
      fps,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data video. Coba lagi." }, { status: 500 });
  } finally {
    if (tempFile) unlink(tempFile).catch(() => {});
  }
}
