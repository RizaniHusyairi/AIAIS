/**
 * Pembantu kecil seputar URL yang dipakai lebih dari satu halaman.
 */

/**
 * Nama host untuk ditampilkan, tanpa `www.`.
 *
 * Dipakai pada halaman yang melempar pengunjung keluar portal: tujuan tautan
 * sebaiknya terbaca sebelum diklik. Lintasan internal (mis. `/admin/login`)
 * bukan URL absolut dan akan dikembalikan apa adanya — pemanggil yang
 * memutuskan apakah ingin menampilkannya.
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
