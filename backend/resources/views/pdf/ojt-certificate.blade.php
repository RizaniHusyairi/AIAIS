{{--
    Sertifikat OJT.

    Tata letak, kop, kalimat, dan latarnya mengikuti sertifikat portal v1
    (`resources/views/user_staff2/ojt/certificate_pdf.blade.php` pada
    aptp-airport-main). Peserta lama sudah menerima sertifikat dengan wujud
    itu; sertifikat v2 yang tampil lain membuat dua angkatan peserta memegang
    dua dokumen resmi yang tidak serupa.

    PROVENANS
      Sumber   : templat sertifikat OJT portal v1 dan latarnya
                 (`public/assetsv2/image/sertifikat/bg.png`, disalin ke
                 `resources/pdf/sertifikat-ojt-bg.png`).
      Diambil  : 6 Oktober 2026.
      Catatan  : salah ketik v1 "KEMENTRIAN" dan "JENDRAL" TIDAK ditiru.
                 Penanda tangan dibaca dari `config('pejabat.penanda_tangan')`,
                 bukan ditulis mati seperti di v1, supaya pergantian pejabat
                 cukup lewat `.env`.

    Perbedaan teknis dari v1:
      - Latar dipasang sebagai <img> penuh halaman, bukan `background-size`
        yang tidak dikenal DomPDF.
      - Pas foto dikirim sebagai data URI: berkasnya di disk privat atau di
        direktori unggahan v1, keduanya bisa di luar chroot DomPDF.

    TIDAK memakai `pdf._layout` — sertifikat adalah satu lembar utuh tanpa kop
    laporan, penomoran halaman, atau kaki "dicetak oleh".
--}}
@php($ttd = config('pejabat.penanda_tangan'))
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $judul }} - {{ $peserta->name }}</title>
    <style>
        @page { margin: 0; }

        body {
            font-family: 'Times New Roman', Times, serif;
            margin: 0;
            padding: 0;
            color: #000;
        }

        .latar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }

        .isi {
            padding: 60px 100px 0 100px;
            text-align: center;
        }

        .kop .baris1 { font-size: 20px; font-weight: bold; }
        .kop .baris2 { font-size: 16px; font-weight: bold; }
        .kop .baris3 { font-size: 14px; font-weight: bold; }
        .kop .baris4 { font-size: 14px; }

        .judul {
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 5px;
            margin-bottom: 5px;
        }

        .nomor { font-size: 16px; margin-bottom: 20px; }
        .teks { font-size: 18px; line-height: 1.2; margin-bottom: 20px; }
        .teks-panjang { margin: 0 80px 20px 80px; }

        .nama {
            font-size: 28px;
            font-weight: bold;
            text-decoration: underline;
            margin: 20px 0 30px 0;
        }

        .foto {
            position: absolute;
            bottom: 120px;
            left: 120px;
            width: 110px;
            height: 130px;
            border: 2px solid #fff;
        }

        .kaki {
            position: absolute;
            bottom: 230px;
            width: 100%;
            font-size: 13px;
        }

        .ttd {
            float: right;
            width: 300px;
            margin-right: 100px;
            text-align: left;
        }

        .ttd .jabatan { margin-right: 30px; }
        .ttd .ruang { height: 64px; }
        .ttd .nama-pejabat { font-weight: bold; text-decoration: underline; font-size: 12px; }
        .ttd .nip { font-weight: bold; font-size: 12px; }
    </style>
</head>
<body>
    @if ($latar)
        <img src="{{ $latar }}" class="latar" alt="">
    @endif

    <div class="isi">
        <div class="kop">
            <div class="baris1">KEMENTERIAN PERHUBUNGAN</div>
            <div class="baris2">DIREKTORAT JENDERAL PERHUBUNGAN UDARA</div>
            <div class="baris2">BADAN LAYANAN UMUM</div>
            <div class="baris2">KANTOR UNIT PENYELENGGARA BANDAR UDARA KELAS I</div>
            <div class="baris3">AJI PANGERAN TUMENGGUNG PRANOTO - SAMARINDA</div>
            <div class="baris4">Jalan Poros Bontang Samarinda Kel. Sungai Siring Samarinda - Kalimantan Timur</div>
            <div class="baris4">Telp. (0541) 2831593 Email : mail.aptpranotoairport@gmail.com</div>
            <hr>
        </div>

        <div class="judul">SERTIFIKAT</div>
        {{-- Nomor urutnya diisi tangan saat penandatanganan, seperti di v1.
             Sistem tidak punya buku agenda nomor surat, dan mengarangnya
             berarti menerbitkan nomor resmi yang tidak tercatat. --}}
        <div class="nomor">No: SM.304/...../APTP/{{ $dicetak->format('Y') }}</div>

        <div class="teks">Diberikan kepada:</div>

        <div class="nama">{{ $peserta->name }}</div>

        <div class="teks teks-panjang">
            dari {{ $peserta->institution }} Jurusan {{ $peserta->major }} telah menyelesaikan Program
            <strong>On the Job Training (OJT)</strong> pada Kantor UPBU Kelas I A.P.T. Pranoto Samarinda
            selama <strong>{{ $peserta->duration }}</strong>
            mulai dari <strong>{{ \App\Support\CetakanPdf::tanggal($peserta->start_date, 'd F Y') }}</strong>
            s/d <strong>{{ \App\Support\CetakanPdf::tanggal($peserta->end_date, 'd F Y') }}</strong>
            dengan predikat <strong>{{ $peserta->predicate }}</strong>.
        </div>
    </div>

    @if ($foto)
        <img src="{{ $foto }}" class="foto" alt="">
    @endif

    <div class="kaki">
        <div class="ttd">
            <div>Samarinda, {{ \App\Support\CetakanPdf::tanggal($dicetak, 'd F Y') }}</div>
            <div class="jabatan">{{ mb_strtoupper($ttd['jabatan']) }}</div>
            <div class="ruang"></div>
            <div class="nama-pejabat">{{ mb_strtoupper($ttd['nama']) }}</div>
            <div class="nip">NIP. {{ $ttd['nip'] }}</div>
        </div>
    </div>
</body>
</html>
