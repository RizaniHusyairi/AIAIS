'use client';

/**
 * Pendaftaran dan pemantauan OJT (praktik kerja lapangan).
 *
 * Bukan pengajuan setuju/tolak melainkan rekam peserta, jadi yang ditampilkan
 * adalah perjalanannya: mendaftar → berjalan → selesai, berujung nilai dan
 * sertifikat.
 *
 * Data hanya dapat disunting selama status masih `Mendaftar`. Nama dan nomor
 * identitas inilah yang tercetak di sertifikat, sehingga setelah petugas
 * memprosesnya, perubahan harus lewat petugas — dan halaman ini mengatakannya,
 * bukan sekadar menyembunyikan tombolnya.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunUpload, akunFetch, muatSesiWarga } from '@/lib/akunApi';
import type { OjtStudent, StatusOjt } from '@/types';
import { tanggal } from '@/lib/submissions';
import { ArrowLeft, Plus, CircleAlert, GraduationCap, Upload, Pencil } from 'lucide-react';

const gaya = 'mt-1.5 w-full rounded-xl px-4 py-3 text-[13.5px] text-slate-900 bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-400 outline-none transition-colors';

const RUPA_STATUS: Record<StatusOjt, string> = {
  'Mendaftar': 'bg-slate-100 ring-slate-200 text-slate-700',
  'Berjalan': 'bg-blue-50 ring-blue-200 text-blue-700',
  'Selesai': 'bg-emerald-50 ring-emerald-200 text-emerald-700',
  'Batal': 'bg-rose-50 ring-rose-200 text-rose-700',
};

const KOSONG = {
  name: '', id_number: '', birth_place: '', birth_date: '', address: '',
  institution: '', major: '', duration: '', start_date: '', end_date: '',
  phone_number: '',
};

const MEDAN: { key: keyof typeof KOSONG; label: string; type?: string; placeholder?: string; lebar?: boolean }[] = [
  { key: 'name', label: 'Nama Lengkap' },
  { key: 'id_number', label: 'Nomor Induk / Identitas' },
  { key: 'birth_place', label: 'Tempat Lahir' },
  { key: 'birth_date', label: 'Tanggal Lahir', type: 'date' },
  { key: 'institution', label: 'Asal Institusi', placeholder: 'Politeknik Negeri Samarinda' },
  { key: 'major', label: 'Jurusan' },
  { key: 'duration', label: 'Lama Pelaksanaan', placeholder: '3 bulan' },
  { key: 'phone_number', label: 'Nomor Telepon' },
  { key: 'start_date', label: 'Tanggal Mulai', type: 'date' },
  { key: 'end_date', label: 'Tanggal Selesai', type: 'date' },
  { key: 'address', label: 'Alamat', lebar: true },
];

const NAMA_BERKAS: Record<string, string> = {
  identity_card_path: 'Kartu identitas',
  photo_path: 'Pas foto',
  final_certificate_path: 'Sertifikat',
};

export default function OjtView() {
  const router = useRouter();
  const [items, setItems] = useState<OjtStudent[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [tampil, setTampil] = useState(false);
  const [suntingId, setSuntingId] = useState<number | null>(null);
  const [form, setForm] = useState(KOSONG);
  const [ktp, setKtp] = useState<File | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const muat = async () => {
    const res = await akunFetch<OjtStudent[]>('/ojt');
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

  const bukaSunting = (it: OjtStudent) => {
    setForm({
      name: it.name, id_number: it.id_number, birth_place: it.birth_place,
      birth_date: String(it.birth_date).slice(0, 10), address: it.address,
      institution: it.institution, major: it.major, duration: it.duration,
      start_date: String(it.start_date).slice(0, 10), end_date: String(it.end_date).slice(0, 10),
      phone_number: it.phone_number,
    });
    setSuntingId(it.id);
    setTampil(true);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMengirim(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (ktp) fd.append('identity_card', ktp);
    if (foto) fd.append('photo', foto);

    // Pembaruan memakai POST, bukan PUT: Laravel tidak mengurai multipart pada
    // permintaan PUT — konvensi yang sama dipakai modul berkas lain.
    const res = await akunUpload<OjtStudent>(suntingId ? `/ojt/${suntingId}` : '/ojt', fd);
    setMengirim(false);

    if (!res.ok) {
      setGalat(res.message);

      return;
    }

    await muat();
    setForm(KOSONG);
    setKtp(null);
    setFoto(null);
    setSuntingId(null);
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
          <h1 className="mt-3 text-2xl font-black text-white tracking-tight">Praktik Kerja Lapangan (OJT)</h1>
          <p className="mt-1.5 text-[13px] text-blue-100/85 leading-relaxed max-w-xl">
            Daftarkan diri Anda sebagai peserta OJT di Bandar Udara APT Pranoto. Nilai dan sertifikat
            akan tampil di halaman ini setelah pelaksanaan selesai.
          </p>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {!tampil && (
          <button
            onClick={() => { setSuntingId(null); setForm(KOSONG); setTampil(true); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Daftar OJT
          </button>
        )}

        {tampil && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={kirim}
            className="bg-white ring-1 ring-slate-200 rounded-2xl p-6 space-y-5"
          >
            <h2 className="text-[15px] font-black text-slate-900">
              {suntingId ? 'Ubah Data Peserta' : 'Formulir Pendaftaran OJT'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MEDAN.map((m) => (
                <label key={m.key} className={`block ${m.lebar ? 'sm:col-span-2' : ''}`}>
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">{m.label}</span>
                  <input
                    required type={m.type ?? 'text'} maxLength={125} placeholder={m.placeholder}
                    className={gaya}
                    value={form[m.key]}
                    onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Kartu Identitas <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(JPG, PNG, PDF)</span>
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
                  <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-[12.5px] text-slate-600 truncate">
                    {ktp?.name ?? 'Belum dipilih'}
                  </span>
                  <label className="text-[12px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                    Pilih
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                      onChange={(e) => setKtp(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </label>

              <label className="block">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Pas Foto <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">(JPG, PNG)</span>
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
                  <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-[12.5px] text-slate-600 truncate">
                    {foto?.name ?? 'Belum dipilih'}
                  </span>
                  <label className="text-[12px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                    Pilih
                    <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                      onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </label>
            </div>

            <p className="text-[11.5px] text-slate-400">
              Pembimbing dan unit kerja ditentukan petugas setelah pendaftaran diterima.
            </p>

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
                {mengirim ? 'Menyimpan...' : suntingId ? 'Simpan Perubahan' : 'Kirim Pendaftaran'}
              </button>
              <button
                type="button" onClick={() => { setTampil(false); setSuntingId(null); setGalat(''); }}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13.5px] px-6 py-3 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.form>
        )}

        <h2 className="mt-10 text-[15px] font-black text-slate-900">Data OJT Anda</h2>

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <GraduationCap className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada pendaftaran OJT.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="bg-white ring-1 ring-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-black text-slate-900">{it.name}</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {it.institution} · {it.major} · {it.duration}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {tanggal(it.start_date)} – {tanggal(it.end_date)}
                    </p>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full ring-1 text-[11.5px] font-bold ${RUPA_STATUS[it.status] ?? RUPA_STATUS['Mendaftar']}`}>
                    {it.status}
                  </span>
                </div>

                {it.supervisors.length > 0 && (
                  <p className="mt-2 text-[12px] text-slate-500">
                    Pembimbing: {it.supervisors.join(', ')}
                    {it.work_units.length > 0 && <> · Unit: {it.work_units.join(', ')}</>}
                  </p>
                )}

                {it.available_files.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-slate-400">
                    Berkas terlampir: {it.available_files.map((f) => NAMA_BERKAS[f] ?? f).join(', ')}
                  </p>
                )}

                {/* Nilai dihitung server; halaman ini hanya menampilkannya. */}
                {it.average_score !== null && (
                  <div className="mt-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3">
                    <p className="text-[12px] font-bold text-emerald-900">
                      Nilai akhir {it.average_score} · {it.predicate} ({it.letter_grade})
                    </p>
                    {it.grades && it.grades.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {it.grades.map((g) => (
                          <li key={g.component} className="flex justify-between text-[11.5px] text-emerald-900/85">
                            <span>{g.component}</span>
                            <span className="font-bold tabular-nums">{g.score}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {it.staff_notes && (
                  <p className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 text-[12.5px] text-slate-700 leading-relaxed">
                    <span className="font-bold">Catatan petugas: </span>{it.staff_notes}
                  </p>
                )}

                {it.status === 'Mendaftar' ? (
                  <button
                    onClick={() => bukaSunting(it)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Ubah data
                  </button>
                ) : (
                  <p className="mt-3 text-[11.5px] text-slate-400">
                    Data sudah diproses petugas dan tidak dapat diubah sendiri. Hubungi petugas bila
                    ada yang keliru — nama dan nomor identitas ini tercetak di sertifikat.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
