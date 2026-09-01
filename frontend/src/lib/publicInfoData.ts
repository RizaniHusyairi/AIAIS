/**
 * Layanan Informasi Publik — tiga halaman di bawah menu PPID.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber  : aptpairport.id (situs produksi v1), halaman
 *             /informasi-publik/{informasi-berkala,
 *             informasi-serta-merta, informasi-setiap-saat}
 *   Diambil : 2 Agustus 2026
 *   Catatan : ketiga halaman itu dikendalikan basis data, jadi basis data
 *             lokal di repo legacy KOSONG dan tidak bisa dipakai sebagai
 *             sumber. Seluruh isi di bawah ditranskrip dari HTML yang tayang
 *             lewat pengurai yang memasangkan judul, tanggal, dan tautannya
 *             dalam satu langkah — bukan disalin tangan — supaya tidak ada
 *             tautan yang tertukar antar dokumen.
 *
 *   Berbeda dengan [[serviceStandardData]] yang tautannya mati, seluruh
 *   tautan di berkas ini NYATA dan diperiksa pada 2 Agustus 2026.
 *
 *   Keterangan pada INFO_SERTA_MERTA adalah ringkasan yang DIPOTONG SERVER
 *   v1 pada 150 karakter (`Str::limit`), sehingga sebagian berakhir dengan
 *   "...". Teks utuhnya ada di tautan Instagram masing-masing. Potongan itu
 *   dipertahankan apa adanya — memanjangkannya berarti mengarang kalimat.
 * ────────────────────────────────────────────────────────────────────────
 */

/* ------------------------------------------------------------------ */
/*  Tipe bersama                                                       */
/* ------------------------------------------------------------------ */

/** Satu dokumen yang dapat dibuka. */
export type InfoDoc = {
  slug: string;
  title: string;
  /** Tanggal terbit ISO; kosong bila v1 tidak mencantumkannya. */
  published?: string;
  /** Nama pejabat, khusus dokumen LHKPN. */
  pejabat?: string;
  url: string;
};

/** Sekelompok dokumen dengan satu nama kategori. */
export type InfoGroup = {
  slug: string;
  title: string;
  docs: InfoDoc[];
};

/* ------------------------------------------------------------------ */
/*  1. Informasi Berkala                                               */
/* ------------------------------------------------------------------ */

export const BERKALA_PENGANTAR =
  'Informasi yang wajib disediakan dan diumumkan secara berkala adalah informasi yang telah dikuasai dan didokumentasikan oleh Badan Publik untuk diumumkan secara teratur dan rutin tanpa adanya permintaan.';

export const INFO_BERKALA: InfoGroup[] = [
  {
    slug: 'data-statistik-kepegawaian',
    title: 'Data Statistik Kepegawaian',
    docs: [
      {
        slug: 'abk-2020-2029',
        title: 'Data ABK berdasarkan Jabatan(2020-2024) Proyeksi (2025-2029)',
        published: '2025-04-24',
        url: 'https://docs.google.com/spreadsheets/d/1BKwXfvaWeyLPjXzsdJcZZEvJU9bjoPYd/edit?usp=drive_link&ouid=108559757573979060792&rtpof=true&sd=true',
      },
    ],
  },
  {
    slug: 'laporan-keuangan',
    title: 'Laporan Keuangan',
    docs: [
      {
        slug: 'keuangan-2024',
        title: 'Laporan Keuangan 2024',
        published: '2025-01-02',
        url: 'https://drive.google.com/file/d/1_b4ZxEqwQEOEySWdob_OPkbqMhTrjj5v/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'laporan-tahunan',
    title: 'Laporan Tahunan',
    docs: [
      {
        slug: 'lakip-2024',
        title: 'LAKIP BADAN LAYANAN UMUM UNIT PENYELENGGARA BANDAR UDARA KELAS I A.P.T. PRANOTO SAMARINDA TAHUN 2024',
        published: '2025-01-06',
        url: 'https://drive.google.com/file/d/1Kf7da9xqBPdFpxJPMOxqJ0HVaxDz1Tdc/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'lhkpn',
    title: 'LHKPN',
    docs: [
      {
        slug: 'lhkpn-2024',
        title: 'LHKPN 2024',
        // Gelar ditulis "S.iT." pada sumber halaman ini, sedangkan
        // lib/airportProfile.ts menulis "S.SiT." untuk orang yang sama.
        // Dibiarkan seperti sumbernya masing-masing; jangan diselaraskan
        // diam-diam tanpa memastikan mana yang benar.
        pejabat: 'I Kadek Yuli Sastrawan, S.Ikom., S.iT.',
        published: '2025-02-28',
        url: 'https://drive.google.com/file/d/1WMw9nikfcKEm-pwM03ndBzCe5Ro5vjAp/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'rencana-kinerja-anggaran',
    title: 'Rencana Kinerja Anggaran',
    docs: [
      {
        slug: 'rka-2025',
        title: 'RKA 2025',
        published: '2025-01-22',
        url: 'https://drive.google.com/file/d/1g4nygxekP4kex1tZhMv8tAloekE4gr7k/view',
      },
    ],
  },
  {
    // Ejaan "Survey" (Inggris) ada pada sumber; nama kategori dipertahankan.
    slug: 'survey-kepuasan',
    title: 'Survey Kepuasan',
    docs: [
      {
        slug: 'spak-spkp-2024',
        title: 'SPAK dan SPKP 2024',
        published: '2025-04-20',
        url: 'https://drive.google.com/file/d/1xxnsH3zXXW-ihucKAKU3O5dsKyOT2pmk/view?usp=drive_link',
      },
      {
        slug: 'spak-spkp-2023',
        title: 'SPAK dan SPKP 2023',
        published: '2025-04-20',
        url: 'https://drive.google.com/file/d/143Anexwgt_6C_J0oaC7scj7uVPDJuLtl/view?usp=drive_link',
      },
      {
        slug: 'spak-spkp-2022',
        title: 'SPAK dan SPKP 2022',
        published: '2025-04-20',
        url: 'https://drive.google.com/file/d/1Z-DDZlN8__2AGZvmrMFRuSzlYp__A54x/view?usp=drive_link',
      },
      {
        slug: 'spak-spkp-2021',
        title: 'SPAK dan SPKP 2021',
        published: '2025-04-20',
        url: 'https://drive.google.com/file/d/1Ud38ytY2QH-akCBH3EMYMkdx5L0y0AIY/view?usp=drive_link',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  2. Informasi Serta Merta                                           */
/* ------------------------------------------------------------------ */

export const SERTA_MERTA_PENGANTAR =
  'Informasi yang wajib diumumkan secara serta merta yaitu informasi yang dapat mengancam hajat hidup orang banyak dan ketertiban umum.';

export type InfoSertaMerta = {
  slug: string;
  uraian: string;
  keterangan: string;
  url: string;
};

/** Dua puluh maklumat, urut dari yang terbaru seperti pada v1. */
export const INFO_SERTA_MERTA: InfoSertaMerta[] = [
  {
    slug: 'bahaya-bercanda-tentang-bom',
    uraian: 'Bahaya Bercanda Tentang Bom',
    keterangan: 'Undang-undang melarang bercanda soal bom di area bandara & pesawat. Ancaman bercanda bisa jadi nyata: hukuman pidana menanti',
    url: 'https://www.instagram.com/p/DM9pTcaRFTi/?img_index=1',
  },
  {
    slug: 'waspada-bahaya-layang-layang',
    uraian: 'Waspada Bahaya Layang-Layang',
    keterangan: 'Tahukah #SobatAviasi. Bermain layang-layang di sekitar bandara bisa mengancam keselamatan penerbangan! Benang atau layang-layang yang tersangkut di ja...',
    url: 'https://www.instagram.com/p/DMEokeXvjHH/?img_index=1',
  },
  {
    slug: 'penyesuaian-tarif-blu',
    uraian: 'Penyesuaian Tarif BLU',
    keterangan: 'Halo #SobatAviasi. Berlaku Mulai tanggal 1 Agustus 2025, akan diberlakukan penyesuaian tarif jasa kebandarudaraan di Bandara A.P.T. Pranoto Samarinda...',
    url: 'https://www.instagram.com/p/DL84BWBPYqm/?img_index=1',
  },
  {
    slug: 'perubahan-ketentuan-bagasi-lion-group',
    uraian: 'Perubahan Ketentuan Bagasi Lion Group',
    keterangan: 'KETENTUAN TERBARU BAGASI MASKAPAI LION AIR DAN SUPER AIR JET. Berlaku untuk pembelian tiket tanggal 17 Juli 2025',
    url: 'https://www.instagram.com/p/DLhrKkuhL5u/',
  },
  {
    slug: 'himbauan-mematuhi-rambu-pada-area-drop-zone-dan-pick-up-zone',
    uraian: 'Himbauan mematuhi rambu pada area drop zone dan pick up zone',
    keterangan: '#SobatAviasi selalu patuhi rambu-rambu dan petugas yang mengatur arus lalu lintas pada area drop zone maupun pick up zone agar tercipta kondisi yang t...',
    url: 'https://www.instagram.com/p/DIKpDxghCXX/',
  },
  {
    slug: 'tips-mudik-anti-ribet-dengan-pesawat',
    uraian: 'Tips Mudik Anti Ribet Dengan Pesawat',
    keterangan: '#SobatAviasi Siap mudik tanpa ribet? Ikuti tips mudik anti ribet dengan pesawat berikut ini yah.. Selamat mudik, semoga perjalanan sobat lancar dan me...',
    url: 'https://www.instagram.com/p/DHVik9IhCJE/?img_index=1',
  },
  {
    slug: 'waspada-penjualan-tiket-palsu',
    uraian: 'Waspada Penjualan Tiket Palsu',
    keterangan: '#SobatAviasi menjelang libur mudik lebaran tentu banyak sekali modus penjualan tiket palsu yang beredar pada sosial media, sobat perlu mencermati terl...',
    url: 'https://www.instagram.com/p/DHSNMGGvvtW/',
  },
  {
    slug: 'larangan-melakukan-aktifitas-bahaya-di-sekitar-bandara',
    uraian: 'Larangan melakukan aktifitas bahaya di sekitar Bandara',
    keterangan: '#SobatAviasi yuk kita sama-sama menjaga keselamatan dan keamanan penerbangan dengan tidak melakukan aktivitas yang dapat membahayakan keselamatan pene...',
    url: 'https://www.instagram.com/p/DFXBwyJh2Hr/',
  },
  {
    slug: 'waspada-cuaca-buruk',
    uraian: 'Waspada Cuaca Buruk',
    keterangan: 'Himbauan Penting! Kepada seluruh penumpang di Bandara A.P.T. Pranoto Samarinda, mengingat cuaca buruk dan hujan lebat yang sering terjadi akhir-akhir...',
    url: 'https://www.instagram.com/p/DE1qgkBh54_/',
  },
  {
    slug: 'aturan-baru-penerapan-bagasi-lion-air',
    uraian: 'Aturan Baru Penerapan Bagasi Lion Air',
    keterangan: 'BERLAKU 1 DESEMBER 2024, ATURAN BARU PENERAPAN BAGASI MASKAPAI LION GROUP. Berlaku untuk maskapai Lion Air, Batik Air, Super Air Jet dan Wings Air *Su...',
    url: 'https://www.instagram.com/p/DCnaCtyhhth/?img_index=1',
  },
  {
    slug: 'layanan-parkir-vip',
    uraian: 'Layanan Parkir VIP',
    keterangan: '#SobatAviasi mulai hari ini, Rabu 13 November 2024 telah tersedia layanan Parkir VIP hasil kerjasama antara Bandara A.P.T. Pranoto dengan CV.KKBS. Lay...',
    url: 'https://www.instagram.com/p/DCTZEQHhM8i/',
  },
  {
    slug: 'jalur-alternatif-menuju-bandara',
    uraian: 'Jalur Alternatif Menuju Bandara',
    keterangan: '#sobataviasi sudah tau belum kalo ada jalan alternatif menuju bandar udara A.P.T. Pranoto - Samarinda ??? Akses jalur ini bisa menjadi pilihan #sobata...',
    url: 'https://www.instagram.com/p/DBGv0aZhutm/',
  },
  {
    slug: 'pelayanan-penumpang-disabilitas',
    uraian: 'Pelayanan Penumpang Disabilitas',
    keterangan: 'Alur pelayanan penumpang Disabilitas di Bandara A.P.T. Pranoto',
    url: 'https://www.instagram.com/p/DAQIPFFhLi1/',
  },
  {
    slug: 'bahaya-judi-online',
    uraian: 'Bahaya Judi Online',
    keterangan: 'KEMENTERIAN PERHUBUNGAN Menerbitkan Surat Edaran Larangan Judi Online No. SE-MHB 3Tahun 2024 tentang PENCEGAHAN DAN PENANGGULANGAN JUDI ONLINE DAN SEG...',
    url: 'https://www.instagram.com/p/C-G69pqB4Fj/',
  },
  {
    slug: 'panduan-penurunan-dan-penjemputan-penumpang',
    uraian: 'Panduan Penurunan dan Penjemputan Penumpang',
    keterangan: '#SobatAviasi berikut adalah panduan lajur penurunan dan penjemputan penumpang pada area drop zone dan pickup zonedi Bandara A.P.T. Pranoto yah. Dan ja...',
    url: 'https://www.instagram.com/p/C9eF89bBXgt/',
  },
  {
    slug: 'siapa-yang-boleh-duduk-di-kursi-pintu-darurat-pesawat',
    uraian: 'Siapa yang boleh duduk di Kursi Pintu Darurat Pesawat',
    keterangan: 'Siapa diantara #SobatAviasi yang suka pilih tempat duduk di kursi dekat pintu darurat pesawat (emergency exit row)? Posisi duduk ini memang paling ban...',
    url: 'https://www.instagram.com/p/C9Tumf8hc4-/',
  },
  {
    slug: 'penerapan-parkir-non-tunai-di-bandara',
    uraian: 'Penerapan Parkir Non Tunai di Bandara',
    keterangan: '#SobatAAP mulai tanggal 1 April 2024, Bandara A.P.T. Pranoto Memberlakukan Tap Kartu Uang Elektronik Pada Saat Masuk Dan Keluar. Jadi, sobat dapat men...',
    url: 'https://www.instagram.com/p/C4eaCReBYNf/',
  },
  {
    slug: 'membeli-tiket-pada-situs-resmi-maskapai',
    uraian: 'Membeli Tiket Pada Situs Resmi Maskapai',
    keterangan: '#SobatAAP Guna Menghindari penipuan penjualan tiket yang dilakukan oleh beberapa oknum yang memanfaatkan arus mudik dan arus balik yang tinggi, maka #...',
    url: 'https://www.instagram.com/p/C5Zxy1FhlO7/',
  },
  {
    slug: 'jangan-menerima-titipan-bagasi',
    uraian: 'Jangan Menerima Titipan Bagasi',
    keterangan: '#SobatAviasi Jangan pernah menerima titipan bagasi dari orang tak dikenal di bandara! Waspada dan laporkan hal mencurigakan kepada petugas yah sobat',
    url: 'https://www.instagram.com/p/DHtTF7cB5tC/',
  },
  {
    slug: 'bahaya-membakar-lahan-di-sekitar-bandara',
    uraian: 'Bahaya Membakar Lahan Di Sekitar Bandara',
    keterangan: '#SobatAAP Kebakaran lahan dan hutan selain dapat membahayakan lingkungan sekitar, juga dapat membahayakan keselamatan dan keamanan penerbangan. Asap y...',
    url: 'https://www.instagram.com/p/C6DZzb4hUiy/',
  },
];

/* ------------------------------------------------------------------ */
/*  3. Informasi Setiap Saat                                           */
/* ------------------------------------------------------------------ */

export const SETIAP_SAAT_PENGANTAR =
  'Informasi yang wajib disediakan oleh Badan Publik dan siap tersedia untuk dapat diakses oleh publik tanpa melalui permohonan.';

export const INFO_SETIAP_SAAT: InfoGroup[] = [
  {
    slug: 'persuratan',
    title: 'Persuratan',
    docs: [
      {
        slug: 'cek-fisik-ils',
        title: 'Hasil Cek Fisik Kendaraan Minibus PT. Indonesia Logistik Service (ILS)',
        published: '2025-05-19',
        url: 'https://drive.google.com/file/d/1OuEX5APUh5nyasHvUeMT20O0Fe8rlao9/view?usp=sharing',
      },
      {
        slug: 'se-wafat-yesus-kristus',
        title: 'Surat Edaran Tentang Hari Libur Nasional Dalam Rangka Hari Wafat Yesus Kristus',
        published: '2025-04-17',
        url: 'https://drive.google.com/file/d/1ocTc6JjepNhIFiKYY1F7dz1BSQM1xywb/view?usp=sharing',
      },
      {
        slug: 'se-libur-cuti-2024',
        title: 'Surat Edaran Tentang Hari Libur Nasional dan Cuti Bersama Tahun 2024',
        published: '2024-12-24',
        url: 'https://drive.google.com/file/d/1J9Z-gj5ViIO48ww7Sj-IVzxAbcHfe7KH/view?usp=sharing',
      },
      {
        slug: 'ojt-poltekbang-surabaya',
        title: 'Pembukaan OJT Mahasiswa/i Prodi D3 TNU XV dan Prodi D3 MTU VIII Politeknik Penerbangan Surabaya',
        published: '2024-12-06',
        url: 'https://drive.google.com/file/d/165e2Yg1kPzOYezyLyR5A4ygcNnAu3QOB/view?usp=sharing',
      },
      {
        slug: 'se-libur-natal',
        title: 'Surat Edaran Tentang Hari Libur Nasional dan Cuti Bersama Hari Raya Natal',
        published: '2023-12-21',
        url: 'https://drive.google.com/file/d/1ziPRlVjWaW7310xZu8eEN3KXi7BolM77/view?usp=sharing',
      },
      {
        slug: 'ba-pengawasan-batik-air',
        title: 'Berita Acara Pengawasan Penyelenggaraan Angkutan Udara PT.Batik Air Indonesia',
        published: '2023-12-18',
        url: 'https://drive.google.com/file/d/1v0iiznMLccWIwShjlix1n8GtY_xH4H6V/view?usp=sharing',
      },
    ],
  },
  {
    slug: 'inventaris-bmn',
    title: 'Inventaris BMN',
    docs: [
      {
        slug: 'calbmn-2024',
        title: 'Catatan Atas Laporan Barang Milik Negara (Tahun Anggaran 2024)',
        published: '2025-02-03',
        url: 'https://drive.google.com/file/d/16qsyjKJj0USXqyQb3P1tIWN1YvZgoWa9/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'sop-pelayanan-publik',
    title: 'SOP Pelayanan Publik',
    docs: [
      {
        slug: 'sop-pengaduan',
        title: 'SOP PENANGANAN PENGADUAN, SARAN DAN MASUKAN',
        published: '2024-03-27',
        url: 'https://drive.google.com/file/d/1FG5t7bs4zne3oh2WLDeVy8P8-gxUBjx6/view?usp=drive_link',
      },
      {
        slug: 'sop-penyampaian-informasi',
        title: 'SOP PENYAMPAIAN INFORMASI ATAS DASAR PERMINTAAN',
        published: '2024-03-27',
        url: 'https://drive.google.com/file/d/1MoTKv0Yp3kWJVO44Z0R535-2c-9ky_bA/view?usp=drive_link',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  4. Regulasi PPID                                                   */
/* ------------------------------------------------------------------ */

export const REGULASI_PENGANTAR =
  'Dasar hukum dan peraturan terkait pelaksanaan keterbukaan informasi publik di lingkungan bandara.';

/**
 * Sembilan peraturan dalam tiga kelompok, urut dari yang terbaru pada tiap
 * kelompok — sama seperti tampilan v1.
 *
 * Ejaan "Kementrian" pada nama kelompok ketiga ada pada sumber (seharusnya
 * "Kementerian"). Dipertahankan karena itu label kategori yang dikelola
 * petugas lewat panel admin v1; mengubahnya di sini akan membuat kedua portal
 * menyebut kategori yang sama dengan nama berbeda.
 */
export const REGULASI_PPID: InfoGroup[] = [
  {
    slug: 'peraturan-undang-undang',
    title: 'Peraturan Undang-undang',
    docs: [
      {
        slug: 'uu-43-2009',
        title: 'Undang-Undang Nomor 43 Tahun 2009 tentang Kearsipan',
        published: '2009-10-23',
        url: 'https://drive.google.com/file/d/1Hp20E3TsDN-yXq3BKK-2zoA-6GMndcrK/view?usp=drive_link',
      },
      {
        slug: 'uu-25-2009',
        title: 'Undang-Undang Nomor 25 Tahun 2009 tentang Pelayanan Publik',
        published: '2009-07-18',
        url: 'https://drive.google.com/file/d/1YxQPvR9MT8wxQVhapac-V0eER0qjC8iU/view?usp=drive_link',
      },
      {
        slug: 'uu-14-2008',
        title: 'Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik',
        published: '2008-04-30',
        url: 'https://drive.google.com/file/d/1nh2_N9rpuPH5xXZo4UNCHtmmZyQK7Pqn/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'peraturan-komisi-informasi-pusat',
    title: 'Peraturan Komisi Informasi Pusat',
    docs: [
      {
        slug: 'perki-1-2021',
        title: 'Peraturan Komisi Informasi Pusat Nomor 1 Tahun 2021 Tentang Standar Layanan Informasi Publik',
        published: '2021-06-30',
        url: 'https://drive.google.com/file/d/1efgk9QoriElK3vLceRA8xN2kAt9WhNoy/view?usp=drive_link',
      },
      {
        slug: 'perki-1-2013',
        title: 'Peraturan Komisi Informasi Pusat Nomor 1 Tahun 2013 Tentang Prosedur Penyelesaian Sengketa Informasi Publik',
        published: '2013-04-29',
        url: 'https://drive.google.com/file/d/1Rw3Z_dkGAGXHglG_Gbc92QS2L-pDC3bJ/view?usp=drive_link',
      },
    ],
  },
  {
    slug: 'peraturan-kementerian-perhubungan',
    title: 'Peraturan Kementrian Perhubungan Terkait Keterbukaan Informasi Publik',
    docs: [
      {
        slug: 'kp-591-2023',
        // Tanggal ini ada pada sumber apa adanya. Perhatikan janggalnya:
        // keputusan tahun 2023 tercatat "dipublikasikan" 18 Juli 2025 —
        // kemungkinan besar itu tanggal unggah, bukan tanggal keputusan.
        title: 'Keputusan Sekretaris Jenderal Nomor KP 591 Tahun 2023 tentang Informasi Yang Dikecualikan',
        published: '2025-07-18',
        url: 'https://drive.google.com/file/d/1grsb2RqicPKw2V9hjTiCrN6kP66bqPkq/view?usp=drive_link',
      },
      {
        slug: 'kp-skj-25-2024',
        title: 'Keputusan Sekretaris Jenderal Kementerian Perhubungan Nomor KP-SKJ 25 Tahun 2024 Tentang Daftar Informasi Publik Tahun 2024',
        published: '2024-05-29',
        url: 'https://drive.google.com/file/d/1XQpGdqfDuRjcPdvEZbazB2l7IzxaXS7N/view?usp=drive_link',
      },
      {
        slug: 'km-117-2022',
        title: 'Keputusan Menteri Perhubungan Nomor KM 117 Tahun 2022 tentang SOP Pejabat Pengelola Informasi dan Dokumentasi di Lingkungan Kementerian Perhubungan',
        published: '2022-07-15',
        url: 'https://drive.google.com/file/d/1zS667DcshXtCDA200KKTa1IbJw4n7JgC/view?usp=drive_link',
      },
      {
        slug: 'pm-46-2018',
        title: 'Peraturan Menteri Perhubungan Nomor PM 46 Tahun 2018 tentang Pedoman Pengelolaan Informasi dan Dokumentasi di Lingkungan Kementerian Perhubungan',
        published: '2018-05-22',
        url: 'https://drive.google.com/file/d/1RY9_1phqfBRVdq1llTc7_Fqkrsmw6wGQ/view?usp=drive_link',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Bantuan                                                            */
/* ------------------------------------------------------------------ */

/** "2025-04-24" -> "24 April 2025". */
/** Jumlah dokumen dalam sekumpulan kelompok. */
export const hitungDokumen = (groups: InfoGroup[]): number =>
  groups.reduce((n, g) => n + g.docs.length, 0);
