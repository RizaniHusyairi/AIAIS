import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LayananDetailView from '../LayananDetailView';
import { fetchApi } from '@/lib/api';
import { getService } from '@/lib/serviceData';
import type { ServiceItem } from '@/types';
import { ldRemah, SITE_URL } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

/**
 * Halaman satu layanan.
 *
 * Sebelumnya halaman ini dibuat statis saat build dengan
 * `dynamicParams = false`, dengan alasan "tidak ada layanan yang datang dari
 * basis data". Alasan itu tidak lagi berlaku: daftar layanan kini dikelola
 * petugas lewat panel admin, dan slug yang dibekukan saat build membuat
 * layanan baru menjawab 404 sampai aplikasinya dibangun ulang.
 *
 * Halamannya karena itu dirender saat permintaan. Isinya diambil view di sisi
 * klien; yang dikerjakan di sini hanya metadata, yang memang harus ada di
 * server agar terbaca mesin pencari dan pratayang tautan.
 */

/** Ambil satu layanan untuk keperluan metadata. */
async function ambilLayanan(slug: string): Promise<ServiceItem | null> {
  const res = await fetchApi<ServiceItem>(`/services/${slug}`);

  return res.success && res.data ? res.data : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const layanan = await ambilLayanan(slug);
  const bawaan = getService(slug);

  // Bila backend tak dapat dihubungi saat render, metadata jatuh ke teks
  // bawaan hasil transkripsi v1 — halaman tetap punya judul yang benar.
  const title = layanan?.title ?? bawaan?.title;
  const description = layanan?.description || layanan?.summary || bawaan?.description;

  if (!title) return {};

  return {
    title: `${title} | Bandara APT Pranoto Samarinda`,
    description,
    alternates: { canonical: `/layanan/${slug}` },
  };
}

export default async function LayananDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Slug yang tidak dikenal harus benar-benar 404, bukan halaman kosong
  // berstatus 200 — mesin pencari akan mengindeksnya, dan pengunjung tidak
  // punya petunjuk bahwa alamatnya keliru. Permintaan ini di-memoisasi React
  // bersama panggilan yang sama di `generateMetadata`, jadi backend hanya
  // ditembak sekali per render.
  const layanan = await ambilLayanan(slug);

  const bawaan = getService(slug);
  if (!layanan && !bawaan) notFound();

  const nama = layanan?.title ?? bawaan?.title ?? '';

  return (
    <>
      {/*
        `GovernmentService` — bukan `Service` biasa.
        
        Yang dilayani halaman ini adalah layanan publik sebuah unit pelaksana
        teknis Kementerian Perhubungan, dan Google memakai penyedianya untuk
        menghubungkan halaman ini dengan entitas bandara yang sudah
        diperkenalkan di layout akar lewat `@id`.
      */}
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'GovernmentService',
            name: nama,
            description: layanan?.description || layanan?.summary || bawaan?.description || undefined,
            serviceType: nama,
            provider: { '@id': `${SITE_URL}/#bandara` },
            areaServed: { '@type': 'AdministrativeArea', name: 'Kalimantan Timur' },
            availableChannel: {
              '@type': 'ServiceChannel',
              serviceUrl: `${SITE_URL}/layanan/${slug}`,
            },
          },
          ldRemah([
            { name: 'Beranda', path: '/' },
            { name: 'Layanan', path: '/layanan' },
            { name: nama, path: `/layanan/${slug}` },
          ]),
        ]}
      />
      <LayananDetailView slug={slug} />
    </>
  );
}
