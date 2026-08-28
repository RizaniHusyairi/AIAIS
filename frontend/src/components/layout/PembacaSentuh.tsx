'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAksesibilitas } from '@/lib/aksesibilitas';
import { useBahasa } from '@/lib/bahasa';
import { ucapkanSekali, hentikanUcapan } from '@/lib/bacaNyaring';

/**
 * Membacakan teks yang disentuh kursor atau menerima fokus papan tik.
 *
 * Menyala hanya ketika penyetelan `baca` dinyalakan dari panel aksesibilitas.
 * Sebelum ini baca-nyaring hanya punya satu perilaku — tekan tombol, seluruh
 * halaman dibacakan dari awal — yang tidak berguna bagi orang yang cuma ingin
 * tahu bunyi satu baris tabel jadwal.
 *
 * SATU pendengar di tingkat dokumen, bukan penangan per elemen. Portal ini
 * merender ribuan simpul teks pada halaman padat seperti papan jadwal;
 * memasang penangan pada masing-masingnya berarti ribuan pendaftaran yang
 * harus ikut dibongkar setiap kali daftarnya disegarkan tiap menit. Peristiwa
 * `pointerover` dan `focusin` sama-sama menggelembung, jadi satu pendengar di
 * `document` sudah menangkap semuanya — termasuk simpul yang baru muncul
 * sesudah pendengarnya terpasang.
 */

/** Jeda diam sebelum sebuah sasaran benar-benar dibacakan. */
const TUNDA = 220;

/**
 * Batas panjang satu pembacaan.
 *
 * Sasarannya selalu elemen terdalam di bawah kursor, jadi biasanya pendek.
 * Batas ini menjaga kasus sebaliknya: elemen yang kebetulan membungkus satu
 * bagian halaman penuh tidak boleh berubah menjadi pidato dua menit yang
 * hanya bisa dihentikan dengan mematikan penyetelannya.
 */
const MAKS = 600;

/**
 * Wilayah yang tidak boleh ikut dibacakan.
 *
 * Panel aksesibilitas ada di dalam daftar ini dan itu bukan pilihan gaya:
 * sakelar penyalanya sendiri berada di dalam panel, sehingga tanpa
 * pengecualian ini pemakai yang hendak MEMATIKAN mode ini harus menyeberangi
 * panel yang membacakan setiap keterangan yang dilewati kursornya.
 */
const LEWATI = '[data-baca-lewati], [aria-hidden="true"], svg, canvas';

/** Elemen yang tidak menyimpan teks untuk dibaca, sependek apa pun isinya. */
const BUKAN_TEKS = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'IMG', 'VIDEO', 'INPUT']);

/**
 * Teks milik satu elemen, atau string kosong bila tidak ada yang layak dibaca.
 *
 * `innerText`, bukan `textContent`: yang pertama mengikuti apa yang benar-benar
 * TERLIHAT — melewatkan simpul tersembunyi dan menghormati pemenggalan baris —
 * sedangkan yang kedua ikut memungut teks di balik `display:none`, termasuk
 * label menu yang sedang tertutup.
 */
function teksDari(el: Element): string {
  if (BUKAN_TEKS.has(el.tagName)) return '';
  if (el.closest(LEWATI)) return '';

  const teks = (el as HTMLElement).innerText ?? '';
  return teks.replace(/\s+/g, ' ').trim().slice(0, MAKS);
}

export default function PembacaSentuh() {
  const { baca } = useAksesibilitas();
  const bahasa = useBahasa();
  const pathname = usePathname();

  useEffect(() => {
    if (!baca) return;

    let pewaktu = 0;
    let terakhir: Element | null = null;
    let disorot: HTMLElement | null = null;

    const lepasSorotan = () => {
      disorot?.removeAttribute('data-baca-sorot');
      disorot = null;
    };

    const bacakan = (el: Element) => {
      const teks = teksDari(el);
      if (!teks) return;

      lepasSorotan();
      disorot = el as HTMLElement;
      disorot.setAttribute('data-baca-sorot', '');

      ucapkanSekali(teks, bahasa);
    };

    const jadwalkan = (sasaran: Element | null) => {
      if (!sasaran || sasaran === terakhir) return;
      terakhir = sasaran;

      /* Penundaannya penting. Tanpa itu, menyeberangi halaman untuk meraih
         satu tautan akan memicu pembacaan setiap elemen yang kebetulan
         terlewati — dan karena tiap ucapan baru membatalkan yang sebelumnya,
         yang terdengar hanyalah rentetan suku kata terpotong. */
      window.clearTimeout(pewaktu);
      pewaktu = window.setTimeout(() => bacakan(sasaran), TUNDA);
    };

    const onPointer = (e: PointerEvent) => {
      const t = e.target;
      jadwalkan(t instanceof Element ? t : null);
    };

    /* Papan tik WAJIB ikut dilayani. Mode ini justru dipakai orang yang
       kesulitan membaca layar, dan sebagian di antaranya menyusur halaman
       dengan Tab, bukan dengan tetikus. Tanpa baris ini fitur aksesibilitas
       ini hanya melayani pemakai yang bertetikus. */
    const onFokus = (e: FocusEvent) => {
      const t = e.target;
      jadwalkan(t instanceof Element ? t : null);
    };

    /* Kursor meninggalkan jendela: diam, dan lepaskan sorotannya. Sisa ucapan
       yang terus mengoceh setelah pemakai berpindah ke jendela lain adalah
       kelakuan yang paling cepat membuat fitur ini dimatikan selamanya. */
    const onKeluar = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      window.clearTimeout(pewaktu);
      terakhir = null;
      lepasSorotan();
      hentikanUcapan();
    };

    document.addEventListener('pointerover', onPointer, { passive: true });
    document.addEventListener('focusin', onFokus);
    document.addEventListener('pointerout', onKeluar, { passive: true });

    return () => {
      window.clearTimeout(pewaktu);
      document.removeEventListener('pointerover', onPointer);
      document.removeEventListener('focusin', onFokus);
      document.removeEventListener('pointerout', onKeluar);
      lepasSorotan();
      hentikanUcapan();
    };
    // `pathname` ikut: berpindah halaman membuang seluruh DOM lama, dan
    // sasaran yang tersimpan di `terakhir` beserta sorotannya ikut menjadi
    // rujukan ke elemen yang sudah tidak ada.
  }, [baca, bahasa, pathname]);

  return null;
}
