<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\FoundItem;
use App\Models\LostReport;
use App\Support\Notifikasi;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Lapor kehilangan barang di area bandara.
 *
 * Jalur publiknya sengaja terbuka tanpa akun — orang yang baru kehilangan tas
 * tidak akan mendaftar lebih dulu, dan menuntutnya menyaring habis wisatawan
 * serta penumpang transit. Konsekuensinya kedua endpoint publik dibatasi laju
 * (lihat routes/api.php) dan dijaga penangkal kiriman ganda.
 */
class LostReportController extends Controller
{
    /** Folder foto barang pada cakram publik. */
    private const DIR = 'lost-reports';

    /**
     * Jeda penangkal kiriman ganda.
     *
     * Sama alasannya dengan `ComplaintController`: tombol kirim yang terklik
     * dua kali menghasilkan dua tiket untuk satu kehilangan, dan petugas
     * mencarikan barang yang sama dua kali.
     */
    private const DUPLICATE_SECONDS = 60;

    /* ================================================================
       Publik
       ================================================================ */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reporter_name' => 'required|string|max:150',
            'reporter_phone' => 'required|string|max:40',
            // Surel opsional: banyak pelapor adalah penumpang transit yang
            // hanya sempat meninggalkan nomor ponsel.
            'reporter_email' => 'nullable|email|max:150',
            'category' => 'required|string|in:' . implode(',', LostReport::CATEGORIES),
            'item_description' => 'required|string|max:5000',
            'lost_area' => 'required|string|in:' . implode(',', LostReport::AREAS),
            // Tidak boleh di masa depan: barang tidak bisa hilang besok, dan
            // tanggal yang keliru merusak jendela pencocokan.
            'lost_at' => 'required|date|before_or_equal:now',
            'flight_number' => 'nullable|string|max:20',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'reporter_name.required' => 'Nama pelapor wajib diisi.',
            'reporter_phone.required' => 'Nomor telepon wajib diisi agar petugas dapat menghubungi Anda.',
            'reporter_email.email' => 'Alamat surel tidak sah.',
            'category.required' => 'Kategori barang wajib dipilih.',
            'category.in' => 'Kategori barang tidak dikenali.',
            'item_description.required' => 'Ciri-ciri barang wajib diisi.',
            'item_description.max' => 'Ciri-ciri barang maksimal 5.000 karakter.',
            'lost_area.required' => 'Lokasi perkiraan kehilangan wajib dipilih.',
            'lost_area.in' => 'Lokasi kehilangan tidak dikenali.',
            'lost_at.required' => 'Perkiraan waktu kehilangan wajib diisi.',
            'lost_at.before_or_equal' => 'Waktu kehilangan tidak boleh di masa depan.',
            'photo.image' => 'Foto harus berupa gambar (JPG, PNG, atau WEBP).',
            'photo.mimes' => 'Foto harus berformat JPG, PNG, atau WEBP.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        $duplikat = LostReport::where('reporter_phone', $validated['reporter_phone'])
            ->where('item_description', $validated['item_description'])
            ->where('created_at', '>=', Carbon::now()->subSeconds(self::DUPLICATE_SECONDS))
            ->first();

        if ($duplikat) {
            // Dijawab sukses dengan tiket yang sudah ada, bukan galat: dari
            // sisi pelapor laporannya memang sudah masuk.
            return ApiResponse::success([
                'ticket_number' => $duplikat->ticket_number,
                'status' => $duplikat->status,
                'created_at' => $duplikat->created_at,
            ], 'Laporan Anda sudah kami terima sebelumnya. Simpan Nomor Tiket ini.', null, 200);
        }

        if ($request->hasFile('photo')) {
            // Nama diacak: nama asli unggahan kerap memuat spasi dan identitas
            // pengunggahnya, dan daftar direktori tidak boleh membocorkannya.
            $validated['photo'] = $request->file('photo')->storeAs(
                self::DIR,
                Str::uuid() . '.' . $request->file('photo')->extension(),
                'public',
            );
        }

        $validated['ticket_number'] = LostReport::buatNomorTiket();
        $validated['status'] = 'submitted';

        $laporan = LostReport::create($validated);

        // Memberi tahu petugas. Kegagalannya tidak pernah menggagalkan
        // pengiriman warga — lihat App\Support\Notifikasi.
        Notifikasi::kirim('kehilangan', $laporan->ticket_number);

        return ApiResponse::success([
            'ticket_number' => $laporan->ticket_number,
            'status' => $laporan->status,
            'created_at' => $laporan->created_at,
        ], 'Laporan kehilangan berhasil dikirim. Simpan Nomor Tiket Anda untuk memantau pencariannya.', null, 201);
    }

    /**
     * Pelacakan publik.
     *
     * Balasannya lewat `LostReport::publicView()` — tanpa data pribadi pelapor
     * dan tanpa apa pun tentang barang temuan yang tercocokkan. Lihat alasannya
     * di model.
     */
    public function track($ticket_number)
    {
        $laporan = LostReport::where('ticket_number', $ticket_number)->first();

        if (! $laporan) {
            return ApiResponse::error('Nomor tiket laporan kehilangan tidak ditemukan.', null, 404);
        }

        return ApiResponse::success($laporan->publicView(), 'Status laporan kehilangan');
    }

    /* ================================================================
       Admin
       ================================================================ */

    /** Daftar admin — memuat data pelapor, karena petugas perlu menghubunginya. */
    public function adminIndex(Request $request)
    {
        $status = $request->query('status');

        $laporan = LostReport::query()
            ->with('foundItem')
            ->when(
                $status && in_array($status, LostReport::STATUSES, true),
                fn ($q) => $q->where('status', $status),
            )
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($laporan, 'Daftar laporan kehilangan barang');
    }

    public function adminShow($id)
    {
        $laporan = LostReport::with('foundItem')->findOrFail($id);

        return ApiResponse::success($laporan, 'Rincian laporan kehilangan');
    }

    /**
     * Ubah status dan catatan petugas.
     *
     * `matched` sengaja TIDAK dapat disetel dari sini — status itu hanya boleh
     * lahir dari pencocokan yang benar-benar menautkan sebuah barang temuan
     * (lihat `match()`). Tanpa larangan ini, sebuah laporan bisa berstatus
     * "sudah dicocokkan" tanpa ada barang yang tertaut, dan petugas berikutnya
     * mencari barang yang tidak pernah ada.
     */
    public function updateStatus(Request $request, $id)
    {
        $laporan = LostReport::findOrFail($id);

        $request->validate([
            'status' => 'required|in:submitted,searching,returned,not_found',
            'admin_note' => 'nullable|string|max:5000',
        ], [
            'status.in' => 'Status laporan tidak dikenali, atau hanya dapat diubah lewat pencocokan.',
            'admin_note.max' => 'Catatan petugas maksimal 5.000 karakter.',
        ]);

        // Menyatakan barang sudah diserahkan tanpa ada barang yang tertaut
        // adalah keadaan yang tidak dapat dipertanggungjawabkan.
        if ($request->status === 'returned' && ! $laporan->found_item_id) {
            return ApiResponse::error(
                'Laporan belum dicocokkan dengan barang temuan mana pun, jadi belum dapat ditandai sudah diserahkan.',
                null,
                422,
            );
        }

        $laporan->update([
            'status' => $request->status,
            'admin_note' => $request->input('admin_note', $laporan->admin_note),
            'responded_at' => now(),
        ]);

        return ApiResponse::success($laporan->fresh('foundItem'), 'Status laporan berhasil diperbarui');
    }

    /**
     * Kandidat pencocokan — barang temuan yang mungkin milik pelapor.
     *
     * Penyaringnya di `FoundItem::scopeKandidat()`. Sengaja tidak otomatis:
     * panel menyodorkan, petugas yang memutuskan.
     */
    public function candidates($id)
    {
        $laporan = LostReport::findOrFail($id);

        $kandidat = FoundItem::kandidat($laporan->category, $laporan->lost_at)->get();

        return ApiResponse::success($kandidat, 'Kandidat barang temuan');
    }

    /**
     * Pasang atau lepas pencocokan.
     *
     * `found_item_id` bernilai null berarti melepas.
     *
     * Keduanya berjalan dalam satu transaksi: laporan dan barang temuan harus
     * berpindah keadaan bersama-sama. Bila hanya satu sisi yang tersimpan,
     * akan ada barang berstatus `matched` yang tidak tertaut laporan mana pun
     * — dan tidak ada satu pun layar yang menampilkannya, sehingga barang itu
     * hilang dari peredaran tanpa ada yang menyadarinya.
     */
    public function match(Request $request, $id)
    {
        $laporan = LostReport::findOrFail($id);

        $request->validate([
            'found_item_id' => 'nullable|integer|exists:found_items,id',
            'admin_note' => 'nullable|string|max:5000',
        ], [
            'found_item_id.exists' => 'Barang temuan yang dipilih tidak ditemukan.',
        ]);

        $idBaru = $request->input('found_item_id');

        // Barang yang sudah diserahkan atau dimusnahkan tidak boleh ditautkan
        // ke laporan baru.
        if ($idBaru) {
            $calon = FoundItem::findOrFail($idBaru);

            if (! in_array($calon->status, ['stored', 'matched'], true)) {
                return ApiResponse::error(
                    'Barang temuan itu sudah diserahkan atau dimusnahkan, jadi tidak dapat dicocokkan lagi.',
                    null,
                    422,
                );
            }

            $tertaut = LostReport::where('found_item_id', $idBaru)
                ->where('id', '!=', $laporan->id)
                ->first();

            if ($tertaut) {
                return ApiResponse::error(
                    "Barang temuan itu sudah dicocokkan dengan laporan {$tertaut->ticket_number}.",
                    null,
                    422,
                );
            }
        }

        DB::transaction(function () use ($laporan, $idBaru, $request) {
            $lama = $laporan->found_item_id;

            // Barang yang tadinya tertaut dikembalikan ke gudang.
            if ($lama && $lama !== $idBaru) {
                FoundItem::where('id', $lama)->where('status', 'matched')->update(['status' => 'stored']);
            }

            $laporan->update([
                'found_item_id' => $idBaru,
                'status' => $idBaru ? 'matched' : 'searching',
                'admin_note' => $request->input('admin_note', $laporan->admin_note),
                'responded_at' => now(),
            ]);

            if ($idBaru) {
                FoundItem::where('id', $idBaru)->update(['status' => 'matched']);
            }
        });

        return ApiResponse::success(
            $laporan->fresh('foundItem'),
            $idBaru ? 'Laporan berhasil dicocokkan dengan barang temuan' : 'Pencocokan berhasil dilepas',
        );
    }

    public function destroy($id)
    {
        $laporan = LostReport::findOrFail($id);
        $foto = $laporan->photo;
        $barang = $laporan->found_item_id;

        DB::transaction(function () use ($laporan, $barang) {
            // Barang temuannya kembali ke gudang, bukan ikut terhapus — barang
            // fisiknya masih ada di pos.
            if ($barang) {
                FoundItem::where('id', $barang)->where('status', 'matched')->update(['status' => 'stored']);
            }

            $laporan->delete();
        });

        if (! empty($foto)) {
            Storage::disk('public')->delete($foto);
        }

        return ApiResponse::success(null, 'Laporan kehilangan berhasil dihapus');
    }
}
