@extends('pdf._layout')

{{--
    Rekapitulasi lalu lintas angkutan udara harian untuk satu bulan.

    Susunan kolomnya mengikuti laporan v1 — petugas sudah terbiasa membacanya,
    dan laporan bulanan yang berganti bentuk menyulitkan perbandingan
    antarbulan yang justru menjadi gunanya.

    Baris JUMLAH di kaki tabel dihitung dari baris yang benar-benar tercetak,
    bukan dikirim terpisah, supaya angka totalnya mustahil berbeda dari
    penjumlahan yang dilihat pembacanya.
--}}

@section('isi')
    @if ($logs->isEmpty())
        <div class="kosong">
            Belum ada catatan lalu lintas udara pada periode ini.
        </div>
    @else
        <table class="data">
            <thead>
                <tr>
                    <th rowspan="2" class="tengah" style="width: 26px;">No</th>
                    <th rowspan="2" style="width: 78px;">Tanggal</th>
                    @foreach ($kategori as $k)
                        <th colspan="3" class="tengah">{{ $k['label'] }}{{ $k['unit'] ? ' (' . $k['unit'] . ')' : '' }}</th>
                    @endforeach
                </tr>
                <tr>
                    @foreach ($kategori as $k)
                        <th class="tengah">Datang</th>
                        <th class="tengah">Berangkat</th>
                        <th class="tengah">Jumlah</th>
                    @endforeach
                </tr>
            </thead>

            <tbody>
                @foreach ($logs as $i => $log)
                    <tr>
                        <td class="tengah">{{ $i + 1 }}</td>
                        <td>{{ $log->date->translatedFormat('d M Y') }}</td>
                        @foreach ($kategori as $k)
                            @php
                                $datang = (int) $log->{$k['key'] . '_arrival'};
                                $pergi = (int) $log->{$k['key'] . '_departure'};
                            @endphp
                            <td class="angka">{{ number_format($datang, 0, ',', '.') }}</td>
                            <td class="angka">{{ number_format($pergi, 0, ',', '.') }}</td>
                            <td class="angka"><strong>{{ number_format($datang + $pergi, 0, ',', '.') }}</strong></td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>

            <tfoot>
                <tr>
                    <th colspan="2" style="background: #eff6ff; color: #0b1e5b;">JUMLAH</th>
                    @foreach ($kategori as $k)
                        @php
                            $totalDatang = $logs->sum($k['key'] . '_arrival');
                            $totalPergi = $logs->sum($k['key'] . '_departure');
                        @endphp
                        <th class="angka" style="background: #eff6ff;">{{ number_format($totalDatang, 0, ',', '.') }}</th>
                        <th class="angka" style="background: #eff6ff;">{{ number_format($totalPergi, 0, ',', '.') }}</th>
                        <th class="angka" style="background: #eff6ff;">{{ number_format($totalDatang + $totalPergi, 0, ',', '.') }}</th>
                    @endforeach
                </tr>
            </tfoot>
        </table>

        <p class="catatan">
            Tercatat {{ $logs->count() }} hari pada periode ini. Hari yang tidak memiliki catatan
            tidak ditampilkan sebagai nol — ketiadaan barisnya berarti datanya memang belum masuk,
            bukan tidak ada penerbangan.
        </p>
    @endif
@endsection
