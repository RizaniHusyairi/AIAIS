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

export interface Complaint {
  id: number;
  ticket_number: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  category: string;
  subject: string;
  description: string;
  status: 'submitted' | 'in_progress' | 'resolved' | 'rejected';
  admin_response?: string;
  responded_at?: string;
  created_at: string;
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

export interface ChatMessage {
  id: number;
  chat_thread_id: number;
  sender_type: 'visitor' | 'admin';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatThread {
  id: number;
  ticket_number: string;
  visitor_name: string;
  visitor_email?: string | null;
  visitor_phone?: string | null;
  category: string;
  subject: string;
  status: 'open' | 'active' | 'resolved' | 'closed';
  last_activity_at: string;
  created_at: string;
  messages?: ChatMessage[];
}

