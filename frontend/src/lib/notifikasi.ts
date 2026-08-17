/**
 * Klien lonceng panel dan langganan notifikasi push.
 *
 * Seluruh permintaannya lewat `adminFetch`, jadi token dan penanganan sesi
 * berakhir mengikuti aturan panel yang sudah ada.
 */

import { adminFetch } from '@/lib/adminApi';

export type JenisNotifikasi =
  | 'pengaduan' | 'chat' | 'kehilangan' | 'informasi' | 'penilaian';

export interface ItemNotifikasi {
  id: string;
  jenis: JenisNotifikasi | null;
  judul: string;
  ticket: string | null;
  path: string;
  dibaca: boolean;
  created_at: string;
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

export const ambilNotifikasi = () =>
  adminFetch<{ items: ItemNotifikasi[]; belum_dibaca: number }>('/notifications');

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
