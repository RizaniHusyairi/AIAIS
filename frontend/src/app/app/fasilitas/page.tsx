'use client';

/**
 * Direktori fasilitas terminal.
 *
 * SEBELUMNYA LAYAR INI MENGARANG ISINYA: dua belas fasilitas ditulis tetap di
 * dalam berkas — "Duty Free", "Coffee Shop", "Area Bermain" — tanpa hubungan
 * apa pun dengan apa yang benar-benar ada di terminal. Petugas yang menyunting
 * daftar fasilitas di panel admin tidak pernah mengubah apa yang dilihat
 * pengguna ponsel.
 *
 * Kini bersumber `GET /facilities`, sumber yang sama dengan direktori desktop,
 * dan memakai `lib/facilityMeta.ts` supaya warna serta ikon satu fasilitas
 * selalu sama di kedua tampilan.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Facility } from '@/types';
import { facilityCatMeta, facilityIcon } from '@/lib/facilityMeta';
import {
  StatusBar, AppHeader, Segmented, KotakCari, Memuat, LayarKosong,
  listContainer, listItem,
} from '@/components/pwa/ui';
import { Building2, MapPin } from 'lucide-react';

const SEMUA = 'Semua';

export default function FasilitasScreen() {
  const [fasilitas, setFasilitas] = useState<Facility[] | null>(null);
  const [kategori, setKategori] = useState<string>(SEMUA);
  const [cari, setCari] = useState('');

  useEffect(() => {
    fetchApi<Facility[]>('/facilities').then((res) => {
      setFasilitas(res.success && Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  /* Daftar publik hanya menampilkan yang benar-benar dapat dipakai — aturan
     lintas-lapis portal. Panel admin yang menampilkan seluruhnya. */
  const aktif = useMemo(
    () => (fasilitas ?? []).filter((f) => f.is_operational),
    [fasilitas],
  );

  /* Kategori dibangkitkan dari datanya, bukan didaftar tetap: kategori baru
     yang ditambahkan petugas langsung muncul tanpa menyunting berkas ini. */
  const kategoriTersedia = useMemo(() => {
    const set = [...new Set(aktif.map((f) => f.category))].sort();
    return [SEMUA, ...set];
  }, [aktif]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return aktif.filter((f) => {
      const cocokKategori = kategori === SEMUA || f.category === kategori;
      const cocokCari =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.location_description?.toLowerCase().includes(q);
      return cocokKategori && cocokCari;
    });
  }, [aktif, kategori, cari]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Fasilitas" />
        <div className="px-4 pb-3 space-y-3">
          <KotakCari value={cari} onChange={setCari} placeholder="Cari fasilitas…" />
          {kategoriTersedia.length > 1 && (
            <Segmented
              options={kategoriTersedia.map((k) => ({ value: k, label: k }))}
              value={kategori}
              onChange={setKategori}
              layoutId="seg-fasilitas"
            />
          )}
        </div>
      </div>

      {fasilitas === null ? (
        <Memuat label="Memuat fasilitas…" />
      ) : tampil.length === 0 ? (
        <LayarKosong
          icon={Building2}
          judul={aktif.length === 0 ? 'Belum ada data fasilitas' : 'Tidak ada yang cocok'}
          pesan={
            aktif.length === 0
              ? 'Daftar fasilitas terminal belum diisi petugas.'
              : 'Coba kata kunci lain atau pilih kategori Semua.'
          }
        />
      ) : (
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          /* Dua kolom mulai tablet — kartunya pendek, dan satu kolom di layar
             selebar itu menyisakan separuh layar kosong. */
          className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {tampil.map((f) => {
            const meta = facilityCatMeta(f.category);
            const Icon = facilityIcon(f);
            return (
              <motion.div
                key={f.id}
                variants={listItem}
                className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60"
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: meta.color }} strokeWidth={2.1} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14px] leading-snug">{f.name}</p>
                  {f.location_description && (
                    <p className="mt-0.5 flex items-start gap-1 text-[11.5px] text-slate-500 leading-snug">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" />
                      {f.location_description}
                    </p>
                  )}
                  {f.description && (
                    <p className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                      {f.description}
                    </p>
                  )}
                  <span
                    className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {f.category}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
