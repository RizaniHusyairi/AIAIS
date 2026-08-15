/** Peran yang dikenali portal; selaras dengan `User::ROLES` di backend. */
export type UserRole = 'admin' | 'staff' | 'user';

/**
 * Identitas pengguna yang sedang masuk.
 *
 * Sengaja hanya empat medan — inilah bentuk yang dikembalikan
 * `AuthController::publicUser()`. Bendera `is_admin`/`is_staff`, nomor
 * telepon, dan alamat TIDAK ikut keluar dari API.
 */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

/** Keterangan periode Posko Nataru dari tautan petugas. */
export interface PoskoInfo {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description: string | null;
}

/** Satu catatan penerbangan Posko Nataru. */
export interface NataruFlight {
  id: number;
  nataru_event_id: number;
  flight_date: string;
  flight_time: string;
  airline: string;
  flight_number: string;
  status_flight: string;
  route: string;
  direction: 'arrival' | 'departure';
  aircraft_type: string | null;
  aircraft_registration: string | null;
  seat_capacity: number | null;
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  /** Dihitung server dari ketiga angka di atas. */
  pax_total: number;
  cargo: number;
  baggage: number;
  /** Dihitung server; null bila kapasitas kursi tidak diketahui. */
  load_factor: number | null;
  ticket_price_high: number | null;
  ticket_price_low: number | null;
  officer_name: string;
  remarks: string | null;
}

/** Satu periode Posko Nataru pada panel pengelolaan. */
export interface NataruEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  peak_date: string | null;
  is_active: boolean;
  compare_event_id: number | null;
  description: string | null;
  flights_count?: number;
}

/** Ringkasan satu periode posko. */
export interface NataruSummary {
  event: Pick<NataruEvent, 'id' | 'name' | 'start_date' | 'end_date' | 'peak_date' | 'is_active'>;
  totals: {
    flights: number;
    passengers: number;
    cargo: number;
    baggage: number;
    airlines: number;
    average_load_factor: number | null;
  };
  by_direction: Record<'arrival' | 'departure', {
    flights: number;
    passengers: number;
    average_load_factor: number | null;
  }>;
  daily: { date: string; flights: number; passengers: number }[];
}

/** Kedatangan, keberangkatan, dan totalnya untuk satu kategori. */
export interface TrafficTotals {
  arrival: number;
  departure: number;
  total: number;
}

/** Satu periode pada seri statistik — satu bulan atau satu tahun. */
export interface TrafficPeriod {
  /** Kunci mesin: "2025" atau "2025-09". */
  period: string;
  /** Label tampil: "2025" atau "September". */
  label: string;
  /** Banyak hari yang benar-benar tercatat pada periode ini. */
  days: number;
  aircraft: TrafficTotals;
  passenger: TrafficTotals;
  baggage: TrafficTotals;
  cargo: TrafficTotals;
}

/** Statistik lalu lintas udara sebagaimana dikirim API. */
export interface AirTrafficStats {
  years: number[];
  /** Tahun yang sedang disaring; null berarti seluruh tahun. */
  year: number | null;
  range: { from: string | null; to: string | null };
  days: number;
  summary: Record<'aircraft' | 'passenger' | 'baggage' | 'cargo', TrafficTotals>;
  series: TrafficPeriod[];
}

/** Satu catatan lalu lintas udara harian (panel admin). */
export interface AirTrafficLog {
  id: number;
  date: string;
  aircraft_arrival: number;
  aircraft_departure: number;
  passenger_arrival: number;
  passenger_departure: number;
  baggage_arrival: number;
  baggage_departure: number;
  cargo_arrival: number;
  cargo_departure: number;
}

/** Status pengajuan; nilainya ditiru apa adanya dari v1. */
export type StatusPengajuan = 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Revisi Diperlukan';

/**
 * Pengajuan kunjungan lapangan (field trip).
 *
 * `documents` sengaja TIDAK ada di sini: lintasan berkasnya tidak pernah
 * keluar dari API. Yang tersedia hanya `document_count`, dan berkasnya diambil
 * per indeks lewat endpoint bertoken.
 */
export interface FieldTrip {
  id: number;
  user_id: number;
  fieldtrip_name: string;
  description: string;
  fieldtrip_type: string;
  submission_status: StatusPengajuan;
  staff_notes: string | null;
  reply_document_path: string | null;
  document_count: number;
  created_at: string;
  /** Hanya terisi pada daftar sisi petugas. */
  user?: { id: number; name: string; email: string; phone: string | null };
}

/**
 * Keterangan satu jenis pengajuan layanan, dari `/submission-types`.
 *
 * Bentuk formulirnya datang dari backend, bukan ditulis ulang di frontend.
 * Enam jenis pengajuan berbagi satu halaman; menyalin daftar medannya ke sini
 * berarti dua daftar yang harus dijaga tetap sama, dan yang satu pasti
 * tertinggal.
 */
export interface SubmissionType {
  slug: string;
  label: string;
  title_label: string;
  type_label: string;
  types: string[];
  has_more: boolean;
  extra: { field: string; label: string; required: boolean }[];
}

/**
 * Satu pengajuan layanan.
 *
 * Kolom judul dan jenisnya BERBEDA nama antarjenis (`business_name`,
 * `license_name`, `ad_name`, ...), jadi bentuknya dibiarkan terbuka dan
 * dibaca lewat `SubmissionType.title_label` beserta kuncinya dari backend.
 */
export interface SubmissionItem {
  id: number;
  user_id: number;
  description: string;
  submission_status: StatusPengajuan;
  staff_notes: string | null;
  reply_document_path: string | null;
  document_count: number;
  created_at: string;
  user?: { id: number; name: string; email: string; phone: string | null };
  [kolom: string]: unknown;
}

/** Pemohon yang menyertai daftar sisi petugas. */
export interface PemohonRingkas {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

/** Pengajuan slot penerbangan charter. */
export interface SlotSubmission {
  id: number;
  user_id: number;
  aircraft_registration: string;
  aircraft_type: string;
  departure_schedule: string;
  arrival_schedule: string;
  origin_airport: string;
  destination_airport: string;
  flight_type: 'penumpang' | 'kargo' | 'lainnya';
  flight_more: string | null;
  submission_status: StatusPengajuan;
  staff_notes: string | null;
  admin_comments: string | null;
  reply_document_path: string | null;
  document_count: number;
  created_at: string;
  user?: PemohonRingkas;
}

/** Status Extend Advance; satu nilai lebih banyak daripada pengajuan lain. */
export type StatusExtendAdvance = StatusPengajuan | 'Menunggu Dokumen Ditandatangani';

/**
 * Pengajuan Extend Advance.
 *
 * `statement_notes` adalah SALINAN bunyi pernyataan pada saat pengajuan
 * dibuat — bukan bunyi yang berlaku sekarang. Yang mengikat adalah yang
 * benar-benar ditandatangani Pilot In Command.
 */
export interface ExtendAdvanceSubmission {
  id: number;
  user_id: number;
  operator: string;
  aircraft_type: string;
  registration_and_flight_number: string;
  flight_date: string;
  eobt: string;
  aobt: string;
  route: string;
  take_off_alternate: string | null;
  purpose_of_flight: string;
  pic_name: string;
  submission_status: StatusExtendAdvance;
  staff_notes: string | null;
  reply_document_path: string | null;
  statement_notes: string | null;
  has_signed_document: boolean;
  created_at: string;
  user?: PemohonRingkas;
}

export type StatusOjt = 'Mendaftar' | 'Berjalan' | 'Selesai' | 'Batal';

/** Satu komponen penilaian OJT. */
export interface OjtGrade {
  component: string;
  score: number;
}

/**
 * Peserta OJT.
 *
 * `average_score`, `predicate`, dan `letter_grade` DIHITUNG server dari
 * `grades`. Jangan pernah menghitungnya ulang di sini lalu mengirimkannya —
 * backend mengabaikannya, dan dua perhitungan yang berbeda akan menyesatkan
 * pembacanya.
 */
export interface OjtStudent {
  id: number;
  user_id: number;
  name: string;
  id_number: string;
  birth_place: string;
  birth_date: string;
  address: string;
  institution: string;
  major: string;
  duration: string;
  start_date: string;
  end_date: string;
  status: StatusOjt;
  supervisors: string[];
  work_units: string[];
  phone_number: string;
  grades: OjtGrade[] | null;
  average_score: number | null;
  predicate: string | null;
  letter_grade: string | null;
  staff_notes: string | null;
  available_files: string[];
  /** Sudah difinalisasi? Penandanya keberadaan sertifikat bertanda tangan. */
  is_finalized: boolean;
  created_at: string;
  user?: PemohonRingkas;
}

/**
 * Agregat keuangan untuk satu periode atau untuk keseluruhan.
 *
 * `detailed` adalah bagian anggaran yang sudah DIRINCI ke dalam baris
 * pengeluaran — bukan yang sudah terpakai. Portal v1 melabelinya "Realisasi",
 * dan itu keliru: anggaran yang rinciannya belum diketik tampil seolah
 * serapannya rendah. Jangan menamainya ulang jadi "realisasi" di lapisan mana
 * pun; seluruh rantainya sengaja memakai satu kata yang sama.
 */
export interface FinanceTotals {
  income: number;
  budget: number;
  detailed: number;
  undetailed: number;
}

export interface FinancePeriod extends FinanceTotals {
  period: string;
  label: string;
  entries: number;
}

export interface FinanceSource {
  source: string;
  amount: number;
  entries: number;
}

export interface FinanceStats {
  years: number[];
  /** Tahun yang sedang disaring; null berarti seluruh tahun. */
  year: number | null;
  entries: number;
  summary: FinanceTotals;
  series: FinancePeriod[];
  sources: FinanceSource[];
}

/** Satu baris rincian di bawah sebuah anggaran. */
export interface BudgetExpense {
  id: number;
  finance_id: number;
  description: string;
  amount: number;
}

/** Satu catatan keuangan (panel admin). */
export interface Finance {
  id: number;
  date: string;
  flow_type: 'in' | 'budget';
  amount: number;
  source: string | null;
  note: string | null;
  budget_expenses: BudgetExpense[];
  /** Turunan dari $appends backend. */
  expenses_total: number;
  /** null untuk catatan pemasukan — "sisa" tidak berlaku di sana. */
  remaining: number | null;
  is_detailed: boolean;
}

/** Destinasi wisata di sekitar bandara. */
export interface TourismItem {
  id: number;
  name: string;
  slug: string;
  category: string;
  /** Perkiraan jarak darat dari terminal, dalam kilometer. */
  distance_km: number | null;
  /** Perkiraan waktu tempuh sebagai teks bebas, mis. "±15 menit". */
  duration: string | null;
  city: string | null;
  cover_image: string | null;
  /** Lintasan mentah sebagaimana tersimpan; dapat memuat berkas yang hilang. */
  gallery: string[] | null;
  short_desc: string;
  description: string;
  highlights: string[] | null;
  address: string;
  gmaps_url: string | null;
  status: 'published' | 'draft';
  /** Turunan `$appends`. */
  cover_url: string | null;
  has_cover: boolean;
  /** Hanya foto yang benar-benar dapat dibuka, tanpa pengulangan. */
  gallery_urls: string[];
}

/** Pertanyaan yang sering diajukan. */
export interface FaqItem {
  id: number;
  question: string;
  /** HTML dari editor panel admin — render lewat `SafeHtml`, jangan mentah. */
  answer: string;
  category: string;
  service_id: number | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
}

/** Satu baris tarif pada layanan bertarif. */
export interface ServiceRate {
  name: string;
  /** Besaran apa adanya, mis. "Rp. 31.000/m²" — satuannya beragam. */
  price: string;
}

/** Layanan pengajuan bandara, sebagaimana dikirim API. */
export interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  requirements: string[] | null;
  steps: string[] | null;
  has_pricing: boolean;
  pricing_info: ServiceRate[] | null;
  /** Lintasan dasbor pemohon; masih bergaya v1 sampai modul pengajuan pindah. */
  submission_url: string | null;
  is_active: boolean;
}

/** Baris pengguna pada panel manajemen akun. */
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
  is_accepted: boolean;
  created_at?: string;
}

export type FlightStatus =
  | 'scheduled'
  | 'check_in'
  | 'boarding'
  | 'departed'
  | 'delayed'
  | 'landed'
  | 'cancelled';

export interface Flight {
  id: number;
  flight_number: string;
  airline: string;
  /**
   * URL logo. Menunjuk ke proksi backend (`/airlines/logo/…`), bukan langsung
   * ke server FIDS — host FIDS hanya HTTP dan akan diblokir sebagai mixed
   * content saat portal berjalan di HTTPS.
   */
  airline_logo?: string | null;
  /** Kode maskapai dari FIDS, mis. "SAQ". Dipakai lencana cadangan. */
  airline_code?: string | null;
  /** Warna merek maskapai dari FIDS, mis. "#1fb253". Sudah divalidasi heks. */
  airline_color?: string | null;
  origin: string;
  destination: string;
  /** Kota & provinsi bandara asal, mis. "Berau, Kalimantan Timur". */
  origin_city?: string | null;
  destination_city?: string | null;
  /** Tanggal penerbangan dari FIDS (YYYY-MM-DD). */
  flight_date?: string | null;
  scheduled_time: string;
  /** Hanya terisi bila FIDS benar-benar mengirim estimasi tersendiri. */
  estimated_time?: string | null;
  terminal: string;
  /** `null` berarti gate belum ditentukan — jangan tampilkan angka karangan. */
  gate?: string | null;
  /** Nomor ban bagasi, khusus kedatangan. */
  baggage_belt?: number | null;
  /** Nomor konter check-in, khusus keberangkatan. */
  checkin_counters?: number[];
  flight_type: 'departure' | 'arrival';
  status: FlightStatus;
  /** Teks remark asli dari FIDS, mis. "Departured On-Time". */
  remarks?: string | null;
  /** Alasan keterlambatan bila diisi petugas. */
  delay_reason?: string | null;
  /** Catatan bebas dari petugas FIDS. */
  note?: string | null;
  aircraft_type?: string | null;
  airline_phone?: string | null;
  airline_email?: string | null;
  /** Penerbangan tambahan / di luar jadwal reguler. */
  is_extra?: boolean;
  /** Kapan status terakhir diperbarui di FIDS (ISO 8601). */
  updated_at?: string | null;
}

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  thumbnail?: string;
  author: string;
  views_count: number;
  is_featured: boolean;
  status?: 'draft' | 'published';
  published_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_active: boolean;
  target_audience: string;
}

/**
 * Standar Pelayanan, Maklumat Pelayanan, dan Survei Kepuasan Masyarakat.
 *
 * `has_document` false berarti dokumennya belum terbit. Tampilan wajib
 * mengatakannya apa adanya, bukan memasang tombol yang berujung 404.
 */
export interface ServiceStandard {
  id: number;
  type: string;
  title: string;
  document_number: string | null;
  description: string | null;
  published_date: string;
  is_active: boolean;
  /** Turunan `$appends`; menyatukan berkas unggahan dan tautan luar. */
  document_url: string | null;
  has_document: boolean;
}

/** Tautan ke portal resmi pemerintah di luar aptpairport.id. */
export interface ExternalLink {
  id: number;
  name: string;
  url: string;
  description: string | null;
  /** Kelas Bootstrap Icons warisan v1, mis. "bi-megaphone-fill". */
  icon: string | null;
  logo_path: string | null;
  /** Turunan `$appends`; null bila berkas logonya tidak ada. */
  logo_url: string | null;
  group: string;
  sort_order: number;
  is_active: boolean;
}

/** Informasi Berkala — dokumen yang wajib diumumkan rutin. */
export interface PeriodicDocument {
  id: number;
  category: string;
  title: string;
  document_path: string;
  published_date: string;
  /** Hanya terisi pada dokumen LHKPN, yang diumumkan per pejabat. */
  pejabat_name: string | null;
}

/** Informasi Setiap Saat — dokumen yang tersedia kapan pun diminta. */
export interface EvergreenInformation {
  id: number;
  title: string;
  category: string;
  published_date: string;
  document_link: string;
}

/**
 * Informasi Serta-Merta — peringatan keselamatan yang disiarkan tanpa diminta.
 * Kolomnya berbahasa Indonesia mengikuti tabel warisan v1.
 */
export interface ImmediateInformation {
  id: number;
  uraian: string;
  keterangan: string;
  link_url: string;
  link_text: string;
}

/** Laporan tahunan penyelenggaraan PPID. */
export interface InformationServiceReport {
  id: number;
  title: string;
  publication_year: number;
  document_link: string;
}

/** Peraturan dasar hukum PPID. Dokumennya selalu tautan luar, bukan unggahan. */
export interface PpidRegulation {
  id: number;
  category: string;
  title: string;
  document_link: string;
  published_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Facility {
  id: number;
  name: string;
  category: string;
  location_description: string;
  icon?: string;
  description?: string;
  /** Butir keterangan warisan portal v1, mis. ["Tersedia: 16 Counter", ...]. */
  details?: string[] | null;
  image_path?: string | null;
  /** Turunan `$appends`; null bila berkas gambarnya tidak ada. */
  image_url?: string | null;
  is_operational: boolean;
}

export interface Tenant {
  id: number;
  name: string;
  category: 'food_beverage' | 'retail' | 'lounge' | 'transportation' | 'services';
  location: string;
  operating_hours: string;
  contact_phone?: string;
  image?: string;
  description?: string;
}

export type ComplaintStatus = 'submitted' | 'in_progress' | 'resolved' | 'rejected';

/** Bentuk penuh — hanya dikembalikan endpoint admin. */
export interface Complaint {
  id: number;
  ticket_number: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  category: string;
  subject: string;
  description: string;
  /** Lintasan berkas mentah; pakai `attachment_url` untuk menampilkannya. */
  attachment?: string | null;
  /** `$appends` dari backend; null bila berkasnya tidak ada di cakram. */
  attachment_url?: string | null;
  status: ComplaintStatus;
  admin_response?: string | null;
  responded_at?: string | null;
  created_at: string;
}

/**
 * Bentuk pelacakan publik — SENGAJA tanpa identitas pelapor.
 *
 * Nomor tiket dapat ditebak, jadi `Complaint::publicView()` di backend tidak
 * pernah mengirim nama, surel, maupun telepon. Tipe ini mencerminkan itu;
 * jangan menambahkan medan identitas ke sini.
 */
export interface ComplaintTracking {
  ticket_number: string;
  category: string;
  subject: string;
  status: ComplaintStatus;
  submitted_at: string;
  admin_response?: string | null;
  responded_at?: string | null;
  attachment_url?: string | null;
}

/**
 * Permohonan Informasi Publik (UU 14/2008).
 *
 * `ktp_path` dan `statement_path` sengaja TIDAK ada di sini: keduanya
 * disembunyikan model backend supaya lokasi scan KTP pemohon tidak pernah
 * ikut terkirim. Berkasnya diambil lewat `adminDownload`.
 */
export interface InformationRequest {
  id: number;
  ticket_number: string;
  request_from: string;
  name: string;
  address: string;
  occupation: string;
  npwp: string;
  phone: string;
  email: string;
  information_details: string;
  information_purpose: string;
  obtain_method: string;
  copy_method: string;
  status: 'submitted' | 'in_progress' | 'fulfilled' | 'rejected';
  admin_response?: string | null;
  response_link?: string | null;
  responded_at?: string | null;
  /** Batas jawaban PPID: 10 hari kerja, dapat diperpanjang 7 hari kerja. */
  due_date?: string | null;
  is_extended: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  category: string;
  file_type: string;
  file_size: string;
  file_url: string;
  download_count: number;
}

/**
 * Surat resmi pada menu Regulasi.
 *
 * `file_url` bernilai null bila berkasnya tidak ada di cakram — daftar publik
 * sudah menyaringnya, tetapi daftar admin sengaja tetap memuatnya agar
 * petugas melihat surat mana yang berkasnya hilang.
 */
export interface Letter {
  id: number;
  type: 'keputusan' | 'edaran';
  number: string;
  title: string;
  issue_date: string;
  file_path: string;
  file_url: string | null;
  has_file: boolean;
}

export interface ChatMessage {
  id: number;
  chat_thread_id: number;
  sender_type: 'visitor' | 'admin';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type ChatStatus = 'open' | 'active' | 'resolved' | 'closed';

/**
 * Percakapan bantuan.
 *
 * `visitor_email` dan `visitor_phone` HANYA terisi pada respons admin —
 * `ChatThread::publicView()` di backend sengaja tidak mengirimkannya kepada
 * pengunjung, karena nomor tiket dapat ditebak. Jangan menampilkan kedua
 * medan itu di halaman publik; nilainya memang akan selalu kosong di sana.
 */
export interface ChatThread {
  id: number;
  ticket_number: string;
  visitor_name: string;
  visitor_email?: string | null;
  visitor_phone?: string | null;
  category: string;
  subject: string;
  status: ChatStatus;
  last_activity_at: string;
  created_at: string;
  messages?: ChatMessage[];
  /** Penanda respons polling delta: `messages` hanya berisi pesan baru. */
  is_delta?: boolean;
  /** Hanya pada daftar admin. */
  unread_count?: number;
  message_count?: number;
  last_message?: ChatMessage | null;
}

/** Penilaian kepuasan atas satu tiket yang penanganannya sudah selesai. */
export interface RatingSummary {
  /** null bila belum ada penilaian sama sekali — bukan nol bintang. */
  average: number | null;
  total: number;
  distribution: { score: number; total: number }[];
  latest_comments: {
    ticket_number: string;
    channel: 'chat' | 'complaint';
    score: number;
    comment: string;
    created_at: string;
  }[];
}


/* ---------------- Aplikasi internal pegawai ---------------- */

export type StatusAset = 'Baik' | 'Pemeliharaan';

/** Satu perpindahan status aset; riwayat sekali-tulis. */
export interface InventoryStatusLog {
  id: number;
  previous_status: StatusAset | null;
  new_status: StatusAset;
  notes: string | null;
  created_at: string;
  user?: { id: number; name: string };
}

/** Satu catatan jurnal pemeliharaan. */
export interface InventoryLogbook {
  id: number;
  inventory_id: number;
  log_date: string;
  schedule_time: string | null;
  notes: string;
  documentation_urls: string[];
  created_at: string;
  user?: { id: number; name: string };
}

export interface Inventory {
  id: number;
  name: string;
  status: StatusAset;
  category: string;
  input_date: string;
  photo_url: string | null;
  maintenance_report_link: string | null;
  status_logs?: InventoryStatusLog[];
  logbooks?: InventoryLogbook[];
}

export interface SparePart {
  id: number;
  name: string;
  stock: number;
  photo_url: string | null;
  requests?: SparePartRequest[];
}

/**
 * Permintaan suku cadang.
 *
 * Tabel v1 tidak punya kolom jumlah maupun status, jadi permintaan di sini
 * murni pencatatan — ia TIDAK mengurangi stok. Lihat SparePartRequest di
 * backend untuk konsekuensinya.
 */
export interface SparePartRequest {
  id: number;
  user_id: number;
  spare_part_id: number;
  subject: string;
  follow_up_notes: string | null;
  memo_link: string | null;
  created_at: string;
  user?: { id: number; name: string };
  spare_part?: { id: number; name: string; stock: number };
}

/* ---------------- Persuratan ---------------- */

export type StatusSurat =
  | 'Verifikasi Tambahan'
  | 'Menunggu Persetujuan Atasan'
  | 'Disetujui'
  | 'Ditolak'
  | 'Revisi Diperlukan';

export interface PenggunaRingkas { id: number; name: string }

export interface SuratVerification {
  id: number;
  user_id: number;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  order: number;
  comments: string | null;
  user?: PenggunaRingkas;
}

export interface SuratRevision {
  id: number;
  user_id: number;
  comments: string;
  previous_status: string;
  created_at: string;
  user?: PenggunaRingkas;
}

/** Satu langkah pada jejak audit surat; sekali-tulis. */
export interface SuratEvent {
  id: number;
  actor_user_id: number | null;
  event_type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  actor?: PenggunaRingkas;
}

/**
 * Surat dinas.
 *
 * `assigned_to_user_id` adalah penunjuk giliran — satu-satunya penentu siapa
 * yang boleh menggerakkan surat ini sekarang.
 */
export interface Persuratan {
  id: number;
  user_id: number;
  assigned_to_user_id: number | null;
  letter_type: string;
  letter_date: string;
  recipient_address: string;
  subject: string;
  final_approver_id: number;
  collaborators: number[] | null;
  attachments: string[] | null;
  status: StatusSurat;
  signed_document_link: string | null;
  created_at: string;
  verifications_count?: number;
  user?: PenggunaRingkas;
  assignee?: PenggunaRingkas;
  final_approver?: PenggunaRingkas;
  verifications?: SuratVerification[];
  revisions?: SuratRevision[];
  events?: SuratEvent[];
}

/* ---------------- Absensi rapat ---------------- */

/** Keterangan rapat yang dibaca peserta dari tautan bertoken. */
export interface AbsensiInfo {
  title: string;
  date: string | null;
  start_time: string | null;
  location: string;
  organizer: string;
  is_active: boolean;
}

/**
 * Satu peserta pada daftar hadir.
 *
 * `signature` (lintasan berkasnya) TIDAK pernah keluar dari API — yang ada
 * hanya `has_signature`, dan gambarnya diambil lewat endpoint bertoken.
 */
export interface Attendance {
  id: number;
  meeting_id: number;
  name: string;
  department: string;
  phone: string | null;
  has_signature: boolean;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  slug: string;
  date: string;
  start_time: string;
  location: string;
  organizer: string;
  organizer_nip: string | null;
  is_active: boolean;
  attendances_count?: number;
  attendances?: Attendance[];
}
