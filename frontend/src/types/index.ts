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
  airline_logo?: string;
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

export interface DocumentItem {
  id: number;
  title: string;
  category: string;
  file_type: string;
  file_size: string;
  file_url: string;
  download_count: number;
}
