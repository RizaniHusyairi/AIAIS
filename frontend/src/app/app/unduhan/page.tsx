'use client';

/** Pusat Unduhan — dokumen dan formulir publik. */

import React from 'react';
import DaftarDokumen from '@/components/pwa/DaftarDokumen';
import { LAYAR_UNDUHAN } from '@/lib/pwaDokumen';

export default function UnduhanScreen() {
  return (
    <DaftarDokumen
      judul={LAYAR_UNDUHAN.judul}
      endpoint={LAYAR_UNDUHAN.endpoint}
      adaptor={LAYAR_UNDUHAN.adaptor}
      keteranganKosong={LAYAR_UNDUHAN.keteranganKosong}
    />
  );
}
