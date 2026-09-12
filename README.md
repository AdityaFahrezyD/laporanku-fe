# LaporanKu Frontend

Dashboard React dan Tailwind untuk pembukuan bersama. Komponen UI menggunakan atomic design di `src/components`. Dashboard publik dapat dibaca tanpa login; halaman login admin tersedia langsung di `/api/login`, tanpa tautan pada navigasi publik. Dashboard admin menyediakan lima tab Income, Expenses, Transfer, Dompet, dan Kategori beserta pengelolaan data.

## Menjalankan lokal

1. Aktifkan backend dan database melalui Laragon. Jalankan backend pada `http://127.0.0.1:8000` (misalnya dengan `php artisan serve`).
2. Jalankan `npm install` jika dependensi belum terpasang, lalu `npm run dev`. Buka `http://localhost:5173`; login admin melalui `http://localhost:5173/api/login`.
3. Alamat backend diatur melalui konstanta `API_BASE_URL` pada `src/services/api.js`. Ubah konstanta ini bila alamat backend berubah, lalu restart Vite.

Frontend memanggil `/api` melalui proxy Vite, sehingga pengembangan lokal tidak memerlukan perubahan CORS backend. Saat development, fetch memakai path relatif dan proxy Vite mengambil target dari `API_BASE_URL` di `src/services/api.js`. Tidak perlu mengisi `VITE_API_BASE_URL` atau `BACKEND_URL` di file env.

## Login admin

Vite menggunakan port 5173 sesuai `FRONTEND_URL` backend lokal. Konfigurasi Sanctum backend membaca host beserta port dari URL tersebut. Jika memakai `SANCTUM_STATEFUL_DOMAINS` eksplisit, sertakan `localhost:5173` (atau host:port frontend yang dipakai, tanpa skema). Port tidak berpindah otomatis ketika sibuk. Proxy juga meneruskan `/sanctum/csrf-cookie`, POST `/api/login`, dan `/api/logout`; GET/HEAD `/api/login` tetap membuka halaman frontend, termasuk trailing slash dan query string. URL lama `/login` dialihkan ke `/api/login`.

Login mengambil cookie CSRF, mengirim email/password/remember dengan `X-XSRF-TOKEN`, lalu memeriksa role dari `/api/user`. Sesi admin diarahkan ke dashboard dan memiliki tombol Keluar. Tombol ini mengirim POST `/api/logout` dengan CSRF; respons 204 atau 401 membawa pengguna ke dashboard publik `/`. Kegagalan jaringan/server ditampilkan tanpa menganggap sesi telah berakhir. Membuka URL logout melalui GET tidak mengakhiri sesi. Akun non-admin mendapatkan pesan pembatasan akses dan dapat keluar. Password/token tidak disimpan di localStorage. URL tersembunyi hanya menghilangkan tautan publik; otorisasi tetap dilakukan oleh middleware backend. Login menangani 422, 419, 429, dan gangguan koneksi tanpa retry otomatis.

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

`src` boleh kosong, URL gambar, atau object URL pratinjau lokal. `imageClassName` mengatur gaya gambar. Komponen ini menangani tampilan gambar. Form admin membungkusnya dengan AttachmentPicker untuk pemilihan file dan layanan upload ke endpoint attachment backend. Komponen yang membuat object URL bertanggung jawab memanggil `URL.revokeObjectURL` ketika pratinjau tidak dipakai lagi.

## Kontrak data

Dashboard mengambil `GET /api/wallets`, `/api/incomes`, `/api/expenses`, dan `/api/transfers` dengan cookie serta header `Accept: application/json`. Respons memakai `{ message, data: [] }`. Relasi kategori sudah tersedia pada daftar transaksi, sehingga dashboard tidak meminta daftar kategori terpisah.

Saldo mencakup seluruh wallet termasuk yang nonaktif. Total pemasukan dan pengeluaran memakai seluruh periode; transfer tidak menambah kedua total tersebut. Lima transaksi terbaru digabung dan diurutkan di frontend karena backend belum menyediakan pagination atau endpoint agregasi dashboard. Nominal dihitung sebagai integer sen (BigInt); tanggal ditampilkan dalam WIB.

Pemuatan awal dan tombol Muat ulang meminta empat daftar. Tidak ada polling atau retry otomatis. Respons 429 menonaktifkan muat ulang selama `Retry-After`. Jika pembaruan gagal, data terakhir tetap ditampilkan dengan pemberitahuan. Jika pemuatan pertama gagal, saldo tidak ditampilkan sebagai nol. Data contoh hanya dipakai sebagai fixture pengujian.

## Deployment

Frontend produksi memakai Vercel di `https://adit.laporanku.my.id`, dengan backend
`https://laporanku.my.id`. Konfigurasi build dan fallback SPA tersedia di
`vercel.json`. Ikuti [panduan deployment](DEPLOYMENT.md) untuk DNS, konfigurasi
cookie Sanctum pada hosting, dan pemeriksaan login setelah deploy.

## Kendala backend yang ditemukan

Saat integrasi lokal, `GET http://laporanku.test/api/wallets` mengembalikan HTTP 500 karena tabel `laporanku.cache` belum tersedia. Backend memiliki migration `0001_01_01_000001_create_cache_table.php` untuk tabel `cache` dan `cache_locks`. Periksa `php artisan migrate:status` di backend dan terapkan migration yang belum dijalankan sesuai kondisi database. Integrasi frontend tidak mengubah skema atau file backend.

## Verifikasi

- `npm test`: kontrak respons, total saldo, transfer, data kosong, nullable relations, error, rate limit, presisi desimal, dan WIB.
- `npm run lint`
- `npm run build`

## Dashboard admin dan CRUD

Setelah login sebagai admin, halaman utama menampilkan ringkasan serta lima tab.
Setiap tab memiliki pencarian dan pagination tampilan 10 baris; backend saat ini
tetap mengirim seluruh daftar. Detail/edit mengambil record terbaru dari API.

- Income/Expenses: dompet, nominal, tanggal/waktu WIB, kategori sesuai jenis, deskripsi.
- Transfer: dompet asal dan tujuan berbeda, nominal, tanggal/waktu WIB, deskripsi.
- Dompet: tambah dengan saldo awal, edit nama/jenis/status. Saldo tidak dikirim saat
  edit; tidak ada tombol hapus karena backend mengharuskan nonaktifkan dompet.
- Kategori: tambah, detail, edit, hapus; penolakan kategori yang digunakan mengikuti API.
- Penghapusan transaksi meminta konfirmasi dan backend menyesuaikan saldo serta attachment.

Form transaksi dimulai dengan satu slot gambar kosong. Tombol Tambah gambar
menambah slot; setiap slot bisa diganti/dihapus. Pilih JPEG, PNG, WebP, atau AVIF
maksimal 5 MB dan 4 juta piksel sesuai default backend. Foto lebih besar perlu
diperkecil dahulu. Frontend tidak melakukan konversi AVIF; backend memvalidasi
isi/animasi dan mengompresnya. Batas UI ini perlu diselaraskan jika konfigurasi
attachment backend berubah.

Transaksi disimpan terlebih dahulu, kemudian file diunggah berurutan menggunakan
FormData, cookie sesi, dan CSRF. Upload bersifat terpisah dari transaksi. Jika upload
ditolak, data transaksi tetap ada: form mempertahankan ID dan hanya mengirim ulang
file yang belum berhasil. File sukses tidak dikirim ulang. Jika koneksi terputus
atau server gagal, pengguna diminta memeriksa daftar/detail sebelum mencoba lagi
karena hasil request mungkin sudah tersimpan. Tidak ada retry mutasi otomatis.
Attachment tersimpan dapat dibuka dari Detail dan dihapus melalui Edit.
Penghapusan gambar tersimpan langsung berlaku setelah konfirmasi, walaupun
perubahan field form belum disimpan.

Respons 422 menampilkan error input, 429 membatasi pengiriman sampai Retry-After.
Setelah perubahan, lima daftar dimuat ulang untuk memperbarui saldo, kategori,
transaksi, dan metadata attachment. Gagal memuat ulang mempertahankan data terakhir.
Guest tetap menggunakan dashboard publik tanpa kontrol CRUD; otorisasi sebenarnya
tetap dilakukan backend.

## Tes browser

Jalankan `npm run test:browser` setelah menginstal dependensi. Playwright memakai
Chrome lokal (channel chrome) dan Vite sementara pada port 5178. Jika Chrome belum
terpasang, pasang Chrome atau sesuaikan channel konfigurasi Playwright.
Tes menggunakan API simulasi; tidak menulis database backend lokal.
Jalankan juga `npm test`, `npm run lint`, dan `npm run build`.