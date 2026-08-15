<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryLogbook;
use App\Support\CetakanPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Inventaris aset bandara — aplikasi internal pegawai.
 *
 * SATU KEPUTUSAN YANG MENENTUKAN BENTUK CONTROLLER INI: status aset tidak
 * dapat diubah lewat `update()`. Ia hanya berpindah lewat `changeStatus()`,
 * yang WAJIB disertai alasan dan selalu menuliskan barisnya ke
 * `inventory_status_logs`.
 *
 * Alasannya: riwayat status adalah gunanya modul ini. Aset yang statusnya
 * dapat diubah diam-diam lewat formulir sunting biasa akan punya riwayat
 * berlubang, dan pertanyaan "sejak kapan alat ini rusak" tidak lagi terjawab —
 * padahal itulah pertanyaan yang membuat orang membuka halaman ini.
 */
class InventoryController extends Controller
{
    public function adminIndex(Request $request)
    {
        $items = Inventory::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->orderBy('name')
            ->get();

        return ApiResponse::success($items, 'Daftar aset inventaris');
    }

    /** Rincian satu aset berikut riwayat status dan jurnalnya. */
    public function adminShow($id)
    {
        $item = Inventory::with([
            'statusLogs.user:id,name',
            'logbooks.user:id,name',
        ])->findOrFail($id);

        return ApiResponse::success($item, 'Rincian aset inventaris');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->aturan(), $this->pesan());

        $item = new Inventory($this->tanpaFoto($data));
        // Aset baru selalu lahir dalam keadaan Baik; perpindahan status
        // sesudahnya harus lewat `changeStatus()` supaya tercatat.
        $item->status = 'Baik';
        $item->save();

        $this->simpanFoto($request, $item);

        return ApiResponse::success($item->fresh(), 'Aset berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = Inventory::findOrFail($id);
        $data = $request->validate($this->aturan(partial: true), $this->pesan());

        $item->update($this->tanpaFoto($data));
        $this->simpanFoto($request, $item);

        return ApiResponse::success($item->fresh(), 'Aset berhasil diperbarui');
    }

    /**
     * Pindahkan status aset, sekaligus catat riwayatnya.
     *
     * Alasan WAJIB diisi. Perpindahan tanpa alasan menghasilkan riwayat yang
     * lengkap tanggalnya tetapi kosong isinya — sama tak bergunanya dengan
     * tidak mencatat sama sekali.
     */
    public function changeStatus(Request $request, $id)
    {
        $item = Inventory::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(Inventory::STATUSES)],
            'notes' => 'required|string',
        ], [
            'status.required' => 'Status baru wajib dipilih.',
            'status.in' => 'Status aset tidak dikenali.',
            'notes.required' => 'Alasan perpindahan status wajib diisi.',
        ]);

        if ($data['status'] === $item->status) {
            return ApiResponse::error('Aset ini sudah berstatus '.$item->status.'.', null, 422);
        }

        $lama = $item->status;

        $item->statusLogs()->create([
            'user_id' => $request->user()->id,
            'previous_status' => $lama,
            'new_status' => $data['status'],
            'notes' => $data['notes'],
        ]);

        $item->status = $data['status'];
        $item->save();

        return ApiResponse::success(
            $item->fresh(),
            "Status aset diubah dari {$lama} menjadi {$data['status']} dan tercatat pada riwayat"
        );
    }

    public function destroy($id)
    {
        $item = Inventory::with('logbooks')->findOrFail($id);

        foreach ($item->logbooks as $jurnal) {
            $jurnal->hapusBerkas();
        }

        $item->hapusFoto();
        $item->delete();

        return ApiResponse::success(null, 'Aset berhasil dihapus beserta riwayat dan jurnalnya');
    }

    /* ------------------------- jurnal pemeliharaan ------------------------- */

    public function storeLogbook(Request $request, $id)
    {
        $item = Inventory::findOrFail($id);

        $data = $request->validate([
            'log_date' => 'required|date',
            'schedule_time' => 'nullable|date_format:H:i',
            'notes' => 'required|string',
            'documentation' => 'nullable|array|max:6',
            'documentation.*' => 'image|max:2048',
        ], [
            'log_date.required' => 'Tanggal kegiatan wajib diisi.',
            'schedule_time.date_format' => 'Waktu harus dalam format jam:menit, misalnya 09:30.',
            'notes.required' => 'Catatan kegiatan wajib diisi.',
            'documentation.max' => 'Maksimal 6 foto per catatan.',
            'documentation.*.image' => 'Dokumentasi harus berupa gambar.',
            'documentation.*.max' => 'Ukuran tiap foto maksimal 2MB.',
        ]);

        $lintasan = [];

        foreach ($request->file('documentation') ?? [] as $foto) {
            $lintasan[] = $foto->storeAs(
                'inventory/logbook',
                Str::uuid().'.'.$foto->getClientOriginalExtension(),
                InventoryLogbook::DISK
            );
        }

        $jurnal = $item->logbooks()->create([
            'user_id' => $request->user()->id,
            'log_date' => $data['log_date'],
            'schedule_time' => $data['schedule_time'] ?? null,
            'notes' => $data['notes'],
            'documentation' => $lintasan,
        ]);

        return ApiResponse::success($jurnal, 'Catatan jurnal berhasil ditambahkan', null, 201);
    }

    public function destroyLogbook($id)
    {
        $jurnal = InventoryLogbook::findOrFail($id);
        $jurnal->hapusBerkas();
        $jurnal->delete();

        return ApiResponse::success(null, 'Catatan jurnal berhasil dihapus');
    }

    /**
     * Cetak logbook satu aset sebagai PDF.
     *
     * Riwayat status ikut dicetak bersama jurnalnya — lihat catatan pada
     * templatenya. Aset yang belum punya catatan apa pun tetap menghasilkan
     * berkas berisi identitas asetnya; menolak mencetak akan terbaca seolah
     * fiturnya rusak.
     */
    public function exportLogbookPdf(Request $request, $id)
    {
        $aset = Inventory::with(['statusLogs.user:id,name', 'logbooks.user:id,name'])->findOrFail($id);

        $pdf = Pdf::loadView('pdf.inventory-logbook', [
            'judul' => 'Logbook Pemeliharaan Aset',
            'periode' => $aset->name.' · '.$aset->category,
            'dicetakPada' => CetakanPdf::dicetakPada(),
            'dicetakOleh' => $request->user()?->name,
            'aset' => $aset,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('logbook-'.Str::slug($aset->name).'.pdf');
    }

    /* -------------------------------------------------------------- */

    /** @return array<string, mixed> */
    private function aturan(bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        return [
            'name' => $ada.'required|string|max:125',
            'category' => $ada.'required|string|max:125',
            'input_date' => $ada.'required|date',
            'maintenance_report_link' => 'nullable|url|max:500',
            'photo' => 'nullable|image|max:2048',
        ];
    }

    /** @return array<string, string> */
    private function pesan(): array
    {
        return [
            'name.required' => 'Nama aset wajib diisi.',
            'category.required' => 'Kategori wajib diisi.',
            'input_date.required' => 'Tanggal pencatatan wajib diisi.',
            'maintenance_report_link.url' => 'Laporan pemeliharaan harus berupa tautan yang sah.',
            'photo.image' => 'Foto aset harus berupa gambar.',
            'photo.max' => 'Ukuran foto maksimal 2MB.',
        ];
    }

    private function tanpaFoto(array $data): array
    {
        return array_diff_key($data, ['photo' => null]);
    }

    private function simpanFoto(Request $request, Inventory $item): void
    {
        if (! $request->hasFile('photo')) {
            return;
        }

        $item->hapusFoto();

        $foto = $request->file('photo');

        $item->photo_path = $foto->storeAs(
            'inventory',
            Str::uuid().'.'.$foto->getClientOriginalExtension(),
            Inventory::DISK
        );
        $item->save();
    }
}
