'use client';

/**
 * Kode QR untuk tautan bertoken.
 *
 * Ada karena cara tautan absensi benar-benar dibagikan: petugas menempelkan
 * selembar kertas di pintu ruang rapat, dan peserta memindainya sambil
 * berjalan masuk. Mengetikkan token 48 aksara dari layar proyektor bukan
 * pilihan yang nyata, dan mengirimkannya lewat grup pesan berarti tautannya
 * ikut tersimpan di ponsel orang yang tidak hadir.
 *
 * TIGA HAL YANG MENENTUKAN BENTUKNYA:
 *
 *  1. **Selalu hitam di atas putih**, meski panel sedang bertema gelap. QR
 *     bertema gelap (modul terang di atas latar gelap) memang masih terbaca
 *     sebagian pemindai, tetapi tidak semuanya — dan kegagalannya baru
 *     ketahuan saat antrean sudah berdiri di pintu.
 *  2. **Koreksi galat tingkat H (30%).** Dua alasan sekaligus: lembarnya
 *     ditempel di pintu dan kena lipatan serta sidik jari, DAN lambang bandara
 *     di tengahnya menutup sebagian modul. Tingkat H itulah yang membuat
 *     tutupan di tengah tetap terbaca — dengan tingkat M kode yang berlambang
 *     gagal dipindai begitu sudutnya sedikit terlipat.
 *  3. **Kanvas beresolusi cetak (1024px), ditampilkan kecil.** Satu kanvas
 *     melayani layar sekaligus unduhan dan cetakan; menggambar ulang pada
 *     ukuran tampil akan menghasilkan PNG buram begitu dicetak di A4.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode as IkonQr } from 'lucide-react';
import { Btn } from './ui';

/** Sisi kanvas dalam piksel. Cukup untuk QR selebar 10 cm pada 260 dpi. */
const SISI = 1024;

/**
 * Sisi tampilnya di layar, dalam piksel CSS.
 *
 * Dipasang sebagai GAYA SEBARIS, bukan lewat kelas Tailwind. `QRCode.toCanvas`
 * menuliskan `style.width`/`style.height` senilai `SISI` pada elemen kanvas
 * (lihat `qrcode/lib/renderer/canvas.js`), dan gaya sebaris mengalahkan kelas
 * apa pun — itulah sebabnya kode ini sempat tampil selebar 1024px dan menembus
 * dinding modalnya. Menimpanya balik dengan gaya sebaris adalah satu-satunya
 * cara yang bekerja tanpa `!important`.
 */
const TAMPIL = 176;

/** Lambang bandara yang dipasang di tengah kode. */
const LOGO = '/logo-mini-apt.svg';

/**
 * Lebar alas putih di tengah kode, sebagai pecahan dari sisi QR.
 *
 * 0,24 dipilih, bukan lebih besar. Koreksi galat tingkat H memulihkan sekitar
 * 30% modul yang rusak, dan alas selebar 24% sisi menutup ±5,8% LUAS kode —
 * jauh di bawah ambang itu, dengan sisa toleransi untuk lipatan kertas dan
 * pantulan cahaya di pintu. Memperbesarnya sampai terlihat gagah adalah cara
 * paling umum membuat kode berlambang gagal dipindai.
 */
const ALAS = 0.24;

/** Lebar lambang di dalam alas itu. Sisanya menjadi bingkai putih. */
const LAMBANG = 0.17;

/** Satu medan keterangan pada lembar cetak, bergaya boarding pass. */
export type MedanCetak = { label: string; value: string };

export default function QrTautan({
  url,
  judul,
  keterangan,
  detail = [],
  namaBerkas,
}: {
  url: string;
  /** Judul yang ikut tercetak di atas kode. */
  judul: string;
  /** Baris keterangan di bawah judul pada lembar cetak. Boleh kosong. */
  keterangan?: string;
  /**
   * Keterangan terpisah label–nilai, ditata sebagai medan boarding pass pada
   * lembar cetak. Lebih disukai daripada `keterangan`: satu kalimat panjang
   * yang dipisah titik tengah terbaca sebagai catatan kaki, sedangkan medan
   * berlabel terbaca sekilas dari jarak satu meter — jarak orang berdiri di
   * depan pintu ruang rapat.
   */
  detail?: MedanCetak[];
  /** Nama berkas unduhan, tanpa ekstensi. */
  namaBerkas?: string;
}) {
  const kanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    let batal = false;

    QRCode.toCanvas(kanvas, url, {
      errorCorrectionLevel: 'H',
      width: SISI,
      // Empat modul adalah zona sunyi minimum menurut spesifikasi QR. Tanpa
      // itu pemindai kesulitan menemukan tepi kode pada kertas berpola.
      margin: 4,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(() => {
        if (batal) return;

        // Kembalikan ukuran tampilnya; lihat catatan pada `TAMPIL`. Kanvasnya
        // sendiri tetap 1024px, jadi unduhan dan cetakan tidak ikut mengecil.
        kanvas.style.width = `${TAMPIL}px`;
        kanvas.style.height = `${TAMPIL}px`;

        /*
         * Lambang bandara di tengah kode.
         *
         * Digambar SESUDAH QR-nya jadi, langsung di atas kanvas yang sama,
         * supaya unduhan dan cetakan memakai gambar yang persis sama dengan
         * yang terlihat di layar — bukan dua jalur penggambaran yang bisa
         * menyimpang.
         *
         * Kegagalan memuat lambang TIDAK menggagalkan apa pun: kodenya sudah
         * tergambar utuh, dan QR tanpa lambang tetap sepenuhnya sah. Petugas
         * lebih baik menempel kode polos daripada tidak menempel apa pun.
         */
        const ctx = kanvas.getContext('2d');
        if (!ctx) return;

        const gambar = new Image();
        gambar.onload = () => {
          if (batal) return;

          const alas = SISI * ALAS;
          const lambang = SISI * LAMBANG;
          const tengah = SISI / 2;
          const jari = alas * 0.22;

          // Alas putih bersudut tumpul. Tanpa alas, modul gelap di belakang
          // lambang membuat tepinya tidak terbaca pemindai maupun mata.
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(tengah - alas / 2, tengah - alas / 2, alas, alas, jari);
          ctx.fill();

          ctx.drawImage(gambar, tengah - lambang / 2, tengah - lambang / 2, lambang, lambang);
        };
        gambar.src = LOGO;
      })
      .catch(() => {
        if (!batal) setGalat('Kode QR gagal dibuat.');
      });

    return () => { batal = true; };
  }, [url]);

  const unduh = () => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    kanvas.toBlob((blob) => {
      if (!blob) return;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${namaBerkas ?? 'qr'}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  /**
   * Lembar tempel untuk pintu ruang rapat.
   *
   * Dicetak dari jendela terpisah, bukan lewat `@media print` pada panel:
   * panel admin punya bilah sisi, tema gelap, dan tabel yang seluruhnya harus
   * disembunyikan lebih dulu — aturan cetak seperti itu selalu ketinggalan
   * satu langkah dari perubahan tata letak panelnya.
   *
   * BENTUKNYA SATU BOARDING PASS SEUKURAN A4, motif yang sama dengan portal
   * dan layar absensinya: kop langit malam, takik perforasi, busur rute
   * putus-putus, dan pita landasan di kaki halaman. Lembar ini ditempel di
   * pintu bersama pengumuman lain, dan bentuk yang dikenali seketika sebagai
   * milik bandara lebih berguna daripada kotak hitam-putih tanpa identitas.
   *
   * TIGA HAL YANG BUKAN SEKADAR HIASAN:
   *
   *  1. `print-color-adjust: exact`. Tanpa itu peramban membuang seluruh
   *     latar berwarna saat mencetak, dan kop langit malamnya keluar sebagai
   *     kertas kosong dengan teks putih di atasnya — tak terbaca sama sekali.
   *  2. Kurung sudut di sekeliling QR. Ia menandai daerah yang harus masuk
   *     bingkai kamera, dan menjaga zona sunyi kode tetap kosong dari hiasan
   *     apa pun.
   *  3. Tautan tetap tercetak sebagai teks. Peserta yang kameranya tidak dapat
   *     memindai — atau ponselnya terlalu tua — masih punya jalan masuk.
   */
  const cetak = () => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;

    const gambar = kanvas.toDataURL('image/png');
    const jendela = window.open('', '_blank', 'width=880,height=1040');

    if (!jendela) {
      setGalat('Jendela cetak diblokir peramban. Izinkan pop-up untuk situs ini.');

      return;
    }

    const aman = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* Lambang dirujuk lewat alamat mutlak: jendela cetak ber-URL about:blank,
       dan lintasan relatif tidak punya asal untuk dihitung. */
    const asal = window.location.origin;

    const medan = detail.length > 0
      ? detail
      : (keterangan ? [{ label: 'Keterangan', value: keterangan }] : []);

    jendela.document.write(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>QR Absensi — ${aman(judul)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
  }

  .lembar {
    position: relative;
    /* 296mm, bukan 297mm: pada margin halaman 0, isi yang tingginya PERSIS
       satu halaman kerap dibulatkan peramban menjadi sepersekian piksel lebih
       tinggi, dan lembar kedua yang kosong ikut keluar dari pencetak. */
    width: 210mm; min-height: 296mm;
    margin: 0 auto;
    padding: 0 0 0 0;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  /* ---- Kop: langit malam bandara ---- */
  .kop {
    position: relative;
    background: linear-gradient(135deg, #0b1e5b 0%, #123a8f 55%, #0284c7 100%);
    color: #fff;
    padding: 13mm 18mm 11mm;
    overflow: hidden;
  }
  .kop .cahaya {
    position: absolute; top: -34mm; right: -18mm;
    width: 92mm; height: 92mm; border-radius: 50%;
    background: rgba(125, 211, 252, .20);
  }
  .lockup { position: relative; display: flex; align-items: center; gap: 5mm; }
  .lockup img { width: 17mm; height: 17mm; }
  .lockup .nama { font-size: 15pt; font-weight: 800; letter-spacing: .01em; line-height: 1.15; }
  .lockup .sub { margin-top: 1mm; font-size: 8.5pt; color: rgba(191, 219, 254, .85); }
  .iata {
    margin-left: auto; text-align: right;
    font-size: 26pt; font-weight: 900; line-height: 1;
    color: rgba(186, 230, 253, .95);
  }
  .iata span { display: block; font-size: 7pt; font-weight: 700; letter-spacing: .22em; color: rgba(191, 219, 254, .7); }

  /* ---- Badan boarding pass ---- */
  .badan { position: relative; flex: 1; padding: 12mm 18mm 0; }
  .eyebrow {
    font-size: 8.5pt; font-weight: 800; letter-spacing: .24em;
    text-transform: uppercase; color: #2563eb; margin: 0;
  }
  h1 { font-size: 26pt; font-weight: 900; line-height: 1.15; margin: 3mm 0 0; }

  /* Grid, bukan flex-wrap: empat medan harus berbaris rapi seperti pada
     boarding pass sungguhan. Dengan flex-wrap, nilai yang panjang mendorong
     medan terakhir turun sendirian ke baris kedua — dan baris kedua itulah
     yang membuat lembarnya melimpah ke halaman kedua. */
  .medan { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7mm; margin-top: 7mm; }
  .medan .butir { min-width: 0; }
  .medan .label {
    font-size: 7pt; font-weight: 800; letter-spacing: .18em;
    text-transform: uppercase; color: #94a3b8; margin: 0;
  }
  .medan .nilai { font-size: 11.5pt; font-weight: 700; color: #1e293b; margin: 1.5mm 0 0; line-height: 1.3; }

  /* ---- Perforasi ---- */
  .perforasi { position: relative; margin: 8mm 0; border-top: 2px dashed #cbd5e1; }
  .perforasi .takik {
    position: absolute; top: -4mm; width: 8mm; height: 8mm;
    border-radius: 50%; background: #e2e8f0;
  }
  .perforasi .kiri { left: -22mm; }
  .perforasi .kanan { right: -22mm; }

  /* ---- Kode ---- */
  .kode { position: relative; text-align: center; }
  .busur { position: absolute; top: 12mm; left: -6mm; right: -6mm; height: 40mm; }
  .bingkai { position: relative; display: inline-block; padding: 7mm; }
  .bingkai img { display: block; width: 86mm; height: 86mm; }
  .sudut { position: absolute; width: 12mm; height: 12mm; border: 1.2mm solid #0b1e5b; }
  .sudut.tl { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 3mm 0 0 0; }
  .sudut.tr { top: 0; right: 0; border-left: 0; border-bottom: 0; border-radius: 0 3mm 0 0; }
  .sudut.bl { bottom: 0; left: 0; border-right: 0; border-top: 0; border-radius: 0 0 0 3mm; }
  .sudut.br { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 3mm 0; }

  .ajakan {
    margin: 6mm 0 0; font-size: 15pt; font-weight: 900; color: #0b1e5b;
    display: flex; align-items: center; justify-content: center; gap: 3mm;
  }
  .ajakan svg { width: 6mm; height: 6mm; }
  .url {
    margin: 6mm auto 0; max-width: 150mm;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 8pt; color: #64748b; word-break: break-all;
  }

  /* ---- Kaki: pita landasan ---- */
  .kaki { margin-top: auto; }
  .landasan {
    height: 6mm; background: #0b1e5b;
    background-image: repeating-linear-gradient(90deg,
      #ffffff 0, #ffffff 8mm, transparent 8mm, transparent 16mm);
  }
  .kakiTeks {
    background: #0b1e5b; color: rgba(191, 219, 254, .85);
    padding: 4mm 18mm 6mm; font-size: 8pt;
    display: flex; justify-content: space-between; gap: 6mm;
  }
</style></head>
<body>
  <div class="lembar">
    <div class="kop">
      <div class="cahaya"></div>
      <div class="lockup">
        <img src="${asal}${LOGO}" alt="">
        <div>
          <div class="nama">BANDAR UDARA APT PRANOTO</div>
          <div class="sub">Kantor UPBU Kelas I A.P.T. Pranoto — Samarinda, Kalimantan Timur</div>
        </div>
        <div class="iata">AAP<span>Samarinda</span></div>
      </div>
    </div>

    <div class="badan">
      <p class="eyebrow">Daftar Hadir Rapat</p>
      <h1>${aman(judul)}</h1>

      ${medan.length > 0 ? `<div class="medan">${medan.map((m) => `
        <div class="butir">
          <p class="label">${aman(m.label)}</p>
          <p class="nilai">${aman(m.value)}</p>
        </div>`).join('')}</div>` : ''}

      <div class="perforasi">
        <span class="takik kiri"></span>
        <span class="takik kanan"></span>
      </div>

      <div class="kode">
        <svg class="busur" viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M-20 170 Q 380 40 1020 130" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="9 13"/>
        </svg>

        <div class="bingkai">
          <span class="sudut tl"></span><span class="sudut tr"></span>
          <span class="sudut bl"></span><span class="sudut br"></span>
          <img src="${gambar}" alt="Kode QR daftar hadir">
        </div>

        <p class="ajakan">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0b1e5b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.5 4-2.4 2.4-2.1-.6a.5.5 0 0 0-.5.8L5 16l1.4 2.2a.5.5 0 0 0 .8-.1l.6-2.1 2.4-2.4 4 3.5a.5.5 0 0 0 .8-.5Z"/></svg>
          Pindai untuk mengisi daftar hadir
        </p>

        <p class="url">${aman(url)}</p>
      </div>
    </div>

    <div class="kaki">
      <div class="landasan"></div>
      <div class="kakiTeks">
        <span>Sistem Informasi Terpadu AIAIS · Bandar Udara APT Pranoto Samarinda</span>
        <span>Absensi ditutup oleh penyelenggara setelah rapat selesai</span>
      </div>
    </div>
  </div>
</body></html>`);
    jendela.document.close();
    jendela.focus();

    /*
     * Tunggu SELURUH gambar termuat — kode QR maupun lambangnya.
     *
     * Sebelumnya hanya gambar pertama yang ditunggu. Begitu lambang bandara
     * ikut masuk lembar, mencetak setelah QR saja menghasilkan kop dengan
     * kotak kosong di tempat lambangnya: berkasnya lebih besar dan datang
     * belakangan, dan dialog cetak sudah membekukan halaman sebelum ia tiba.
     */
    const gambarSemua = Array.from(jendela.document.images);
    let tersisa = gambarSemua.filter((g) => !g.complete).length;

    if (tersisa === 0) {
      jendela.print();

      return;
    }

    const mungkinCetak = () => {
      tersisa -= 1;
      if (tersisa <= 0) jendela.print();
    };

    gambarSemua
      .filter((g) => !g.complete)
      // `onerror` ikut dihitung: lambang yang gagal termuat tidak boleh
      // menahan lembarnya selamanya — QR-nya sendiri sudah cukup berguna.
      .forEach((g) => { g.onload = mungkinCetak; g.onerror = mungkinCetak; });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--adm-inset)] ring-1 ring-[var(--adm-line)] p-4">
        {/* Latar putih dipasang di sini, bukan diwarisi panel: pada tema gelap
            panelnya gelap, dan QR tanpa latar terang jauh lebih sulit dipindai. */}
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <canvas
            ref={kanvasRef}
            aria-label={`Kode QR daftar hadir ${judul}`}
            role="img"
            /* Ukuran awal sebelum kanvas selesai digambar; sesudahnya
               ditimpa gaya sebaris — lihat `TAMPIL`. */
            style={{ width: TAMPIL, height: TAMPIL }}
            className="block"
          />
        </div>

        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--adm-dim)]">
          <IkonQr className="w-3.5 h-3.5" />
          Peserta memindai kode ini, tanpa perlu masuk akun.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <Btn variant="ghost" onClick={unduh}>
            <Download className="w-4 h-4" /> Unduh PNG
          </Btn>
          <Btn variant="ghost" onClick={cetak}>
            <Printer className="w-4 h-4" /> Cetak Lembar Tempel
          </Btn>
        </div>
      </div>

      {galat && (
        <p role="alert" className="text-[11.5px] font-semibold text-rose-500">{galat}</p>
      )}
    </div>
  );
}
