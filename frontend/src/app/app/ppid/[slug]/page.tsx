'use client';

/**
 * Daftar dokumen PPID — satu rute untuk enam layar.
 *
 * Slugnya dicocokkan dengan `LAYAR_PPID` di `lib/pwaDokumen.ts`; lintasan yang
 * tidak dikenal ditolak apa adanya alih-alih menampilkan daftar kosong yang
 * terlihat seperti "belum ada dokumen" padahal alamatnya yang salah.
 *
 * `/app/ppid/permohonan` punya berkasnya sendiri dan tidak sampai ke sini —
 * segmen statis selalu menang atas `[slug]` di Next.
 */

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import DaftarDokumen from '@/components/pwa/DaftarDokumen';
import { LAYAR_PPID } from '@/lib/pwaDokumen';

export default function DokumenPpidScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const layar = LAYAR_PPID[slug];

  if (!layar) notFound();

  return (
    <DaftarDokumen
      judul={layar.judul}
      endpoint={layar.endpoint}
      adaptor={layar.adaptor}
      keteranganKosong={layar.keteranganKosong}
    />
  );
}
