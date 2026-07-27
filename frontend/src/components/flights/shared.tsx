'use client';

import React, { useEffect, useState } from 'react';
import { Flight } from '@/types';

/* ------------------------------------------------------------------ */
/*  Identitas maskapai                                                 */
/* ------------------------------------------------------------------ */

/** Petakan nama maskapai -> kode pendek + warna khas untuk lencana logo. */
export function airlineStyle(name: string): { code: string; color: string } {
  const n = (name || '').toLowerCase();
  if (n.includes('garuda')) return { code: 'GA', color: '#0e7490' };
  if (n.includes('lion')) return { code: 'JT', color: '#dc2626' };
  if (n.includes('citilink')) return { code: 'QG', color: '#16a34a' };
  if (n.includes('sriwijaya')) return { code: 'SJ', color: '#ea580c' };
  if (n.includes('batik')) return { code: 'ID', color: '#2563eb' };
  if (n.includes('wings')) return { code: 'IW', color: '#059669' };
  if (n.includes('super air') || n.includes('superjet')) return { code: 'IU', color: '#7c3aed' };
  if (n.includes('pelita')) return { code: '6D', color: '#0891b2' };
  const code = (name || 'XX').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'XX';
  return { code, color: '#334155' };
}

/**
 * Rapikan URL logo dari API.
 *
 * Nama berkas di server FIDS boleh mengandung spasi (mis. logo Garuda yang
 * berasal dari unggahan WhatsApp), jadi URL perlu di-encode. Encoding hanya
 * dilakukan bila memang ada spasi supaya URL yang sudah ter-encode tidak
 * diproses dua kali.
 */
export function airlineLogoUrl(logo?: string | null): string | null {
  const url = (logo || '').trim();
  if (!url) return null;
  return /\s/.test(url) ? encodeURI(url) : url;
}

/**
 * Lencana maskapai.
 *
 * Menampilkan logo asli dari API bila tersedia; bila URL kosong atau gambarnya
 * gagal dimuat (server FIDS eksternal sedang tidak dapat dijangkau), tampilan
 * mundur ke lencana kode dua huruf berwarna khas maskapai.
 */
export function AirlineLogo({
  airline,
  logo,
  size = 40,
}: {
  airline: string;
  logo?: string | null;
  size?: number;
}) {
  const { code, color } = airlineStyle(airline);
  const src = airlineLogoUrl(logo);
  const [failed, setFailed] = useState(false);

  // Baris dapat dipakai ulang saat data disegarkan — coba lagi untuk URL baru.
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <div
        className="rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm p-1"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- host FIDS eksternal, dimuat apa adanya agar bisa jatuh ke lencana saat gagal */}
        <img
          src={src}
          alt={`Logo ${airline}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.3 }}
      title={airline}
    >
      {code}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rute                                                               */
/* ------------------------------------------------------------------ */

/**
 * `splitPlace` dan `shortTime` kini tinggal di `@/lib/place` supaya modul
 * non-React (peta & simulasi penerbangan) bisa memakainya tanpa menarik
 * React. Diekspor ulang di sini agar seluruh halaman yang sudah mengimpor
 * dari berkas ini tetap bekerja tanpa perubahan.
 */
export { splitPlace, shortTime } from '@/lib/place';

/** Tanggal penerbangan FIDS (YYYY-MM-DD) -> "Senin, 27 Juli 2026". */
export function fmtFlightDate(date?: string | null): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Selisih waktu pembaruan status FIDS dalam bahasa manusia. */
export function relativeUpdated(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return `${Math.round(hours / 24)} hari lalu`;
}

/** Ringkasan gate / ban bagasi sesuai jenis penerbangan. */
export function gateLabel(flight: Flight): { label: string; value: string; assigned: boolean } {
  if (flight.flight_type === 'arrival') {
    const assigned = flight.baggage_belt != null;
    return {
      label: 'Ban Bagasi',
      value: assigned ? `Belt ${flight.baggage_belt}` : 'Belum ditentukan',
      assigned,
    };
  }
  const assigned = !!flight.gate;
  return { label: 'Gate', value: assigned ? String(flight.gate) : 'Belum ditentukan', assigned };
}

/* ------------------------------------------------------------------ */
/*  Status                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Terjadwal', className: 'text-emerald-600' },
  check_in: { label: 'Check-in Dibuka', className: 'text-indigo-600' },
  boarding: { label: 'Boarding', className: 'text-blue-600' },
  departed: { label: 'Berangkat', className: 'text-slate-500' },
  landed: { label: 'Mendarat', className: 'text-slate-500' },
  delayed: { label: 'Delay', className: 'text-amber-600' },
  cancelled: { label: 'Dibatalkan', className: 'text-rose-600' },
};

export function statusInfo(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.scheduled;
}

/**
 * Varian lengkap untuk lencana status bertema terang.
 * `pulse` menandai status yang perlu menarik perhatian (sedang boarding).
 */
export type StatusTheme = {
  label: string;
  /** Kelas untuk lencana utuh: latar + teks + garis tepi. */
  badge: string;
  /** Kelas warna latar titik indikator. */
  dot: string;
  /** Kelas warna teks saja, untuk baris ringkas. */
  text: string;
  pulse: boolean;
};

const STATUS_THEMES: Record<string, StatusTheme> = {
  scheduled: {
    label: 'Terjadwal',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    pulse: false,
  },
  /**
   * Tahap sebelum boarding. Sengaja dibedakan: FIDS mengirim "Check In Open"
   * dan "Boarding" sebagai remark terpisah, tetapi sebelumnya keduanya
   * ditampilkan sebagai "Boarding" sehingga penumpang salah menduga sudah
   * saatnya naik pesawat.
   */
  check_in: {
    label: 'Check-in Dibuka',
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    dot: 'bg-indigo-500',
    text: 'text-indigo-600',
    pulse: true,
  },
  boarding: {
    label: 'Boarding',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-600',
    pulse: true,
  },
  departed: {
    label: 'Berangkat',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    pulse: false,
  },
  landed: {
    label: 'Mendarat',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    dot: 'bg-sky-500',
    text: 'text-sky-600',
    pulse: false,
  },
  delayed: {
    label: 'Delay',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    pulse: true,
  },
  cancelled: {
    label: 'Dibatalkan',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
    pulse: false,
  },
};

export function statusTheme(status: string): StatusTheme {
  return STATUS_THEMES[status] || STATUS_THEMES.scheduled;
}

/* ------------------------------------------------------------------ */
/*  Tidak ada data contoh penerbangan di sini.                          */
/*                                                                      */
/*  Sebelumnya berkas ini mengekspor DEMO_DEPARTURES/DEMO_ARRIVALS yang */
/*  dipakai layar PWA ketika API mengembalikan daftar kosong. Akibatnya */
/*  saat umpan FIDS bandara kosong, penumpang melihat lima penerbangan  */
/*  karangan tanpa penanda apa pun bahwa itu bukan jadwal sungguhan.    */
/*                                                                      */
/*  Kalau tidak ada jadwal, katakan tidak ada jadwal.                   */
/* ------------------------------------------------------------------ */
