<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Complaint;
use App\Support\Notifikasi;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pengaduan publik berlampiran bukti.
 *
 * Sengaja terbuka tanpa autentikasi: menyampaikan pengaduan atas layanan
 * publik tidak boleh mensyaratkan akun. Konsekuensinya endpoint ini dibatasi
 * laju (lihat routes/api.php) dan dijaga penangkal kiriman ganda.
 */
class ComplaintController extends Controller
{
    /** Folder lampiran pada cakram publik. */
    private const DIR = 'complaints';

    /**
     * Jeda penangkal kiriman ganda.
     *
     * Portal v1 memakai jaring serupa (5 detik atas email + pesan yang sama)
     * karena tombol kirim yang diklik dua kali menghasilkan dua tiket untuk
     * satu keluhan, dan petugas menjawab keduanya.
     */
    private const DUPLICATE_SECONDS = 60;

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reporter_name' => 'required|string|max:150',
            'reporter_email' => 'required|email|max:150',
            'reporter_phone' => 'required|string|max:30',
            'category' => 'required|string|in:' . implode(',', Complaint::CATEGORIES),
            'subject' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
            // Hanya gambar: lampiran pengaduan adalah bukti keadaan lapangan
            // (fasilitas rusak, antrean menumpuk), bukan dokumen.
            'attachment' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'reporter_name.required' => 'Nama pelapor wajib diisi.',
            'reporter_email.required' => 'Alamat surel wajib diisi.',
            'reporter_email.email' => 'Alamat surel tidak sah.',
            'reporter_phone.required' => 'Nomor telepon wajib diisi.',
            'category.required' => 'Kategori pengaduan wajib dipilih.',
            'category.in' => 'Kategori pengaduan tidak dikenali.',
            'subject.required' => 'Subjek pengaduan wajib diisi.',
            'description.required' => 'Uraian pengaduan wajib diisi.',
            'description.max' => 'Uraian pengaduan maksimal 5.000 karakter.',
            'attachment.image' => 'Lampiran harus berupa gambar (JPG, PNG, atau WEBP).',
            'attachment.mimes' => 'Lampiran harus berformat JPG, PNG, atau WEBP.',
            'attachment.max' => 'Ukuran lampiran maksimal 5 MB.',
        ]);

        $duplikat = Complaint::where('reporter_email', $validated['reporter_email'])
            ->where('description', $validated['description'])
            ->where('created_at', '>=', Carbon::now()->subSeconds(self::DUPLICATE_SECONDS))
            ->first();

        if ($duplikat) {
            // Dijawab sukses dengan tiket yang sudah ada, bukan galat:
            // dari sisi pelapor pengaduannya memang sudah masuk.
            return ApiResponse::success([
                'ticket_number' => $duplikat->ticket_number,
                'status' => $duplikat->status,
                'created_at' => $duplikat->created_at,
            ], 'Pengaduan Anda sudah kami terima sebelumnya. Simpan Nomor Tiket ini.', null, 200);
        }

        if ($request->hasFile('attachment')) {
            // Nama diacak: nama asli unggahan kerap memuat spasi dan identitas
            // pengunggahnya, dan daftar direktori tidak boleh membocorkannya.
            $validated['attachment'] = $request->file('attachment')->storeAs(
                self::DIR,
                Str::uuid() . '.' . $request->file('attachment')->extension(),
                'public',
            );
        }

        $validated['ticket_number'] = 'TKT-' . date('Ymd') . '-' . strtoupper(Str::random(4));
        $validated['status'] = 'submitted';

        $complaint = Complaint::create($validated);

        Notifikasi::kirim('pengaduan', $complaint->ticket_number);

        return ApiResponse::success([
            'ticket_number' => $complaint->ticket_number,
            'status' => $complaint->status,
            'created_at' => $complaint->created_at,
        ], 'Pengaduan berhasil dikirim. Simpan Nomor Tiket Anda untuk melacak penanganannya.', null, 201);
    }

    /** Pelacakan publik — tanpa data pribadi pelapor. Lihat Complaint::publicView(). */
    public function track($ticket_number)
    {
        $complaint = Complaint::where('ticket_number', $ticket_number)->first();

        if (! $complaint) {
            return ApiResponse::error('Nomor tiket pengaduan tidak ditemukan.', null, 404);
        }

        return ApiResponse::success($complaint->publicView(), 'Status tiket pengaduan');
    }

    /** Daftar admin — memuat data pelapor, karena petugas perlu menghubunginya. */
    public function index(Request $request)
    {
        $status = $request->query('status');

        $complaints = Complaint::query()
            ->when($status && in_array($status, Complaint::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($complaints, 'Daftar semua pengaduan publik');
    }

    public function resolve(Request $request, $id)
    {
        $complaint = Complaint::findOrFail($id);

        $request->validate([
            'status' => 'required|in:in_progress,resolved,rejected',
            'admin_response' => 'required|string|max:5000',
        ], [
            'status.in' => 'Status pengaduan tidak dikenali.',
            'admin_response.required' => 'Tanggapan petugas wajib diisi.',
        ]);

        $complaint->update([
            'status' => $request->status,
            'admin_response' => $request->admin_response,
            'responded_at' => now(),
        ]);

        return ApiResponse::success($complaint->fresh(), 'Pengaduan berhasil diperbarui');
    }

    public function destroy($id)
    {
        $complaint = Complaint::findOrFail($id);
        $lampiran = $complaint->attachment;

        $complaint->delete();

        if (! empty($lampiran)) {
            Storage::disk('public')->delete($lampiran);
        }

        return ApiResponse::success(null, 'Pengaduan berhasil dihapus');
    }
}
