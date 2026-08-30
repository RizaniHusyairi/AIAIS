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
import { AnimatePresence, motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Facility } from '@/types';
import { facilityCatMeta, facilityIcon } from '@/lib/facilityMeta';
import {
  StatusBar, AppHeader, Segmented, KotakCari, Memuat, LayarKosong,
  listContainer, listItem,
} from '@/components/pwa/ui';
import { Building2, MapPin, X } from 'lucide-react';

const SEMUA = 'Semua';

export default function FasilitasScreen() {
  const [fasilitas, setFasilitas] = useState<Facility[] | null>(null);
  const [kategori, setKategori] = useState<string>(SEMUA);
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState<Facility | null>(null);

  /* Foto yang gagal dimuat dicatat per fasilitas, bukan disembunyikan diam
     diam: kartunya harus jatuh ke ikon kategori, bukan menyisakan kotak
     kosong. `image_url` sudah null dari server bila lintasannya tak ditemukan,
     jadi ini hanya menangkap berkas yang raib setelah respons dibuat. */
  const [fotoGagal, setFotoGagal] = useState<Record<number, true>>({});

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
              <motion.button
                key={f.id}
                type="button"
                variants={listItem}
                onClick={() => setDipilih(f)}
                className="w-full text-left flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.985] transition-transform"
              >
                {f.image_url && !fotoGagal[f.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFotoGagal((s) => ({ ...s, [f.id]: true }))}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 bg-slate-100"
                  />
                ) : (
                  <span
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: meta.color }} strokeWidth={2.1} />
                  </span>
                )}

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
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Lembar bawah — bukan lightbox tengah layar: di ponsel isian sepanjang
          ini lebih terjangkau ibu jari bila muncul dari bawah. */}
      <AnimatePresence>
        {dipilih && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDipilih(null)}
            role="dialog"
            aria-modal="true"
            aria-label={dipilih.name}
            /* z-50 mengalahkan bilah bawah lima slot. */
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="w-full max-h-[86vh] overflow-y-auto bg-white rounded-t-3xl"
            >
              <div className="sticky top-0 z-10 pt-2.5 pb-2 flex justify-center bg-white">
                <span className="w-10 h-1 rounded-full bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setDipilih(null)}
                  aria-label="Tutup"
                  className="absolute right-3 top-2 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {dipilih.image_url && !fotoGagal[dipilih.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dipilih.image_url}
                  alt={dipilih.name}
                  className="w-full aspect-[16/10] object-cover bg-slate-100"
                />
              )}

              {/* pb-8 menjaga isian terakhir tidak tertutup area gestur. */}
              <div className="p-4 pb-8">
                {(() => {
                  const meta = facilityCatMeta(dipilih.category);

                  /* Migrasi v1 menyalin `details` ke `description`, sehingga
                     keduanya kerap memuat kalimat yang sama persis. Ringkasan
                     hanya ditampilkan bila ia menambah sesuatu di luar butir. */
                  const butir = (dipilih.details ?? []).map((d) => d.trim()).filter(Boolean);
                  const ringkas = (dipilih.description ?? '').trim();
                  const rapikan = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
                  const ringkasBerbeda = ringkas !== '' && rapikan(ringkas) !== rapikan(butir.join(' '));

                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {dipilih.category}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            dipilih.is_operational ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dipilih.is_operational ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {dipilih.is_operational ? 'Beroperasi' : 'Tidak Beroperasi'}
                        </span>
                      </div>

                      <h2 className="mt-2.5 text-[19px] font-black text-slate-900 leading-snug">{dipilih.name}</h2>

                      {(ringkasBerbeda || butir.length === 0) && (
                        <p className="mt-2 text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
                          {ringkas || 'Fasilitas resmi Bandara APT Pranoto Samarinda.'}
                        </p>
                      )}

                      {butir.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {butir.map((d) => (
                            <li key={d} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]"
                                style={{ backgroundColor: meta.color }}
                              />
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}

                      {dipilih.location_description && (
                        <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200 flex items-start gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Lokasi</p>
                            <p className="mt-0.5 text-[13px] text-slate-700 leading-relaxed">{dipilih.location_description}</p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
