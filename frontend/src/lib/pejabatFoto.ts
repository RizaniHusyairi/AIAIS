/**
 * Koreksi bingkai foto pejabat — dipakai bersama beranda dan `/profile`.
 *
 * Foto resmi datang dengan kanvas dan bingkai berbeda-beda. Angka di bawah
 * hasil pengukuran kotak-batas alfa tiap PNG (27 Agustus 2026):
 *
 *   berkas        kanvas       kosong atas   tinggi subjek
 *   kadek.png     408×612       12,4%         87,6%
 *   zaldi.png     408×612       10,8%         89,2%
 *   ikhsan.png    1792×2400      7,6%         92,4%
 *   roslan.png    539×702       15,4%         84,6%
 *   murdoko.png   1792×2400     13,2%         86,8%
 *
 * Kelimanya rata dengan tepi bawah kanvas (ruang kosong bawah 0%), jadi
 * `object-bottom` sudah menyamakan garis bawahnya sekaligus menyembunyikan
 * garis potong pinggang di balik tepi kartu. Yang tersisa hanya perbedaan
 * tinggi subjek, dan itulah yang diseragamkan di sini — ke 88,5%, diambil di
 * tengah rentang supaya tidak ada foto yang diperbesar lebih dari 5%.
 *
 * Hanya dua yang menyimpang lebih dari 2%; sisanya sengaja dibiarkan tanpa
 * entri agar tidak ada tambalan yang tak berguna.
 *
 * Skala WAJIB dipasang bersama `origin-bottom`, kalau tidak subjek tumbuh dari
 * titik tengah dan tepi bawahnya terangkat — garis potong yang tadi
 * tersembunyi akan muncul lagi.
 *
 * Aman dipakai pada elemen yang juga dianimasikan framer-motion: Tailwind v4
 * menaruh skala pada properti CSS `scale` tersendiri, sementara framer-motion
 * menulis `transform`, sehingga keduanya menumpuk dan bukan saling menimpa.
 *
 * Kalau foto diganti, ukur ulang kotak-batas alfanya lalu hitung:
 *   skala = 88,5 / tinggi_subjek_dalam_persen
 */
export const PEJABAT_PHOTO_FIT: Record<string, string> = {
  ikhsan: 'scale-[0.96]',
  roslan: 'scale-[1.05]',
};
