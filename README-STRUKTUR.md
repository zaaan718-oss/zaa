# Struktur folder ini

```
/home/container/
├── package.json          <- WRAPPER, cuma delegasi ke folder framex/
└── framex/
    ├── app/
    ├── components/
    ├── lib/
    ├── package.json       <- package.json ASLI, dependency FrameX ada di sini
    ├── .env.local          <- BUAT FILE INI DI SINI (dalam framex/), bukan di root
    └── ... (semua file project lainnya)
```

## Kenapa begini?

Panel Pterodactyl kamu otomatis menjalankan `npm install` di `/home/container/package.json`
setiap server start - ini bagian dari egg panel yang gak bisa diubah. Karena project asli
FrameX ada di dalam folder `framex/`, kita butuh `package.json` "boneka" di root yang
tugasnya cuma masuk ke folder `framex/` dan jalanin perintah yang sebenarnya di sana.

## Yang perlu kamu lakukan

1. **Buat `.env.local` di dalam folder `framex/`** (bukan di `/home/container` root).
   Copy dari `framex/.env.example`, isi semua variabelnya seperti biasa.
2. Semua perintah tetap dijalankan dari `/home/container` (root, LUAR folder framex):
   - `npm install` -> otomatis delegasi ke `framex/`
   - `npm run build` -> otomatis delegasi ke `framex/`
   - `npm run start` -> otomatis delegasi ke `framex/`
3. Startup Command di tab Startup panel tetap `npm run start`.

## Kalau ada error nanti

Ingat path file aslinya ada di `/home/container/framex/...`, bukan langsung di
`/home/container/...`. Kalau lapor error, sebutkan lokasi lengkapnya biar gak salah arah.
