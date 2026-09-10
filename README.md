# LaporanKu Frontend

Dashboard React dan Tailwind untuk pembukuan bersama. Komponen UI menggunakan atomic design di `src/components`. Dashboard membaca API publik backend Laravel; login dan perubahan data belum tersedia di frontend.

## Menjalankan lokal

1. Aktifkan backend dan database melalui Laragon. Target default: `http://laporanku.test`.
2. Jalankan `npm install` jika dependensi belum terpasang, lalu `npm run dev`.
3. Untuk backend di alamat lain, salin `.env.example` menjadi `.env.local`, ubah `BACKEND_URL` (contoh `http://localhost:8000`), lalu restart Vite.

Frontend memanggil `/api` melalui proxy Vite, sehingga pengembangan lokal tidak memerlukan perubahan CORS backend. `VITE_API_BASE_URL` dibiarkan kosong untuk mode ini. Jangan menaruh rahasia dalam variabel `VITE_*` karena nilainya masuk ke bundle browser.

## Kontrak data

Dashboard mengambil `GET /api/wallets`, `/api/incomes`, `/api/expenses`, dan `/api/transfers` dengan cookie serta header `Accept: application/json`. Respons memakai `{ message, data: [] }`. Relasi kategori sudah tersedia pada daftar transaksi, sehingga dashboard tidak meminta daftar kategori terpisah.

Saldo mencakup seluruh wallet termasuk yang nonaktif. Total pemasukan dan pengeluaran memakai seluruh periode; transfer tidak menambah kedua total tersebut. Lima transaksi terbaru digabung dan diurutkan di frontend karena backend belum menyediakan pagination atau endpoint agregasi dashboard. Nominal dihitung sebagai integer sen (BigInt); tanggal ditampilkan dalam WIB.

Pemuatan awal dan tombol Muat ulang meminta empat daftar. Tidak ada polling atau retry otomatis. Respons 429 menonaktifkan muat ulang selama `Retry-After`. Jika pembaruan gagal, data terakhir tetap ditampilkan dengan pemberitahuan. Jika pemuatan pertama gagal, saldo tidak ditampilkan sebagai nol. Data contoh hanya dipakai sebagai fixture pengujian.

## Deployment

Proxy `server.proxy` hanya berlaku pada Vite dev server. Untuk build produksi, konfigurasikan reverse proxy `/api` ke backend pada origin yang sama, atau isi `VITE_API_BASE_URL` dengan origin backend sebelum `npm run build`. Pada opsi lintas origin, backend harus mengizinkan origin frontend melalui CORS dengan credentials. Agar hitungan mundur 429 persis mengikuti header server, expose `Retry-After`; jika tidak terbaca, frontend menunggu 60 detik. Pengaturan sesi Sanctum juga harus cocok jika menggunakan sesi login.

## Kendala backend yang ditemukan

Saat integrasi lokal, `GET http://laporanku.test/api/wallets` mengembalikan HTTP 500 karena tabel `laporanku.cache` belum tersedia. Backend memiliki migration `0001_01_01_000001_create_cache_table.php` untuk tabel `cache` dan `cache_locks`. Periksa `php artisan migrate:status` di backend dan terapkan migration yang belum dijalankan sesuai kondisi database. Integrasi frontend tidak mengubah skema atau file backend.

## Verifikasi

- `npm test`: kontrak respons, total saldo, transfer, data kosong, nullable relations, error, rate limit, presisi desimal, dan WIB.
- `npm run lint`
- `npm run build`
