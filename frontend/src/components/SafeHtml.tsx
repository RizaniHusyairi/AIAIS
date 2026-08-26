'use client';

import { bersihkanHtml } from '@/lib/htmlAman';

/**
 * Render HTML yang berasal dari panel admin, sesudah disaring.
 *
 * Daftar tag yang diizinkan beserta alasan keamanannya ada di
 * `lib/htmlAman.ts` — dibagi dengan editor teks kaya panel admin supaya
 * keduanya tidak pernah berbeda pendapat soal format apa yang sah.
 */
export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: bersihkanHtml(html) }} />;
}
