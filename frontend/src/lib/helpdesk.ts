'use client';

/**
 * Pusat Bantuan — seluruh pemanggilan API dan aturan bersamanya.
 *
 * Dipisahkan dari komponen karena fitur ini punya DUA kulit: halaman web
 * (`app/complaints`) dan layar PWA (`app/app/layanan/chat`). Menyalin logika
 * ke keduanya berarti keduanya akan menyimpang diam-diam; di sini alurnya
 * satu, yang berbeda hanya tampilannya.
 */

import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import type { ChatThread, ChatMessage, ComplaintTracking, LostReportTracking } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tetapan bersama                                                    */
/* ------------------------------------------------------------------ */

/** Selaras dengan `Complaint::CATEGORIES` di backend — validasi menolak selainnya. */
export const HELP_CATEGORIES = [
  'Informasi Penerbangan',
  'Fasilitas & Kebersihan',
  'Kritik & Saran',
  'Parkir & Transportasi',
  'Kargo & EMPU',
  'Keamanan & Keselamatan',
  'Apresiasi',
  'Lainnya',
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

/** Kunci penyimpanan tiket chat aktif; dipakai pula oleh tombol mengambang. */
export const TICKET_KEY = 'active_chat_ticket';

/** Jam operasi layanan bantuan, mengikuti jam operasi bandara (WITA). */
export const SERVICE_HOURS = { start: 7, end: 20 } as const;

/**
 * Apakah petugas sedang bertugas, dihitung dari waktu Samarinda.
 *
 * Sebelumnya halaman ini memajang lencana "Online 07.00–20.00 WITA" yang
 * hardcode — tetap hijau pada pukul tiga pagi. Pengunjung yang menulis saat
 * itu mengira ada yang menjawab seketika.
 */
export function isWithinServiceHours(now: Date = new Date()): boolean {
  const jam = Number(
    now.toLocaleString('en-US', { timeZone: 'Asia/Makassar', hour: '2-digit', hour12: false }),
  );
  return jam >= SERVICE_HOURS.start && jam < SERVICE_HOURS.end;
}

/** Versi reaktif; menilai ulang tiap menit agar lencana berubah sendiri. */
export function useServiceHours(): boolean {
  const [buka, setBuka] = useState(true);

  useEffect(() => {
    const nilai = () => setBuka(isWithinServiceHours());
    nilai();
    const t = setInterval(nilai, 60_000);
    return () => clearInterval(t);
  }, []);

  return buka;
}

/** Jenis tiket ditentukan awalannya, supaya pengunjung tak perlu mengingatnya. */
export type TicketKind = 'chat' | 'complaint' | 'information' | 'lost' | 'unknown';

export function ticketKind(ticket: string): TicketKind {
  const t = ticket.trim().toUpperCase();
  if (t.startsWith('CHAT-')) return 'chat';
  if (t.startsWith('TKT-')) return 'complaint';
  if (t.startsWith('PIP-')) return 'information';
  if (t.startsWith('HLG-')) return 'lost';
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/*  Pemanggilan API                                                    */
/* ------------------------------------------------------------------ */

export type Hasil<T> = { ok: boolean; data: T | null; message: string };

const GAGAL_HUBUNG = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';

/**
 * Pembungkus fetch untuk endpoint publik Pusat Bantuan.
 *
 * `fetchApi` di lib/api.ts menelan galat dan punya jalur cadangan FIDS yang
 * tidak relevan di sini; formulir bantuan justru WAJIB tahu pesan galat
 * validasi dari backend supaya dapat menampilkannya per medan.
 */
async function panggil<T>(path: string, init?: RequestInit): Promise<Hasil<T> & { errors?: Record<string, string[]> }> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', ...init });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.success !== false) {
      return { ok: true, data: (json?.data ?? null) as T, message: json?.message ?? 'Berhasil' };
    }

    return {
      ok: false,
      data: null,
      message: json?.message ?? (res.status === 429
        ? 'Terlalu banyak permintaan. Coba lagi beberapa saat.'
        : 'Permintaan gagal.'),
      errors: json?.errors && typeof json.errors === 'object' ? json.errors : undefined,
    };
  } catch {
    return { ok: false, data: null, message: GAGAL_HUBUNG };
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

/* ---------- chat ---------- */

export type StartChatInput = {
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  category: string;
  subject: string;
  message: string;
};

export function startChat(input: StartChatInput) {
  return panggil<ChatThread>('/chat/start', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/**
 * Ambil percakapan. `since` membuat server hanya mengirim pesan yang lebih
 * baru — halaman menjaring ulang tiap beberapa detik, dan tanpa ini setiap
 * denyut menarik seluruh percakapan dari awal.
 */
export function getChat(ticket: string, since?: number) {
  const q = typeof since === 'number' ? `?since=${since}` : '';
  return panggil<ChatThread>(`/chat/${encodeURIComponent(ticket)}${q}`, { headers: JSON_HEADERS });
}

export function sendChatMessage(ticket: string, message: string) {
  return panggil<ChatThread>(`/chat/${encodeURIComponent(ticket)}/message`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ message }),
  });
}

/* ---------- pengaduan ---------- */

export type ComplaintInput = {
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  category: string;
  subject: string;
  description: string;
  attachment?: File | null;
};

/**
 * Kirim pengaduan formal.
 *
 * Selalu multipart, juga ketika tanpa lampiran — satu jalur kirim lebih
 * mudah dijaga daripada bercabang JSON/multipart menurut ada tidaknya berkas.
 * `Content-Type` sengaja tidak diisi: peramban yang menentukannya berikut
 * `boundary`, dan mengisinya manual membuat Laravel gagal mengurainya.
 */
export function submitComplaint(input: ComplaintInput) {
  const body = new FormData();
  body.append('reporter_name', input.reporter_name);
  body.append('reporter_email', input.reporter_email);
  body.append('reporter_phone', input.reporter_phone);
  body.append('category', input.category);
  body.append('subject', input.subject);
  body.append('description', input.description);
  if (input.attachment) body.append('attachment', input.attachment);

  return panggil<{ ticket_number: string; status: string; created_at: string }>('/complaints', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
}

export function trackComplaint(ticket: string) {
  return panggil<ComplaintTracking>(`/complaints/track/${encodeURIComponent(ticket)}`, {
    headers: JSON_HEADERS,
  });
}

export function trackInformationRequest(ticket: string) {
  return panggil<Record<string, unknown>>(
    `/information-requests/track/${encodeURIComponent(ticket)}`,
    { headers: JSON_HEADERS },
  );
}

/* ---------- lapor kehilangan barang ---------- */

export type LostReportInput = {
  reporter_name: string;
  reporter_phone: string;
  reporter_email?: string;
  category: string;
  item_description: string;
  lost_area: string;
  /** Format `YYYY-MM-DDTHH:mm` dari <input type="datetime-local">. */
  lost_at: string;
  flight_number?: string;
  photo?: File | null;
};

/**
 * `YYYY-MM-DDTHH:mm` (waktu lokal peramban) → ISO 8601 dalam UTC.
 *
 * WAJIB dipakai sebelum mengirim nilai `datetime-local` ke backend.
 * `<input type="datetime-local">` menghasilkan teks TANPA zona waktu, dan
 * Laravel membacanya sebagai UTC karena `APP_TIMEZONE=UTC`. Pelapor di
 * Samarinda yang memilih pukul 09.15 karenanya tersimpan sebagai 09.15 UTC —
 * yakni 17.15 WITA, delapan jam meleset — dan waktu yang jelas sudah lewat
 * ditolak validasi sebagai "di masa depan".
 *
 * `new Date(nilai)` menafsirkan teks tanpa zona itu sebagai waktu LOKAL, lalu
 * `toISOString()` mengubahnya menjadi instan UTC yang benar.
 *
 * Ini keluarga kekeliruan yang sama dengan cetakan PDF yang pernah menuliskan
 * jam UTC di dokumen berlabel WITA — hanya arahnya terbalik.
 */
function keInstanUtc(nilaiLokal: string): string {
  if (!nilaiLokal) return '';
  const d = new Date(nilaiLokal);
  return Number.isNaN(d.getTime()) ? nilaiLokal : d.toISOString();
}

/**
 * Kirim laporan kehilangan barang.
 *
 * Selalu multipart dengan alasan yang sama seperti `submitComplaint`: satu
 * jalur kirim lebih mudah dijaga daripada bercabang menurut ada tidaknya foto,
 * dan `Content-Type` sengaja tidak diisi supaya peramban menentukan
 * `boundary`-nya sendiri.
 */
export function submitLostReport(input: LostReportInput) {
  const body = new FormData();
  body.append('reporter_name', input.reporter_name);
  body.append('reporter_phone', input.reporter_phone);
  if (input.reporter_email) body.append('reporter_email', input.reporter_email);
  body.append('category', input.category);
  body.append('item_description', input.item_description);
  body.append('lost_area', input.lost_area);
  body.append('lost_at', keInstanUtc(input.lost_at));
  if (input.flight_number) body.append('flight_number', input.flight_number);
  if (input.photo) body.append('photo', input.photo);

  return panggil<{ ticket_number: string; status: string; created_at: string }>('/lost-reports', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
}

/**
 * Lacak laporan kehilangan.
 *
 * Balasannya sengaja tidak memuat data pribadi pelapor maupun rincian barang
 * temuan yang tercocokkan — lihat `LostReport::publicView()` di backend. Yang
 * disampaikan kepada pelapor ditulis petugas sendiri di `admin_note`.
 */
export function trackLostReport(ticket: string) {
  return panggil<LostReportTracking>(`/lost-reports/track/${encodeURIComponent(ticket)}`, {
    headers: JSON_HEADERS,
  });
}

/* ---------- penilaian ---------- */

export function submitRating(ticket_number: string, score: number, comment?: string) {
  return panggil<{ score: number }>('/ratings', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ticket_number, score, comment: comment || null }),
  });
}

/** Tiket yang sudah dinilai, supaya panel penilaian tidak muncul lagi. */
const RATED_KEY = 'aiais_rated_tickets';

export function isRated(ticket: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (JSON.parse(localStorage.getItem(RATED_KEY) ?? '[]') as string[]).includes(ticket);
  } catch {
    return false;
  }
}

export function markRated(ticket: string): void {
  if (typeof window === 'undefined') return;
  try {
    const daftar = JSON.parse(localStorage.getItem(RATED_KEY) ?? '[]') as string[];
    if (!daftar.includes(ticket)) {
      localStorage.setItem(RATED_KEY, JSON.stringify([...daftar, ticket]));
    }
  } catch {
    /* penyimpanan terkunci di mode privat — server tetap menolak nilai ganda */
  }
}

/* ------------------------------------------------------------------ */
/*  Sesi chat berjalan                                                 */
/* ------------------------------------------------------------------ */

export function savedTicket(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TICKET_KEY);
  } catch {
    return null;
  }
}

export function saveTicket(ticket: string): void {
  try {
    localStorage.setItem(TICKET_KEY, ticket);
    // Beri tahu tombol mengambang di pohon komponen lain pada tab yang sama;
    // event `storage` bawaan peramban hanya menyala di tab LAIN.
    window.dispatchEvent(new CustomEvent('aiais:chat-ticket'));
  } catch {
    /* diabaikan */
  }
}

export function clearTicket(): void {
  try {
    localStorage.removeItem(TICKET_KEY);
    window.dispatchEvent(new CustomEvent('aiais:chat-ticket'));
  } catch {
    /* diabaikan */
  }
}

/**
 * Kaitan percakapan langsung: memuat sekali penuh, lalu menjaring pesan baru
 * saja setiap `intervalMs`. Dipakai bersama oleh halaman web dan layar PWA.
 */
export function useChatThread(ticket: string | null, intervalMs = 5000) {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Id pesan terakhir yang sudah dimiliki. Disimpan pada ref, bukan variabel
   * efek, karena pengiriman pesan menyisipkan pesan di luar efek dan HARUS
   * ikut memajukan penanda ini — kalau tidak, denyut berikutnya menarik
   * kembali pesan yang sama dan gelembungnya tampil dua kali.
   */
  const lastId = useRef(0);

  /** Satu-satunya jalur penambahan pesan, supaya dedup dan penanda selalu seiring. */
  const gabung = (masuk: ChatMessage[]) => {
    if (!masuk.length) return;
    setMessages((prev) => {
      const ada = new Set(prev.map((m) => m.id));
      const baru = masuk.filter((m) => !ada.has(m.id));
      if (!baru.length) return prev;
      lastId.current = Math.max(lastId.current, ...baru.map((m) => m.id));
      return [...prev, ...baru];
    });
  };

  useEffect(() => {
    if (!ticket) {
      setThread(null);
      setMessages([]);
      setError('');
      lastId.current = 0;
      return;
    }

    let hidup = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const muatPenuh = async () => {
      setLoading(true);
      const res = await getChat(ticket);
      if (!hidup) return;
      setLoading(false);

      if (!res.ok || !res.data) {
        setError(res.message);
        return;
      }

      const list = res.data.messages ?? [];
      setError('');
      setThread(res.data);
      setMessages(list);
      lastId.current = list.length ? list[list.length - 1].id : 0;

      timer = setInterval(async () => {
        const delta = await getChat(ticket, lastId.current);
        if (!hidup || !delta.ok || !delta.data) return;

        const segar = delta.data;
        setThread((prev) => (prev ? { ...prev, status: segar.status } : segar));
        gabung(segar.messages ?? []);
      }, intervalMs);
    };

    muatPenuh();

    return () => {
      hidup = false;
      if (timer) clearInterval(timer);
    };
  }, [ticket, intervalMs]);

  return { thread, messages, loading, error, appendLocal: gabung, setThread };
}
