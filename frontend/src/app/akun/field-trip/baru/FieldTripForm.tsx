'use client';

/**
 * Formulir pengajuan kunjungan lapangan.
 *
 * Berkas syarat diunggah sebagai multipart lewat `akunUpload` — `akunFetch`
 * selalu men-JSON-kan badan permintaan dan tidak dapat membawa berkas.
 *
 * Batas berkas (maksimal 5, masing-masing 2MB, PDF/DOC/DOCX) ditegakkan
 * backend, tetapi diperiksa pula di sini SEBELUM pengunggahan dimulai. Alasannya
 * bukan keamanan melainkan kesabaran: menolak berkas 8MB setelah pengunggahan
 * selesai membuang menit-menit sambungan pemohon, dan pada koneksi seluler
 * itulah bentuk kegagalan yang paling menjengkelkan.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunUpload } from '@/lib/akunApi';
import { ArrowLeft, Upload, X, FileText, CircleAlert } from 'lucide-react';

const JENIS = ['Sekolah', 'Perguruan Tinggi', 'Instansi', 'Komunitas', 'Lainnya'];

const MAKS_BERKAS = 5;
const MAKS_UKURAN = 2 * 1024 * 1024;
const EKSTENSI = ['pdf', 'doc', 'docx'];

const ukuran = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

export default function FieldTripForm() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState(JENIS[0]);
  const [uraian, setUraian] = useState('');
  const [berkas, setBerkas] = useState<File[]>([]);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const tambahBerkas = (daftar: FileList | null) => {
    if (!daftar) return;
    setGalat('');

    const masuk: File[] = [];

    for (const f of Array.from(daftar)) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';

      if (!EKSTENSI.includes(ext)) {
        setGalat(`"${f.name}" bukan PDF, DOC, atau DOCX.`);
        continue;
      }

      if (f.size > MAKS_UKURAN) {
        setGalat(`"${f.name}" berukuran ${ukuran(f.size)}, melebihi batas 2 MB.`);
        continue;
      }

      masuk.push(f);
    }

    const gabungan = [...berkas, ...masuk].slice(0, MAKS_BERKAS);

    if (berkas.length + masuk.length > MAKS_BERKAS) {
      setGalat(`Maksimal ${MAKS_BERKAS} berkas per pengajuan.`);
    }

    setBerkas(gabungan);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (berkas.length === 0) {
      setGalat('Unggah sekurang-kurangnya satu surat pengantar.');

      return;
    }

    setGalat('');
    setMengirim(true);

    const form = new FormData();
    form.append('fieldtrip_name', nama);
    form.append('fieldtrip_type', jenis);
    form.append('description', uraian);
    berkas.forEach((f) => form.append('documents[]', f));

    const res = await akunUpload('/fieldtrips', form);
    setMengirim(false);

    if (res.ok) {
      router.push('/akun');

      return;
    }

    setGalat(res.message);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-10">
          <Link href="/akun" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-100/80 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke akun
          </Link>
          <h1 className="mt-3 text-2xl font-black text-white tracking-tight">Ajukan Kunjungan Lapangan</h1>
          <p className="mt-1.5 text-[13px] text-blue-100/85 leading-relaxed max-w-xl">
            Lampirkan surat pengantar resmi dari sekolah atau instansi Anda. Petugas akan meninjau
            pengajuan dan hasilnya tampil di halaman akun.
          </p>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[820px] mx-auto px-4 sm:px-6 py-10"
      >
        <form onSubmit={kirim} className="bg-white ring-1 ring-slate-200 rounded-2xl p-6 space-y-5">
          <label className="block">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Nama Kegiatan</span>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              maxLength={125}
              placeholder="Kunjungan Industri SMA Negeri 1 Samarinda"
              className="mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Jenis Pemohon</span>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors"
            >
              {JENIS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Uraian Kegiatan</span>
            <textarea
              value={uraian}
              onChange={(e) => setUraian(e.target.value)}
              required
              rows={5}
              placeholder="Jumlah peserta, tanggal yang diinginkan, dan tujuan kunjungan."
              className="mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors resize-y"
            />
          </label>

          <div>
            <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Surat Pengantar</span>
            <p className="mt-1 text-[11.5px] text-slate-400">
              PDF, DOC, atau DOCX. Maksimal {MAKS_BERKAS} berkas, masing-masing 2 MB.
            </p>

            <label className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 px-4 py-6 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-[12.5px] font-bold text-slate-600">Pilih berkas</span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={(e) => { tambahBerkas(e.target.files); e.target.value = ''; }}
                className="hidden"
              />
            </label>

            {berkas.length > 0 && (
              <ul className="mt-3 space-y-2">
                {berkas.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-2.5">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 truncate">{f.name}</span>
                    <span className="text-[11.5px] text-slate-400 tabular-nums">{ukuran(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setBerkas(berkas.filter((_, j) => j !== i))}
                      className="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title={`Buang ${f.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {galat && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
              <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galat}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={mengirim}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[13.5px] px-6 py-3 transition-colors cursor-pointer"
            >
              {mengirim ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
            <Link
              href="/akun"
              className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] px-6 py-3 transition-colors flex items-center"
            >
              Batal
            </Link>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
