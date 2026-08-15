@extends('pdf._layout')

{{--
    Daftar hadir rapat.

    Gambar tanda tangan disematkan sebagai data URI oleh controller, bukan
    dirujuk lewat lintasan berkas — templat PDF tidak boleh punya jalan membaca
    cakram privat.

    Kolom tanda tangan tetap tercetak meski kosong, dengan garis bantu. Peserta
    yang hadir tetapi tanda tangannya gagal tersimpan harus terlihat sebagai
    baris yang belum bertanda tangan, bukan hilang dari daftar.
--}}

@section('isi')
    <table class="data" style="margin-bottom: 14px;">
        <tbody>
            <tr>
                <th style="width: 110px; background: #eff6ff;">Hari / Tanggal</th>
                <td>{{ \App\Support\CetakanPdf::tanggal($rapat->date, 'l, d F Y') }}</td>
                <th style="width: 80px; background: #eff6ff;">Waktu</th>
                <td>{{ $rapat->start_time ? substr($rapat->start_time, 0, 5) . ' WITA' : '—' }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Tempat</th>
                <td>{{ $rapat->location }}</td>
                <th style="background: #eff6ff;">Penyelenggara</th>
                <td>
                    {{ $rapat->organizer }}
                    @if ($rapat->organizer_nip)
                        <br><span style="font-size: 9px; color: #64748b;">NIP {{ $rapat->organizer_nip }}</span>
                    @endif
                </td>
            </tr>
        </tbody>
    </table>

    @if ($peserta->isEmpty())
        <div class="kosong">Belum ada peserta yang mengisi daftar hadir.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th class="tengah" style="width: 26px;">No</th>
                    <th>Nama</th>
                    <th style="width: 150px;">Unit Kerja / Instansi</th>
                    <th style="width: 90px;">Telepon</th>
                    <th class="tengah" style="width: 110px;">Tanda Tangan</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($peserta as $i => $p)
                    <tr>
                        <td class="tengah">{{ $i + 1 }}</td>
                        <td>{{ $p['name'] }}</td>
                        <td>{{ $p['department'] }}</td>
                        <td>{{ $p['phone'] ?: '—' }}</td>
                        <td class="tengah" style="height: 42px;">
                            @if ($p['signature'])
                                <img src="{{ $p['signature'] }}" alt="" style="height: 34px;">
                            @else
                                <span style="color: #94a3b8; font-size: 8px;">belum bertanda tangan</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <p class="catatan">
            Jumlah peserta yang tercatat hadir: <strong>{{ $peserta->count() }}</strong> orang.
        </p>
    @endif
@endsection
