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

export interface Facility {
  id: number;
  name: string;
  category: string;
  location_description: string;
  icon?: string;
  description?: string;
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

