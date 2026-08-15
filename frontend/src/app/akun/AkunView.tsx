'use client';

/**
 * Beranda akun warga — daftar pengajuan miliknya sendiri.
 *
 * Sesi DIVALIDASI ke backend sebelum apa pun dirender. Memeriksa keberadaan
 * data di `localStorage` saja tidak cukup: nilainya dapat diketik siapa pun
 * lewat konsol peramban, dan hasilnya kerangka halaman tampil lengkap sampai
 * permintaan data pertama kebetulan gagal.
 *
 * Baru satu jenis pengajuan yang tersedia (field trip). Sisanya menyusul, dan
 * daftar `JENIS` di bawah yang menampungnya — bukan halaman baru per jenis.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { akunFetch, muatSesiWarga, keluar, type ApiResult } from '@/lib/akunApi';
import type { FieldTrip, StatusPengajuan } from '@/types';
import type { AdminUser } from '@/types';
import {
  Plane, Plus, LogOut, FileText, Clock, CircleCheck, CircleX, RefreshCw,
  Store, Building2, BadgeCheck, Megaphone, Gavel, HardHat, School,
  PlaneTakeoff, Clock3, GraduationCap,
} from 'lucide-react';

/**
 * Pintu masuk tiap jenis layanan.
 *
 * Slug-nya sama dengan yang terdaftar di `SubmissionRegistry` backend; halaman
 * `/akun/pengajuan/[jenis]` mengambil bentuk formulirnya dari sana. Yang
 * ditulis di sini hanya ikon dan kalimat pengantarnya — dua hal yang memang
 * urusan tampilan dan tidak layak dikirim lewat API.
 */
const LAYANAN = [
  { nama: 'Kunjungan Lapangan', href: '/akun/field-trip/baru', icon: School, desc: 'Field trip sekolah, kampus, atau instansi' },
  { nama: 'Pengajuan Tenant', href: '/akun/pengajuan/tenant', icon: Store, desc: 'Membuka gerai di area bandara' },
  { nama: 'Sewa Ruang & Lahan', href: '/akun/pengajuan/sewa', icon: Building2, desc: 'Sewa ruang usaha, lahan, atau peralatan' },
  { nama: 'Perizinan Usaha', href: '/akun/pengajuan/perizinan-usaha', icon: BadgeCheck, desc: 'Izin usaha dan perpanjangannya' },
  { nama: 'Pengiklanan', href: '/akun/pengajuan/pengiklanan', icon: Megaphone, desc: 'Billboard, videotron, dan media lainnya' },
  { nama: 'Beauty Contest', href: '/akun/pengajuan/beauty-contest', icon: Gavel, desc: 'Seleksi terbuka ruang usaha' },
  { nama: 'Izin Kerja', href: '/akun/pengajuan/izin-kerja', icon: HardHat, desc: 'Pekerjaan di sisi udara maupun darat' },
  // Tiga di bawah punya halamannya sendiri: bentuk isiannya bukan judul dan
  // uraian, melainkan rencana penerbangan dan rekam peserta.
  { nama: 'Slot Charter', href: '/akun/slot-charter', icon: PlaneTakeoff, desc: 'Slot untuk penerbangan charter' },
  { nama: 'Extend Advance', href: '/akun/extend-advance', icon: Clock3, desc: 'Beroperasi di luar jam layanan bandara' },
  { nama: 'Praktik Kerja (OJT)', href: '/akun/ojt', icon: GraduationCap, desc: 'Pendaftaran peserta magang bandara' },
];

/** Rupa tiap status. Warna TIDAK berdiri sendiri — ikon dan teks menyertainya. */
export const RUPA_STATUS: Record<StatusPengajuan, { warna: string; latar: string; ikon: typeof Clock }> = {
  'Diajukan': { warna: 'text-slate-700', latar: 'bg-slate-100 ring-slate-200', ikon: Clock },
  'Disetujui': { warna: 'text-emerald-700', latar: 'bg-emerald-50 ring-emerald-200', ikon: CircleCheck },
  'Ditolak': { warna: 'text-rose-700', latar: 'bg-rose-50 ring-rose-200', ikon: CircleX },
  'Revisi Diperlukan': { warna: 'text-amber-700', latar: 'bg-amber-50 ring-amber-200', ikon: RefreshCw },
};

export function LencanaStatus({ status }: { status: StatusPengajuan }) {
  const rupa = RUPA_STATUS[status] ?? RUPA_STATUS['Diajukan'];
  const Ikon = rupa.ikon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 text-[11.5px] font-bold ${rupa.latar} ${rupa.warna}`}>
      <Ikon className="w-3.5 h-3.5" /> {status}
    </span>
  );
}

export default function AkunView() {
  const router = useRouter();
  const [warga, setWarga] = useState<AdminUser | null>(null);
  const [items, setItems] = useState<FieldTrip[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let batal = false;

    (async () => {
      const sesi = await muatSesiWarga();

      if (batal) return;

      if (!sesi) {
        router.replace('/masuk');

        return;
      }

      // Pengelola yang tersasar ke sini diantar ke panelnya, bukan dibiarkan
      // menatap area kosong — token panel memang ditolak seluruh /akun.
      if (sesi.role === 'admin' || sesi.role === 'staff') {
        router.replace('/admin/dashboard');

        return;
      }

      setWarga(sesi);

      const res: ApiResult<FieldTrip[]> = await akunFetch<FieldTrip[]>('/fieldtrips');

      if (batal) return;

      setItems(Array.isArray(res.data) ? res.data : []);
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, [router]);

  if (!warga) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" aria-busy="true">
        <p className="text-[13px] text-slate-500">Memeriksa sesi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center flex-shrink-0">
              <Plane className="w-6 h-6 text-sky-200" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200/80">Akun Layanan</p>
              <h1 className="mt-0.5 text-2xl font-black text-white tracking-tight">{warga.name}</h1>
              <p className="mt-1 text-[12.5px] text-blue-100/80">{warga.email}</p>
            </div>
          </div>

          <button
            onClick={async () => { await keluar(); router.push('/'); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/25 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10">
        {/* ---- Pintu masuk tiap jenis layanan ---- */}
        <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Layanan yang Dapat Diajukan</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Setiap pengajuan ditinjau petugas, dan hasilnya tampil di halaman layanannya masing-masing.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LAYANAN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group bg-white ring-1 ring-slate-200 hover:ring-blue-300 rounded-2xl p-5 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <l.icon className="w-4.5 h-4.5 text-blue-600" />
              </span>
              <p className="mt-3 text-[13.5px] font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                {l.nama}
              </p>
              <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{l.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Pengajuan Kunjungan Lapangan</h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Kunjungan sekolah, perguruan tinggi, atau instansi ke area bandara.
            </p>
          </div>

          <Link
            href="/akun/field-trip/baru"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajukan Baru
          </Link>
        </div>

        {memuat ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-white ring-1 ring-slate-200 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="mt-3 text-[13.5px] font-bold text-slate-700">Belum ada pengajuan.</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Kirim pengajuan pertama Anda lewat tombol Ajukan Baru di atas.
            </p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="mt-6 space-y-3"
          >
            {items.map((it) => (
              <motion.li
                key={it.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className="bg-white ring-1 ring-slate-200 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-black text-slate-900">{it.fieldtrip_name}</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {it.fieldtrip_type} · {it.document_count} berkas ·{' '}
                      {new Date(it.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                    href={it.reply_document_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="w-4 h-4" /> Buka surat balasan
                  </a>
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </main>
    </div>
  );
}
