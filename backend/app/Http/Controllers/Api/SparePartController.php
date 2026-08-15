<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\SparePart;
use App\Models\SparePartRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Suku cadang dan permintaannya — aplikasi internal pegawai.
 *
 * BENTUK TABEL v1 YANG HARUS DISADARI: `spare_part_requests` tidak punya kolom
 * jumlah maupun status. Permintaan di sini murni PENCATATAN — ia tidak
 * mengurangi stok dan tidak punya keadaan "sudah dipenuhi".
 *
 * Karena itu `stock` adalah angka yang disunting petugas, bukan hasil
 * perhitungan. Controller ini TIDAK diam-diam menguranginya saat permintaan
 * masuk: pengurangan otomatis di atas tabel yang tak menyimpan jumlah berarti
 * menebak berapa banyak yang diambil, dan tebakan pada angka stok lebih buruk
 * daripada angka yang jelas-jelas dikelola manual.
 *
 * Penyesuaian stok punya endpoint tersendiri (`adjustStock`) supaya niatnya
 * eksplisit dan alasannya tercatat pada pesannya.
 */
class SparePartController extends Controller
{
    public function adminIndex(Request $request)
    {
        $items = SparePart::query()
            ->when($request->query('q'), fn ($q, $cari) => $q->where('name', 'like', "%{$cari}%"))
            ->orderBy('name')
            ->get();

        return ApiResponse::success($items, 'Daftar suku cadang');
    }

    public function adminShow($id)
    {
        $item = SparePart::with('requests.user:id,name')->findOrFail($id);

        return ApiResponse::success($item, 'Rincian suku cadang');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->aturan(), $this->pesan());

        $item = new SparePart($this->tanpaFoto($data));
        $item->save();

        $this->simpanFoto($request, $item);

        return ApiResponse::success($item->fresh(), 'Suku cadang berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = SparePart::findOrFail($id);
        $data = $request->validate($this->aturan(partial: true), $this->pesan());

        $item->update($this->tanpaFoto($data));
        $this->simpanFoto($request, $item);

        return ApiResponse::success($item->fresh(), 'Suku cadang berhasil diperbarui');
    }

    /**
     * Tambah atau kurangi stok dengan jumlah yang eksplisit.
     *
     * Menerima SELISIH, bukan angka akhir. Dua petugas yang menyesuaikan stok
     * bersamaan dengan angka akhir akan saling menimpa tanpa ada yang sadar;
     * dengan selisih, keduanya terakumulasi.
     */
    public function adjustStock(Request $request, $id)
    {
        $item = SparePart::findOrFail($id);

        $data = $request->validate([
            'delta' => 'required|integer|not_in:0',
        ], [
            'delta.required' => 'Jumlah penyesuaian wajib diisi.',
            'delta.integer' => 'Jumlah penyesuaian harus berupa bilangan bulat.',
            'delta.not_in' => 'Jumlah penyesuaian tidak boleh nol.',
        ]);

        $baru = $item->stock + $data['delta'];

        if ($baru < 0) {
            return ApiResponse::error(
                "Stok tidak dapat menjadi negatif. Stok sekarang {$item->stock}.",
                null,
                422
            );
        }

        $lama = $item->stock;
        $item->stock = $baru;
        $item->save();

        return ApiResponse::success($item->fresh(), "Stok diubah dari {$lama} menjadi {$baru}");
    }

    public function destroy($id)
    {
        $item = SparePart::findOrFail($id);
        $jumlahPermintaan = $item->requests()->count();

        if ($jumlahPermintaan > 0) {
            return ApiResponse::error(
                "Suku cadang ini memiliki {$jumlahPermintaan} permintaan tercatat. Hapus permintaannya dahulu bila memang hendak dihapus.",
                null,
                422
            );
        }

        $item->hapusFoto();
        $item->delete();

        return ApiResponse::success(null, 'Suku cadang berhasil dihapus');
    }

    /* ------------------------- permintaan ------------------------- */

    public function requests(Request $request)
    {
        $items = SparePartRequest::with(['user:id,name', 'sparePart:id,name,stock'])
            ->when($request->query('spare_part_id'), fn ($q, $id) => $q->where('spare_part_id', $id))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar permintaan suku cadang');
    }

    public function storeRequest(Request $request)
    {
        $data = $request->validate([
            'spare_part_id' => 'required|exists:spare_parts,id',
            'subject' => 'required|string|max:125',
            'follow_up_notes' => 'nullable|string',
            'memo_link' => 'nullable|url|max:500',
        ], [
            'spare_part_id.required' => 'Suku cadang wajib dipilih.',
            'spare_part_id.exists' => 'Suku cadang tidak ditemukan.',
            'subject.required' => 'Perihal permintaan wajib diisi.',
            'memo_link.url' => 'Nota dinas harus berupa tautan yang sah.',
        ]);

        $item = SparePartRequest::create([...$data, 'user_id' => $request->user()->id]);

        // Stok TIDAK dikurangi di sini — lihat catatan kelas.
        return ApiResponse::success(
            $item->load('sparePart:id,name,stock'),
            'Permintaan tercatat. Stok tidak berubah otomatis; sesuaikan lewat penyesuaian stok bila barangnya sudah keluar.',
            null,
            201
        );
    }

    public function updateRequest(Request $request, $id)
    {
        $item = SparePartRequest::findOrFail($id);

        $data = $request->validate([
            'subject' => 'sometimes|required|string|max:125',
            'follow_up_notes' => 'nullable|string',
            'memo_link' => 'nullable|url|max:500',
        ], [
            'subject.required' => 'Perihal permintaan wajib diisi.',
            'memo_link.url' => 'Nota dinas harus berupa tautan yang sah.',
        ]);

        $item->update($data);

        return ApiResponse::success($item->fresh(), 'Permintaan berhasil diperbarui');
    }

    public function destroyRequest($id)
    {
        SparePartRequest::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Permintaan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /** @return array<string, mixed> */
    private function aturan(bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        return [
            'name' => $ada.'required|string|max:125',
            'stock' => $ada.'required|integer|min:0',
            'photo' => 'nullable|image|max:2048',
        ];
    }

    /** @return array<string, string> */
    private function pesan(): array
    {
        return [
            'name.required' => 'Nama suku cadang wajib diisi.',
            'stock.required' => 'Jumlah stok wajib diisi.',
            'stock.integer' => 'Stok harus berupa bilangan bulat.',
            'stock.min' => 'Stok tidak boleh negatif.',
            'photo.image' => 'Foto harus berupa gambar.',
            'photo.max' => 'Ukuran foto maksimal 2MB.',
        ];
    }

    private function tanpaFoto(array $data): array
    {
        return array_diff_key($data, ['photo' => null]);
    }

    private function simpanFoto(Request $request, SparePart $item): void
    {
        if (! $request->hasFile('photo')) {
            return;
        }

        $item->hapusFoto();

        $foto = $request->file('photo');

        $item->photo_path = $foto->storeAs(
            'spare-parts',
            Str::uuid().'.'.$foto->getClientOriginalExtension(),
            SparePart::DISK
        );
        $item->save();
    }
}
