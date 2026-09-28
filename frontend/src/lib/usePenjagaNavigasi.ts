'use client';

/**
 * Cegah isian formulir hilang saat pengguna berpindah halaman.
 *
 * `beforeunload` saja tidak cukup: ia hanya bekerja saat tab ditutup atau
 * dimuat ulang. Navigasi di dalam aplikasi — tautan <Link>, tombol kembali
 * browser, gestur kembali Android, dan tombol ← di kepala PWA yang memanggil
 * `router.back()` — melepas halaman tanpa pernah memicunya. Proyek ini tidak
 * memakai `cacheComponents`, jadi halaman yang ditinggalkan benar-benar
 * dilepas beserta isiannya.
 *
 * Tiga penjaga:
 *  1. `beforeunload` untuk tutup tab, muat ulang, dan tautan ke situs lain.
 *  2. Klik tautan sesama origin dicegat di fase capture pada `document`,
 *     sebelum pendengar React milik <Link> sempat bernavigasi.
 *  3. Satu entri riwayat "penjaga" ber-URL sama. Tombol kembali pertama hanya
 *     mundur ke entri asli halaman ini (router Next memulihkan pohon yang
 *     sama, tidak ada yang dilepas), dan di situlah dialog ditampilkan.
 *
 * Hook ini tidak merender apa pun; pemakainya menampilkan dialog dari
 * `tujuan`, lalu memanggil `tetap()` atau `tinggalkan()`.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type TujuanNavigasi = { jenis: 'tautan'; href: string } | { jenis: 'kembali' };

/** Tambah entri penjaga ber-URL sama. `pushState` yang dipatch Next menyalin state internalnya ke entri ini. */
function pasangPenjaga(diPenjaga: { current: boolean }) {
  window.history.pushState({}, '', window.location.href);
  diPenjaga.current = true;
}

export function usePenjagaNavigasi(aktif: boolean) {
  const router = useRouter();
  const [tujuan, setTujuan] = useState<TujuanNavigasi | null>(null);
  /** Pengguna sudah memilih pergi; semua penjaga minggir. */
  const pergi = useRef(false);
  /**
   * Pengguna sedang berada di entri penjaga. Dicatat di sini, BUKAN sebagai
   * penanda di `history.state`: router Next memanggil `replaceState` dengan
   * objek baru setiap kali state-nya berubah, dan penanda seperti itu ikut
   * terhapus — sudah teramati saat pengujian.
   */
  const diPenjaga = useRef(false);

  // 1. Tutup tab, muat ulang, tautan keluar situs.
  useEffect(() => {
    if (!aktif) return;
    const cegah = (e: BeforeUnloadEvent) => {
      if (!pergi.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', cegah);
    return () => window.removeEventListener('beforeunload', cegah);
  }, [aktif]);

  // 2. Klik tautan di dalam situs.
  useEffect(() => {
    if (!aktif) return;
    const klik = (e: MouseEvent) => {
      if (pergi.current || e.defaultPrevented || e.button !== 0) return;
      // Ctrl/⌘/Shift-klik membuka tab baru; halaman ini tetap utuh.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // ditangani beforeunload
      // Tautan jangkar di halaman yang sama tidak meninggalkan formulir.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      setTujuan({ jenis: 'tautan', href: url.pathname + url.search + url.hash });
    };
    document.addEventListener('click', klik, true);
    return () => document.removeEventListener('click', klik, true);
  }, [aktif]);

  // 3. Tombol kembali.
  useEffect(() => {
    if (!aktif) {
      // Formulir tidak lagi berisi (mis. sudah terkirim): cabut entri penjaga
      // supaya tombol kembali berikutnya langsung ke halaman sebelumnya,
      // bukan ke salinan halaman ini.
      if (diPenjaga.current) window.history.back();
      diPenjaga.current = false;
      return;
    }

    const urlDijaga = window.location.href;
    // Diperiksa dulu: StrictMode menjalankan efek dua kali saat pasang,
    // dan penjaga tidak boleh bertumpuk.
    if (!diPenjaga.current) pasangPenjaga(diPenjaga);

    const pindah = () => {
      if (pergi.current || window.location.href !== urlDijaga) return;
      if (diPenjaga.current) {
        // Mundur dari entri penjaga ke entri asli halaman ini.
        diPenjaga.current = false;
        setTujuan({ jenis: 'kembali' });
      } else {
        // Maju lagi ke entri penjaga (mis. tombol maju saat dialog terbuka).
        diPenjaga.current = true;
        setTujuan(null);
      }
    };
    window.addEventListener('popstate', pindah);
    return () => window.removeEventListener('popstate', pindah);
  }, [aktif]);

  const tetap = () => {
    // Tombol kembali tadi sudah memakai entri penjaga; pasang lagi.
    if (tujuan?.jenis === 'kembali' && !diPenjaga.current) pasangPenjaga(diPenjaga);
    setTujuan(null);
  };

  const tinggalkan = () => {
    const t = tujuan;
    pergi.current = true;
    setTujuan(null);
    if (t?.jenis === 'tautan') router.push(t.href);
    else window.history.back();
  };

  return { tujuan, tetap, tinggalkan };
}
