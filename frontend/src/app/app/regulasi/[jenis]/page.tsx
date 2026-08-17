'use client';

/** Surat Keputusan & Surat Edaran. Dua layar, satu rute. */

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import DaftarDokumen from '@/components/pwa/DaftarDokumen';
import { LAYAR_REGULASI } from '@/lib/pwaDokumen';

export default function RegulasiScreen({ params }: { params: Promise<{ jenis: string }> }) {
  const { jenis } = use(params);
  const layar = LAYAR_REGULASI[jenis];

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
