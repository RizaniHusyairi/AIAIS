import { NewsItem, Announcement } from '@/types';

/**
 * Data berita contoh — dipakai saat server Laravel tidak aktif.
 * Kategori mengikuti filter portal: Pengumuman, Operasional, Layanan, Kegiatan.
 */
export const NEWS_FALLBACK: NewsItem[] = [
  {
    id: 1,
    title: 'Peningkatan Fasilitas untuk Kenyamanan Penumpang',
    slug: 'peningkatan-fasilitas-penumpang',
    category: 'Layanan',
    excerpt:
      'Bandara APT Pranoto Samarinda terus berkomitmen meningkatkan kualitas layanan dan fasilitas demi kenyamanan seluruh penumpang.',
    content: `
      <p>Bandar Udara Aji Pangeran Tumenggung (APT) Pranoto Samarinda terus berkomitmen menghadirkan pelayanan berstandar internasional. Sebagai gerbang udara utama Kalimantan Timur sekaligus penyangga Ibu Kota Nusantara (IKN), bandara ini melakukan revitalisasi fasilitas terminal secara menyeluruh.</p>
      <h2>Ruang Tunggu yang Lebih Luas dan Nyaman</h2>
      <p>Peningkatan mencakup perluasan area ruang tunggu keberangkatan, penambahan kursi ergonomis, serta penyediaan area <strong>charging station</strong> di setiap sudut terminal.</p>
      <blockquote>"Kami ingin setiap penumpang merasakan kenyamanan sejak melangkah masuk terminal hingga menaiki pesawat," ujar Kepala Kantor UPBU Kelas I APT Pranoto Samarinda.</blockquote>
      <h2>Fasilitas Baru untuk Semua Kalangan</h2>
      <ul>
        <li>Musholla Utama yang lebih luas dan bersih</li>
        <li>Area bermain anak yang aman dan edukatif</li>
        <li>Layanan kursi roda gratis dan jalur ramah disabilitas</li>
        <li>Koneksi Wi-Fi gratis berkecepatan tinggi</li>
      </ul>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1400&q=80',
    author: 'Humas UPBU APT Pranoto',
    views_count: 1482,
    is_featured: true,
    published_at: '2024-05-20',
  },
  {
    id: 2,
    title: 'Penyesuaian Jadwal Penerbangan Periode Juni 2024',
    slug: 'penyesuaian-jadwal-juni-2024',
    category: 'Pengumuman',
    excerpt:
      'Informasi penyesuaian jadwal penerbangan untuk beberapa rute selama periode Juni 2024.',
    content: `
      <p>Sehubungan dengan penyesuaian slot penerbangan nasional, terdapat perubahan jadwal pada sejumlah rute keberangkatan dan kedatangan di Bandar Udara APT Pranoto Samarinda untuk periode Juni 2024.</p>
      <h2>Rute yang Terdampak</h2>
      <ul>
        <li>Samarinda – Jakarta (CGK): pergeseran waktu keberangkatan hingga 45 menit</li>
        <li>Samarinda – Surabaya (SUB): penambahan satu frekuensi harian</li>
        <li>Samarinda – Balikpapan (BPN): penyesuaian jadwal sore hari</li>
      </ul>
      <p>Penumpang diimbau memeriksa kembali jadwal penerbangan melalui kanal resmi maskapai sebelum berangkat menuju terminal.</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1400&q=80',
    author: 'Divisi Operasi Bandara',
    views_count: 968,
    is_featured: true,
    published_at: '2024-05-18',
  },
  {
    id: 3,
    title: 'Saksikan Pertunjukan Budaya Kalimantan di Bandara',
    slug: 'pertunjukan-budaya-kalimantan',
    category: 'Operasional',
    excerpt:
      'Nikmati pertunjukan budaya khas Kalimantan setiap akhir pekan di area keberangkatan.',
    content: `
      <p>Bandar Udara APT Pranoto Samarinda menggelar rangkaian pertunjukan budaya sebagai bagian dari upaya memperkenalkan kekayaan seni Kalimantan Timur kepada para pengguna jasa penerbangan.</p>
      <h2>Jadwal Pertunjukan</h2>
      <p>Pertunjukan dilaksanakan setiap akhir pekan di area terminal keberangkatan, menampilkan tari tradisional Dayak dan musik sampe khas Kalimantan.</p>
      <blockquote>"Bandara bukan sekadar tempat transit, tetapi juga etalase budaya daerah," ujar penyelenggara kegiatan.</blockquote>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1583373834259-46cc92173cb7?auto=format&fit=crop&w=1400&q=80',
    author: 'Humas UPBU APT Pranoto',
    views_count: 754,
    is_featured: true,
    published_at: '2024-05-15',
  },
  {
    id: 4,
    title: 'Layanan Wi-Fi Gratis Kini Semakin Cepat',
    slug: 'wifi-gratis-semakin-cepat',
    category: 'Layanan',
    excerpt:
      'Kami meningkatkan kecepatan dan jangkauan Wi-Fi gratis di seluruh area bandara.',
    content: `
      <p>Bandar Udara APT Pranoto Samarinda meningkatkan kapasitas jaringan internet nirkabel di seluruh area terminal, mulai dari lobi keberangkatan hingga ruang tunggu dan area kedatangan.</p>
      <h2>Peningkatan Kapasitas</h2>
      <p>Penambahan titik akses baru serta peningkatan bandwidth memungkinkan penumpang mengakses internet dengan lebih stabil, termasuk saat jam sibuk penerbangan.</p>
      <ul>
        <li>Akses gratis tanpa batas waktu</li>
        <li>Jangkauan menyeluruh di area publik terminal</li>
        <li>Proses koneksi cukup satu kali autentikasi</li>
      </ul>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=1400&q=80',
    author: 'Divisi Teknik & Fasilitas',
    views_count: 1120,
    is_featured: false,
    published_at: '2024-05-12',
  },
  {
    id: 5,
    title: 'Program Mudik Aman & Nyaman Bersama APT Pranoto',
    slug: 'program-mudik-aman-nyaman',
    category: 'Kegiatan',
    excerpt:
      'Dukung perjalanan mudik Anda dengan berbagai layanan dan fasilitas spesial dari kami.',
    content: `
      <p>Menyambut musim mudik, Bandar Udara APT Pranoto Samarinda menghadirkan program layanan khusus untuk memastikan perjalanan penumpang berlangsung aman, lancar, dan nyaman.</p>
      <h2>Layanan Selama Periode Mudik</h2>
      <ul>
        <li>Posko terpadu layanan informasi 24 jam</li>
        <li>Penambahan petugas bantuan di area check-in</li>
        <li>Shuttle bus dari dan menuju pusat kota</li>
        <li>Area istirahat khusus keluarga</li>
      </ul>
      <p>Penumpang diimbau tiba di terminal lebih awal untuk mengantisipasi peningkatan volume penumpang.</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=80',
    author: 'Humas UPBU APT Pranoto',
    views_count: 2410,
    is_featured: false,
    published_at: '2024-05-10',
  },
  {
    id: 6,
    title: 'Prosedur Keamanan Penerbangan & Aturan Bagasi Kabin Terbaru',
    slug: 'prosedur-keamanan-bagasi-kabin',
    category: 'Pengumuman',
    excerpt:
      'Penumpang diimbau memahami ketentuan terbaru mengenai barang bawaan kabin demi kelancaran pemeriksaan keamanan.',
    content: `
      <p>Demi menjaga keselamatan dan keamanan penerbangan, Kantor UPBU Kelas I APT Pranoto mengingatkan kembali ketentuan barang bawaan kabin yang berlaku di seluruh area pemeriksaan keamanan.</p>
      <h2>Barang yang Dibatasi</h2>
      <ul>
        <li>Cairan, aerosol, dan gel maksimal 100 ml per kemasan</li>
        <li>Power bank dengan kapasitas di atas 100 Wh wajib mendapat persetujuan maskapai</li>
        <li>Benda tajam wajib dimasukkan ke dalam bagasi tercatat</li>
      </ul>
      <p>Penumpang disarankan tiba di terminal minimal 90 menit sebelum jadwal keberangkatan.</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1400&q=80',
    author: 'Divisi Keamanan (AVSEC)',
    views_count: 1905,
    is_featured: false,
    published_at: '2024-05-05',
  },
];

export const ANNOUNCEMENTS_FALLBACK: Announcement[] = [
  { id: 1, title: 'Penyesuaian Jadwal Penerbangan Periode Juni 2024', content: 'Terdapat perubahan jadwal pada sejumlah rute keberangkatan dan kedatangan.', priority: 'high', is_active: true, target_audience: 'Penumpang' },
  { id: 2, title: 'Aturan Bagasi Kabin Terbaru', content: 'Cairan maksimal 100 ml per kemasan. Power bank di atas 100 Wh wajib persetujuan maskapai.', priority: 'medium', is_active: true, target_audience: 'Penumpang' },
  { id: 3, title: 'Pemeliharaan Area Parkir Terminal', content: 'Sebagian area parkir P2 ditutup sementara untuk pemeliharaan.', priority: 'low', is_active: true, target_audience: 'Umum' },
];

/** Kategori filter portal berita */
export const NEWS_CATEGORIES = ['Pengumuman', 'Operasional', 'Layanan', 'Kegiatan'] as const;

export const CATEGORY_STYLES: Record<string, { text: string; bg: string; solid: string }> = {
  Pengumuman: { text: '#1d4ed8', bg: '#dbeafe', solid: '#2563eb' },
  Operasional: { text: '#0e7490', bg: '#cffafe', solid: '#0891b2' },
  Layanan: { text: '#6d28d9', bg: '#ede9fe', solid: '#7c3aed' },
  Kegiatan: { text: '#c2410c', bg: '#ffedd5', solid: '#ea580c' },
};
