'use client';

import DOMPurify from 'isomorphic-dompurify';

/**
 * Render HTML yang berasal dari panel admin, sesudah disaring.
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
 */

const TAG_DIIZINKAN = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'h2', 'h3', 'h4',
  'blockquote', 'a', 'span',
];

const ATRIBUT_DIIZINKAN = ['href', 'target', 'rel', 'class'];

export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  const bersih = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: TAG_DIIZINKAN,
    ALLOWED_ATTR: ATRIBUT_DIIZINKAN,
    // `javascript:` dan `data:` pada href ditolak; hanya skema aman yang lewat.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: bersih }} />;
}
