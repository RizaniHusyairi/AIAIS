'use client';

/**
 * Extend Advance — permohonan beroperasi di luar jam layanan bandara.
 *
 * Alurnya BERTAHAP, dan halaman ini harus membuat tahapannya terlihat. Setelah
 * mengirim rencana penerbangan, pemohon belum selesai: ia harus mengunduh
 * surat pernyataan, memintakan tanda tangan Pilot In Command, lalu
 * mengunggahnya kembali. Baru sesudah itu pengajuannya masuk antrean petugas.
 *
 * Karena itu pengajuan berstatus `Menunggu Dokumen Ditandatangani` diberi
 * kotak tindakan yang menonjol, bukan sekadar lencana status. Pemohon yang
 * mengira sudah selesai akan menunggu keputusan yang tidak akan pernah datang.
 *
 * Teks pernyataan ditampilkan UTUH sebelum mengirim. Isinya penerimaan
 * tanggung jawab atas risiko penerbangan di luar jam layanan; menyembunyikannya
 * di balik tautan membuat orang menandatangani sesuatu yang belum dibacanya.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunFetch, akunUpload, muatSesiWarga } from '@/lib/akunApi';
import type { ExtendAdvanceSubmission } from '@/types';
import { tanggal } from '@/lib/submissions';
import { LencanaStatus } from '@/app/akun/AkunView';
import { ArrowLeft, Plus, FileText, CircleAlert, Upload, Clock3 } from 'lucide-react';

const gaya = 'mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors';

const KOSONG = {
  operator: '', aircraft_type: '', registration_and_flight_number: '',
  flight_date: '', eobt: '', aobt: '', route: '', take_off_alternate: '',
  purpose_of_flight: '', pic_name: '',
};

const MEDAN: { key: keyof typeof KOSONG; label: string; type?: string; placeholder?: string; opsional?: boolean }[] = [
  { key: 'operator', label: 'Operator', placeholder: 'Nama maskapai atau operator' },
  { key: 'aircraft_type', label: 'Tipe Pesawat', placeholder: 'C208' },
  { key: 'registration_and_flight_number', label: 'Registrasi & Nomor Penerbangan', placeholder: 'PK-VVA / SI123' },
  { key: 'flight_date', label: 'Tanggal Penerbangan', type: 'date' },
  { key: 'eobt', label: 'EOBT', type: 'time' },
  { key: 'aobt', label: 'AOBT', type: 'time' },
  { key: 'route', label: 'Rute', placeholder: 'WALS-WAAA' },
  { key: 'take_off_alternate', label: 'Take Off Alternate', opsional: true },
  { key: 'purpose_of_flight', label: 'Tujuan Penerbangan', placeholder: 'Charter medis' },
  { key: 'pic_name', label: 'Nama Pilot In Command' },
];

export default function ExtendAdvanceView() {
  const router = useRouter();
  const [items, setItems] = useState<ExtendAdvanceSubmission[]>([]);
  const [pernyataan, setPernyataan] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [tampil, setTampil] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [unggahId, setUnggahId] = useState<number | null>(null);

  const muat = async () => {
    const res = await akunFetch<ExtendAdvanceSubmission[]>('/extend-advance');
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

      const teks = await akunFetch<{ statement: string | null }>('/extend-advance/statement');

      if (batal) return;

      setPernyataan(teks.data?.statement ?? null);
      await muat();

      if (!batal) setMemuat(false);
    })();

    return () => { batal = true; };
  }, [router]);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMengirim(true);

    const res = await akunFetch<ExtendAdvanceSubmission>('/extend-advance', {
      method: 'POST',
      body: { ...form, take_off_alternate: form.take_off_alternate.trim() || null },
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

  const unggahTtd = async (id: number, berkas: File | null) => {
    if (!berkas) return;

    setUnggahId(id);
    const fd = new FormData();
    fd.append('signed_document', berkas);

    const res = await akunUpload(`/extend-advance/${id}/signed`, fd);
    setUnggahId(null);

    if (!res.ok) {
      setGalat(res.message);

      return;
    }

    setGalat('');
    await muat();
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
          <h1 className="mt-3 text-2xl font-black text-white tracking-tight">Extend Advance</h1>
          <p className="mt-1.5 text-[13px] text-blue-100/85 leading-relaxed max-w-xl">
            Permohonan beroperasi di luar jam layanan bandara. Pengajuan baru dapat diproses setelah
            surat pernyataan ditandatangani Pilot In Command dan diunggah kembali.
          </p>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {/* Pernyataan ditampilkan utuh — bukan di balik tautan. */}
        <section className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-5">
          <h2 className="text-[13.5px] font-black text-amber-900">Surat Pernyataan Tanggung Jawab</h2>
          {pernyataan ? (
            <p className="mt-2 text-[12.5px] text-amber-900/90 leading-relaxed whitespace-pre-line">{pernyataan}</p>
          ) : (
            <p className="mt-2 text-[12.5px] font-semibold text-amber-900/90">
              Teks pernyataan belum diatur petugas. Hubungi bandara sebelum mengajukan.
            </p>
          )}
        </section>

        {!tampil && (
          <button
            onClick={() => setTampil(true)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajukan Baru
          </button>
        )}

        {tampil && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={kirim}
            className="mt-6 bg-white ring-1 ring-slate-200 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-[15px] font-black text-slate-900">Rencana Penerbangan</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MEDAN.map((m) => (
                <label key={m.key} className="block">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {m.label}
                    {m.opsional && <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(opsional)</span>}
                  </span>
                  <input
                    required={!m.opsional}
                    type={m.type ?? 'text'}
                    maxLength={125}
                    placeholder={m.placeholder}
                    className={gaya}
                    value={form[m.key]}
                    onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  />
                </label>
              ))}
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
            <Clock3 className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada pengajuan.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-black text-slate-900">{it.registration_and_flight_number}</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {it.operator} · {it.aircraft_type} · {it.route}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {tanggal(it.flight_date)} · EOBT {it.eobt} · AOBT {it.aobt} · PIC {it.pic_name}
                    </p>
                  </div>
                  <LencanaStatus status={it.submission_status === 'Menunggu Dokumen Ditandatangani' ? 'Diajukan' : it.submission_status} />
                </div>

                {/* Tahap yang paling mudah terlewat: pemohon mengira sudah
                    selesai padahal pengajuannya belum masuk antrean. */}
                {it.submission_status === 'Menunggu Dokumen Ditandatangani' && (
                  <div className="mt-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-4">
                    <p className="text-[12.5px] font-bold text-amber-900">
                      Pengajuan ini belum masuk antrean petugas.
                    </p>
                    <p className="mt-1 text-[12px] text-amber-900/85 leading-relaxed">
                      Cetak surat pernyataan di atas, mintakan tanda tangan Pilot In Command, lalu
                      unggah kembali di sini dalam format PDF.
                    </p>

                    <label className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {unggahId === it.id ? 'Mengunggah...' : 'Unggah Pernyataan Bertanda Tangan'}
                      <input
                        type="file" accept=".pdf" className="hidden"
                        onChange={(e) => { unggahTtd(it.id, e.target.files?.[0] ?? null); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                )}

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
