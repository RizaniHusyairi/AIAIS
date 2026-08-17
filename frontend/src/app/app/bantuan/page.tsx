import BantuanView from './BantuanView';

/**
 * Pusat Bantuan versi PWA.
 *
 * Rutenya `/app/bantuan`, bukan lagi `/app/layanan/bantuan`: layar ini kini
 * tujuan utama di tengah bilah bawah, dan menyembunyikannya di dalam cabang
 * Layanan membuat lintasannya tidak sepadan dengan kedudukannya.
 *
 * Server Component tipis yang hanya membaca `?mode=` lalu menyerahkannya ke
 * view — sama persis dengan `/complaints`. Membacanya di sini, bukan lewat
 * `useSearchParams`, menghilangkan keharusan membungkus layar dengan
 * `<Suspense>`. `searchParams` berupa Promise pada versi Next ini.
 */
export default async function BantuanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const mode = (await searchParams).mode;

  return <BantuanView modeAwal={typeof mode === 'string' ? mode : undefined} />;
}
