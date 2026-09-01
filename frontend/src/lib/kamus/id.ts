/**
 * Kamus bahasa Indonesia — SUMBER KEBENARAN struktur kamus.
 *
 * Tipe `Kamus` di `index.ts` diturunkan dari berkas ini (`typeof id`), sehingga
 * setiap kunci yang ditambahkan di sini WAJIB diterjemahkan di `en.ts` atau
 * build gagal. Tidak ada mekanisme cadangan saat runtime dan memang tidak
 * diperlukan: kunci yang hilang tertangkap kompilator, bukan pengunjung.
 *
 * Susunannya mengikuti TEMPAT PEMAKAIAN (nav, footer, beranda, ...), bukan
 * kategori abstrak. Mencari teks yang salah berarti membuka satu komponen dan
 * menelusuri satu cabang, bukan menyisir daftar datar.
 *
 * Yang TIDAK masuk kamus:
 *   - Nama diri: "APT Pranoto", "Kementerian Perhubungan", nama tenant, nama
 *     lembaga pada `relatedLinks.ts`. Nama diri tidak diterjemahkan.
 *   - Konten dari API (judul berita, deskripsi wisata). Backend belum punya
 *     lapisan terjemahan; yang disediakan hanya `umum.kontenIndonesia`.
 */

const id = {
  bahasa: {
    label: 'Bahasa',
    id: 'Bahasa Indonesia',
    en: 'English',
    kodeId: 'ID',
    kodeEn: 'EN',
    keEn: 'Switch to English',
    keId: 'Ganti ke Bahasa Indonesia',
  },

  umum: {
    cari: 'Cari',
    cariInformasi: 'Cari informasi',
    cariPlaceholder: 'Cari jadwal penerbangan, fasilitas, berita...',
    pencarianPopuler: 'Pencarian populer:',
    bukaMenu: 'Buka menu',
    tutupMenu: 'Tutup menu',
    menu: 'Menu',
    kembali: 'Kembali',
    lihatSemua: 'Lihat semua',
    selengkapnya: 'Selengkapnya',
    memuat: 'Memuat...',
    tidakAdaData: 'Belum ada data',
    segera: 'Segera',
    tutup: 'Tutup',
    lewatiKeKonten: 'Lewati ke konten utama',
    modeTerang: 'Mode terang',
    modeMalam: 'Mode malam',
    keModeTerang: 'Beralih ke mode terang',
    keModeMalam: 'Beralih ke mode malam',
    bukaPusatBantuan: 'Buka Pusat Bantuan',
    pusatBantuan: 'Pusat Bantuan',
    lanjutkanPercakapan: 'Lanjutkan percakapan',
    balasanBaru: 'balasan baru dari petugas',
    /* Ditampilkan pada halaman berbahasa Inggris yang isinya datang dari
       basis data. Backend portal ini belum menyimpan versi Inggris, dan
       mengatakannya terus terang lebih baik daripada membiarkan pengunjung
       mengira fitur bahasanya rusak. */
    kontenIndonesia: 'Isi dokumen dan berita disajikan dalam Bahasa Indonesia.',
  },

  a11y: {
    buka: 'Buka penyetelan aksesibilitas',
    judul: 'Aksesibilitas',
    tutup: 'Tutup panel aksesibilitas',
    ukuranTeks: 'Ukuran teks',

    sakelar: {
      kontras: { label: 'Kontras tinggi', ket: 'Teks hitam pekat di atas latar polos, garis tepi dipertegas.' },
      gerak: { label: 'Kurangi gerak', ket: 'Menghentikan animasi, partikel, dan hiasan bergerak.' },
      tautan: { label: 'Garis bawah tautan', ket: 'Tautan dalam teks tidak lagi dibedakan warnanya saja.' },
      fokus: { label: 'Penanda fokus tebal', ket: 'Memperjelas posisi kursor papan tik saat menekan Tab.' },
      spasi: { label: 'Perenggangan teks', ket: 'Menambah jarak baris, huruf, dan kata pada paragraf.' },
      font: { label: 'Font ramah baca', ket: 'Atkinson Hyperlegible, dirancang agar huruf mirip tetap terbedakan.' },
    },

    bacaNyaring: 'Baca nyaring',
    sentuhLabel: 'Baca saat disentuh',
    sentuhKet: 'Teks yang disentuh kursor atau menerima fokus papan tik langsung dibacakan.',
    seluruhHalaman: 'Bacakan seluruh halaman',
    bacaKet: 'Membacakan isi halaman ini memakai suara bawaan perangkat Anda.',
    /* Peringatan ini menyebut bahasa yang sedang aktif, bukan Indonesia
       saja: sejak portal dwibahasa, pemakai Inggris di perangkat tanpa suara
       Inggris menghadapi persoalan yang sama persis. */
    bacaTanpaSuara: 'Perangkat ini tidak memiliki suara berbahasa Indonesia, sehingga pelafalannya akan terdengar asing.',
    bacaAman: 'Tidak ada teks yang dikirim keluar dari perangkat Anda.',
    lanjutkan: 'Lanjutkan',
    jeda: 'Jeda',
    hentikan: 'Hentikan pembacaan',

    kembalikan: 'Kembalikan ke bawaan',
    catatanSimpan: 'Penyetelan disimpan di peramban ini saja dan tidak dikirim ke mana pun.',
  },

  nav: {
    beranda: 'Beranda',
    informasiPublik: 'Informasi Publik',
    ppid: 'PPID',
    informasi: 'Informasi',
    regulasi: 'Regulasi',
    layanan: 'Layanan',
    tautanTerkait: 'Tautan Terkait',
    portalAplikasi: 'Portal Aplikasi',

    strip: {
      berikutnya: 'Berikutnya',
      ke: 'ke',
      cuaca: 'Berawan',
    },

    profilBandara: { nama: 'Profil Bandara', desc: 'Sejarah, visi-misi, dan tata kelola UPBU APT Pranoto' },
    strukturOrganisasi: { nama: 'Struktur Organisasi', desc: 'Bagan organisasi Kantor UPBU Kelas I' },
    pejabatBandara: { nama: 'Pejabat Bandara', desc: 'Struktur pimpinan Kantor UPBU Kelas I APT Pranoto' },
    fasilitasBandara: { nama: 'Fasilitas Bandara', desc: 'Ruang tunggu, musala, kesehatan, dan fasilitas umum' },
    statistikLaluLintas: { nama: 'Statistik Lalu Lintas', desc: 'Pergerakan pesawat, penumpang, bagasi, dan kargo per periode' },

    profilPpid: { nama: 'Profil PPID BLU', desc: 'Profil Pejabat Pengelola Informasi dan Dokumentasi' },
    sopPpid: { nama: 'SOP PPID', desc: 'Prosedur operasional standar layanan informasi' },
    standarPelayanan: { nama: 'Standar Pelayanan', desc: 'Standar & maklumat pelayanan serta survei kepuasan masyarakat' },
    pengajuanInformasi: { nama: 'Pengajuan Informasi Publik', desc: 'Formulir permohonan informasi publik' },
    regulasiPpid: { nama: 'Regulasi PPID', desc: 'Dasar hukum penyelenggaraan PPID' },
    layananInformasi: { nama: 'Layanan Informasi', desc: 'Laporan dan klasifikasi informasi publik' },
    informasiBerkala: { nama: 'Informasi Berkala' },
    informasiSertaMerta: { nama: 'Informasi Serta Merta' },
    informasiSetiapSaat: { nama: 'Informasi Setiap Saat' },

    jadwalPenerbangan: { nama: 'Jadwal Penerbangan', desc: 'Status keberangkatan & kedatangan real-time' },
    petaRute: { nama: 'Peta Rute', desc: 'Rute penerbangan hari ini pada satu peta' },
    berita: { nama: 'Berita', desc: 'Kabar terbaru & pengumuman resmi operasional' },
    kinerjaKeuangan: { nama: 'Kinerja Keuangan', desc: 'Pemasukan dan anggaran Badan Layanan Umum' },
    poskoNataru: { nama: 'Papan Posko Nataru', desc: 'Perkembangan arus penumpang selama Posko Natal & Tahun Baru' },
    faq: { nama: 'FAQ', desc: 'Pertanyaan yang sering diajukan' },

    suratKeputusan: { nama: 'Surat Keputusan', desc: 'Keputusan resmi Kepala Kantor UPBU' },
    suratEdaran: { nama: 'Surat Edaran', desc: 'Edaran resmi operasional bandara' },

    pas: { nama: 'PAS', desc: 'Pas bandara untuk orang' },
    tim: { nama: 'TIM', desc: 'Tanda Izin Mengemudi sisi udara' },
    keuanganPenagihan: { nama: 'Keuangan dan Penagihan', desc: 'Sistem keuangan dan penagihan' },
    pusatBantuan: { nama: 'Pusat Bantuan', desc: 'Pengaduan, pertanyaan, dan chat petugas' },
    laporKehilangan: { nama: 'Lapor Kehilangan Barang', desc: 'Laporkan barang yang tertinggal di area bandara' },
    beautyContest: { nama: 'Beauty Contest', desc: 'Seleksi mitra usaha bandara' },
    extendAdvance: { nama: 'Extend Advance', desc: 'Perpanjangan uang muka' },
    fieldTrip: { nama: 'Field Trip', desc: 'Kunjungan edukasi ke area bandara' },
    pengajuanInformasiSingkat: { nama: 'Pengajuan Informasi Publik', desc: 'Permohonan informasi publik' },
    pengiklanan: { nama: 'Pengiklanan', desc: 'Pemasangan iklan di area bandara' },
    perijinanUsaha: { nama: 'Perijinan Usaha', desc: 'Izin kegiatan usaha di bandara' },
    sertifikatOjt: { nama: 'Sertifikat OJT', desc: 'Sertifikat on-the-job training' },
    sewa: { nama: 'Sewa', desc: 'Sewa ruang dan lahan bandara' },
    slotCharter: { nama: 'Slot Charter', desc: 'Pengajuan slot penerbangan charter' },
    tenant: { nama: 'Tenant', desc: 'Pendaftaran tenant komersial' },

    semuaTautan: { nama: 'Semua Tautan Terkait', desc: 'Daftar lengkap tautan instansi terkait' },

    populer: {
      jadwal: 'Jadwal Penerbangan',
      fasilitas: 'Fasilitas Terminal',
      berita: 'Berita Terbaru',
      wisata: 'Wisata Terdekat',
      bantuan: 'Pusat Bantuan',
    },
  },

  footer: {
    ringkasan:
      'Bandar Udara APT Pranoto Samarinda siap melayani dengan aman, nyaman, dan profesional. Gerbang utama udara Ibu Kota Kalimantan Timur & Penyangga IKN.',
    ikutiKami: 'Ikuti Kami',
    hubungiKami: 'Hubungi Kami',
    jamOperasi: 'Jam operasi bandara',
    bukaPeta: 'Buka di Peta',
    kolomInformasi: 'Informasi',
    kolomLayanan: 'Layanan Publik',
    kolomTautan: 'Tautan',

    waktuBandara: 'Waktu Bandara',
    keberangkatanHariIni: 'Keberangkatan hari ini',
    kedatanganHariIni: 'Kedatangan hari ini',
    berikutnya: 'Berikutnya',
    papanJadwal: 'Papan Jadwal',

    statistikKunjungan: 'Statistik Kunjungan',
    dihitungSejak: 'Dihitung sejak',
    penghitunganBaru: 'Penghitungan kunjungan baru dimulai',
    totalKunjungan: 'Total Kunjungan',
    kunjunganHariIni: 'Kunjungan Hari Ini',
    sedangOnline: 'Sedang Online',

    diBawahNaungan: 'Di Bawah Naungan',
    hakCipta: 'Kantor UPBU Kelas I A.P.T Pranoto Samarinda. Hak cipta dilindungi.',
    kebijakanPrivasi: 'Kebijakan Privasi',

    informasi: {
      profil: 'Profil Bandara',
      sejarah: 'Sejarah',
      pejabat: 'Manajemen & Pejabat',
      berita: 'Berita & Pengumuman',
      wisata: 'Pariwisata Terdekat',
      jadwal: 'Jadwal Penerbangan',
    },
    layanan: {
      standar: 'Standar Pelayanan',
      regulasi: 'Regulasi & Surat Keputusan',
      ppid: 'PPID & Informasi Publik',
      bantuan: 'Pusat Bantuan & Pengaduan',
      unduhan: 'Pusat Unduhan',
      faq: 'FAQ',
    },
    semuaTautan: 'Semua Tautan Terkait',
  },

  beranda: {
    /* Angka bandara TIDAK ada di kamus sama sekali — baik nilainya maupun
       labelnya. Keduanya dikelola petugas lewat `/admin/angka-bandara` dan
       disimpan berpasangan `label_id`/`label_en` di basis data. Teks di bawah
       yang tersisa berperan sebagai CADANGAN untuk blok "Tentang": ia yang
       tampil selama petugas belum menyunting apa pun di panel. */
    intro:
      'Gerbang udara Kalimantan Timur yang menghubungkan Anda ke berbagai destinasi di Indonesia dan dunia.',
    cekPenerbangan: 'Cek Penerbangan',
    lihatFasilitas: 'Lihat Fasilitas',
    lihatWisata: 'Lihat Destinasi Wisata',

    cepat: {
      penerbangan: { judul: 'Penerbangan', desc: 'Info Jadwal' },
      fasilitas: { judul: 'Fasilitas', desc: 'Layanan Bandara' },
      transportasi: { judul: 'Transportasi', desc: 'Menuju Bandara' },
      parkir: { judul: 'Parkir', desc: 'Area Parkir' },
      layananOnline: { judul: 'Layanan Online', desc: 'Pengaduan & Layanan' },
      peta: { judul: 'Peta Bandara', desc: 'Navigasi Terminal' },
    },

    profilKicker: 'Profil Bandara',
    profilJudul: 'Tentang Bandar Udara APT Pranoto',
    profilRingkas:
      'Bandar Udara APT Pranoto Samarinda merupakan gerbang utama Kalimantan Timur yang melayani penerbangan domestik dan terus berkembang menjadi bandara modern berstandar internasional.',
    putarVideo: 'Putar video profil',
    lihatProfil: 'Lihat Profil Bandara',

    pengumumanKicker: 'Papan Pengumuman',
    pengumumanJudul: 'Informasi Terkini Bandara',
    pengumumanAktif: 'pengumuman berlaku',
    pengumumanSampai: 'Berlaku sampai',

    beritaKicker: 'Kabar Terkini',
    beritaJudul: 'Berita & Pengumuman',
    fasilitasKicker: 'Kenyamanan',
    fasilitasJudul: 'Fasilitas Unggulan',

    fasilitas: {
      wifi: { nama: 'Wi-Fi Gratis', sub: 'Tersedia di seluruh area' },
      ruangTunggu: { nama: 'Ruang Tunggu', sub: 'Nyaman & luas' },
      restoran: { nama: 'Restoran', sub: 'Beragam pilihan kuliner' },
      musala: { nama: 'Musala', sub: 'Bersih & nyaman' },
      bermainAnak: { nama: 'Area Bermain Anak', sub: 'Ramah keluarga' },
      disabilitas: { nama: 'Layanan Disabilitas', sub: 'Aksesibilitas terjamin' },
    },

    pejabatKicker: 'Tata Kelola',
    pejabatJudul: 'Pejabat Bandar Udara APT Pranoto Samarinda',
    pejabatAktif: 'Pejabat aktif',
    hubungiKantor: 'Hubungi kantor',
    pilihPejabatLain: 'Pilih pejabat lainnya',
    profilLengkap: 'Profil Lengkap',
    bagikanProfil: 'Bagikan profil',
    sebelumnya: 'Sebelumnya',
    selanjutnya: 'Selanjutnya',

    aksesKicker: 'Transportasi',
    aksesJudul: 'Akses Menuju Bandara',
    akses: {
      pribadi: { nama: 'Kendaraan Pribadi', desc: 'Tersedia area parkir yang luas' },
      taksi: { nama: 'Taksi & Rideshare', desc: 'Konter koperasi taksi di luar area kedatangan' },
      bus: { nama: 'Bus & Shuttle', desc: 'Tersedia layanan bus dari berbagai titik kota' },
      rental: { nama: 'Rental Mobil', desc: 'Berbagai pilihan rental mobil di area bandara' },
    },
    bukaPetaAplikasi: 'Buka di aplikasi peta',
    membukaTabBaru: ' (membuka tab baru)',

    wisataKicker: 'Pariwisata Terdekat',
    wisataJudul: 'Jelajahi Sekitar Bandara',
    wisataRingkas:
      'Destinasi budaya, alam, dan belanja khas Kalimantan Timur — terdekat hanya 15 menit dari terminal.',
    wisataSemua: 'Lihat Semua Destinasi',
    dariBandara: 'dari bandara',


    mitraKicker: 'MITRA & PEMANGKU KEPENTINGAN',
    mitraJudul: 'Dipercaya oleh Mitra Terkemuka',
    mitraRingkas:
      'Maskapai, instansi, dan penyedia layanan yang bekerja bersama kami menjaga penerbangan di APT Pranoto tetap aman, tepat waktu, dan nyaman.',
    mitraHitung: 'mitra terdaftar',
    mitraMaskapai: 'Maskapai',
    mitraInstansi: 'Instansi & Layanan',

    newsletterJudul: 'Dapatkan Informasi Terbaru',
    newsletterRingkas:
      'Berlangganan buletin kami untuk mendapatkan informasi terbaru seputar penerbangan dan promo menarik.',
    newsletterEmail: 'Masukkan email Anda',
    newsletterKirim: 'Berlangganan',
  },

  profil: {
    heroKicker: 'Kantor UPBU Kelas I',
    heroJudul: 'Profil & Visi Misi',
    heroAksen: 'Bandara APT Pranoto',
    heroLeadAwal: 'Bandar Udara Aji Pangeran Tumenggung Pranoto',
    heroLeadAkhir:
      'adalah gerbang transportasi udara utama Kota Samarinda, Kalimantan Timur, sekaligus simpul konektivitas kawasan penyangga Ibu Kota Nusantara.',
    lihatVisiMisi: 'Lihat Visi & Misi',
    pejabatBandara: 'Pejabat Bandara',
    /* Uraian panjang halaman ini bersumber dari lib/airportProfile.ts dan
       lib/orgStructure.ts — dokumen resmi berbahasa Indonesia yang belum punya
       versi Inggris. Dikatakan sekali di muka, bukan diterjemahkan setengah. */
    catatanIsi:
      'Uraian profil, visi-misi, dan struktur organisasi di bawah adalah dokumen resmi berbahasa Indonesia.',
  },

  ppid: {
    eyebrow: 'Keterbukaan Informasi Publik',
    judul: 'Profil',
    aksen: 'PPID',
    leadAwal: 'Pejabat Pengelola Informasi dan Dokumentasi menjamin hak Anda atas informasi publik sesuai',
    lihatSop: 'Lihat SOP PPID',
    skTim: 'SK Tim PPID',
    laporanBulanan: 'Lihat Laporan Bulanan PPID',
    catatanIsi:
      'Dokumen dan uraian PPID di bawah adalah dokumen resmi berbahasa Indonesia.',
  },

  layanan: {
    heroKicker: 'Layanan Bandara',
    heroJudul: 'Layanan',
    heroAksen: 'Pengajuan',
    heroLead:
      'Layanan pengajuan usaha, perizinan, dan kegiatan di lingkungan Bandar Udara Kelas I Aji Pangeran Tumenggung Pranoto Samarinda — lengkap dengan persyaratan dan alur prosesnya.',
    lihatPersyaratan: 'Lihat Persyaratan',
    portalTerpisah: 'Portal Layanan Terpisah',
    portalTerpisahRingkas: 'Ketiga layanan berikut dikelola pada sistem tersendiri dan terbuka di tab baru.',
    bantuanJudul: 'Butuh Bantuan Memilih Layanan?',
    bantuanAwal: 'Hubungi bandara pada jam layanan',
    bantuanAkhir:
      ', atau ajukan pertanyaan melalui permohonan informasi publik agar tercatat dengan nomor tiket.',
    email: 'Email',
  },

  fasilitas: {
    heroKicker: 'Direktori Fasilitas',
    heroJudul: 'Fasilitas Terminal',
    heroAksen: 'Bandara APT Pranoto',
    heroLead:
      'Panduan lengkap fasilitas umum, keagamaan, kesehatan, layanan khusus, dan area komersial terminal — dirancang ramah bagi seluruh penumpang, termasuk penyandang disabilitas.',
    lihatDenah: 'Lihat Denah Terminal',
    tenantTransportasi: 'Tenant & Transportasi',

    ringkas: {
      total: 'Total Fasilitas',
      kategori: 'Kategori Layanan',
      beroperasi: 'Sedang Beroperasi',
      zona: 'Zona Terminal',
    },

    direktoriJudul: 'Semua Kebutuhan Anda di Terminal',
    direktoriRingkas: 'Telusuri fasilitas berdasarkan kategori atau cari langsung nama dan lokasinya.',
    semua: 'Semua',
    cariPlaceholder: 'Cari fasilitas...',
    memuat: 'Memuat direktori fasilitas...',
    kosongData: 'Data fasilitas belum tersedia saat ini.',
    kosongCari: 'Tidak ada fasilitas yang cocok dengan pencarian Anda.',

    lihatFoto: 'Lihat foto',
    tutup: 'Tutup',
    statusBeroperasi: 'Beroperasi',
    statusTutup: 'Tidak Beroperasi',
    labelLokasi: 'Lokasi',
    deskripsiBawaan: 'Fasilitas resmi Bandara APT Pranoto Samarinda.',

    denahKicker: 'Denah Terminal',
    denahJudul: 'Peta Skematik Terminal',
    denahRingkas:
      'Terminal APT Pranoto dirancang modern dengan akses bebas hambatan bagi penyandang disabilitas.',
    zona: {
      lantai1: { nama: 'Lantai 1 — Lobi & Kedatangan', item: ['Konter Check-in', 'Pengambilan Bagasi', 'Zona Antar-Jemput', 'Halte Bus DAMRI'] },
      lantai2: { nama: 'Lantai 2 — Keberangkatan', item: ['Pemeriksaan Keamanan', 'Gate 1 – 4', 'Pujasera', 'Ruang Tunggu'] },
      vip: { nama: 'Ruang Tunggu VIP', item: ['Oasis Lounge', 'Ruang Rapat', 'Area Merokok Khusus'] },
      parkir: { nama: 'Parkir Terpadu', item: ['1.000+ slot kendaraan', 'Pengisian Cepat Kendaraan Listrik', 'Roda dua & roda empat'] },
    },

    bantuanJudul: 'Butuh Pendampingan Khusus?',
    bantuanRingkas:
      'Petugas kami siap membantu penumpang lanjut usia, penyandang disabilitas, ibu hamil, dan penumpang dengan kebutuhan khusus lainnya.',
    hubungiPetugas: 'Hubungi Petugas',

    ctaKicker: 'Lengkapi Perjalanan Anda',
    ctaJudul: 'Jelajahi Tenant & Transportasi',
    ctaRingkas:
      'Selain fasilitas terminal, tersedia pilihan kuliner, oleh-oleh khas Kalimantan Timur, lounge, serta moda transportasi resmi menuju pusat Kota Samarinda.',
    ctaTombol: 'Lihat Direktori Tenant',
  },

  penerbangan: {
    /* Kunci status mengikuti nilai yang dikirim FIDS apa adanya. Nilai yang
       tidak dikenal jatuh ke `scheduled`, sama seperti `statusTheme`. */
    status: {
      scheduled: 'Terjadwal',
      check_in: 'Check-in Dibuka',
      boarding: 'Boarding',
      departed: 'Berangkat',
      landed: 'Mendarat',
      delayed: 'Delay',
      cancelled: 'Dibatalkan',
    },
    belumDitentukan: 'Belum ditentukan',
    gate: 'Gate',
    conveyor: 'Conveyor',
    konter: 'Konter',
    baruSaja: 'baru saja',
    menitLalu: 'menit lalu',
    jamLalu: 'jam lalu',
    hariLalu: 'hari lalu',

    menyegarkan: 'Menyegarkan…',
    segarkan: 'Segarkan Data',
    cariPlaceholder: 'Cari nomor penerbangan, maskapai, atau kota…',
    semua: 'Semua',
    berangkat: 'Berangkat',
    datang: 'Datang',
    semuaMaskapai: 'Semua Maskapai',
    hitungPenerbangan: 'penerbangan',
    heroJudul: 'Informasi Jadwal',
    heroAksen: 'Penerbangan',
    heroLead:
      'Status keberangkatan dan kedatangan Bandara APT Pranoto Samarinda, diperbarui otomatis setiap menit.',
    waktuSetempat: 'Waktu Setempat · WITA',
    totalPenerbangan: 'Total Penerbangan',
    perluPerhatian: 'Perlu Perhatian',
    terjadwal: 'Terjadwal',
    estimasi: 'Estimasi',
    kolomPenerbangan: 'Penerbangan',
    kolomRute: 'Rute',
    kolomJadwal: 'Jadwal WITA',
    kolomTitikLayan: 'Gate / Konter / Conveyor',
    kolomStatus: 'Status',
    petaRute: 'Peta Rute',
    judulKeberangkatan: 'Keberangkatan',
    judulKedatangan: 'Kedatangan',
    judulSemua: 'Semua Penerbangan',

    kosongCocok: 'Tidak ada penerbangan yang cocok',
    kosongJadwal: 'Belum ada jadwal penerbangan',
    kosongCocokPesan: 'Coba ubah kata kunci pencarian atau longgarkan filter maskapai.',
    kosongJadwalPesan: 'Data FIDS belum tersedia saat ini. Silakan segarkan beberapa saat lagi.',
  },

  faq: {
    heroJudul: 'Pertanyaan yang',
    heroAksen: 'Sering Diajukan',
    heroSub: 'Bandar Udara APT Pranoto Samarinda',
    heroLead:
      'Jawaban atas hal-hal yang paling sering ditanyakan pengunjung — rute penerbangan, jam operasional, tarif parkir, taksi, kargo, hingga cara menyampaikan pengaduan. Semuanya disusun dan diperbarui petugas layanan informasi.',
    hitungPertanyaan: 'pertanyaan',
    hitungKategori: 'kategori',

    cariKicker: 'Cari Jawaban',
    cariJudul: 'Ketik kata kuncinya',
    cariRingkas:
      'Pencarian menelusuri isi jawaban, bukan judul pertanyaannya saja — jadi kata yang hanya muncul di tengah penjelasan pun tetap ketemu.',
    cariLabel: 'Cari pertanyaan',
    cariContoh: 'Contoh: rute, parkir inap, taksi, disabilitas, perintis...',
    bersihkanCari: 'Bersihkan pencarian',

    kategori: 'Kategori',
    belumKetemuAwal: 'Belum menemukan jawabannya? Kirim pertanyaan lewat',
    belumKetemuAkhir: '— dijawab petugas dan dapat dilacak dengan nomor tiket.',

    menampilkan: 'Menampilkan',
    bukaSemua: 'Buka Semua',
    tutupSemua: 'Tutup Semua',
    memuatPertanyaan: 'Memuat pertanyaan',

    kosongJudul: 'Tidak ada pertanyaan yang cocok',
    kosongPesan:
      'Coba kata kunci lain atau pilih kategori “Semua” untuk menelusuri seluruh jawaban yang tersedia.',
    bersihkanPenyaring: 'Bersihkan penyaring',

    ctaKicker: 'Layanan Informasi',
    ctaJudul: 'Masih ada yang ingin ditanyakan?',
    ctaRingkas:
      'Petugas layanan informasi bertugas 07.00–20.00 WITA. Pertanyaan dan pengaduan yang masuk diberi nomor tiket sehingga dapat dilacak sendiri.',
    ctaBantuan: 'Pusat Bantuan',
    ctaPpid: 'Layanan PPID',
  },

  galat404: {
    kode: 'Galat 404',
    judul: 'Halaman ini tidak ditemukan',
    ringkas:
      'Alamat yang Anda tuju mungkin salah ketik, sudah dipindahkan, atau isinya sudah tidak diterbitkan lagi. Silakan lanjutkan dari salah satu tujuan di bawah.',
    tujuan: {
      beranda: { label: 'Beranda', desc: 'Halaman utama portal' },
      penerbangan: { label: 'Jadwal Penerbangan', desc: 'Keberangkatan & kedatangan hari ini' },
      berita: { label: 'Berita & Pengumuman', desc: 'Kabar terbaru dari bandara' },
      layanan: { label: 'Layanan', desc: 'Perizinan dan layanan bandara' },
      faq: { label: 'Tanya Jawab', desc: 'Pertanyaan yang sering diajukan' },
    },
  },

  pwa: {
    beranda: 'Beranda',
    berita: 'Berita',
    bantuan: 'Bantuan',
    layanan: 'Layanan',
    akun: 'Akun',
    navigasiUtama: 'Navigasi utama',
    berandaAplikasi: 'Beranda aplikasi',
    memuat: 'Memuat…',
    cari: 'Cari…',
  },
};

export default id;
