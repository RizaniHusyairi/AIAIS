@extends('pdf._layout')

{{--
    Berita acara serah terima barang temuan.

    SELURUH WAKTU SUDAH DIFORMAT CONTROLLER lewat `App\Support\CetakanPdf`, dan
    diterima templat ini sebagai string jadi (`$ditemukanPada`,
    `$diserahkanPada`). JANGAN memformat `$barang->found_at` langsung di sini:
    `APP_TIMEZONE` bernilai UTC sementara dokumen ini menuliskan WITA, sehingga
    tanggal mentah tercetak delapan jam meleset. Kekeliruan itu sudah terjadi
    dua kali pada modul lain — sekali di kaki halaman, sekali lagi di badan
    tabel setelah kaki halamannya diperbaiki.

    Nomor identitas pengambil sengaja tercetak DI SINI meski tidak pernah keluar
    lewat JSON. Dokumen inilah tempatnya: ia ditandatangani kedua pihak dan
    disimpan sebagai arsip, bukan dikirim lewat jaringan.

    Kolom tanda tangan dibiarkan kosong untuk diisi dengan pena. Menandatangani
    serah terima barang di layar tidak menambah apa pun — yang menghadap loket
    adalah orangnya sendiri.
--}}

@section('isi')
    <p style="margin: 0 0 12px 0; text-align: justify;">
        Pada hari ini telah dilaksanakan serah terima barang temuan di lingkungan
        Bandar Udara APT Pranoto Samarinda, dengan rincian sebagai berikut.
    </p>

    <table class="data" style="margin-bottom: 14px;">
        <tbody>
            <tr>
                <th style="width: 130px; background: #eff6ff;">Nomor Barang</th>
                <td colspan="3">{{ $barang->code }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Kategori</th>
                <td style="width: 200px;">{{ $barang->category }}</td>
                <th style="width: 110px; background: #eff6ff;">Ditemukan</th>
                <td>{{ $ditemukanPada }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Lokasi Penemuan</th>
                <td>{{ $barang->found_area }}</td>
                <th style="background: #eff6ff;">Penemu</th>
                <td>{{ $barang->finder_name ?: '—' }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Ciri-ciri Barang</th>
                <td colspan="3">{{ $barang->description }}</td>
            </tr>
        </tbody>
    </table>

    @if ($laporan)
        {{-- Nomor tiket dicantumkan supaya dokumen ini dapat ditelusuri balik
             ke laporan warganya. Data pribadi pelapor selebihnya tidak dicetak;
             yang menandatangani adalah pengambil, dan identitasnya sudah
             tercatat di bawah. --}}
        <table class="data" style="margin-bottom: 14px;">
            <tbody>
                <tr>
                    <th style="width: 130px; background: #eff6ff;">Nomor Tiket Laporan</th>
                    <td>{{ $laporan->ticket_number }}</td>
                    <th style="width: 110px; background: #eff6ff;">Pelapor</th>
                    <td>{{ $laporan->reporter_name }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <table class="data" style="margin-bottom: 18px;">
        <thead>
            <tr><th colspan="4">Diterima Oleh</th></tr>
        </thead>
        <tbody>
            <tr>
                <th style="width: 130px; background: #eff6ff;">Nama</th>
                <td style="width: 200px;">{{ $barang->receiver_name }}</td>
                <th style="width: 110px; background: #eff6ff;">Diserahkan</th>
                <td>{{ $diserahkanPada }}</td>
            </tr>
            <tr>
                <th style="background: #eff6ff;">Identitas</th>
                <td colspan="3">
                    {{ $barang->receiver_id_type }} — {{ $barang->receiver_id_number }}
                </td>
            </tr>
            @if ($barang->handover_note)
                <tr>
                    <th style="background: #eff6ff;">Catatan</th>
                    <td colspan="3">{{ $barang->handover_note }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <p style="margin: 0 0 20px 0; text-align: justify;">
        Barang tersebut telah diterima dalam keadaan baik dan sesuai dengan
        ciri-ciri yang disampaikan. Dengan ditandatanganinya berita acara ini,
        tanggung jawab penyimpanan barang beralih kepada pihak yang menerima.
    </p>

    {{-- Dua kolom tanda tangan. DomPDF tidak mengenal flexbox; tabel tanpa
         garis adalah satu-satunya cara yang hasilnya sama di berkas cetakan. --}}
    <table style="width: 100%; margin-top: 10px;">
        <tr>
            <td style="width: 50%; text-align: center; vertical-align: top;">
                <div style="margin-bottom: 60px;">Yang Menyerahkan</div>
                <div style="font-weight: bold; text-decoration: underline;">
                    {{ $barang->handover_officer }}
                </div>
                <div style="font-size: 9px; color: #64748b;">Petugas Bandar Udara</div>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
                <div style="margin-bottom: 60px;">Yang Menerima</div>
                <div style="font-weight: bold; text-decoration: underline;">
                    {{ $barang->receiver_name }}
                </div>
                <div style="font-size: 9px; color: #64748b;">
                    {{ $barang->receiver_id_type }}
                </div>
            </td>
        </tr>
    </table>
@endsection
