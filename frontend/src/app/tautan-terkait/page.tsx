import type { Metadata } from 'next';
import TautanTerkaitView from './TautanTerkaitView';

/**
 * Server Component tipis + view `'use client'` — pola halaman publik v2.
 *
 * Rutenya `/tautan-terkait`, sama dengan portal v1, supaya tautan lama yang
 * sudah beredar tetap mendarat di tempat yang benar.
 */
export const metadata: Metadata = {
  title: 'Tautan Terkait | Bandara APT Pranoto Samarinda',
  description:
    'Kumpulan portal resmi pemerintah yang berkaitan dengan pelayanan publik dan kedinasan Bandar Udara APT Pranoto Samarinda: SIPPN, SP4N-LAPOR!, SIK, dan e-Kinerja.',
  alternates: { canonical: '/tautan-terkait' },
};

export default function TautanTerkaitPage() {
  return <TautanTerkaitView />;
}
