/**
 * Bawaan tampilan statistik lalu lintas udara.
 *
 * Satuan tiap kategori BERBEDA — pesawat dan penumpang dihitung per satuan,
 * bagasi dan kargo dalam kilogram. Menaruh keempatnya pada satu grafik
 * menuntut dua sumbu berbeda skala, yang membuat dua garis tampak dapat
 * dibandingkan padahal tidak. Karena itu tiap kategori mendapat grafiknya
 * sendiri.
 */

/**
 * Warna dua seri: kedatangan dan keberangkatan.
 *
 * Diambil dari palet kategorikal yang sudah tervalidasi — pemisahan ΔE 24,7
 * pada simulasi buta warna protan, jauh di atas ambang 8. Jangan menggantinya
 * dengan warna pilihan sendiri tanpa memvalidasi ulang.
 *
 * Identitas seri TIDAK pernah bergantung warna semata: legenda selalu ada dan
 * tabel data menyediakan angkanya dalam teks.
 */
export const WARNA_SERI = {
  arrival: '#2a78d6',
  departure: '#eb6834',
} as const;

/** Format angka bergaya Indonesia; nol tetap ditulis nol, bukan tanda hubung. */
export const angka = (n: number) => n.toLocaleString('id-ID');
