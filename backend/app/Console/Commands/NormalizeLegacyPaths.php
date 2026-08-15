<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Periksa — dan bila diminta, betulkan — lintasan berkas warisan v1.
 *
 * ============================================================
 * KENAPA PERINTAH INI ADA
 * ============================================================
 *
 * Kolom berkas v1 memuat TIGA konvensi berbeda yang tercampur dalam satu
 * basis data:
 *
 *   1. `documents/news/x.jpg`            → relatif terhadap akar unggahan v1
 *      (`public/uploads`), yakni cakram `legacy`
 *   2. `uploads/letters/x.pdf`           → relatif terhadap `public/` v1,
 *      yakni cakram `legacy_public`. Awalan `uploads/` di sini BUKAN
 *      penggandaan yang perlu dibuang — ia justru bagian sah dari lintasan
 *      begitu diselesaikan terhadap akar yang benar. Diperiksa langsung:
 *      berkas di `public/uploads/letters/se001.pdf` cocok dengan nilai
 *      `uploads/letters/se001.pdf` lewat cakram `legacy_public`, dan tidak
 *      cocok lewat `legacy`.
 *   3. `assets_landing/img/fasilitas/x.jpg` → juga relatif terhadap `public/`,
 *      lewat cakram yang sama
 *
 * Resolusi saat membaca sudah menangani ketiganya, tetapi dengan menebak:
 * tiap permintaan mencoba beberapa kemungkinan sampai ada yang cocok. Perintah
 * ini menjalankan penebakan itu SEKALI, lalu menuliskan bentuk yang benar ke
 * basis data, sehingga sesudah cutover pembacaan cukup sambungan langsung.
 *
 * ============================================================
 * BAWAANNYA MEMERIKSA, BUKAN MENGUBAH
 * ============================================================
 *
 * Tanpa `--apply`, perintah ini tidak menulis satu baris pun. Itu disengaja:
 * ia berjalan di atas basis data produksi yang tidak tergantikan, dan angka
 * hasil pemeriksaannya justru yang dibutuhkan prosedur cutover — "berapa
 * berkas yang gagal ditemukan sebelum dan sesudah".
 *
 * Berkas yang TIDAK ditemukan tidak pernah dikosongkan nilainya. Lintasan yang
 * menggantung setidaknya memberi tahu nama berkas yang dicari; mengosongkannya
 * menghapus satu-satunya petunjuk yang tersisa.
 */
class NormalizeLegacyPaths extends Command
{
    protected $signature = 'aiais:normalize-legacy-paths
                            {--apply : Tuliskan perbaikannya ke basis data (tanpa ini hanya memeriksa)}
                            {--table= : Batasi pada satu tabel saja}';

    protected $description = 'Periksa dan betulkan lintasan berkas warisan v1 pada kolom-kolom berkas';

    /**
     * Kolom berkas yang diperiksa.
     *
     * `json` menandai kolom yang isinya larik lintasan, bukan satu lintasan.
     *
     * @var array<int, array{table: string, column: string, json?: bool}>
     */
    private const KOLOM = [
        ['table' => 'news', 'column' => 'image'],
        ['table' => 'letters', 'column' => 'file_path'],
        ['table' => 'facilities', 'column' => 'image_path'],
        ['table' => 'tourisms', 'column' => 'cover_image'],
        ['table' => 'tourisms', 'column' => 'gallery', 'json' => true],
        ['table' => 'external_links', 'column' => 'logo_path'],
        ['table' => 'periodic_documents', 'column' => 'document_path'],
        ['table' => 'service_standards', 'column' => 'file_path'],
        ['table' => 'airport_tenants', 'column' => 'image'],
        ['table' => 'info_slides', 'column' => 'image_path'],
        ['table' => 'inventories', 'column' => 'photo_path'],
        ['table' => 'spare_parts', 'column' => 'photo_path'],
    ];

    public function handle(): int
    {
        $terapkan = (bool) $this->option('apply');
        $hanya = $this->option('table');

        $this->info($terapkan
            ? 'Menormalkan lintasan berkas warisan — PERUBAHAN AKAN DITULIS.'
            : 'Memeriksa lintasan berkas warisan (mode periksa; tidak ada yang ditulis).');
        $this->newLine();

        $total = ['diperiksa' => 0, 'sudah_benar' => 0, 'dibetulkan' => 0, 'hilang' => 0, 'url' => 0];
        $baris = [];

        foreach (self::KOLOM as $def) {
            if ($hanya !== null && $def['table'] !== $hanya) {
                continue;
            }

            $hasil = $this->periksaKolom($def, $terapkan);

            if ($hasil === null) {
                continue;
            }

            foreach ($total as $k => $_) {
                $total[$k] += $hasil[$k];
            }

            if ($hasil['diperiksa'] > 0) {
                $baris[] = [
                    $def['table'].'.'.$def['column'],
                    $hasil['diperiksa'],
                    $hasil['sudah_benar'],
                    $hasil['dibetulkan'],
                    $hasil['url'],
                    $hasil['hilang'],
                ];
            }
        }

        if ($baris === []) {
            $this->warn('Tidak ada nilai berkas yang perlu diperiksa.');

            return self::SUCCESS;
        }

        $this->table(
            ['Kolom', 'Diperiksa', 'Sudah benar', $terapkan ? 'Dibetulkan' : 'Dapat dibetulkan', 'URL penuh', 'Tidak ditemukan'],
            $baris,
        );

        $this->newLine();
        $this->line(sprintf(
            'Total: %d nilai · %d sudah benar · %d %s · %d URL penuh · <fg=red>%d tidak ditemukan</>',
            $total['diperiksa'],
            $total['sudah_benar'],
            $total['dibetulkan'],
            $terapkan ? 'dibetulkan' : 'dapat dibetulkan',
            $total['url'],
            $total['hilang'],
        ));

        if ($total['hilang'] > 0) {
            $this->newLine();
            $this->warn(
                'Berkas yang tidak ditemukan TIDAK dikosongkan nilainya — lintasan yang menggantung '
                .'masih memberi tahu nama berkas yang dicari. Periksa apakah direktori unggahan v1 '
                .'sudah tersalin lengkap sebelum menyimpulkan berkasnya benar-benar hilang.'
            );
        }

        if (! $terapkan && $total['dibetulkan'] > 0) {
            $this->newLine();
            $this->line('Jalankan ulang dengan <fg=yellow>--apply</> untuk menuliskan perbaikannya.');
        }

        return self::SUCCESS;
    }

    /** @return array<string, int>|null */
    private function periksaKolom(array $def, bool $terapkan): ?array
    {
        $tabel = $def['table'];
        $kolom = $def['column'];

        if (! DB::getSchemaBuilder()->hasTable($tabel) || ! DB::getSchemaBuilder()->hasColumn($tabel, $kolom)) {
            return null;
        }

        $hitung = ['diperiksa' => 0, 'sudah_benar' => 0, 'dibetulkan' => 0, 'hilang' => 0, 'url' => 0];

        DB::table($tabel)
            ->select('id', $kolom)
            ->whereNotNull($kolom)
            ->where($kolom, '<>', '')
            ->orderBy('id')
            ->chunk(200, function ($rows) use ($tabel, $kolom, $def, $terapkan, &$hitung) {
                foreach ($rows as $row) {
                    $asli = $row->{$kolom};

                    if (($def['json'] ?? false)) {
                        $daftar = json_decode($asli, true);

                        if (! is_array($daftar)) {
                            continue;
                        }

                        $baru = [];
                        $berubah = false;

                        foreach ($daftar as $satu) {
                            $r = $this->selesaikan((string) $satu, $hitung);
                            $baru[] = $r ?? $satu;
                            $berubah = $berubah || ($r !== null && $r !== $satu);
                        }

                        if ($berubah && $terapkan) {
                            DB::table($tabel)->where('id', $row->id)->update([$kolom => json_encode($baru)]);
                        }

                        continue;
                    }

                    $benar = $this->selesaikan((string) $asli, $hitung);

                    if ($benar !== null && $benar !== $asli && $terapkan) {
                        DB::table($tabel)->where('id', $row->id)->update([$kolom => $benar]);
                    }
                }
            });

        return $hitung;
    }

    /**
     * Cari bentuk lintasan yang benar-benar menunjuk berkas.
     *
     * Mengembalikan lintasan yang seharusnya tersimpan, atau null bila nilainya
     * tidak perlu/tidak dapat diubah. `$hitung` diperbarui di tempat.
     *
     * @param  array<string, int>  $hitung
     */
    private function selesaikan(string $nilai, array &$hitung): ?string
    {
        $nilai = trim($nilai);

        if ($nilai === '') {
            return null;
        }

        $hitung['diperiksa']++;

        // URL penuh milik server lain — dibiarkan apa adanya. Peninggalan v1
        // yang sebagian dokumennya masih dilayani aptpairport.id.
        if (str_starts_with($nilai, 'http://') || str_starts_with($nilai, 'https://')) {
            $hitung['url']++;

            return null;
        }

        $legacy = Storage::disk('legacy');
        $publik = Storage::disk('legacy_public');

        // Sudah benar: menunjuk berkas nyata di cakram unggahan.
        if ($legacy->exists($nilai)) {
            $hitung['sudah_benar']++;

            return null;
        }

        // Sudah benar pula bila menunjuk aset statis v1 di luar unggahan
        // (`assets_landing/...`). Nilainya tidak diubah — cakramnya yang
        // berbeda, bukan lintasannya yang salah.
        if ($publik->exists($nilai)) {
            $hitung['sudah_benar']++;

            return null;
        }

        // Kandidat perbaikan, berurutan dari yang paling mungkin.
        //
        // Keduanya hanya menyasar nilai yang benar-benar SALAH, bukan yang
        // sekadar diselesaikan lewat cakram berbeda — kasus itu sudah dijawab
        // dua pemeriksaan di atas.
        $kandidat = [
            // Nilai yang kehilangan awalan direktorinya.
            'uploads/'.$nilai,
            // Nama berkas polos bertimestamp di akar unggahan; v1 memakai
            // move() pada pembaruan berita, sehingga sebagian nilainya begitu.
            basename($nilai),
        ];

        foreach ($kandidat as $coba) {
            if ($coba === '' || $coba === $nilai) {
                continue;
            }

            if ($legacy->exists($coba) || $publik->exists($coba)) {
                $hitung['dibetulkan']++;

                return $coba;
            }
        }

        $hitung['hilang']++;

        return null;
    }
}
