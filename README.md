# ✈️ AIAIS - APT Pranoto Airport Information System

**AIAIS (APT Pranoto Airport Information System)** adalah portal web resmi dan sistem manajemen informasi terpadu untuk **Bandar Udara Kelas I Aji Pangeran Tumenggung (APT) Pranoto Samarinda, Kalimantan Timur**.

Aplikasi ini mengintegrasikan **Flight Information Display System (FIDS) real-time**, layanan penumpang, informasi transportasi (DAMRI IKN & Taksi), pengaduan publik online, galeri, berita, serta CMS Admin Dashboard untuk pengelolaan konten bandara.

---

## 🎨 Tampilan & Arsitektur Fitur

- **Homepage Portal**: Hero Banner dengan Video Profil (YouTube/MP4 background), FIDS Widget, Akses Cepat Responsif, Samarinda Weather Widget, Pejabat Bandara Animated Spotlight, dan Galeri.
- **Informasi Penerbangan (FIDS)**: Keberangkatan & Kedatangan real-time dengan status jadwal dan filter maskapai.
- **Fasilitas & Transportasi**: Informasi lengkap ruang tunggu, WiFi, Musholla, area parkir, serta armada DAMRI IKN.
- **Media Center**: Berita, pengumuman resmi, dan siaran pers dengan fitur tanggapan pembaca & tombol berbagi.
- **Layanan Online & Aduan**: Permohonan Pas Bandara dan sistem pengaduan publik.
- **CMS Admin Dashboard (`/admin/dashboard`)**: Pengelolaan data penerbangan, berita, pengumuman, permohonan pas, dan pengaturan URL Video Background Hero.

---

## 🛠️ Teknologi Yang Digunakan

### **Frontend**
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Styling**: Vanilla CSS + TailwindCSS + [Lucide React Icons](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

### **Backend & Database**
- **Framework**: [Laravel 13 REST API](https://laravel.com/)
- **Database**: MySQL 8 (Laragon Connection)
- **Environment**: PHP 8.3+

---

## 🚀 Panduan Memulai (Local Setup)

### **1. Clone Repositori**
```bash
git clone https://github.com/RizaniHusyairi/AIAIS.git
cd AIAIS
```

### **2. Setup Backend (Laravel API)**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```
> API backend akan berjalan pada: `http://127.0.0.1:8000`

### **3. Setup Frontend (Next.js)**
```bash
cd ../frontend
npm install
npm run dev
```
> Portal frontend akan berjalan pada: `http://localhost:3000`

---

## 📁 Struktur Monorepo

```text
AIAIS/
├── backend/            # Laravel 13 API Project
│   ├── app/            # Controllers, Models, Routes
│   ├── database/       # Migrations & Seeders
│   └── routes/api.php  # API Endpoints (/flights, /news, /settings)
│
├── frontend/           # Next.js 16 Web Application
│   ├── src/app/        # App Router Pages & Admin Dashboard
│   ├── src/components/ # Layouts (Navbar, Footer) & PWA Components
│   └── src/lib/        # API Client Sync
│
├── docs/               # UI References & Screenshots
├── .gitignore          # Unified Git Exclusion Rules
└── README.md           # Dokumentasi Proyek
```

---

## 🔖 Versi

AIAIS adalah **generasi kedua** portal Bandara APT Pranoto. Ia menggantikan
situs lama [aptpairport.id](https://aptpairport.id), yang ditandai sebagai
**v1.0.0**.

| Produk | Versi | Status |
|---|---|---|
| aptpairport.id (Laravel monolit) | `1.0.0` | Produksi, akan digantikan |
| AIAIS (monorepo ini) | lihat berkas [`VERSION`](VERSION) | Pengembangan menuju `2.0.0` |

Penomoran mengikuti [Semantic Versioning](https://semver.org/lang/id/).
Selama pengembangan versinya berakhiran pra-rilis (`-alpha.N`, `-beta.N`,
`-rc.N`); menjadi `2.0.0` tepat saat menggantikan situs lama.

### Sumber kebenaran tunggal

Angka versi **hanya diketik di satu tempat**: berkas [`VERSION`](VERSION) di
akar repositori. Semua yang lain menurunkannya:

| Konsumen | Cara membaca |
|---|---|
| Frontend | `next.config.ts` membacanya saat build → `NEXT_PUBLIC_APP_VERSION` → `src/lib/version.ts` |
| Backend | `config/app.php` membacanya → `config('app.version')` |
| Cache PWA | Disisipkan ke URL service worker (`/sw.js?v=…`), cache berotasi otomatis |
| `frontend/package.json` | Cermin, disamakan lewat `npm version` saat rilis |

Versi terpasang dapat diperiksa lewat `GET /api/v2/version`, dan tampil di
footer portal, halaman profil PWA, serta sidebar panel admin. Panel admin akan
memperingatkan bila versi backend dan frontend berbeda.

### Jangan tertukar

Ada **tiga sumbu versi** di proyek ini yang menandai hal berbeda:

1. **Versi produk** (`VERSION`) — naik saat produk dirilis. *Ini yang dimaksud "AIAIS 2.0.0".*
2. **Versi kontrak API** (`config/api.php`, prefiks `/api/v2`) — naik hanya saat **bentuk data** berubah dan merusak klien lama. Tidak terikat versi produk.
3. **Versi cache aset** (service worker) — berotasi otomatis tiap rilis, tidak perlu disunting manual.

Prosedur menaikkan versi ada di [`docs/RELEASING.md`](docs/RELEASING.md).
Riwayat perubahan ada di [`CHANGELOG.md`](CHANGELOG.md).

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **UPBU Kelas I APT Pranoto Samarinda**. Dilindungi Undang-Undang.
