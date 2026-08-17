'use client';

/**
 * Satu layar daftar dokumen, dipakai berulang.
 *
 * Delapan daftar di portal ini berbentuk sama persis — judul, keterangan
 * singkat, dan satu tautan berkas: Surat Keputusan, Surat Edaran, Pusat
 * Unduhan, Regulasi PPID, Standar Pelayanan, Informasi Berkala, Informasi
 * Serta-Merta, Informasi Setiap Saat, dan Laporan Layanan Informasi. Bentuk
 * datanya berbeda-beda (`Letter`, `DocumentItem`, `PeriodicDocument`, …)
 * karena tabelnya memang warisan v1 yang tidak seragam.
 *
 * Menulis satu layar per daftar berarti sembilan berkas yang harus dijaga
 * agar tetap serupa, dan pengalamannya pasti menyimpang begitu satu di
 * antaranya disunting. Komponen ini menerima ADAPTOR — fungsi kecil yang
 * memetakan satu baris apa pun menjadi `Dokumen` — sehingga bentuk datanya
 * tinggal di `lib/pwaDokumen.ts` dan tampilannya cukup ada di sini.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import {
  StatusBar, AppHeader, KotakCari, Memuat, LayarKosong, listContainer, listItem,
} from '@/components/pwa/ui';
import { FileText, ExternalLink, FolderOpen } from 'lucide-react';

/** Bentuk seragam yang dimengerti layar ini. */
export type Dokumen = {
  /** Kunci React; harus unik dalam satu daftar. */
  id: string | number;
  judul: string;
  /** Baris keterangan di bawah judul: nomor surat, tahun, ukuran berkas. */
  meta?: string;
  /** Pengelompokan opsional; kartu-kartunya diberi judul kelompok. */
  kelompok?: string;
  /** Null berarti berkasnya tidak ada — barisnya tidak ditampilkan. */
  tautan: string | null;
  /** Teks tombolnya, bila bukan "Buka". */
  labelTautan?: string;
};

export default function DaftarDokumen<T>({
  judul,
  endpoint,
  adaptor,
  keteranganKosong,
  pengantar,
}: {
  judul: string;
  /** Lintasan API publik, mis. `/letters?type=keputusan`. */
  endpoint: string;
  adaptor: (baris: T) => Dokumen;
  keteranganKosong?: string;
  pengantar?: React.ReactNode;
}) {
  const [baris, setBaris] = useState<T[] | null>(null);
  const [cari, setCari] = useState('');

  useEffect(() => {
    let batal = false;

    fetchApi<T[]>(endpoint).then((res) => {
      if (batal) return;
      setBaris(res.success && Array.isArray(res.data) ? res.data : []);
    });

    return () => { batal = true; };
  }, [endpoint]);

  /**
   * Daftar publik hanya menampilkan yang berkasnya benar-benar ada — aturan
   * lintas-lapis portal. Panel admin yang menampilkan seluruhnya lengkap
   * dengan penanda, supaya petugas tahu mana yang bermasalah.
   */
  const dokumen = useMemo(
    () => (baris ?? []).map(adaptor).filter((d) => !!d.tautan),
    [baris, adaptor],
  );

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return dokumen;
    return dokumen.filter(
      (d) => d.judul.toLowerCase().includes(q) || d.meta?.toLowerCase().includes(q),
    );
  }, [dokumen, cari]);

  /* Kelompok dipertahankan urutan kemunculannya — backend sudah mengurutkan,
     dan mengurutkan ulang di sini akan melawan urutan yang dipilih petugas. */
  const kelompok = useMemo(() => {
    const peta = new Map<string, Dokumen[]>();
    for (const d of tampil) {
      const k = d.kelompok ?? '';
      if (!peta.has(k)) peta.set(k, []);
      peta.get(k)!.push(d);
    }
    return [...peta.entries()];
  }, [tampil]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title={judul} />
        {dokumen.length > 4 && (
          <div className="px-4 pb-3">
            <KotakCari value={cari} onChange={setCari} placeholder={`Cari di ${judul.toLowerCase()}…`} />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl p-4 space-y-4">
        {pengantar}

        {baris === null ? (
          <Memuat label="Memuat dokumen…" />
        ) : tampil.length === 0 ? (
          <LayarKosong
            icon={FolderOpen}
            judul={dokumen.length === 0 ? 'Belum ada dokumen' : 'Tidak ada yang cocok'}
            pesan={
              dokumen.length === 0
                ? keteranganKosong ?? 'Dokumen pada bagian ini belum diunggah petugas.'
                : 'Coba kata kunci lain.'
            }
          />
        ) : (
          kelompok.map(([namaKelompok, isi]) => (
            <div key={namaKelompok || 'tanpa-kelompok'} className="space-y-2.5">
              {namaKelompok && (
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 px-1">
                  {namaKelompok}
                </h2>
              )}

              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
              >
                {isi.map((d) => (
                  <motion.a
                    key={d.id}
                    variants={listItem}
                    href={d.tautan!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                  >
                    <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" strokeWidth={2.1} />
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-bold text-slate-900 leading-snug">
                        {d.judul}
                      </span>
                      {d.meta && (
                        <span className="block text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                          {d.meta}
                        </span>
                      )}
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600">
                        {d.labelTautan ?? 'Buka dokumen'} <ExternalLink className="w-3 h-3" />
                      </span>
                    </span>
                  </motion.a>
                ))}
              </motion.div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
