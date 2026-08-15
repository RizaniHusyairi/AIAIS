'use client';

/**
 * Satu halaman untuk enam jenis pengajuan layanan.
 *
 * Bentuk formulirnya datang dari `/submission-types` — label, daftar pilihan,
 * dan medan tambahan semuanya ditentukan backend. Enam halaman terpisah akan
 * menyimpang satu per satu begitu daftar pilihannya berubah, dan yang
 * ketinggalan baru ketahuan saat ada pemohon mengirim nilai yang ditolak.
 *
 * Berkas syarat diperiksa di sini SEBELUM diunggah — bukan demi keamanan
 * (backend tetap memeriksa) melainkan demi kesabaran pemohon di sambungan
 * seluler. Alasan yang sama dijelaskan pada formulir field trip.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunFetch, akunUpload, muatSesiWarga } from '@/lib/akunApi';
import { fetchApi } from '@/lib/api';
import type { SubmissionItem, SubmissionType } from '@/types';
import {
  KOLOM_JUDUL, KOLOM_JENIS, KOLOM_LAINNYA, judul, jenis, medanFormulir, tanggal,
} from '@/lib/submissions';
import { LencanaStatus } from '@/app/akun/AkunView';
import { ArrowLeft, Plus, Upload, X, FileText, CircleAlert } from 'lucide-react';

const MAKS_BERKAS = 5;
const MAKS_UKURAN = 2 * 1024 * 1024;
const EKSTENSI = ['pdf', 'doc', 'docx'];

const ukuran = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

const gaya = 'mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors';

export default function PengajuanView({ slug }: { slug: string }) {
  const router = useRouter();
  const [tipe, setTipe] = useState<SubmissionType | null>(null);
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTampil, setFormTampil] = useState(false);

  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [uraian, setUraian] = useState('');
  const [berkas, setBerkas] = useState<File[]>([]);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    let batal = false;

    (async () => {
      const sesi = await muatSesiWarga();

      if (batal) return;

      if (!sesi) {
        router.replace('/masuk');

        return;
      }

      const [daftarTipe, daftarItem] = await Promise.all([
        fetchApi<SubmissionType[]>('/submission-types'),
        akunFetch<SubmissionItem[]>(`/pengajuan/${slug}`),
      ]);

      if (batal) return;

      const t = (daftarTipe.success && daftarTipe.data ? daftarTipe.data : []).find((x) => x.slug === slug) ?? null;

      setTipe(t);
      setItems(Array.isArray(daftarItem.data) ? daftarItem.data : []);
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, [router, slug]);

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

    if (berkas.length + masuk.length > MAKS_BERKAS) {
      setGalat(`Maksimal ${MAKS_BERKAS} berkas per pengajuan.`);
    }

    setBerkas([...berkas, ...masuk].slice(0, MAKS_BERKAS));
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipe) return;

    if (berkas.length === 0) {
      setGalat('Unggah sekurang-kurangnya satu berkas syarat.');

      return;
    }

    setGalat('');
    setMengirim(true);

    const form = new FormData();
    form.append('description', uraian);
    medanFormulir(tipe).forEach((m) => form.append(m, nilai[m] ?? ''));
    berkas.forEach((f) => form.append('documents[]', f));

    const res = await akunUpload<SubmissionItem>(`/pengajuan/${slug}`, form);
    setMengirim(false);

    if (!res.ok) {
      setGalat(res.message);

      return;
    }

    // Daftarnya dimuat ulang, bukan ditambahi di sisi klien: statusnya
    // ditetapkan backend, dan menebaknya di sini berarti menampilkan keadaan
    // yang belum tentu sama dengan yang tersimpan.
    const ulang = await akunFetch<SubmissionItem[]>(`/pengajuan/${slug}`);
    setItems(Array.isArray(ulang.data) ? ulang.data : []);
    setNilai({});
    setUraian('');
    setBerkas([]);
    setFormTampil(false);
  };

  if (memuat) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" aria-busy="true">
        <p className="text-[13px] text-slate-500">Memuat...</p>
      </div>
    );
  }

  if (!tipe) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-[14px] font-bold text-slate-700">Jenis pengajuan tidak dikenali.</p>
        <Link href="/akun" className="text-[12.5px] font-bold text-blue-600 hover:text-blue-700">Kembali ke akun</Link>
      </div>
    );
  }

  const kolomLain = tipe.has_more ? KOLOM_LAINNYA[slug] : undefined;
  // Pada izin kerja, judul dan jenisnya kolom yang sama — cukup satu isian.
  const judulSamaDenganJenis = KOLOM_JUDUL[slug] === KOLOM_JENIS[slug];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
          <Link href="/akun" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-100/80 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke akun
          </Link>
          <h1 className="mt-3 text-2xl font-black text-white tracking-tight">{tipe.label}</h1>
          <p className="mt-1.5 text-[13px] text-blue-100/85 leading-relaxed max-w-xl">
            Lampirkan berkas syarat dalam format PDF, DOC, atau DOCX. Petugas akan meninjau pengajuan
            dan hasilnya tampil di halaman ini.
          </p>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {!formTampil && (
          <button
            onClick={() => setFormTampil(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajukan Baru
          </button>
        )}

        {formTampil && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={kirim}
            className="bg-white ring-1 ring-slate-200 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-[15px] font-black text-slate-900">Formulir {tipe.label}</h2>

            {!judulSamaDenganJenis && (
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">{tipe.title_label}</span>
                <input
                  required maxLength={125} className={gaya}
                  value={nilai[KOLOM_JUDUL[slug]] ?? ''}
                  onChange={(e) => setNilai({ ...nilai, [KOLOM_JUDUL[slug]]: e.target.value })}
                />
              </label>
            )}

            <label className="block">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">{tipe.type_label}</span>
              <select
                required className={gaya}
                value={nilai[KOLOM_JENIS[slug]] ?? ''}
                onChange={(e) => setNilai({ ...nilai, [KOLOM_JENIS[slug]]: e.target.value })}
              >
                <option value="" disabled>Pilih {tipe.type_label.toLowerCase()}</option>
                {tipe.types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            {tipe.extra.map((x) => (
              <label key={x.field} className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {x.label}{!x.required && <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(opsional)</span>}
                </span>
                <input
                  required={x.required}
                  type={x.field.endsWith('_date') ? 'date' : ['area', 'quantity'].includes(x.field) ? 'number' : 'text'}
                  className={gaya}
                  value={nilai[x.field] ?? ''}
                  onChange={(e) => setNilai({ ...nilai, [x.field]: e.target.value })}
                />
              </label>
            ))}

            {kolomLain && (
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Keterangan Tambahan <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(opsional)</span>
                </span>
                <input
                  maxLength={125} className={gaya}
                  value={nilai[kolomLain] ?? ''}
                  onChange={(e) => setNilai({ ...nilai, [kolomLain]: e.target.value })}
                />
              </label>
            )}

            <label className="block">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Uraian</span>
              <textarea
                required rows={5} className={`${gaya} resize-y`}
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                placeholder="Jelaskan maksud pengajuan Anda."
              />
            </label>

            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">Berkas Syarat</span>
              <p className="mt-1 text-[11.5px] text-slate-400">
                PDF, DOC, atau DOCX. Maksimal {MAKS_BERKAS} berkas, masing-masing 2 MB.
              </p>

              <label className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 px-4 py-6 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-[12.5px] font-bold text-slate-600">Pilih berkas</span>
                <input
                  type="file" multiple accept=".pdf,.doc,.docx" className="hidden"
                  onChange={(e) => { tambahBerkas(e.target.files); e.target.value = ''; }}
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

            <div className="flex gap-3">
              <button
                type="submit" disabled={mengirim}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[13.5px] px-6 py-3 transition-colors cursor-pointer"
              >
                {mengirim ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
              <button
                type="button" onClick={() => { setFormTampil(false); setGalat(''); }}
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
            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada pengajuan.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-black text-slate-900">{judul(it, slug)}</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {jenis(it, slug)} · {it.document_count} berkas · {tanggal(it.created_at)}
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
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
