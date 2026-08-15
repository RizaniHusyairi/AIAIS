{{--
    Kerangka bersama seluruh cetakan PDF portal.

    Dipakai ulang oleh setiap ekspor (lalu lintas udara, logbook inventaris,
    daftar hadir rapat, sertifikat OJT, dan seterusnya) supaya kop, penomoran
    halaman, dan blok provenansnya seragam — dokumen resmi yang tampil berbeda
    tiap modul membuat pembacanya ragu mana yang asli.

    CSS-nya sengaja sederhana. DomPDF tidak mengenal flexbox maupun grid; tata
    letak apa pun yang lebih rumit dari tabel akan terlihat benar di peramban
    lalu berantakan di berkas cetakannya.

    Slot yang diisi tiap halaman:
      $judul      — judul dokumen
      $periode    — keterangan periode/lingkup (opsional, tapi hampir selalu perlu)
      $orientasi  — 'portrait' | 'landscape' (diatur controller lewat setPaper)
      $dicetakOleh — nama petugas yang mencetak
--}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $judul }}</title>
    <style>
        @page { margin: 90px 40px 70px 40px; }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10px;
            color: #1e293b;
            margin: 0;
        }

        /* Kop dan kaki diulang pada SETIAP halaman — lembar kedua yang lepas
           dari berkasnya harus tetap dapat dikenali asalnya. */
        header {
            position: fixed;
            top: -70px; left: 0; right: 0; height: 60px;
            border-bottom: 2px solid #0b1e5b;
        }

        header .instansi { font-size: 13px; font-weight: bold; color: #0b1e5b; }
        header .alamat { font-size: 9px; color: #64748b; margin-top: 2px; }

        footer {
            position: fixed;
            bottom: -50px; left: 0; right: 0; height: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            font-size: 8px;
            color: #64748b;
        }

        /* Nomor halaman diletakkan DomPDF lewat counter CSS. */
        .halaman:after { content: counter(page) " / " counter(pages); }

        h1 { font-size: 15px; margin: 0 0 2px 0; color: #0b1e5b; }
        .periode { font-size: 10px; color: #475569; margin: 0 0 12px 0; }

        table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.data th, table.data td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        table.data thead th {
            background: #eff6ff;
            color: #0b1e5b;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .04em;
        }
        table.data tbody tr:nth-child(even) td { background: #f8fafc; }

        .angka { text-align: right; }
        .tengah { text-align: center; }
        .kosong { padding: 24px; text-align: center; color: #64748b; font-style: italic; }
        .catatan { margin-top: 10px; font-size: 9px; color: #64748b; }
    </style>
</head>
<body>
    <header>
        <div class="instansi">BANDAR UDARA APT PRANOTO SAMARINDA</div>
        <div class="alamat">Jalan Poros Samarinda – Bontang KM. 22, Sungai Siring, Samarinda Utara, Kalimantan Timur</div>
    </header>

    <footer>
        {{-- Provenans cetakan. Lembar yang beredar di rapat harus dapat
             ditelusuri: kapan dicetak dan oleh siapa. Tanpa ini, dua versi
             laporan yang berbeda angkanya mustahil dibedakan mana yang terbaru. --}}
        Dicetak {{ $dicetakPada }}
        @isset($dicetakOleh) oleh {{ $dicetakOleh }} @endisset
        · Portal Bandara APT Pranoto
        <span style="float: right;">Halaman <span class="halaman"></span></span>
    </footer>

    <main>
        <h1>{{ $judul }}</h1>
        @isset($periode)
            <p class="periode">{{ $periode }}</p>
        @endisset

        @yield('isi')
    </main>
</body>
</html>
