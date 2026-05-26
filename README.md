# dmaz — Scribd Downloader

Situs web statis untuk menghasilkan link download dari URL Scribd. Ringan, tanpa backend, siap deploy ke **Netlify**.

## Fitur

- Tempel URL Scribd → dapat link download instan.
- Tombol **Paste** dari clipboard, **Copy** link, dan **Reset**.
- Multi-mirror (VDownloaders, DocDownloader, iLoveScribd) sebagai fallback.
- Mendukung path `document/`, `doc/`, dan `presentation/`.
- Dukungan share link via query param: `?url=...`.
- Responsif, tema gelap/terang otomatis.
- 100% client-side — tidak ada data user yang dikirim ke server kami.

## Struktur Project

```
.
├── index.html       # Halaman utama
├── style.css        # Styling
├── script.js        # Logika rewrite URL
├── netlify.toml     # Konfigurasi Netlify
├── _redirects       # Fallback redirect rules
├── _headers         # Fallback security headers
└── README.md
```

## Jalankan Lokal

Tidak butuh build step. Cukup buka `index.html` di browser, atau jalankan static server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Lalu buka `http://localhost:8080`.

## Deploy ke Netlify

### Opsi 1 — Drag & Drop (paling cepat)

1. Buka https://app.netlify.com/drop
2. Drag folder project ini ke jendela browser.
3. Selesai — Netlify memberi URL `https://<random>.netlify.app`.

### Opsi 2 — Connect Git

1. Push repo ini ke GitHub/GitLab/Bitbucket.
2. Di Netlify dashboard: **Add new site → Import an existing project**.
3. Pilih repo `Download`, biarkan build command kosong, publish dir `.`.
4. Klik **Deploy site**.

### Opsi 3 — Netlify CLI

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=.
```

## Kustom Domain

Di Netlify dashboard → **Domain settings → Add custom domain**. Misal: `dmaz.app`.

## Catatan Hukum

dmaz adalah jembatan URL — proses ekstraksi dokumen dilakukan oleh layanan mirror pihak ketiga. Hormati hak cipta dan kebijakan Scribd. Gunakan untuk dokumen yang Anda miliki atau yang berlisensi terbuka.
