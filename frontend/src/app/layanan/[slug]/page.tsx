import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LayananDetailView from '../LayananDetailView';
import { SERVICES, getService } from '@/lib/serviceData';

/**
 * Kesembilan slug diketahui saat build, jadi halamannya dibuat statis.
 * `dynamicParams = false` membuat slug di luar daftar langsung 404 alih-alih
 * dirender saat permintaan — tidak ada layanan yang datang dari basis data.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) return {};

  return {
    title: `${service.title} | Bandara APT Pranoto Samarinda`,
    description: service.description,
    alternates: { canonical: `/layanan/${service.slug}` },
  };
}

export default async function LayananDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) notFound();

  // Hanya slug yang dioper — lihat catatan pada LayananDetailView.
  return <LayananDetailView slug={service.slug} />;
}
