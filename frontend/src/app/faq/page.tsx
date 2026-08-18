import type { Metadata } from 'next';
import FaqView from './FaqView';
import { fetchApi } from '@/lib/api';
import { ldRemah, metaHalaman } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import type { FaqItem } from '@/types';

/**
 * Pertanyaan yang Sering Diajukan.
 *
 * Server Component tipis sesuai konvensi portal: ia mengekspor metadata dan
 * MENGAMBIL DATA AWALNYA di sisi server, lalu menyerahkannya ke view.
 *
 * Pengambilan di server itu bukan kerapian belaka. Halaman ini justru yang
 * paling sering ditemukan lewat mesin pencari — orang mengetik pertanyaannya,
 * bukan nama bandara. Bila isinya baru muncul setelah JavaScript berjalan,
 * perayap dan pengunjung berkoneksi buruk mendapat halaman kosong.
 *
 * View tetap mengambil ulang di sisi klien supaya jawaban yang baru disunting
 * petugas langsung tampil tanpa menunggu cache halaman.
 */

export const metadata: Metadata = metaHalaman({
  title: 'Pertanyaan yang Sering Diajukan | Bandara APT Pranoto Samarinda',
  description: 'Jawaban atas pertanyaan yang paling sering diajukan seputar penerbangan, fasilitas, '
    + 'layanan, dan pengaduan di Bandar Udara APT Pranoto Samarinda.',
  path: '/faq',
});

export default async function FaqPage() {
  const res = await fetchApi<FaqItem[]>('/faqs');

  /*
   * Data dikirim MENTAH ke view, bukan hasil `gabungFaq`.
   *
   * `gabungFaq` menyisipkan `icon` berupa komponen Lucide — sebuah fungsi.
   * Fungsi tidak dapat menyeberangi batas Server → Client Component, dan React
   * menggagalkan seluruh render dengan "Functions cannot be passed directly to
   * Client Components". Akibatnya halaman ini menjawab dokumen galat
   * (`<html id="__next_error__">`) pada render server lalu memulihkan dirinya
   * di peramban — tampak baik-baik saja bagi pengunjung, tetapi perayap
   * menerima halaman galat. Justru di halaman yang komentarnya sendiri
   * menyebut paling sering ditemukan lewat mesin pencari.
   *
   * Ikonnya dipasang view, yang memang sudah mengimpor `gabungFaq` untuk
   * pengambilan ulangnya sendiri.
   */
  const awal = Array.isArray(res.data) ? res.data : [];

  return (
    <>
      {/*
        Skema FAQPage.
     
        Halaman inilah satu-satunya di portal yang isinya benar-benar berbentuk
        tanya jawab, dan Google menampilkan pasangan tanya jawab langsung di
        halaman hasil pencarian bila skemanya ada — jawaban bandara terbaca
        sebelum pengunjung mengklik apa pun.
     
        Dirender hanya bila datanya sungguh ada. Skema FAQPage tanpa
        `mainEntity` adalah janji kosong, dan Search Console melaporkannya
        sebagai galat data terstruktur.
     
        Jawaban dikirim sebagai teks polos: `acceptedAnswer.text` menerima
        sebagian markah, tetapi HTML dari editor panel admin memuat atribut
        gaya dan kelas yang tidak satu pun berarti di sini.
      */}
      {awal.length > 0 && (
        <JsonLd
          data={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: 'id-ID',
            mainEntity: awal.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.answer.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/s+/g, ' ').trim(),
              },
            })),
          },
          ldRemah([
            { name: 'Beranda', path: '/' },
            { name: 'Pertanyaan yang Sering Diajukan', path: '/faq' },
          ]),
          ]}
        />
      )}
      <FaqView awal={awal} />
    </>
  );
}
