import type { Metadata } from 'next';
import SopPpidView from './SopPpidView';

/** Server Component pembungkus — lihat catatan di ../page.tsx. */
export const metadata: Metadata = {
  title: 'SOP PPID | Bandara APT Pranoto Samarinda',
  description:
    'Prosedur operasional standar layanan informasi publik PPID Bandar Udara A.P.T. Pranoto: tata cara permohonan informasi, pengajuan keberatan, dan penyelesaian sengketa beserta batas waktunya menurut UU 14/2008.',
  alternates: { canonical: '/ppid/sop' },
};

export default function SopPpidPage() {
  return <SopPpidView />;
}
