/**
 * Kamus bahasa Inggris.
 *
 * `satisfies Kamus` di bawah adalah pengaman utamanya: kunci yang ditambahkan
 * di `id.ts` tetapi lupa diterjemahkan di sini menjadi galat kompilasi, bukan
 * teks kosong yang baru ketahuan setelah tayang.
 *
 * Catatan penerjemahan:
 *   - Nama diri dibiarkan apa adanya — "APT Pranoto", "PPID", "PAS", "TIM",
 *     "UPBU". Sebagian di antaranya istilah hukum Indonesia yang tidak punya
 *     padanan resmi; menerjemahkannya justru membuat pengunjung asing tidak
 *     dapat mencocokkannya dengan papan penunjuk di terminal.
 *   - Singkatan hukum diberi keterangan sekali di deskripsinya, bukan pada
 *     setiap kemunculan.
 */

import type { Kamus } from './index';

const en = {
  bahasa: {
    label: 'Language',
    id: 'Bahasa Indonesia',
    en: 'English',
    kodeId: 'ID',
    kodeEn: 'EN',
    keEn: 'Switch to English',
    keId: 'Ganti ke Bahasa Indonesia',
  },

  umum: {
    cari: 'Search',
    cariInformasi: 'Search information',
    cariPlaceholder: 'Search flight schedules, facilities, news...',
    pencarianPopuler: 'Popular searches:',
    bukaMenu: 'Open menu',
    tutupMenu: 'Close menu',
    menu: 'Menu',
    kembali: 'Back',
    lihatSemua: 'View all',
    selengkapnya: 'Read more',
    memuat: 'Loading...',
    tidakAdaData: 'No data yet',
    segera: 'Soon',
    tutup: 'Close',
    lewatiKeKonten: 'Skip to main content',
    modeTerang: 'Light mode',
    modeMalam: 'Dark mode',
    keModeTerang: 'Switch to light mode',
    keModeMalam: 'Switch to dark mode',
    bukaPusatBantuan: 'Open the Help Centre',
    pusatBantuan: 'Help Centre',
    lanjutkanPercakapan: 'Continue the conversation',
    balasanBaru: 'new replies from an officer',
    kontenIndonesia: 'Documents and news articles are published in Indonesian.',
  },

  a11y: {
    buka: 'Open accessibility settings',
    judul: 'Accessibility',
    tutup: 'Close the accessibility panel',
    ukuranTeks: 'Text size',

    sakelar: {
      kontras: { label: 'High contrast', ket: 'Deep black text on plain backgrounds, with sharper borders.' },
      gerak: { label: 'Reduce motion', ket: 'Stops animations, particles, and moving decoration.' },
      tautan: { label: 'Underline links', ket: 'Links within text are no longer set apart by colour alone.' },
      fokus: { label: 'Bold focus ring', ket: 'Makes the keyboard cursor easier to spot when you press Tab.' },
      spasi: { label: 'Text spacing', ket: 'Widens line, letter, and word spacing in paragraphs.' },
      font: { label: 'Readable font', ket: 'Atkinson Hyperlegible, designed so similar letters stay distinct.' },
    },

    bacaNyaring: 'Read aloud',
    sentuhLabel: 'Read on hover',
    sentuhKet: 'Text under the cursor — or focused with the keyboard — is read aloud straight away.',
    seluruhHalaman: 'Read the whole page',
    bacaKet: 'Reads this page using your device’s built-in voice.',
    bacaTanpaSuara: 'This device has no English voice installed, so the pronunciation will sound foreign.',
    bacaAman: 'No text leaves your device.',
    lanjutkan: 'Resume',
    jeda: 'Pause',
    hentikan: 'Stop reading',

    kembalikan: 'Reset to defaults',
    catatanSimpan: 'Settings are stored in this browser only and are never sent anywhere.',
  },

  nav: {
    beranda: 'Home',
    informasiPublik: 'Public Information',
    ppid: 'PPID',
    informasi: 'Information',
    regulasi: 'Regulations',
    layanan: 'Services',
    tautanTerkait: 'Related Links',
    portalAplikasi: 'Application Portal',

    strip: {
      berikutnya: 'Next',
      ke: 'to',
      cuaca: 'Cloudy',
    },

    profilBandara: { nama: 'Airport Profile', desc: 'History, vision and mission, and governance of UPBU APT Pranoto' },
    strukturOrganisasi: { nama: 'Organisational Structure', desc: 'Organisation chart of the Class I UPBU Office' },
    pejabatBandara: { nama: 'Airport Officials', desc: 'Leadership of the Class I UPBU Office of APT Pranoto' },
    fasilitasBandara: { nama: 'Airport Facilities', desc: 'Waiting lounges, prayer rooms, medical care, and public amenities' },
    statistikLaluLintas: { nama: 'Traffic Statistics', desc: 'Aircraft, passenger, baggage, and cargo movements per period' },

    profilPpid: { nama: 'PPID Profile', desc: 'Profile of the Information and Documentation Management Officer' },
    sopPpid: { nama: 'PPID Procedures', desc: 'Standard operating procedures for information services' },
    standarPelayanan: { nama: 'Service Standards', desc: 'Service standards and pledge, plus public satisfaction surveys' },
    pengajuanInformasi: { nama: 'Public Information Request', desc: 'Request form for public information' },
    regulasiPpid: { nama: 'PPID Regulations', desc: 'Legal basis for public information services' },
    layananInformasi: { nama: 'Information Services', desc: 'Reports and classification of public information' },
    laporanLayananInformasi: { nama: 'Information Service Reports' },
    informasiBerkala: { nama: 'Periodic Information' },
    informasiSertaMerta: { nama: 'Immediate Information' },
    informasiSetiapSaat: { nama: 'Information Available at All Times' },

    jadwalPenerbangan: { nama: 'Flight Schedule', desc: 'Real-time departure and arrival status' },
    petaRute: { nama: 'Route Map', desc: "Today's flight routes on a single map" },
    berita: { nama: 'News', desc: 'Latest news and official operational announcements' },
    kinerjaKeuangan: { nama: 'Financial Performance', desc: 'Revenue and budget of the Public Service Agency' },
    poskoNataru: { nama: 'Holiday Command Post', desc: 'Passenger flow during the Christmas and New Year command post period' },
    faq: { nama: 'FAQ', desc: 'Frequently asked questions' },

    suratKeputusan: { nama: 'Decrees', desc: 'Official decrees of the Head of the UPBU Office' },
    suratEdaran: { nama: 'Circular Letters', desc: 'Official airport operational circulars' },

    pas: { nama: 'PAS', desc: 'Airport personnel pass' },
    tim: { nama: 'TIM', desc: 'Airside driving permit' },
    keuanganPenagihan: { nama: 'Finance and Billing', desc: 'Finance and billing system' },
    pusatBantuan: { nama: 'Help Centre', desc: 'Complaints, questions, and live chat with officers' },
    laporKehilangan: { nama: 'Report a Lost Item', desc: 'Report an item left behind in the airport area' },
    beautyContest: { nama: 'Beauty Contest', desc: 'Selection of airport business partners' },
    extendAdvance: { nama: 'Extend Advance', desc: 'Extension of cash advances' },
    fieldTrip: { nama: 'Field Trip', desc: 'Educational visits to the airport area' },
    pengajuanInformasiSingkat: { nama: 'Public Information Request', desc: 'Request for public information' },
    pengiklanan: { nama: 'Advertising', desc: 'Advertisement placement in the airport area' },
    perijinanUsaha: { nama: 'Business Licensing', desc: 'Permits for business activities at the airport' },
    sertifikatOjt: { nama: 'OJT Certificate', desc: 'On-the-job training certificate' },
    sewa: { nama: 'Leasing', desc: 'Lease of airport space and land' },
    slotCharter: { nama: 'Charter Slot', desc: 'Application for charter flight slots' },
    tenant: { nama: 'Tenant', desc: 'Commercial tenant registration' },

    semuaTautan: { nama: 'All Related Links', desc: 'Complete list of links to related institutions' },

    populer: {
      jadwal: 'Flight Schedule',
      fasilitas: 'Terminal Facilities',
      berita: 'Latest News',
      wisata: 'Nearby Attractions',
      bantuan: 'Help Centre',
    },
  },

  footer: {
    ringkasan:
      'APT Pranoto Samarinda Airport serves you safely, comfortably, and professionally. The main air gateway to the capital of East Kalimantan and the supporting region of the new capital, IKN.',
    ikutiKami: 'Follow Us',
    hubungiKami: 'Contact Us',
    jamOperasi: 'Airport operating hours',
    bukaPeta: 'Open in Maps',
    kolomInformasi: 'Information',
    kolomLayanan: 'Public Services',
    kolomTautan: 'Links',

    waktuBandara: 'Airport Time',
    keberangkatanHariIni: 'Departures today',
    kedatanganHariIni: 'Arrivals today',
    berikutnya: 'Next',
    papanJadwal: 'Flight Board',

    statistikKunjungan: 'Visitor Statistics',
    dihitungSejak: 'Counted since',
    penghitunganBaru: 'Visitor counting has only just started',
    totalKunjungan: 'Total Visits',
    kunjunganHariIni: 'Visits Today',
    sedangOnline: 'Currently Online',

    diBawahNaungan: 'Under the Auspices Of',
    hakCipta: 'Class I UPBU Office of A.P.T Pranoto Samarinda. All rights reserved.',
    kebijakanPrivasi: 'Privacy Policy',

    informasi: {
      profil: 'Airport Profile',
      sejarah: 'History',
      pejabat: 'Management & Officials',
      berita: 'News & Announcements',
      wisata: 'Nearby Tourism',
      jadwal: 'Flight Schedule',
    },
    layanan: {
      standar: 'Service Standards',
      regulasi: 'Regulations & Decrees',
      ppid: 'PPID & Public Information',
      bantuan: 'Help Centre & Complaints',
      unduhan: 'Download Centre',
      faq: 'FAQ',
    },
    semuaTautan: 'All Related Links',
  },

  beranda: {
    intro:
      'The air gateway to East Kalimantan, connecting you to destinations across Indonesia and beyond.',
    cekPenerbangan: 'Check Flights',
    lihatFasilitas: 'View Facilities',
    lihatWisata: 'Explore Destinations',

    cepat: {
      penerbangan: { judul: 'Flights', desc: 'Schedule information' },
      fasilitas: { judul: 'Facilities', desc: 'Airport services' },
      transportasi: { judul: 'Transport', desc: 'Getting to the airport' },
      parkir: { judul: 'Parking', desc: 'Parking areas' },
      layananOnline: { judul: 'Online Services', desc: 'Complaints & services' },
      peta: { judul: 'Airport Map', desc: 'Terminal navigation' },
    },

    profilKicker: 'Airport Profile',
    profilJudul: 'About APT Pranoto Airport',
    profilRingkas:
      'APT Pranoto Samarinda Airport is the main gateway to East Kalimantan, serving domestic flights and steadily growing into a modern airport built to international standards.',
    putarVideo: 'Play the profile video',
    lihatProfil: 'View Airport Profile',

    beritaKicker: 'Latest Updates',
    beritaJudul: 'News & Announcements',
    fasilitasKicker: 'Comfort',
    fasilitasJudul: 'Featured Facilities',

    fasilitas: {
      wifi: { nama: 'Free Wi-Fi', sub: 'Available throughout the terminal' },
      ruangTunggu: { nama: 'Waiting Lounge', sub: 'Comfortable and spacious' },
      restoran: { nama: 'Restaurants', sub: 'A range of dining options' },
      musala: { nama: 'Prayer Room', sub: 'Clean and comfortable' },
      bermainAnak: { nama: "Children's Play Area", sub: 'Family friendly' },
      disabilitas: { nama: 'Accessibility Services', sub: 'Step-free access assured' },
    },

    pejabatKicker: 'Governance',
    pejabatJudul: 'Officials of APT Pranoto Samarinda Airport',
    profilLengkap: 'Full Profile',
    bagikanProfil: 'Share profile',
    sebelumnya: 'Previous',
    selanjutnya: 'Next',

    aksesKicker: 'Transport',
    aksesJudul: 'Getting to the Airport',
    akses: {
      pribadi: { nama: 'Private Vehicle', desc: 'Ample parking available' },
      taksi: { nama: 'Taxi & Ride-hailing', desc: 'Available 24 hours' },
      bus: { nama: 'Bus & Shuttle', desc: 'Bus services from several points around the city' },
      rental: { nama: 'Car Rental', desc: 'A range of rental options at the airport' },
    },
    bukaPetaAplikasi: 'Open in your maps app',
    membukaTabBaru: ' (opens in a new tab)',

    wisataKicker: 'Nearby Tourism',
    wisataJudul: 'Explore Around the Airport',
    wisataRingkas:
      'Culture, nature, and shopping across East Kalimantan — the closest is just 15 minutes from the terminal.',
    wisataSemua: 'View All Destinations',
    dariBandara: 'from the airport',

    angkaJudul: 'APT Pranoto in Numbers',

    newsletterJudul: 'Stay Up to Date',
    newsletterRingkas:
      'Subscribe to our newsletter for the latest flight information and special offers.',
    newsletterEmail: 'Enter your email address',
    newsletterKirim: 'Subscribe',
  },

  profil: {
    heroKicker: 'Class I UPBU Office',
    heroJudul: 'Profile, Vision & Mission',
    heroAksen: 'APT Pranoto Airport',
    heroLeadAwal: 'Aji Pangeran Tumenggung Pranoto Airport',
    heroLeadAkhir:
      'is the principal air gateway to Samarinda, East Kalimantan, and a connecting point for the region supporting Nusantara, the new national capital.',
    lihatVisiMisi: 'Vision & Mission',
    pejabatBandara: 'Airport Officials',
    catatanIsi:
      'The profile, vision and mission, and organisational structure below are official documents published in Indonesian.',
  },

  ppid: {
    eyebrow: 'Public Information Transparency',
    judul: 'PPID',
    aksen: 'Profile',
    leadAwal:
      'The Information and Documentation Management Officer safeguards your right to public information under',
    lihatSop: 'View PPID Procedures',
    skTim: 'PPID Team Decree',
    catatanIsi: 'The PPID documents and descriptions below are official documents published in Indonesian.',
  },

  layanan: {
    heroKicker: 'Airport Services',
    heroJudul: 'Application',
    heroAksen: 'Services',
    heroLead:
      'Applications for business activity, permits, and events at Class I Aji Pangeran Tumenggung Pranoto Samarinda Airport — each with its requirements and process laid out.',
    lihatPersyaratan: 'View Requirements',
    portalTerpisah: 'Services on Separate Portals',
    portalTerpisahRingkas: 'These three services run on their own systems and open in a new tab.',
    bantuanJudul: 'Not Sure Which Service You Need?',
    bantuanAwal: 'Call the airport during service hours',
    bantuanAkhir:
      ', or submit your question as a public information request so it is recorded with a ticket number.',
    email: 'Email',
  },

  fasilitas: {
    heroKicker: 'Facility Directory',
    heroJudul: 'Terminal Facilities',
    heroAksen: 'APT Pranoto Airport',
    heroLead:
      'A complete guide to the terminal’s public, prayer, medical, special-assistance, and commercial facilities — designed to welcome every passenger, including travellers with disabilities.',
    lihatDenah: 'View Terminal Map',
    tenantTransportasi: 'Tenants & Transport',

    ringkas: {
      total: 'Total Facilities',
      kategori: 'Service Categories',
      beroperasi: 'Currently Operating',
      zona: 'Terminal Zones',
    },

    direktoriJudul: 'Everything You Need in the Terminal',
    direktoriRingkas: 'Browse facilities by category, or search directly by name and location.',
    semua: 'All',
    cariPlaceholder: 'Search facilities...',
    memuat: 'Loading the facility directory...',
    kosongData: 'Facility data is unavailable right now.',
    kosongCari: 'No facilities match your search.',

    denahKicker: 'Terminal Map',
    denahJudul: 'Schematic Terminal Map',
    denahRingkas:
      'APT Pranoto terminal is built to a modern design with step-free access for travellers with disabilities.',
    zona: {
      lantai1: { nama: 'Level 1 — Lobby & Arrivals', item: ['Check-in Counters', 'Baggage Claim', 'Drop-off Zone', 'DAMRI Bus Stop'] },
      lantai2: { nama: 'Level 2 — Departures', item: ['Security Check', 'Gates 1 – 4', 'Food Court', 'Waiting Lounge'] },
      vip: { nama: 'VIP Lounge', item: ['Oasis Lounge', 'Meeting Room', 'Designated Smoking Area'] },
      parkir: { nama: 'Integrated Car Park', item: ['1,000+ vehicle bays', 'EV Fast Charger', 'Two- and four-wheeled vehicles'] },
    },

    bantuanJudul: 'Need Special Assistance?',
    bantuanRingkas:
      'Our officers are ready to assist elderly passengers, travellers with disabilities, expectant mothers, and anyone with other special requirements.',
    hubungiPetugas: 'Contact an Officer',

    ctaKicker: 'Complete Your Journey',
    ctaJudul: 'Explore Tenants & Transport',
    ctaRingkas:
      'Beyond the terminal facilities you will find dining, East Kalimantan souvenirs, lounges, and official transport into central Samarinda.',
    ctaTombol: 'View Tenant Directory',
  },

  penerbangan: {
    status: {
      scheduled: 'Scheduled',
      check_in: 'Check-in Open',
      boarding: 'Boarding',
      departed: 'Departed',
      landed: 'Landed',
      delayed: 'Delayed',
      cancelled: 'Cancelled',
    },
    belumDitentukan: 'Not yet assigned',
    gate: 'Gate',
    conveyor: 'Conveyor',
    konter: 'Counter',
    baruSaja: 'just now',
    menitLalu: 'min ago',
    jamLalu: 'hr ago',
    hariLalu: 'days ago',

    menyegarkan: 'Refreshing…',
    segarkan: 'Refresh Data',
    cariPlaceholder: 'Search by flight number, airline, or city…',
    semua: 'All',
    berangkat: 'Departures',
    datang: 'Arrivals',
    semuaMaskapai: 'All Airlines',
    hitungPenerbangan: 'flights',
    heroJudul: 'Flight',
    heroAksen: 'Schedule',
    heroLead:
      'Departure and arrival status at APT Pranoto Samarinda Airport, refreshed automatically every minute.',
    waktuSetempat: 'Local Time · WITA',
    totalPenerbangan: 'Total Flights',
    perluPerhatian: 'Needs Attention',
    terjadwal: 'Scheduled',
    estimasi: 'Estimated',
    kolomPenerbangan: 'Flight',
    kolomRute: 'Route',
    kolomJadwal: 'Schedule WITA',
    kolomTitikLayan: 'Gate / Counter / Conveyor',
    kolomStatus: 'Status',
    petaRute: 'Route Map',
    judulKeberangkatan: 'Departures',
    judulKedatangan: 'Arrivals',
    judulSemua: 'All Flights',

    kosongCocok: 'No matching flights',
    kosongJadwal: 'No flight schedule yet',
    kosongCocokPesan: 'Try a different keyword, or loosen the airline filter.',
    kosongJadwalPesan: 'FIDS data is unavailable right now. Please refresh again shortly.',
  },

  faq: {
    heroJudul: 'Frequently Asked',
    heroAksen: 'Questions',
    heroSub: 'APT Pranoto Samarinda Airport',
    heroLead:
      'Answers to what visitors ask most — flight routes, operating hours, parking rates, taxis, cargo, and how to file a complaint. All written and kept up to date by our information service officers.',
    hitungPertanyaan: 'questions',
    hitungKategori: 'categories',

    cariKicker: 'Find an Answer',
    cariJudul: 'Type a keyword',
    cariRingkas:
      'The search looks inside the answers, not just the question titles — so a word that appears only midway through an explanation still turns up.',
    cariLabel: 'Search questions',
    cariContoh: 'For example: routes, overnight parking, taxi, accessibility...',
    bersihkanCari: 'Clear search',

    kategori: 'Categories',
    belumKetemuAwal: 'Still no answer? Send your question through the',
    belumKetemuAkhir: '— an officer replies, and you can track it with a ticket number.',

    menampilkan: 'Showing',
    bukaSemua: 'Expand All',
    tutupSemua: 'Collapse All',
    memuatPertanyaan: 'Loading questions',

    kosongJudul: 'No matching questions',
    kosongPesan:
      'Try another keyword, or pick the “Semua” category to search across every answer available.',
    bersihkanPenyaring: 'Clear filters',

    ctaKicker: 'Information Service',
    ctaJudul: 'Still have a question?',
    ctaRingkas:
      'Information service officers are on duty 07.00–20.00 WITA. Questions and complaints receive a ticket number so you can track them yourself.',
    ctaBantuan: 'Help Centre',
    ctaPpid: 'PPID Services',
  },

  galat404: {
    kode: 'Error 404',
    judul: 'This page could not be found',
    ringkas:
      'The address may be mistyped, the page may have moved, or its content may no longer be published. Please continue from one of the destinations below.',
    tujuan: {
      beranda: { label: 'Home', desc: 'The portal home page' },
      penerbangan: { label: 'Flight Schedule', desc: "Today's departures and arrivals" },
      berita: { label: 'News & Announcements', desc: 'The latest from the airport' },
      layanan: { label: 'Services', desc: 'Airport permits and services' },
      faq: { label: 'FAQ', desc: 'Frequently asked questions' },
    },
  },

  pwa: {
    beranda: 'Home',
    berita: 'News',
    bantuan: 'Help',
    layanan: 'Services',
    akun: 'Account',
    navigasiUtama: 'Main navigation',
    berandaAplikasi: 'App home',
    memuat: 'Loading…',
    cari: 'Search…',
  },
} satisfies Kamus;

export default en;
