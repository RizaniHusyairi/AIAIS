import type { Metadata } from 'next';
import NewsDetailView from './NewsDetailView';
import { notFound } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { metaHalaman, urlAbsolut, ldRemah, SITE_URL, SITE_NAME } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import type { NewsItem } from '@/types';

/**
 * Halaman satu berita.
 *
 * Halaman paling berharga di seluruh portal bagi mesin pencari — dan sampai
 * sekarang satu-satunya yang sama sekali tidak punya metadata: seluruh
 * berkasnya `'use client'`, sehingga setiap artikel tampil di hasil pencarian
 * dan di pratayang WhatsApp dengan judul portal yang sama persis. Ratusan
 * alamat berbeda, satu judul.
 *
 * Isinya tetap dirakit view di sisi klien. Yang pindah ke server hanya
 * metadata dan data terstrukturnya.
 */

/**
 * Hasil pencarian satu berita, dengan sebab kegagalannya.
 *
 * Sebabnya harus dibedakan. "Slug ini tidak ada" wajib berakhir 404, sedangkan
 * "server sedang tidak dapat dihubungi" tidak boleh — mengubah gangguan
 * sementara menjadi 404 membuat Google membuang artikel yang sebenarnya sehat
 * dari indeks.
 */
type Hasil =
  | { keadaan: 'ada'; berita: NewsItem }
  | { keadaan: 'tidak-ada' }
  | { keadaan: 'server-bisu' };

/**
 * Ambil satu berita.
 *
 * Sengaja TIDAK lewat `fetchApi`. Pembungkus itu menelan perbedaan yang
 * justru menentukan di sini: untuk lintasan `/news/...` ia menjawab data
 * contoh dari `NEWS_FALLBACK` pada kegagalan APA PUN — termasuk 404 —
 * sehingga slug yang tidak pernah ada menjawab 200 berisi artikel karangan.
 * Google menyebut keadaan itu soft 404, dan menghukumnya: alamat yang tak
 * terbatas jumlahnya, semuanya "berhasil", semuanya berisi teks yang sama.
 *
 * `API_BASE_URL` tetap diimpor dari `lib/api.ts` — alamat API masih hanya
 * disusun di sana; yang tidak dipakai di sini cuma lapisan fallback-nya.
 */
async function ambilBerita(slug: string): Promise<Hasil> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/news/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return { keadaan: 'server-bisu' };
  }

  if (res.status === 404) return { keadaan: 'tidak-ada' };
  if (!res.ok) return { keadaan: 'server-bisu' };

  const json = await res.json().catch(() => null);
  const data = json?.data;

  // Bentuknya diperiksa, bukan sekadar status 200: backend menjawab 200 pula
  // untuk galat validasi, dan metadata yang dirakit dari badan yang salah
  // bentuk akan terkirim ke mesin pencari sebagai judul artikel.
  return data && typeof data.title === 'string'
    ? { keadaan: 'ada', berita: data as NewsItem }
    : { keadaan: 'tidak-ada' };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hasil = await ambilBerita(slug);

  /*
   * Slug yang tidak dikenal ditangani `notFound()` di komponen halaman, jadi
   * yang tersisa di sini hanya keadaan "server bisu": view di baliknya tetap
   * menampilkan sesuatu, tetapi yang ditampilkannya adalah artikel contoh.
   * Halaman semacam itu tidak boleh masuk indeks — alamatnya akan tercatat di
   * Google membawa isi yang tidak pernah diterbitkan bandara.
   */
  if (hasil.keadaan !== 'ada') {
    return {
      title: `Berita | ${SITE_NAME}`,
      robots: { index: false, follow: true },
      alternates: { canonical: `/news/${slug}` },
    };
  }

  const berita = hasil.berita;
  const ringkasan = (berita.excerpt || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/s+/g, ' ')
    .trim()
    .slice(0, 200);

  return metaHalaman({
    title: `${berita.title} | ${SITE_NAME}`,
    description: ringkasan || `Berita ${berita.category} dari ${SITE_NAME}.`,
    path: `/news/${slug}`,
    image: berita.thumbnail || null,
    type: 'article',
    publishedTime: berita.published_at || null,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Di-memoisasi React bersama panggilan yang sama di `generateMetadata`,
  // jadi backend hanya ditembak sekali per render — pola yang sama dengan
  // `/layanan/[slug]`.
  const hasil = await ambilBerita(slug);

  /*
   * 404 yang sesungguhnya, lengkap dengan status HTTP-nya.
   *
   * Hanya untuk `tidak-ada`. Saat backend bisu halaman tetap disajikan
   * (view punya isi cadangannya sendiri) dan sudah ditandai `noindex` di
   * `generateMetadata` — gangguan server tidak boleh menghapus artikel yang
   * sehat dari indeks Google.
   */
  if (hasil.keadaan === 'tidak-ada') notFound();

  const berita = hasil.keadaan === 'ada' ? hasil.berita : null;

  return (
    <>
      {berita && (
        <JsonLd
          data={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: berita.title,
            description: berita.excerpt || undefined,
            image: berita.thumbnail ? [urlAbsolut(berita.thumbnail)] : undefined,
            datePublished: berita.published_at || undefined,
            articleSection: berita.category || undefined,
            inLanguage: 'id-ID',
            mainEntityOfPage: urlAbsolut(`/news/${slug}`),
            // Penulis dan penerbit sama-sama lembaga, bukan perorangan:
            // kolom `author` diisi petugas humas sebagai unit kerja
            // ("Humas UPBU APT Pranoto"), bukan nama pribadi — dan
            // memasukkannya sebagai `Person` akan salah sekaligus
            // menerbitkan identitas orang yang tidak perlu diterbitkan.
            author: { '@type': 'Organization', name: berita.author || SITE_NAME, url: SITE_URL },
            publisher: { '@id': `${SITE_URL}/#bandara` },
          },
          ldRemah([
            { name: 'Beranda', path: '/' },
            { name: 'Berita', path: '/news' },
            { name: berita.title, path: `/news/${slug}` },
          ]),
          ]}
        />
      )}
      <NewsDetailView params={params} />
    </>
  );
}
