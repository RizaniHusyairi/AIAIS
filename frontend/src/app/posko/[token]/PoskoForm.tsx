'use client';

/**
 * Formulir petugas Posko Nataru.
 *
 * DIRANCANG UNTUK KEADAAN PEMAKAIANNYA, bukan untuk kerapian formulir:
 * petugas berdiri di apron memegang ponsel, dan memasukkan puluhan
 * penerbangan dalam satu giliran jaga. Tiga keputusan lahir dari situ.
 *
 *  1. **Nama petugas dan tanggal BERTAHAN setelah tersimpan.** Keduanya sama
 *     sepanjang giliran jaga; memintanya diketik ulang tiap penerbangan
 *     adalah cara tercepat membuat data tidak terkirim.
 *  2. **Isian penerbangan dikosongkan, fokus kembali ke nomor penerbangan.**
 *     Penerbangan berikutnya dapat langsung diketik tanpa menyentuh layar.
 *  3. **Daftar kiriman giliran ini ditampilkan di bawah formulir.** Tanpa itu
 *     petugas tidak punya cara tahu apa yang sudah masuk, dan penerbangan
 *     yang sama mudah tercatat dua kali.
 *
 * Halaman ini SENGAJA tidak didaftarkan pada proksi ponsel di `src/proxy.ts`.
 * Pengunjung ponsel di rute lain dialihkan ke layar PWA, tetapi di sini
 * ponsel justru perangkat utamanya — mengalihkannya akan membuang formulir
 * yang jadi satu-satunya alasan halaman ini ada.
 *
 * Total penumpang dan load factor TIDAK diisi di sini: server yang
 * menghitungnya dari angka penyusunnya. Yang ditampilkan di bawah isian hanya
 * pratinjau, supaya petugas dapat menangkap salah ketik sebelum menyimpan.
 */

import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import type { PoskoInfo } from '@/types';
import {
  Plane, PlaneLanding, PlaneTakeoff, CheckCircle2, AlertTriangle, Loader2, Lock, ListChecks,
} from 'lucide-react';

const STATUS = ['Berjadwal', 'Perintis', 'Tidak Berjadwal'];

type Isian = {
  flight_date: string;
  flight_time: string;
  airline: string;
  flight_number: string;
  status_flight: string;
  route: string;
  direction: 'arrival' | 'departure';
  aircraft_type: string;
  aircraft_registration: string;
  seat_capacity: string;
  pax_adult: string;
  pax_child: string;
  pax_infant: string;
  cargo: string;
  baggage: string;
  ticket_price_high: string;
  ticket_price_low: string;
  officer_name: string;
  remarks: string;
};

/** Isian yang dikosongkan tiap kali satu penerbangan tersimpan. */
const KOSONG_PENERBANGAN = {
  flight_time: '', airline: '', flight_number: '', route: '',
  aircraft_type: '', aircraft_registration: '', seat_capacity: '',
  pax_adult: '', pax_child: '0', pax_infant: '0',
  cargo: '0', baggage: '0', ticket_price_high: '', ticket_price_low: '',
  remarks: '',
} as const;

const AWAL: Isian = {
  flight_date: '',
  status_flight: STATUS[0],
  direction: 'arrival',
  officer_name: '',
  ...KOSONG_PENERBANGAN,
};

function Isi({
  label, value, onChange, type = 'text', required, placeholder, error, inputRef, hint, ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  [k: string]: unknown;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // Ukuran sentuh 44px: dipakai berdiri, satu tangan, kerap bersarung tangan.
        className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
          error ? 'border-rose-300 focus:ring-rose-300' : 'border-slate-300 focus:ring-blue-400'
        }`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-[11.5px] text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-[11.5px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export default function PoskoForm({ token, info }: { token: string; info: PoskoInfo | null }) {
  const [form, setForm] = useState<Isian>(AWAL);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [terkirim, setTerkirim] = useState<{ nomor: string; pax: number }[]>([]);
  const [baruSaja, setBaruSaja] = useState<string | null>(null);
  const refNomor = useRef<HTMLInputElement>(null);

  const ubah = (k: keyof Isian) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Pratinjau turunan; nilai sebenarnya tetap dihitung server. */
  const pratinjau = useMemo(() => {
    const d = Number(form.pax_adult) || 0;
    const a = Number(form.pax_child) || 0;
    const b = Number(form.pax_infant) || 0;
    const kursi = Number(form.seat_capacity) || 0;

    return {
      total: d + a + b,
      lf: kursi > 0 ? Math.round(((d + a) / kursi) * 1000) / 10 : null,
    };
  }, [form.pax_adult, form.pax_child, form.pax_infant, form.seat_capacity]);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat({});
    setGalatUmum('');
    setMengirim(true);

    const angka = (v: string) => (v === '' ? null : Number(v));

    try {
      const res = await fetch(`${API_BASE_URL}/nataru/${token}/flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...form,
          seat_capacity: angka(form.seat_capacity),
          pax_adult: Number(form.pax_adult) || 0,
          pax_child: Number(form.pax_child) || 0,
          pax_infant: Number(form.pax_infant) || 0,
          cargo: Number(form.cargo) || 0,
          baggage: Number(form.baggage) || 0,
          ticket_price_high: angka(form.ticket_price_high),
          ticket_price_low: angka(form.ticket_price_low),
          aircraft_type: form.aircraft_type || null,
          aircraft_registration: form.aircraft_registration || null,
          remarks: form.remarks || null,
        }),
      });

      const json = await res.json().catch(() => null);
      setMengirim(false);

      if (res.status === 429) {
        setGalatUmum('Terlalu banyak kiriman berturut-turut. Tunggu sebentar lalu coba lagi.');
        return;
      }

      if (!res.ok || !json?.success) {
        if (json?.errors && Object.keys(json.errors).length) {
          setGalat(Object.fromEntries(Object.entries(json.errors).map(([k, v]) => [k, (v as string[])[0]])));
        }
        setGalatUmum(json?.message ?? 'Data gagal disimpan.');
        return;
      }

      setTerkirim((t) => [{ nomor: json.data.flight_number, pax: json.data.pax_total }, ...t]);
      setBaruSaja(json.message);
      // Nama petugas dan tanggal dipertahankan — lihat catatan di atas berkas.
      setForm((f) => ({ ...f, ...KOSONG_PENERBANGAN }));
      refNomor.current?.focus();
    } catch {
      setMengirim(false);
      setGalatUmum('Tidak dapat terhubung ke server. Periksa sambungan lalu coba lagi.');
    }
  };

  /* ---------- tautan tidak dikenali atau posko tertutup ---------- */

  if (!info) {
    return (
      <Kerangka>
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-xl bg-rose-50 ring-1 ring-rose-200 items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </span>
          <h1 className="mt-4 text-[18px] font-black text-slate-900">Tautan Tidak Dikenali</h1>
          <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
            Tautan posko ini tidak berlaku atau sudah diganti. Hubungi koordinator posko untuk
            mendapatkan tautan yang berlaku.
          </p>
        </div>
      </Kerangka>
    );
  }

  if (!info.is_active) {
    return (
      <Kerangka>
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-xl bg-amber-50 ring-1 ring-amber-200 items-center justify-center">
            <Lock className="w-6 h-6 text-amber-600" />
          </span>
          <h1 className="mt-4 text-[18px] font-black text-slate-900">Posko Sudah Ditutup</h1>
          <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
            {info.name} sudah tidak menerima kiriman data. Bila masih ada penerbangan yang perlu
            dicatat, hubungi koordinator posko.
          </p>
        </div>
      </Kerangka>
    );
  }

  /* ---------- formulir ---------- */

  const rentang = `${new Date(info.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${new Date(info.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <Kerangka lebar>
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Plane className="w-5 h-5 text-white rotate-45" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[17px] font-black text-slate-900 leading-tight">{info.name}</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Periode {rentang}</p>
        </div>
      </div>

      {info.description && (
        <p className="mt-3 text-[12.5px] text-slate-600 leading-relaxed bg-blue-50 ring-1 ring-blue-100 rounded-xl px-3.5 py-2.5">
          {info.description}
        </p>
      )}

      <AnimatePresence>
        {baruSaja && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-semibold text-emerald-800">{baruSaja}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {galatUmum && (
        <p role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galatUmum}
        </p>
      )}

      <form onSubmit={kirim} className="mt-5 space-y-5">
        {/* Identitas giliran jaga — bertahan antar kiriman */}
        <fieldset className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 space-y-3">
          <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Giliran Jaga
          </legend>
          <p className="text-[11.5px] text-slate-500 -mt-1">
            Nama dan tanggal tetap terisi setelah menyimpan, jadi cukup diisi sekali per giliran.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Isi label="Nama Petugas" required value={form.officer_name} onChange={ubah('officer_name')} error={galat.officer_name} placeholder="Nama, Nama" />
            <Isi label="Tanggal Penerbangan" required type="date" value={form.flight_date} onChange={ubah('flight_date')} error={galat.flight_date} min={info.start_date} max={info.end_date} />
          </div>
        </fieldset>

        {/* Penerbangan */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Penerbangan</legend>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, direction: 'arrival' }))}
              aria-pressed={form.direction === 'arrival'}
              className={`min-h-[52px] rounded-xl font-bold text-[13.5px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                form.direction === 'arrival' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300'
              }`}
            >
              <PlaneLanding className="w-4 h-4" /> Kedatangan
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, direction: 'departure' }))}
              aria-pressed={form.direction === 'departure'}
              className={`min-h-[52px] rounded-xl font-bold text-[13.5px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                form.direction === 'departure' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300'
              }`}
            >
              <PlaneTakeoff className="w-4 h-4" /> Keberangkatan
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Isi label="Nomor Penerbangan" required value={form.flight_number} onChange={ubah('flight_number')} error={galat.flight_number} placeholder="ID 6672" inputRef={refNomor} />
            <Isi label="Maskapai" required value={form.airline} onChange={ubah('airline')} error={galat.airline} placeholder="Batik Air" />
            <Isi label="Jam" required type="time" value={form.flight_time} onChange={ubah('flight_time')} error={galat.flight_time} />
            <Isi label="Rute" required value={form.route} onChange={ubah('route')} error={galat.route} placeholder="CGK-AAP" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">Jenis Penerbangan <span className="text-rose-500">*</span></label>
            <select
              value={form.status_flight}
              onChange={(e) => ubah('status_flight')(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Isi label="Tipe Pesawat" value={form.aircraft_type} onChange={ubah('aircraft_type')} placeholder="B737-800" />
            <Isi label="Registrasi" value={form.aircraft_registration} onChange={ubah('aircraft_registration')} placeholder="PK-LAA" />
            <Isi label="Kapasitas Kursi" type="number" inputMode="numeric" value={form.seat_capacity} onChange={ubah('seat_capacity')} error={galat.seat_capacity} placeholder="180" hint="Untuk menghitung load factor" />
          </div>
        </fieldset>

        {/* Muatan */}
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Muatan</legend>

          <div className="grid grid-cols-3 gap-3">
            <Isi label="Dewasa" required type="number" inputMode="numeric" value={form.pax_adult} onChange={ubah('pax_adult')} error={galat.pax_adult} placeholder="0" min={0} />
            <Isi label="Anak" required type="number" inputMode="numeric" value={form.pax_child} onChange={ubah('pax_child')} error={galat.pax_child} min={0} />
            <Isi label="Bayi" required type="number" inputMode="numeric" value={form.pax_infant} onChange={ubah('pax_infant')} error={galat.pax_infant} min={0} />
          </div>

          {/* Pratinjau turunan — server yang menghitung nilai sebenarnya. */}
          <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 px-3.5 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
            <p className="text-[12.5px] text-slate-700">
              Total penumpang <span className="font-black text-slate-900 tabular-nums">{pratinjau.total}</span>
            </p>
            <p className="text-[12.5px] text-slate-700">
              Load factor{' '}
              <span className="font-black text-slate-900 tabular-nums">
                {pratinjau.lf !== null ? `${pratinjau.lf}%` : 'belum dapat dihitung'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Isi label="Kargo (kg)" required type="number" inputMode="numeric" value={form.cargo} onChange={ubah('cargo')} error={galat.cargo} min={0} />
            <Isi label="Bagasi (kg)" required type="number" inputMode="numeric" value={form.baggage} onChange={ubah('baggage')} error={galat.baggage} min={0} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Isi label="Harga Tiket Tertinggi" type="number" inputMode="numeric" value={form.ticket_price_high} onChange={ubah('ticket_price_high')} placeholder="Kosongkan bila tidak tahu" min={0} />
            <Isi label="Harga Tiket Terendah" type="number" inputMode="numeric" value={form.ticket_price_low} onChange={ubah('ticket_price_low')} min={0} />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">Catatan</label>
            <textarea
              value={form.remarks}
              onChange={(e) => ubah('remarks')(e.target.value)}
              rows={2}
              placeholder="Keterlambatan, kendala operasional, dan sejenisnya."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={mengirim}
          className="w-full min-h-[52px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-[14.5px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {mengirim && <Loader2 className="w-4 h-4 animate-spin" />}
          {mengirim ? 'Menyimpan...' : 'Simpan Penerbangan'}
        </button>
      </form>

      {/* Kiriman giliran ini */}
      {terkirim.length > 0 && (
        <div className="mt-7">
          <h2 className="text-[12.5px] font-bold text-slate-700 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-600" />
            Tersimpan pada giliran ini ({terkirim.length})
          </h2>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Daftar ini hanya catatan di layar Anda — memuat ulang halaman akan mengosongkannya,
            tetapi datanya tetap tersimpan di server.
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {terkirim.map((t, i) => (
              <li key={`${t.nomor}-${i}`} className="flex items-center justify-between rounded-xl bg-white ring-1 ring-slate-200 px-3.5 py-2 text-[12.5px]">
                <span className="font-bold text-slate-800">{t.nomor}</span>
                <span className="text-slate-500 tabular-nums">{t.pax} penumpang</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Kerangka>
  );
}

function Kerangka({ children, lebar }: { children: React.ReactNode; lebar?: boolean }) {
  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className={`mx-auto ${lebar ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5 sm:p-6">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Posko Nataru · Bandar Udara APT Pranoto Samarinda
        </p>
      </div>
    </div>
  );
}
