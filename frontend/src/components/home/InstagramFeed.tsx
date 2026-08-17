'use client';

/**
 * Umpan unggahan Instagram — bagian yang bergulir saja.
 *
 * Cangkangnya (kepala, garis perforasi, kaki) ada di `HeroBoardingPass`;
 * berkas ini hanya isi yang digulir, supaya bentuk boarding pass dan mekanisme
 * gulirnya dapat berubah masing-masing tanpa saling mengganggu.
 *
 * ────────────────────────────────────────────────────────────────────────
 * TIGA HAL YANG JANGAN DIUBAH TANPA MEMBACA ALASANNYA
 *
 *  1. `overscroll-behavior` DIBIARKAN PADA NILAI BAWAAN. Area bergulir di
 *     dalam hero menangkap roda tetikus pengunjung yang sebenarnya hendak
 *     menggulir halaman. Dengan nilai bawaan (`auto`), begitu daftarnya mentok
 *     gulirannya diteruskan ke halaman. `overscroll-contain` justru
 *     memerangkap.
 *
 *  2. TIDAK ADA PUTAR-OTOMATIS. Konten yang berpindah sendiri di muka halaman
 *     resmi menarik mata sepanjang waktu, dan pengunjung kehilangan kendali
 *     atas apa yang sedang dibacanya.
 *
 *  3. GAMBARNYA SELALU `image_url` — salinan lokal. URL CDN Meta mati dalam
 *     hitungan jam; menampilkannya langsung menghasilkan beranda penuh gambar
 *     rusak menjelang sore. Lihat `InstagramSync` di backend.
 *
 *  4. TINGGINYA DIATUR INDUK, BUKAN ANGKA DI SINI. Komponen ini mengisi ruang
 *     yang tersisa lewat `flex-1 min-h-0`, dan tiap unggahan setinggi `h-full`
 *     wadah gulirnya. Sebelumnya tingginya berupa angka piksel yang dihitung
 *     induknya dengan cara mengurangi tinggi bilah status, kepala, dan kaki —
 *     hitungan itu melupakan satu baris, umpannya 45px lebih tinggi daripada
 *     ruang yang ada, dan takarir unggahan terakhir tergunting. Angka semacam
 *     itu akan meleset lagi pada suntingan tata letak berikutnya.
 * ────────────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { InstagramPost } from '@/types';

function tanggalTampil(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function InstagramFeed({ posts }: { posts: InstagramPost[] }) {
  const kurangiGerak = useReducedMotion();
  const wadah = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);

  /**
   * Unggahan yang sedang terlihat, dihitung dari posisi guliran.
   *
   * Diambil dari `scrollTop` dan bukan IntersectionObserver: tinggi tiap
   * unggahan sama persis, jadi pembagian sederhana sudah tepat dan tidak
   * menambah pengamat yang harus dibersihkan.
   */
  const perbaruiAktif = useCallback(() => {
    const el = wadah.current;
    if (!el) return;
    setAktif(Math.round(el.scrollTop / (el.clientHeight || 1)));
  }, []);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    el.addEventListener('scroll', perbaruiAktif, { passive: true });
    return () => el.removeEventListener('scroll', perbaruiAktif);
  }, [perbaruiAktif]);

  const keUnggahan = (i: number) => {
    const el = wadah.current;
    if (!el) return;
    el.scrollTo({ top: i * el.clientHeight, behavior: kurangiGerak ? 'auto' : 'smooth' });
  };

  if (posts.length === 0) return null;

  const banyak = posts.length > 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        ref={wadah}
        className="relative flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory"
        // `scrollbarWidth` disembunyikan agar bingkai kartunya tetap bersih;
        // `overscroll-behavior` sengaja tidak disetel — lihat butir 1.
        style={{ scrollbarWidth: 'none' }}
        tabIndex={0}
        role="region"
        aria-label="Unggahan Instagram terbaru bandara"
      >
        {posts.map((p) => {
          const isi = (
            <>
              {/*
                `flex-1 min-h-0` DAN BUKAN `aspect-square`.

                Dengan rasio persegi, tinggi gambar mengikuti lebar kartu
                sehingga gambar plus takarir melampaui tinggi satu unggahan dan
                takarirnya tergunting oleh unggahan berikutnya. Dengan `flex-1`,
                gambarlah yang mengalah dan takarir selalu utuh.
              */}
              <div className="relative flex-1 min-h-0 bg-slate-100 overflow-hidden">
                {p.is_video ? (
                  /*
                   * `controls` ADA, `autoPlay` TIDAK.
                   *
                   * Video yang berjalan sendiri di muka halaman resmi menarik
                   * mata sepanjang waktu — alasan yang sama dengan butir 2 di
                   * kepala berkas ini soal putar-otomatis. `preload="metadata"`
                   * cukup untuk menampilkan bingkai pertama tanpa mengunduh
                   * seluruh videonya di layar pertama.
                   */
                  <video
                    src={p.image_url ?? ''}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={p.caption_excerpt ?? 'Video unggahan Instagram bandara'}
                    className="w-full h-full object-cover bg-slate-900"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- salinan lokal, bukan aset remote
                  <img
                    src={p.image_url ?? ''}
                    alt={p.caption_excerpt ?? 'Unggahan Instagram bandara'}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
              </div>

              <div className="flex-shrink-0 px-5 py-2.5">
                {p.caption_excerpt && (
                  /* Takarir dirender sebagai TEKS POLOS. Ia datang dari luar
                     sistem — dari Instagram atau dari ketikan petugas — dan
                     tidak ada alasan melewatkannya sebagai HTML. */
                  <p className="text-[12px] text-slate-700 leading-relaxed line-clamp-2">
                    {p.caption_excerpt}
                  </p>
                )}
                <p className="mt-1 text-[10.5px] text-slate-400">{tanggalTampil(p.posted_at)}</p>
              </div>
            </>
          );

          return (
            <div key={p.id} className="snap-start h-full flex flex-col">
              {/* Unggahan manual boleh tidak bertautan; yang tanpa tautan
                  dirender sebagai blok biasa, bukan tautan mati. Keduanya
                  meneruskan rantai flex supaya `flex-1` pada gambar benar-benar
                  mengukur sisa ruang. */}
              {p.permalink ? (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-0 flex flex-col group"
                >
                  {isi}
                </a>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col group">{isi}</div>
              )}
            </div>
          );
        })}
      </div>

      {banyak && (
        <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2">
          {posts.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => keUnggahan(i)}
              aria-label={`Ke unggahan ${i + 1}`}
              aria-current={i === aktif}
              className={`rounded-full transition-all cursor-pointer ${
                i === aktif ? 'w-5 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Petunjuk gulir — hilang begitu pengunjung benar-benar menggulir. */}
      {banyak && aktif === 0 && (
        <p className="flex-shrink-0 flex items-center justify-center gap-1 pb-1.5 text-[10px] text-slate-400">
          <ChevronDown className="w-3 h-3" /> Gulir untuk unggahan lainnya
        </p>
      )}
    </div>
  );
}
