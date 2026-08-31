/**
 * Konten PPID — Pejabat Pengelola Informasi dan Dokumentasi.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1), halaman
 *             /informasi-publik/profil-ppid-blu dan /informasi-publik/sop-ppid
 *   Diambil : 2 Agustus 2026
 *   Silang  : dicocokkan baris-per-baris dengan Blade di repo legacy
 *             (resources/views/landing-menu/informasi-publik/…). Kedua sumber
 *             SAMA PERSIS untuk halaman ini — berbeda dengan halaman Profil
 *             Bandara yang isinya berasal dari tabel `settings` sehingga repo
 *             lokal sudah usang. Lihat [[airportProfile.ts]].
 *
 *   Halaman PPID adalah kewajiban UU 14/2008 tentang Keterbukaan Informasi
 *   Publik. JANGAN menambah, meringkas, atau "memperbaiki" tenggat waktu,
 *   dasar hukum, maupun nama pejabat di berkas ini tanpa sumber resmi:
 *   angka-angka di sini adalah hak hukum pemohon informasi, dan salah tulis
 *   satu angka berarti portal menyesatkan orang soal hak mereka.
 * ────────────────────────────────────────────────────────────────────────
 */

/* ------------------------------------------------------------------ */
/*  Profil PPID                                                        */
/* ------------------------------------------------------------------ */

export const PPID_ORG = 'BLU Kantor UPBU Kelas I A.P.T. Pranoto';

/** Paragraf pembuka: latar belakang UU KIP. */
export const PPID_LATAR: string[] = [
  'Sejak Undang-Undang Nomor 14 Tahun 2008 Tentang Keterbukaan Informasi Publik (UU KIP) diberlakukan secara efektif pada tanggal 30 April 2010 telah mendorong bangsa Indonesia satu langkah maju ke depan, menjadi bangsa yang transparan dan akuntabel dalam mengelola sumber daya publik. UU KIP sebagai instrumen hukum yang mengikat merupakan tonggak atau dasar bagi seluruh rakyat Indonesia untuk bersama-sama mengawasi secara langsung pelayanan publik yang diselenggarakan oleh Badan Publik.',
  'Keterbukaan informasi adalah salah satu pilar penting yang akan mendorong terciptanya iklim transparansi. Terlebih di era yang serba terbuka ini, keinginan masyarakat untuk memperoleh informasi semakin tinggi. Diberlakukannya UU KIP merupakan perubahan yang mendasar dalam kehidupan bermasyarakat, berbangsa dan bernegara, oleh sebab itu perlu adanya kesadaran dari seluruh elemen bangsa agar setiap lembaga dan badan pemerintah dalam pengelolaan informasi harus dengan prinsip good governance, tata kelola yang baik dan akuntabilitas.',
];

export const PPID_VISI =
  'Terwujudnya layanan informasi publik yang Transparan, Objektif dan Prima untuk meningkatkan peran serta aktif masyarakat dalam penyelenggaraan pembangunan sektor transportasi.';

/** Empat penjabaran visi. Judulnya adalah kata kunci di dalam visi itu sendiri. */
export const PPID_VISI_PILAR: { title: string; text: string }[] = [
  {
    title: 'Layanan Informasi Publik',
    text: 'Suatu usaha untuk memberikan informasi publik sesuai Undang-Undang No. 14 tahun 2008 tentang Keterbukaan Informasi Publik di lingkungan Kementerian Perhubungan.',
  },
  {
    title: 'Transparan',
    text: 'Memberikan akses seluas-luasnya kepada masyarakat dalam memperoleh informasi publik dengan cepat dan tepat waktu, biaya ringan, dan cara yang sederhana.',
  },
  {
    title: 'Objektif',
    text: 'Memberikan akses informasi kepada setiap kalangan, baik Perorangan, Kelompok, maupun Badan Hukum.',
  },
  {
    title: 'Prima',
    text: 'Terus berupaya penuh dalam peningkatan pelayanan, pengelolaan dan pendokumentasian informasi publik secara akuntabel, efisien dan mudah diakses.',
  },
];

export const PPID_MISI: string[] = [
  'Menjamin akses informasi publik sesuai Undang-Undang No. 14 tahun 2008 tentang Keterbukaan Informasi Publik.',
  'Meningkatkan kualitas layanan informasi publik.',
  'Meningkatkan profesionalisme SDM layanan informasi publik.',
  'Meningkatkan sarana-prasarana dalam rangka efisiensi dan efektivitas layanan informasi publik.',
  'Meningkatkan pengelolaan informasi dan dokumentasi secara baik, efisien, mudah diakses dan bersifat desentralisasi.',
];

export const PPID_TUGAS: string[] = [
  'Melakukan pengelolaan informasi publik.',
  'Menyampaikan informasi secara baik dan efisien sehingga dapat diakses dengan mudah.',
  'Melakukan pemutakhiran dalam pengelolaan maupun pengembangan digital.',
  'Menyediakan Sarana dan Prasarana dalam pelaksanaan pelayanan informasi.',
];

/*
 * SK Tim PPID TIDAK lagi di sini.
 *
 * Ia kini satu baris di tabel `ppid_profile_documents` yang dikelola dari
 * /admin/profil-ppid, karena SK diperbarui tiap kali susunan tim berubah dan
 * itu tidak boleh menuntut rilis kode. SK yang selama ini tayang — beserta
 * tautan Drive-nya — dipindahkan ke `PpidProfileDocumentSeeder`, lengkap
 * dengan provenansnya.
 */

export type PpidDoc = {
  slug: string;
  title: string;
  desc: string;
  src: string;
  /** Dimensi asli berkas — dipakai agar tata letak tidak melompat saat memuat. */
  width: number;
  height: number;
};

/** Dokumen bergambar pada halaman Profil PPID. */
export const PPID_DOKUMEN: PpidDoc[] = [
  {
    slug: 'struktur',
    title: 'Struktur Organisasi PPID',
    desc: 'Susunan tim pengelola informasi dan dokumentasi bandara.',
    src: '/ppid/struktur-ppid.jpg',
    width: 1280,
    height: 905,
  },
  {
    slug: 'maklumat',
    title: 'Maklumat Pelayanan',
    desc: 'Janji layanan PPID kepada masyarakat.',
    src: '/ppid/maklumat-pelayanan.png',
    width: 1280,
    height: 905,
  },
  {
    slug: 'biaya',
    title: 'Standar Biaya Layanan',
    desc: 'Rincian biaya penggandaan dan pengiriman informasi publik.',
    src: '/ppid/standar-biaya-layanan.png',
    width: 1280,
    height: 905,
  },
];

/* ------------------------------------------------------------------ */
/*  SOP PPID                                                           */
/* ------------------------------------------------------------------ */

export const SOP_PENGANTAR =
  'Pada halaman ini, Anda dapat melihat SOP terkait dengan pengelolaan dan layanan Informasi Publik di PPID (Pejabat Pengelola Informasi dan Dokumentasi). SOP ini berfungsi sebagai panduan dalam memberikan layanan informasi yang transparan, tepat waktu, dan sesuai dengan ketentuan yang berlaku.';

export type SopStep = {
  text: string;
  /** Tenggat resmi pada langkah ini, bila ada. Ditonjolkan sebagai lencana. */
  deadline?: string;
};

export type SopProcedure = {
  slug: string;
  /** Nomor urut yang tampil sebagai "nomor penerbangan" pada kartu. */
  order: number;
  title: string;
  /** Ringkasan satu kalimat — tidak ada di v1, murni label navigasi. */
  lead: string;
  /** Tenggat paling penting, ditampilkan besar di kepala kartu. */
  headline: string;
  headlineLabel: string;
  steps: SopStep[];
  image: string;
  imageAlt: string;
};

/**
 * Tiga prosedur layanan informasi publik.
 *
 * Urutannya SENGAJA berbeda dari v1. Di v1 kartu pertama adalah "sengketa" —
 * tahap paling akhir dan paling jarang dipakai — sedangkan "permohonan",
 * pintu masuk yang dicari hampir semua pengunjung, berada di tengah. Di sini
 * urutannya mengikuti perjalanan pemohon: permohonan -> keberatan -> sengketa.
 * Isi tiap langkah tidak diubah sedikit pun.
 */
export const SOP_PROSEDUR: SopProcedure[] = [
  {
    slug: 'permohonan',
    order: 1,
    title: 'Tata Cara Permohonan Informasi Publik',
    lead: 'Langkah awal bagi siapa pun yang ingin memperoleh informasi publik dari bandara.',
    headline: '10 + 7 hari kerja',
    headlineLabel: 'Batas waktu jawaban PPID',
    steps: [
      { text: 'Pemohon mengajukan permintaan informasi ke Bandar Udara A.P.T. Pranoto - Samarinda melalui PPID.' },
      { text: 'Mengisi formulir permohonan.' },
      { text: 'Petugas Informasi mencatat semua yang diminta oleh pemohon informasi publik.' },
      { text: 'Pemohon Informasi Publik harus meminta tanda bukti kepada Petugas Informasi serta nomor pendaftaran permintaan.' },
      {
        text: 'PPID memberikan jawaban untuk memenuhi permohonan informasi atau tidak memenuhi dengan disertai alasan.',
        deadline: '10 hari kerja, dapat diperpanjang 7 hari kerja',
      },
    ],
    image: '/ppid/sop-permohonan-informasi.png',
    imageAlt: 'Bagan alur prosedur permohonan informasi publik',
  },
  {
    slug: 'keberatan',
    order: 2,
    title: 'Tata Cara Prosedur Permohonan Keberatan Informasi',
    lead: 'Ditempuh bila jawaban atas permohonan informasi dirasa belum sesuai.',
    headline: '30 hari kerja',
    headlineLabel: 'Batas waktu tanggapan PPID',
    steps: [
      {
        text: 'Keberatan diajukan kepada PPID Bandar Udara A.P.T. Pranoto - Samarinda.',
        deadline: 'paling lambat 30 hari kerja setelah ditemukan alasan',
      },
      {
        text: 'PPID Bandar Udara A.P.T. Pranoto Samarinda harus memberikan tanggapan atas pengajuan keberatan tersebut.',
        deadline: 'paling lambat 30 hari kerja sejak keberatan diterima secara tertulis',
      },
      {
        text: 'Jika pengaju puas atas putusan PPID, maka sengketa keberatan selesai. Jika pengaju keberatan informasi tidak puas atas tanggapan PPID Bandar Udara A.P.T. Pranoto - Samarinda, maka penyelesaian sengketa informasi publik dapat diajukan kepada Komisi Informasi Pusat.',
      },
    ],
    image: '/ppid/sop-keberatan-informasi.png',
    imageAlt: 'Bagan alur prosedur permohonan keberatan informasi',
  },
  {
    slug: 'sengketa',
    order: 3,
    title: 'Tata Cara Prosedur Pengajuan Sengketa Informasi Publik',
    lead: 'Tahap terakhir, ditangani Komisi Informasi Pusat di luar bandara.',
    headline: '14 hari kerja',
    headlineLabel: 'Batas waktu mengajukan sengketa',
    steps: [
      {
        // Sumber menulis "KIP (Komite Informasi Pusat)" pada kalimat ini,
        // padahal dua kalimat berikutnya di halaman yang sama menulis
        // "Komisi Informasi" dengan benar. Nama resmi lembaganya adalah
        // KOMISI Informasi Pusat (UU 14/2008 Pasal 23). Berbeda dengan
        // salah ketik pada kutipan peraturan di [[airportProfile.ts]] yang
        // sengaja dipertahankan, ini bukan kutipan — ini portal pemerintah
        // menyebut nama lembaga negara, dan menyalin salah tulisnya berarti
        // menyesatkan pemohon soal ke mana harus mengadu.
        text: 'Pengajuan sengketa Informasi Publik ke Komisi Informasi Pusat (KIP) diajukan setelah diterimanya tanggapan tertulis dari PPID Bandar Udara A.P.T. Pranoto - Samarinda yang tidak memuaskan permohonan Informasi Publik. Jika pada tahap mediasi dihasilkan kesepakatan, maka kesepakatan hasil mediasi tersebut ditetapkan oleh Putusan Komisi Informasi.',
        deadline: '14 hari kerja setelah tanggapan diterima',
      },
      {
        text: 'Komisi Informasi harus melakukan proses penyelesaian sengketa melalui mediasi. Apabila upaya mediasi dinyatakan tidak berhasil secara tertulis oleh salah satu pihak, atau para pihak yang bersengketa menarik diri dari perundingan, maka Komisi Informasi melanjutkan proses penyelesaian sengketa melalui adjudikasi.',
        deadline: 'dimulai 14 hari kerja sejak permohonan diterima, paling lambat 100 hari kerja',
      },
      {
        text: 'Apabila salah satu atau para pihak yang bersengketa secara tertulis menyatakan tidak menerima putusan adjudikasi dari Komisi Informasi, maka dapat mengajukan gugatan melalui pengadilan. Jika pemohon informasi puas atas keputusan adjudikasi Komisi Informasi, sengketa selesai.',
        deadline: 'paling lambat 14 hari kerja setelah putusan diterima',
      },
    ],
    image: '/ppid/sop-sengketa-informasi.png',
    imageAlt: 'Bagan alur prosedur pengajuan sengketa informasi publik',
  },
];

/** Dasar hukum yang disebut halaman-halaman ini. */
export const PPID_DASAR_HUKUM =
  'Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik';
