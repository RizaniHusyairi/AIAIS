{{--
    Blok tanda tangan "Mengetahui".

    Blok di sisi kanan halaman: jabatan di atas, ruang kosong untuk tanda
    tangan basah, lalu nama dan NIP. Isinya dari
    `config('pejabat.penanda_tangan')` — lihat provenans dan alasan ia tinggal
    di backend pada berkas config itu.

    TANPA GARIS TEPI. Lembar v1 mengurungnya dalam kotak, tetapi kotak itu
    artefak tata letak v1, bukan syarat keabsahan dokumen — dan pada cetakan
    yang tabel pesertanya sudah penuh garis, satu kotak lagi di bawahnya
    membuat halaman terbaca sebagai formulir isian, bukan dokumen yang sudah
    jadi. Jangan menambahkannya kembali.

    DUA HAL YANG MENENTUKAN MARKAHNYA:

     1. **Tabel, bukan div mengambang.** DomPDF tidak mengenal flexbox maupun
        grid; `float` di dalamnya kerap membuat blok ini tumpang tindih dengan
        tabel di atasnya begitu daftar pesertanya panjang. Tabel selebar 100%
        dengan satu sel kosong di kiri adalah cara yang benar-benar bekerja.

     2. **`page-break-inside: avoid`.** Blok tanda tangan yang terbelah dua
        halaman — jabatan di lembar terakhir, nama di lembar berikutnya —
        membuat dokumennya tidak sah ditandatangani.

    Tinggi ruang kosongnya 64px: cukup untuk tanda tangan basah beserta cap
    dinas, ukuran yang sama dengan lembar v1.
--}}
@php($ttd = config('pejabat.penanda_tangan'))

<table style="width: 100%; border-collapse: collapse; margin-top: 26px; page-break-inside: avoid;">
    <tr>
        {{-- Sel kiri sengaja kosong: ia yang mendorong blok ke sisi kanan. --}}
        <td style="width: 55%;"></td>
        <td style="width: 45%; padding: 10px 12px; text-align: center; vertical-align: top;">
            <div style="font-size: 10px;">{{ $ttd['label'] }}</div>
            <div style="font-size: 10px; line-height: 1.45;">{{ $ttd['jabatan'] }}</div>

            {{-- Ruang tanda tangan basah. --}}
            <div style="height: 64px;"></div>

            <div style="font-size: 10px; font-weight: bold;">{{ $ttd['nama'] }}</div>
            @if ($ttd['nip'])
                <div style="font-size: 10px;">NIP. {{ $ttd['nip'] }}</div>
            @endif
        </td>
    </tr>
</table>
