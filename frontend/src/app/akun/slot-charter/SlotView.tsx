'use client';

/**
 * Pengajuan slot penerbangan charter.
 *
 * Halaman tersendiri, bukan bagian dari `/akun/pengajuan/[jenis]`: yang diisi
 * di sini bukan judul dan uraian melainkan sebuah RENCANA PENERBANGAN. Medan
 * kode bandara dan jadwalnya adalah inti pengajuan, bukan keterangan
 * tambahan, sehingga formulir umum akan menyembunyikan justru bagian yang
 * diperiksa petugas.
 *
 * Kode ICAO dipaksa huruf kapital saat diketik. Petugas membaca kode ini
 * berpasangan (asal → tujuan), dan campuran huruf besar-kecil membuat
 * perbandingan sekilas jadi lebih lambat. Validasi sesungguhnya tetap di
 * backend — empat huruf, tanpa angka, asal tidak sama dengan tujuan.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunFetch, muatSesiWarga } from '@/lib/akunApi';
import type { SlotSubmission } from '@/types';
import { tanggal } from '@/lib/submissions';
import { LencanaStatus } from '@/app/akun/AkunView';
import { ArrowLeft, Plus, FileText, CircleAlert, PlaneTakeoff } from 'lucide-react';

const JENIS_PENERBANGAN = [
  { value: 'penumpang', label: 'Penumpang' },
  { value: 'kargo', label: 'Kargo' },
  { value: 'lainnya', label: 'Lainnya' },
];

const gaya = 'mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors';

const KOSONG = {
  aircraft_registration: '',
  aircraft_type: '',
  departure_schedule: '',
  arrival_schedule: '',
  origin_airport: '',
  destination_airport: '',
  flight_type: 'penumpang',
  flight_more: '',
};

/** Waktu lokal ringkas; jadwal charter selalu dibaca berpasangan. */
const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function SlotView() {
  const router = useRouter();
  const [items, setItems] = useState<SlotSubmission[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [tampil, setTampil] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const muat = async () => {
    const res = await akunFetch<SlotSubmission[]>('/slots');
    setItems(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const sesi = await muatSesiWarga();

      if (batal) return;

      if (!sesi) {
        router.replace('/masuk');

        return;
      }

      await muat();

      if (!batal) setMemuat(false);
    })();

    return () => { batal = true; };
  }, [router]);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMengirim(true);

    const res = await akunFetch<SlotSubmission>('/slots', {
      method: 'POST',
      body: {
        ...form,
        flight_more: form.flight_more.trim() || null,
      },
    });
    setMengirim(false);

    if (!res.ok) {
      setGalat(res.message);

      return;
    }

    await muat();
    setForm(KOSONG);
    setTampil(false);
  };

  if (memuat) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" aria-busy="true">
        <p className="text-[13px] text-slate-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
          <Link href="/akun" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-100/80 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke akun
          </Link>
          <h1 className="mt-3 text-2xl font-black text-white tracking-tight">Slot Penerbangan Charter</h1>
          <p className="mt-1.5 text-[13px] text-blue-100/85 leading-relaxed max-w-xl">
            Ajukan slot untuk penerbangan charter. Isikan rencana penerbangan selengkap mungkin —
            petugas menilai pengajuan dari data ini.
          </p>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {!tampil && (
          <button
            onClick={() => setTampil(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajukan Slot Baru
          </button>
        )}

        {tampil && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={kirim}
            className="bg-white ring-1 ring-slate-200 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-[15px] font-black text-slate-900">Rencana Penerbangan</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Registrasi Pesawat</span>
                <input
                  required maxLength={10} className={gaya} placeholder="PK-ABC"
                  value={form.aircraft_registration}
                  onChange={(e) => setForm({ ...form, aircraft_registration: e.target.value.toUpperCase() })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Tipe Pesawat</span>
                <input
                  required maxLength={50} className={gaya} placeholder="ATR 72-600"
                  value={form.aircraft_type}
                  onChange={(e) => setForm({ ...form, aircraft_type: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Bandara Asal (ICAO)</span>
                <input
                  required maxLength={4} className={`${gaya} tracking-[0.2em] font-bold`} placeholder="WALS"
                  value={form.origin_airport}
                  onChange={(e) => setForm({ ...form, origin_airport: e.target.value.toUpperCase() })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Bandara Tujuan (ICAO)</span>
                <input
                  required maxLength={4} className={`${gaya} tracking-[0.2em] font-bold`} placeholder="WAAA"
                  value={form.destination_airport}
                  onChange={(e) => setForm({ ...form, destination_airport: e.target.value.toUpperCase() })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Jadwal Keberangkatan</span>
                <input
                  required type="datetime-local" className={gaya}
                  value={form.departure_schedule}
                  onChange={(e) => setForm({ ...form, departure_schedule: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Jadwal Kedatangan</span>
                <input
                  required type="datetime-local" className={gaya}
                  value={form.arrival_schedule}
                  onChange={(e) => setForm({ ...form, arrival_schedule: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Jenis Penerbangan</span>
                <select
                  className={gaya}
                  value={form.flight_type}
                  onChange={(e) => setForm({ ...form, flight_type: e.target.value })}
                >
                  {JENIS_PENERBANGAN.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Keterangan <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(opsional)</span>
                </span>
                <input
                  maxLength={125} className={gaya}
                  value={form.flight_more}
                  onChange={(e) => setForm({ ...form, flight_more: e.target.value })}
                />
              </label>
            </div>

            {galat && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
                <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galat}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit" disabled={mengirim}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[13.5px] px-6 py-3 transition-colors cursor-pointer"
              >
                {mengirim ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
              <button
                type="button" onClick={() => { setTampil(false); setGalat(''); }}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] px-6 py-3 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.form>
        )}

        <h2 className="mt-10 text-[15px] font-black text-slate-900">Riwayat Pengajuan</h2>

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <PlaneTakeoff className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada pengajuan slot.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-black text-slate-900 tracking-wide">
                      {it.origin_airport} <span className="text-slate-300">→</span> {it.destination_airport}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {it.aircraft_registration} · {it.aircraft_type} · {it.flight_type}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Berangkat {waktu(it.departure_schedule)} · Tiba {waktu(it.arrival_schedule)}
                    </p>
                  </div>
                  <LencanaStatus status={it.submission_status} />
                </div>

                {it.staff_notes && (
                  <p className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-[12.5px] text-slate-700 leading-relaxed">
                    <span className="font-bold">Catatan petugas: </span>{it.staff_notes}
                  </p>
                )}

                {it.submission_status === 'Disetujui' && it.reply_document_path && (
                  <a
                    href={it.reply_document_path} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="w-4 h-4" /> Buka surat balasan
                  </a>
                )}

                <p className="mt-2 text-[11px] text-slate-400">Diajukan {tanggal(it.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
