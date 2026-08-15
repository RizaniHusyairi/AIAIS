@extends('pdf._layout')

{{--
    Logbook pemeliharaan satu aset.

    Riwayat perpindahan STATUS ikut dicetak di bawah jurnalnya, dan itu
    disengaja: pertanyaan yang dibawa orang ke dokumen ini hampir selalu
    "sejak kapan alat ini bermasalah, dan apa yang sudah dikerjakan" — dua
    pertanyaan yang jawabannya terpisah di dua tabel. Mencetak salah satunya
    saja memaksa pembaca mencari lembar kedua.
--}}

@section('isi')
    <table class="data" style="margin-bottom: 14px;">
        <tbody>
            <tr>
                <th style="width: 120px; background: #eff6ff;">Nama Aset</th>
                <td>{{ $aset->name }}</td>
                <th style="width: 100px; background: #eff6ff;">Kategori</th>
                <td>{{ $aset->category }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Status Saat Ini</th>
                <td>{{ $aset->status }}</td>
                <th style="background: #eff6ff;">Tanggal Pencatatan</th>
                <td>{{ optional($aset->input_date)->translatedFormat('d F Y') ?? '—' }}</td>
            </tr>
        </tbody>
    </table>

    <h1 style="font-size: 12px; margin-top: 14px;">Jurnal Kegiatan Pemeliharaan</h1>

    @if ($aset->logbooks->isEmpty())
        <div class="kosong">Belum ada catatan jurnal pada aset ini.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th class="tengah" style="width: 26px;">No</th>
                    <th style="width: 80px;">Tanggal</th>
                    <th style="width: 46px;">Waktu</th>
                    <th>Catatan Kegiatan</th>
                    <th style="width: 100px;">Petugas</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($aset->logbooks as $i => $jurnal)
                    <tr>
                        <td class="tengah">{{ $i + 1 }}</td>
                        <td>{{ optional($jurnal->log_date)->translatedFormat('d M Y') ?? '—' }}</td>
                        <td class="tengah">{{ $jurnal->schedule_time ? substr($jurnal->schedule_time, 0, 5) : '—' }}</td>
                        <td>{{ $jurnal->notes }}</td>
                        <td>{{ optional($jurnal->user)->name ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h1 style="font-size: 12px; margin-top: 16px;">Riwayat Perpindahan Status</h1>

    @if ($aset->statusLogs->isEmpty())
        <div class="kosong">Aset ini belum pernah berpindah status.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th class="tengah" style="width: 26px;">No</th>
                    <th style="width: 100px;">Tanggal</th>
                    <th style="width: 130px;">Perpindahan</th>
                    <th>Alasan</th>
                    <th style="width: 100px;">Petugas</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($aset->statusLogs as $i => $log)
                    <tr>
                        <td class="tengah">{{ $i + 1 }}</td>
                        {{-- Cap waktu WAJIB lewat CetakanPdf::waktu(): tanpa itu
                             kolomnya keluar sebagai UTC sementara kaki halaman
                             menulis WITA. --}}
                        <td>{{ \App\Support\CetakanPdf::waktu($log->created_at) }}</td>
                        <td>{{ $log->previous_status ?? '—' }} &rarr; <strong>{{ $log->new_status }}</strong></td>
                        <td>{{ $log->notes ?? '—' }}</td>
                        <td>{{ optional($log->user)->name ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
@endsection
