import type { Metadata } from 'next';
import FieldTripForm from './FieldTripForm';

export const metadata: Metadata = {
  title: 'Ajukan Kunjungan Lapangan | Bandara APT Pranoto Samarinda',
  robots: { index: false, follow: false },
};

export default function FieldTripBaruPage() {
  return <FieldTripForm />;
}
