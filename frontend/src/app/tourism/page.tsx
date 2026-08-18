import type { Metadata } from 'next';
import TourismView from './TourismView';
import { metaHalaman } from '@/lib/seo';

export const metadata: Metadata = metaHalaman({
  title: 'Destinasi Wisata Samarinda | Bandara APT Pranoto',
  description: 'Jelajahi keindahan, budaya, dan spiritualitas Kota Samarinda — destinasi wisata terdekat yang dapat dijangkau langsung dari Bandara APT Pranoto.',
  path: '/tourism',
});

export default function TourismPage() {
  return <TourismView />;
}
