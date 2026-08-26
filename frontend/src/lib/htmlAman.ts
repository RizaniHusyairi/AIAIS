import DOMPurify from 'isomorphic-dompurify';

/**
 * Daftar putih HTML untuk isi yang ditulis petugas.
 *
 * KENAPA INI ADA. Portal publik, panel admin, dan proksi `/api/admin` berjalan
 * pada SATU origin. Cookie sesi bersifat `httpOnly`, sehingga skrip tidak dapat
 * membaca tokennya — tetapi cookie tetap ikut terkirim otomatis pada permintaan
 * same-origin. Artinya satu potong skrip yang tersimpan di isi berita atau
 * jawaban FAQ dapat memanggil endpoint admin atas nama petugas yang sedang
 * masuk, tanpa perlu mencuri apa pun.
 *
 * Isinya memang ditulis petugas sendiri, jadi ini bukan soal tidak mempercayai
 * mereka: teks yang ditempel dari sumber lain kerap membawa markah tak terduga,
 * dan satu akun admin yang jebol seharusnya tidak langsung berarti seluruh
 * panel dapat dikendalikan dari halaman publik.
 *
 * Daftar tag dibatasi pada yang benar-benar dipakai editor teks kaya v1.
 * Menambah tag ke daftar ini adalah keputusan keamanan — jangan dilakukan
 * hanya karena satu tulisan tampak kurang rapi.
 *
 * KENAPA DI SINI, BUKAN DI `SafeHtml`. Editor pada panel admin harus
 * menghasilkan tepat himpunan tag yang sama dengan yang dirender halaman
 * publik. Kalau daftarnya disalin ke dua tempat, cepat atau lambat keduanya
 * berbeda dan petugas akan menulis format yang diam-diam hilang saat terbit.
 *
 * Perhatikan `img` TIDAK ada di daftar. Karena itu editor tidak boleh punya
 * tombol sisip gambar: gambarnya akan tampak saat menulis lalu lenyap begitu
 * beritanya dibaca pengunjung. Gambar berita masuk lewat kolom sampul.
 */

export const TAG_DIIZINKAN = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'h2', 'h3', 'h4',
  'blockquote', 'a', 'span',
];

export const ATRIBUT_DIIZINKAN = ['href', 'target', 'rel', 'class'];

/** `javascript:` dan `data:` pada href ditolak; hanya skema aman yang lewat. */
export const SKEMA_URI_AMAN = /^(?:https?:|mailto:|tel:|#|\/)/i;

/** Saring HTML sesuai daftar putih di atas. */
export function bersihkanHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: TAG_DIIZINKAN,
    ALLOWED_ATTR: ATRIBUT_DIIZINKAN,
    ALLOWED_URI_REGEXP: SKEMA_URI_AMAN,
  });
}
