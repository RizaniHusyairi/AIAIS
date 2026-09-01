/**
 * Klien lonceng panel dan langganan notifikasi push.
 *
 * Seluruh permintaannya lewat `adminFetch`, jadi token dan penanganan sesi
 * berakhir mengikuti aturan panel yang sudah ada.
 */

import {
  Bell, FileText, MessageCircle, MessageSquareWarning, PackageSearch, ScrollText, Star,
} from 'lucide-react';

import { adminFetch } from '@/lib/adminApi';

export type JenisNotifikasi =
  | 'pengaduan' | 'chat' | 'kehilangan' | 'informasi' | 'penilaian' | 'pengajuan';

export interface ItemNotifikasi {
  id: string;
  jenis: JenisNotifikasi | null;
  judul: string;
  ticket: string | null;
  path: string;
  dibaca: boolean;
  created_at: string;
}

/**
 * Ikon dan warna per jenis.
 *
 * Tinggal di sini, bukan di dalam salah satu komponen, karena lonceng pada
 * kepala panel dan kotak masuk di `/admin/notifikasi` harus menampilkan jenis
 * yang sama dengan rupa yang sama. Menggandakannya berarti dua daftar yang
 * harus diingat bersamaan tiap kali `AktivitasPusatBantuan::JENIS` bertambah —
 * dan `pengajuan` sempat luput justru karena itu.
 */
export const RUPA: Record<JenisNotifikasi, { icon: typeof Bell; warna: string }> = {
  pengaduan: { icon: MessageSquareWarning, warna: '#fb7185' },
  chat: { icon: MessageCircle, warna: '#38bdf8' },
  kehilangan: { icon: PackageSearch, warna: '#fbbf24' },
  informasi: { icon: ScrollText, warna: '#a78bfa' },
  penilaian: { icon: Star, warna: '#34d399' },
  pengajuan: { icon: FileText, warna: '#f472b6' },
};

/** Rupa satu jenis, termasuk saat jenisnya tidak dikenali. */
export function rupaJenis(jenis: JenisNotifikasi | null) {
  return (jenis && RUPA[jenis]) || { icon: Bell, warna: '#64748b' };
}

/** Waktu relatif ringkas; dipakai lonceng maupun kotak masuk. */
export function waktuRelatif(iso: string): string {
  const detik = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export interface RekapNotifikasi {
  total: number;
  belum_dibaca: number;
  hari_ini: number;
  per_jenis: Record<string, number>;
}

export interface SaringNotifikasi {
  jenis?: JenisNotifikasi | '';
  status?: 'belum' | 'sudah' | '';
  q?: string;
  page?: number;
  per_page?: number;
}

export interface HasilNotifikasi {
  items: ItemNotifikasi[];
  belum_dibaca: number;
  rekap: RekapNotifikasi;
  jenis_tersedia: { kunci: JenisNotifikasi; judul: string }[];
  halaman: { saat_ini: number; terakhir: number; total: number };
}

export interface StatusNotifikasi {
  whatsapp: {
    enabled: boolean;
    siap: boolean;
    jumlah_tujuan: number;
    kuota_harian: number;
    terpakai_hari_ini: number;
    /**
     * Setelan gateway yang sedang berlaku di server.
     *
     * `kunci_awalan` hanya bagian `wag_xxxx` sebelum titik — cukup untuk
     * mencocokkan kunci mana yang terpasang, dan bagian rahasianya memang tidak
     * pernah meninggalkan server.
     */
    gateway: {
      endpoint: string;
      host: string | null;
      auth_header: string;
      format: string;
      field_target: string;
      field_message: string;
      device_id: string | number | null;
      kunci_terpasang: boolean;
      kunci_awalan: string | null;
    };
  };
  push: {
    enabled: boolean;
    siap: boolean;
    public_key: string | null;
    perangkat_saya: number;
  };
  penerima: number;
}

/**
 * Ambil riwayat notifikasi.
 *
 * Seluruh saringannya opsional: dipanggil tanpa argumen — seperti yang
 * dilakukan lonceng — hasilnya tetap 30 terbaru, sama seperti sebelum
 * penyaringan ada.
 */
export const ambilNotifikasi = (saring: SaringNotifikasi = {}) => {
  const kueri = new URLSearchParams();

  // Nilai kosong sengaja tidak ikut dikirim; chip "Semua" adalah ketiadaan
  // penyaring, bukan penyaring bernilai kosong yang harus ditolak validasi.
  if (saring.jenis) kueri.set('jenis', saring.jenis);
  if (saring.status) kueri.set('status', saring.status);
  if (saring.q?.trim()) kueri.set('q', saring.q.trim());
  if (saring.page && saring.page > 1) kueri.set('page', String(saring.page));
  if (saring.per_page) kueri.set('per_page', String(saring.per_page));

  const tanya = kueri.toString();

  return adminFetch<HasilNotifikasi>(`/notifications${tanya ? `?${tanya}` : ''}`);
};

export const statusNotifikasi = () =>
  adminFetch<StatusNotifikasi>('/notifications/status');

export const tandaiDibaca = (id: string) =>
  adminFetch(`/notifications/${id}/read`, { method: 'PUT' });

export const tandaiSemuaDibaca = () =>
  adminFetch('/notifications/read-all', { method: 'PUT' });

export const hapusNotifikasi = (id: string) =>
  adminFetch(`/notifications/${id}`, { method: 'DELETE' });

export const kirimNotifikasiUji = () =>
  adminFetch('/notifications/test', { method: 'POST' });

/* ------------------------------------------------------------------ */
/*  Push                                                               */
/* ------------------------------------------------------------------ */

/** Apakah peramban ini sanggup menerima push sama sekali. */
export function pushDidukung(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/**
 * Kunci VAPID datang sebagai base64url; `applicationServerKey` menuntut
 * `Uint8Array`. Tanpa penyandian ulang ini, `subscribe()` menolak dengan pesan
 * yang tidak menyebut sebabnya sama sekali.
 */
function kunciKeBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const mentah = atob(padded);
  // Mengembalikan `ArrayBuffer`, bukan `Uint8Array`: sejak TypeScript 5.7
  // `Uint8Array` bergenerik atas jenis bufernya, dan `applicationServerKey`
  // menuntut buffer yang pasti bukan `SharedArrayBuffer`.
  const buf = new ArrayBuffer(mentah.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < mentah.length; i++) arr[i] = mentah.charCodeAt(i);
  return buf;
}

/** Langganan yang sedang aktif di perangkat ini, bila ada. */
export async function langgananSaatIni(): Promise<PushSubscription | null> {
  if (!pushDidukung()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/**
 * Nyalakan push di perangkat ini.
 *
 * WAJIB dipanggil dari penangan klik. Peramban menolak permintaan izin
 * notifikasi yang tidak berasal dari tindakan pemakai — dan menolaknya
 * diam-diam, tanpa dialog apa pun.
 */
export async function nyalakanPush(publicKey: string): Promise<{ ok: boolean; message: string }> {
  if (!pushDidukung()) {
    return { ok: false, message: 'Peramban ini tidak mendukung notifikasi push.' };
  }

  const izin = await Notification.requestPermission();
  if (izin !== 'granted') {
    return {
      ok: false,
      message: izin === 'denied'
        ? 'Izin notifikasi ditolak. Nyalakan kembali lewat pengaturan situs pada peramban.'
        : 'Izin notifikasi belum diberikan.',
    };
  }

  const reg = await navigator.serviceWorker.ready;

  const lama = await reg.pushManager.getSubscription();
  const sub = lama ?? await reg.pushManager.subscribe({
    // Wajib true: peramban modern menolak langganan yang tidak menjanjikan
    // bahwa tiap kiriman benar-benar ditampilkan kepada pemakai.
    userVisibleOnly: true,
    applicationServerKey: kunciKeBytes(publicKey),
  });

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

  const res = await adminFetch('/push/subscribe', {
    method: 'POST',
    body: {
      endpoint: json.endpoint,
      keys: json.keys,
      device: navigator.userAgent.slice(0, 150),
    },
  });

  return { ok: res.ok, message: res.message };
}

export async function matikanPush(): Promise<{ ok: boolean; message: string }> {
  const sub = await langgananSaatIni();
  if (!sub) return { ok: true, message: 'Notifikasi di perangkat ini memang belum menyala.' };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const res = await adminFetch('/push/unsubscribe', { method: 'DELETE', body: { endpoint } });

  return { ok: res.ok, message: res.message };
}
