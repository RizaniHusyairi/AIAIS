<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pindahkan berkas syarat permohonan informasi warisan v1 ke cakram privat.
 *
 * ============================================================
 * KENAPA PERINTAH INI ADA
 * ============================================================
 *
 * v1 menyimpan scan KTP dan surat pernyataan pada cakram yang dilayani web.
 * Migrasi cutover hanya mengganti nama kolomnya (`ktp` → `ktp_path`,
 * `surat_pertanggungjawaban` → `statement_path`), sementara endpoint unduh
 * v2 hanya mencari di cakram `local`. Akibatnya:
 *
 *   1. petugas mendapat "Berkas tidak ditemukan" untuk SETIAP permohonan v1;
 *   2. berkas aslinya tetap terbuka bagi siapa pun yang tahu URL-nya —
 *      pelanggaran UU 27/2022 yang justru hendak ditutup v2.
 *
 * Menambal endpoint unduh agar ikut mencari di cakram publik hanya membetulkan
 * gejala pertama. Perintah ini membetulkan keduanya: berkas disalin ke cakram
 * privat dengan nama UUID (pola yang sama dengan unggahan v2), kolomnya
 * ditunjuk ke sana, lalu salinan publiknya dihapus.
 *
 * ============================================================
 * BAWAANNYA MEMERIKSA, BUKAN MENGUBAH
 * ============================================================
 *
 * Tanpa `--apply` tidak ada berkas yang dipindah maupun baris yang ditulis.
 * Berkas yang tidak ditemukan dibiarkan nilainya — lintasan yang menggantung
 * masih memberi tahu nama berkas yang dicari.
 */
class SecureInformationRequestFiles extends Command
{
    protected $signature = 'aiais:secure-information-request-files
                            {--apply : Pindahkan berkas dan tuliskan lintasannya (tanpa ini hanya memeriksa)}
                            {--keep-source : Jangan hapus salinan pada cakram publik sesudah dipindah}';

    protected $description = 'Pindahkan scan KTP & surat pernyataan permohonan informasi v1 ke cakram privat';

    /** Harus sama dengan InformationRequestController::DISK. */
    private const TARGET_DISK = 'local';

    /** Kolom → direktori tujuan; sama dengan DIR_* di InformationRequestController. */
    private const KOLOM = [
        'ktp_path' => 'permohonan-informasi/ktp',
        'statement_path' => 'permohonan-informasi/surat-pernyataan',
    ];

    /**
     * Cakram tempat berkas v1 mungkin berada, berurutan dari yang paling
     * mungkin. Semuanya cakram yang dilayani web — itulah masalahnya.
     */
    private const SUMBER = ['public', 'legacy', 'legacy_public'];

    public function handle(): int
    {
        $terapkan = (bool) $this->option('apply');
        $hapusSumber = ! $this->option('keep-source');

        $this->info($terapkan
            ? 'Memindahkan berkas permohonan informasi ke cakram privat — PERUBAHAN AKAN DITULIS.'
            : 'Memeriksa berkas permohonan informasi (mode periksa; tidak ada yang diubah).');
        $this->newLine();

        $hitung = ['sudah_privat' => 0, 'dipindah' => 0, 'hilang' => 0];
        $hilang = [];

        DB::table('public_informations')
            ->select('id', 'ticket_number', ...array_keys(self::KOLOM))
            ->orderBy('id')
            ->chunkById(100, function ($rows) use ($terapkan, $hapusSumber, &$hitung, &$hilang) {
                foreach ($rows as $row) {
                    foreach (self::KOLOM as $kolom => $dir) {
                        $nilai = trim((string) $row->{$kolom});

                        if ($nilai === '') {
                            continue;
                        }

                        if (Storage::disk(self::TARGET_DISK)->exists($nilai)) {
                            $hitung['sudah_privat']++;

                            continue;
                        }

                        $lokasi = $this->temukan($nilai);

                        if ($lokasi === null) {
                            $hitung['hilang']++;
                            $hilang[] = [$row->ticket_number ?? $row->id, $kolom, $nilai];

                            continue;
                        }

                        $hitung['dipindah']++;

                        if ($terapkan) {
                            $this->pindahkan($row->id, $kolom, $dir, $lokasi, $hapusSumber);
                        }
                    }
                }
            });

        $this->table(
            ['Sudah di cakram privat', $terapkan ? 'Dipindah' : 'Dapat dipindah', 'Tidak ditemukan'],
            [[$hitung['sudah_privat'], $hitung['dipindah'], $hitung['hilang']]],
        );

        if ($hilang !== []) {
            $this->newLine();
            $this->warn('Berkas berikut tidak ditemukan di cakram mana pun; nilainya dibiarkan:');
            $this->table(['Tiket', 'Kolom', 'Nilai tersimpan'], $hilang);
        }

        if (! $terapkan && $hitung['dipindah'] > 0) {
            $this->newLine();
            $this->line('Jalankan ulang dengan <fg=yellow>--apply</> untuk memindahkannya.');
        }

        return self::SUCCESS;
    }

    /**
     * Cari berkas yang dimaksud sebuah nilai kolom v1.
     *
     * Nilai v1 bisa berupa lintasan relatif, lintasan berawalan `storage/`
     * atau `uploads/` (URL publik yang ikut tersimpan), maupun URL penuh.
     *
     * @return array{disk: string, path: string}|null
     */
    private function temukan(string $nilai): ?array
    {
        $lintasan = $nilai;

        if (str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')) {
            $lintasan = (string) parse_url($lintasan, PHP_URL_PATH);
        }

        $lintasan = ltrim(rawurldecode($lintasan), '/');

        $kandidat = array_unique(array_filter([
            $lintasan,
            Str::after($lintasan, 'storage/'),
            Str::after($lintasan, 'public/'),
            Str::after($lintasan, 'uploads/'),
        ]));

        foreach (self::SUMBER as $disk) {
            foreach ($kandidat as $coba) {
                if (Storage::disk($disk)->exists($coba)) {
                    return ['disk' => $disk, 'path' => $coba];
                }
            }
        }

        return null;
    }

    /** @param array{disk: string, path: string} $lokasi */
    private function pindahkan(int $id, string $kolom, string $dir, array $lokasi, bool $hapusSumber): void
    {
        $sumber = Storage::disk($lokasi['disk']);
        $tujuan = Storage::disk(self::TARGET_DISK);

        $ekstensi = strtolower(pathinfo($lokasi['path'], PATHINFO_EXTENSION));
        $baru = $dir.'/'.Str::uuid().($ekstensi !== '' ? '.'.$ekstensi : '');

        $tujuan->writeStream($baru, $sumber->readStream($lokasi['path']));

        // Salinan harus utuh sebelum sumber boleh disentuh; kalau tidak,
        // batalkan dan biarkan baris ini apa adanya untuk dicoba lagi.
        if (! $tujuan->exists($baru) || $tujuan->size($baru) !== $sumber->size($lokasi['path'])) {
            $tujuan->delete($baru);
            $this->error("Gagal menyalin {$lokasi['disk']}:{$lokasi['path']} (id {$id}); dilewati.");

            return;
        }

        DB::table('public_informations')->where('id', $id)->update([$kolom => $baru]);

        if ($hapusSumber) {
            $sumber->delete($lokasi['path']);
        }
    }
}
