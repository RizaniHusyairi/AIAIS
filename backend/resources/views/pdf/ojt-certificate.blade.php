{{--
    Sertifikat OJT.

    TIDAK memakai `pdf._layout`. Kerangka itu memikul kop laporan, penomoran
    halaman, dan blok provenans — semuanya benar untuk laporan, dan semuanya
    salah untuk sertifikat. Sertifikat adalah satu lembar utuh yang dipajang,
    dan kaki "Dicetak 15 Agustus 2026 oleh admin" di bawahnya justru merusak
    kesan dokumen resmi yang hendak dibawanya.

    Tata letaknya memakai tabel dan blok, bukan flexbox — DomPDF tidak
    mengenalnya (lihat catatan pada `_layout`).
--}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $judul }}</title>
    <style>
        @page { margin: 0; }

        body {
            font-family: DejaVu Sans, sans-serif;
            margin: 0;
            color: #1e293b;
        }

        .lembar {
            /* A4 lanskap dikurangi bingkai. */
            width: 100%;
            height: 545px;
            padding: 26px 34px;
            box-sizing: border-box;
        }

        .bingkai {
            border: 3px solid #0b1e5b;
            padding: 4px;
            height: 100%;
            box-sizing: border-box;
        }

        .dalam {
            border: 1px solid #c8a34a;
            height: 100%;
            box-sizing: border-box;
            padding: 22px 34px;
            text-align: center;
        }

        .instansi { font-size: 13px; font-weight: bold; color: #0b1e5b; letter-spacing: .06em; }
        .kementerian { font-size: 9px; color: #64748b; margin-top: 2px; letter-spacing: .1em; }

        h1 {
            font-size: 24px;
            color: #0b1e5b;
            letter-spacing: .14em;
            margin: 16px 0 2px 0;
        }

        .nomor { font-size: 9px; color: #64748b; letter-spacing: .05em; }
        .diberikan { font-size: 10px; color: #475569; margin-top: 16px; }

        .nama {
            font-size: 26px;
            font-weight: bold;
            color: #0b1e5b;
            margin: 6px 0 2px 0;
        }

        .garis-nama { width: 55%; margin: 0 auto; border-bottom: 1px solid #c8a34a; }
        .identitas { font-size: 10px; color: #475569; margin-top: 6px; }

        .keterangan {
            font-size: 10.5px;
            color: #334155;
            margin: 14px auto 0 auto;
            width: 80%;
            line-height: 1.6;
        }

        table.nilai {
            margin: 14px auto 0 auto;
            border-collapse: collapse;
            font-size: 10px;
        }
        table.nilai td { padding: 3px 14px; }
        table.nilai .label { color: #64748b; text-align: right; }
        table.nilai .isi { font-weight: bold; color: #0b1e5b; text-align: left; }

        .predikat {
            display: inline-block;
            margin-top: 10px;
            border: 2px solid #c8a34a;
            border-radius: 999px;
            padding: 5px 22px;
            font-size: 13px;
            font-weight: bold;
            color: #0b1e5b;
            letter-spacing: .08em;
        }

        .ttd { margin-top: 20px; font-size: 10px; color: #334155; }
        .ttd .kota { margin-bottom: 46px; }
        .ttd .garis { display: inline-block; border-top: 1px solid #334155; padding-top: 3px; min-width: 190px; }
    </style>
</head>
<body>
<div class="lembar">
    <div class="bingkai">
        <div class="dalam">
            <div class="instansi">BANDAR UDARA APT PRANOTO SAMARINDA</div>
            <div class="kementerian">DIREKTORAT JENDERAL PERHUBUNGAN UDARA</div>

            <h1>SERTIFIKAT</h1>
            <div class="nomor">PRAKTIK KERJA LAPANGAN (ON THE JOB TRAINING)</div>

            <div class="diberikan">Diberikan kepada</div>

            <div class="nama">{{ $peserta->name }}</div>
            <div class="garis-nama"></div>

            <div class="identitas">
                {{ $peserta->id_number }} &nbsp;·&nbsp; {{ $peserta->institution }} &nbsp;·&nbsp; {{ $peserta->major }}
            </div>

            <p class="keterangan">
                Atas keikutsertaannya dalam kegiatan Praktik Kerja Lapangan di Bandar Udara APT Pranoto
                Samarinda, yang dilaksanakan pada
                <strong>{{ \App\Support\CetakanPdf::tanggal($peserta->start_date, 'd F Y') }}</strong>
                sampai dengan
                <strong>{{ \App\Support\CetakanPdf::tanggal($peserta->end_date, 'd F Y') }}</strong>
                @if ($peserta->work_units && count($peserta->work_units) > 0)
                    pada unit {{ implode(', ', $peserta->work_units) }}
                @endif
                dengan hasil sebagai berikut.
            </p>

            <table class="nilai">
                <tr>
                    <td class="label">Nilai Akhir</td>
                    <td class="isi">{{ number_format((float) $peserta->average_score, 2, ',', '.') }}</td>
                    <td class="label">Huruf Mutu</td>
                    <td class="isi">{{ $peserta->letter_grade ?? '—' }}</td>
                </tr>
            </table>

            <div class="predikat">{{ strtoupper($peserta->predicate ?? '—') }}</div>

            <div class="ttd">
                {{-- Tanggal ditulis sebagai tanggal TERBIT sertifikat, bukan
                     tanggal cetak ulang: sertifikat yang dicetak dua kali tidak
                     boleh membawa dua tanggal berbeda. --}}
                <div class="kota">
                    Samarinda, {{ \App\Support\CetakanPdf::tanggal($peserta->end_date, 'd F Y') }}
                </div>
                <div class="garis">Kepala Bandar Udara APT Pranoto</div>
            </div>
        </div>
    </div>
</div>
</body>
</html>
