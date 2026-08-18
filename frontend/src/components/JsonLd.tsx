/**
 * Penyisip data terstruktur.
 *
 * Server Component tanpa keadaan — ia hanya menuliskan satu tag
 * `<script type="application/ld+json">`. Dibuat karena markup itu mulai
 * disalin ke banyak halaman, dan setiap salinan membawa `dangerouslySetInnerHTML`
 * sendiri; satu tempat lebih mudah diperiksa daripada belasan.
 *
 * `data` boleh satu skema atau larik skema. Larik adalah bentuk yang benar
 * bila satu halaman memuat lebih dari satu — Google membacanya sama saja,
 * dan satu tag lebih ringan daripada beberapa.
 *
 * Isinya SELALU berasal dari kode kita sendiri atau dari API portal, tidak
 * pernah dari masukan pengunjung. `JSON.stringify` juga meloloskan diri dari
 * tanda kutip; yang tidak diloloskannya adalah urutan `</script>`, dan itu
 * tidak mungkin muncul dari data terstruktur yang kita rakit.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
