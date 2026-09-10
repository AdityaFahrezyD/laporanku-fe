# LaporanKu Frontend

Dashboard React dan Tailwind untuk pembukuan bersama. Komponen UI menggunakan atomic design di `src/components`. Dashboard publik dapat dibaca tanpa login; halaman login admin tersedia langsung di `/login`, tanpa tautan pada navigasi publik. Form perubahan data belum tersedia.

## Menjalankan lokal

1. Aktifkan backend dan database melalui Laragon. Target default: `http://laporanku.test`.
2. Jalankan `npm install` jika dependensi belum terpasang, lalu `npm run dev`. Buka `http://localhost:5173`; login admin melalui `http://localhost:5173/login`.
3. Untuk backend di alamat lain, salin `.env.example` menjadi `.env.local`, ubah `BACKEND_URL` (contoh `http://localhost:8000`), lalu restart Vite.

Frontend memanggil `/api` melalui proxy Vite, sehingga pengembangan lokal tidak memerlukan perubahan CORS backend. `VITE_API_BASE_URL` dibiarkan kosong untuk mode ini. Jangan menaruh rahasia dalam variabel `VITE_*` karena nilainya masuk ke bundle browser.

## Login admin

Vite menggunakan port 5173 sesuai `FRONTEND_URL` backend lokal. Konfigurasi Sanctum backend membaca host beserta port dari URL tersebut. Jika memakai `SANCTUM_STATEFUL_DOMAINS` eksplisit, sertakan `localhost:5173` (atau host:port frontend yang dipakai, tanpa skema). Port tidak berpindah otomatis ketika sibuk. Proxy juga meneruskan `/sanctum/csrf-cookie`, POST `/login`, dan `/logout`; GET `/login` tetap membuka halaman frontend.

Login mengambil cookie CSRF, mengirim email/password/remember dengan `X-XSRF-TOKEN`, lalu memeriksa role dari `/api/user`. Sesi admin diarahkan ke dashboard dan memiliki tombol Keluar. Akun non-admin mendapatkan pesan pembatasan akses dan dapat keluar. Password/token tidak disimpan di localStorage. URL tersembunyi hanya menghilangkan tautan publik; otorisasi tetap dilakukan oleh middleware backend. Login menangani 422, 419, 429, dan gangguan koneksi tanpa retry otomatis.

## Placeholder gambar

Atom `Placeholder` menyediakan tampilan kosong, gambar, dan fallback saat gambar gagal dimuat:

```jsx
import { Placeholder } from './components'

<Placeholder
  src={previewUrl}
  alt="Bukti transaksi"
  label="Belum ada bukti transaksi"
  description="Pratinjau gambar akan tampil di sini."
  className="max-w-sm"
/>
```

`src` boleh kosong, URL gambar, atau object URL pratinjau lokal. `imageClassName` mengatur gaya gambar. Komponen ini hanya presentasi, bukan file picker atau uploader; endpoint attachment backend belum tersedia. Komponen yang membuat object URL bertanggung jawab memanggil `URL.revokeObjectURL` ketika pratinjau tidak dipakai lagi.

## Kontrak data

Dashboard mengambil `GET /api/wallets`, `/api/incomes`, `/api/expenses`, dan `/api/transfers` dengan cookie serta header `Accept: application/json`. Respons memakai `{ message, data: [] }`. Relasi kategori sudah tersedia pada daftar transaksi, sehingga dashboard tidak meminta daftar kategori terpisah.

Saldo mencakup seluruh wallet termasuk yang nonaktif. Total pemasukan dan pengeluaran memakai seluruh periode; transfer tidak menambah kedua total tersebut. Lima transaksi terbaru digabung dan diurutkan di frontend karena backend belum menyediakan pagination atau endpoint agregasi dashboard. Nominal dihitung sebagai integer sen (BigInt); tanggal ditampilkan dalam WIB.

Pemuatan awal dan tombol Muat ulang meminta empat daftar. Tidak ada polling atau retry otomatis. Respons 429 menonaktifkan muat ulang selama `Retry-After`. Jika pembaruan gagal, data terakhir tetap ditampilkan dengan pemberitahuan. Jika pemuatan pertama gagal, saldo tidak ditampilkan sebagai nol. Data contoh hanya dipakai sebagai fixture pengujian.

## Deployment

Proxy `server.proxy` hanya berlaku pada Vite dev server. Untuk build produksi, arahkan `/api`, `/sanctum`, POST `/login`, dan POST `/logout` ke backend pada origin yang sama; GET `/login` harus dilayani SPA dengan fallback ke `index.html`. Alternatifnya, isi `VITE_API_BASE_URL` dengan origin backend sebelum build. Pada opsi lintas origin, frontend/backend harus memakai domain induk yang sama dengan konfigurasi session domain, stateful Sanctum, dan CORS credentials yang sesuai agar cookie XSRF terbaca oleh frontend. Agar hitungan mundur 429 persis mengikuti header server, expose `Retry-After`; jika tidak terbaca, frontend menunggu 60 detik.

## Kendala backend yang ditemukan

Saat integrasi lokal, `GET http://laporanku.test/api/wallets` mengembalikan HTTP 500 karena tabel `laporanku.cache` belum tersedia. Backend memiliki migration `0001_01_01_000001_create_cache_table.php` untuk tabel `cache` dan `cache_locks`. Periksa `php artisan migrate:status` di backend dan terapkan migration yang belum dijalankan sesuai kondisi database. Integrasi frontend tidak mengubah skema atau file backend.

## Verifikasi

- `npm test`: kontrak respons, total saldo, transfer, data kosong, nullable relations, error, rate limit, presisi desimal, dan WIB.
- `npm run lint`
- `npm run build`
