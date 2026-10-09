'use client';

/**
 * Daftar hadir rapat — layar peserta.
 *
 * DIPAKAI SAMBIL BERDIRI DI PINTU RUANG RAPAT, dari ponsel, sering bergantian
 * dengan orang di belakangnya. Seluruh bentuknya turun dari keadaan itu:
 *
 *  - **Tanpa masuk akun.** Peserta rapat berganti tiap pertemuan; mensyaratkan
 *    akun membuat daftar hadirnya tidak terisi sama sekali. Penjaganya token
 *    48 aksara di dalam URL, bukan sesi. Halaman ini karena itu tidak pernah
 *    menyentuh `localStorage` sesi maupun `adminFetch`.
 *  - **Layar penuh tanpa chrome portal.** `/absensi` terdaftar di
 *    `lib/layoutChrome.ts`, jadi navbar, footer, dan peluncur chat tidak ikut
 *    tampil — tidak ada pintu keluar yang mengundang peserta tersesat dari
 *    antrean.
 *  - **Tidak pernah dialihkan ke PWA.** `/absensi` ada di `KEEP_RESPONSIVE`
 *    (`lib/pwaRoutes.ts`). Sebelumnya tidak, dan akibatnya persis yang
 *    dilaporkan: ponsel yang memindai QR mendarat di beranda aplikasi dengan
 *    tokennya hilang. Layar ini sendirilah yang dibangun untuk ponsel.
 *  - **Ponsel mengingat pengisinya.** Nama, unit kerja, dan nomor telepon
 *    dituangkan kembali pada rapat berikutnya dari `lib/absensiPerangkat.ts`.
 *    Tanda tangannya tidak pernah ikut disimpan, dan asal isiannya dinyatakan
 *    terang beserta jalan "bukan saya" — ponsel pinjaman yang diam-diam
 *    terisi nama orang lain adalah cara tercepat mencatat kehadiran yang salah.
 *  - **Tombol kirim menempel di dasar layar.** Kanvas tanda tangan membuat
 *    halaman lebih panjang daripada satu layar; tombol yang ikut menggulir
 *    berarti peserta harus menggulir turun lagi setelah menandatangani.
 *  - **Layar berhasil menyebut nama yang baru mengisi**, lalu mengantarnya ke
 *    beranda portal — dengan jalan untuk peserta berikutnya tepat di bawahnya.
 *    Nama itu bukan hiasan: yang bersangkutan perlu yakin kehadirannya
 *    tercatat sebelum menyerahkan ponsel.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import TandaTanganKanvas from '@/components/akun/TandaTanganKanvas';
import { StatusBar } from '@/components/pwa/ui';
import { API_BASE_URL } from '@/lib/api';
import { bacaPeserta, simpanPeserta, lupakanPeserta, type JenisKelamin } from '@/lib/absensiPerangkat';
import type { AbsensiInfo } from '@/types';
import {
  KartuSeksi, MedanTeks, PilihJenisKelamin, SakelarMewakili,
  rapikanNomor, jumlahAngkaNomor, NOMOR_MIN, NOMOR_MAKS,
} from './MedanAbsensi';
import {
  CalendarDays, MapPin, User, CircleCheck, CircleAlert, Clock, ShieldCheck,
  Building2, Phone, ArrowRight, DoorClosed, LinkIcon, Home, UserCheck, X,
  CloudOff, RotateCw, UserRoundPen,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Potongan tampilan                                                  */
/* ------------------------------------------------------------------ */

/** Kerangka layar penuh; dipakai keadaan galat maupun formulirnya. */
function Layar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-200/70">
      <div className="mx-auto w-full max-w-[560px] min-h-[100dvh] bg-slate-50 sm:shadow-[0_0_60px_-25px_rgba(15,23,42,0.45)]">
        {children}
      </div>
    </div>
  );
}

/** Satu keterangan rapat pada kartu boarding pass. */
function Keterangan({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-blue-200/70">
        <Icon className="w-3 h-3 flex-shrink-0" />
        {label}
      </p>
      <p className="mt-1 text-[13px] font-bold text-white leading-snug break-words">{value}</p>
    </div>
  );
}

const tanggalPanjang = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

/* ------------------------------------------------------------------ */
/*  Layar                                                              */
/* ------------------------------------------------------------------ */

/**
 * Sebab keterangan rapat tidak dapat dimuat.
 *
 * Dibedakan karena tindakan yang benar bagi peserta berbeda: tautan yang
 * tidak dikenali perlu diganti, sedangkan server yang ramai atau terganggu
 * cukup dicoba lagi — menyuruh peserta meminta tautan baru untuk keadaan itu
 * membuat antrean di pintu bertambah panjang tanpa guna.
 */
export type MasalahTautan = 'tidak-dikenal' | 'ramai' | 'gangguan';

const LAYAR_MASALAH: Record<MasalahTautan, { judul: string; isi: string; cobaLagi: boolean }> = {
  'tidak-dikenal': {
    judul: 'Tautan absensi tidak dikenali',
    isi: 'Tautannya mungkin salah ketik, atau sudah diperbarui petugas. Mintalah tautan — atau pindai ulang kode QR — terbaru kepada penyelenggara rapat.',
    cobaLagi: false,
  },
  ramai: {
    judul: 'Daftar hadir sedang ramai',
    isi: 'Banyak peserta membuka daftar hadir bersamaan. Tautan Anda benar — tunggu beberapa detik, lalu muat ulang.',
    cobaLagi: true,
  },
  gangguan: {
    judul: 'Daftar hadir belum dapat dimuat',
    isi: 'Server sedang tidak dapat dihubungi. Tautan Anda tidak perlu diganti — periksa sambungan internet, lalu muat ulang.',
    cobaLagi: true,
  },
};

export default function AbsensiForm({
  token,
  info,
  masalah,
}: {
  token: string;
  info: AbsensiInfo | null;
  masalah: MasalahTautan | null;
}) {
  const [nama, setNama] = useState('');
  const [unit, setUnit] = useState('');
  const [telepon, setTelepon] = useState('');
  const [jk, setJk] = useState<JenisKelamin | null>(null);
  /** Sakelar "hadir mewakili"; isiannya hanya dikirim selama sakelar menyala. */
  const [mewakili, setMewakili] = useState(false);
  const [diwakili, setDiwakili] = useState('');
  const [ttd, setTtd] = useState<string | null>(null);
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  /*
   * Kunci kanvas tanda tangan. Kanvas menyimpan goresannya di dalam elemen
   * <canvas>, bukan di state React — `setTtd(null)` saja tidak menghapus apa
   * pun yang terlihat. Menaikkan kunci ini memasang kanvas baru yang bersih
   * untuk peserta berikutnya.
   */
  const [kunciKanvas, setKunciKanvas] = useState(0);
  /** Benar bila ketiga isian di atas datang dari simpanan perangkat ini. */
  const [dariPerangkat, setDariPerangkat] = useState(false);

  /*
   * Tuangkan identitas yang diingat perangkat ini.
   *
   * DI DALAM EFEK, bukan sebagai nilai awal `useState`: `localStorage` tidak
   * ada di server, jadi nilai awal yang membacanya membuat markah kiriman
   * server berbeda dari hasil hidrasi — dan React membuang seluruh pohonnya
   * lalu menggambar ulang.
   *
   * Berjalan sekali saat layar dibuka, jadi ia TIDAK ikut campur pada alur
   * "peserta berikutnya": bila satu ponsel memang dipakai bergantian,
   * mengisikan nama orang sebelumnya kepada orang di belakangnya justru
   * sumber kesalahan, bukan kemudahan.
   *
   * `react-hooks/set-state-in-effect` dimatikan dengan sadar. Aturan itu
   * menjaga dari rantai render yang saling memicu; di sini penyetelannya
   * terjadi SEKALI saat pemasangan, dari `localStorage` yang memang tidak
   * dapat dibaca lebih awal — membacanya sebagai nilai awal `useState` akan
   * membuat markah server berbeda dari hasil hidrasi, kegagalan yang jauh
   * lebih mahal daripada satu render tambahan.
   */
  useEffect(() => {
    const tersimpan = bacaPeserta();
    if (!tersimpan) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNama(tersimpan.name);
    setUnit(tersimpan.department);
    setTelepon(rapikanNomor(tersimpan.phone));
    setJk(tersimpan.gender ?? null);
    setDariPerangkat(true);
  }, []);

  /*
   * Kelengkapan tiap isian, dihitung dengan aturan yang SAMA dengan backend
   * (nomor 8–15 angka, jenis kelamin L/P). Dipakai tiga tempat sekaligus:
   * centang pada isian, centang pada kartu seksi, dan bilah kemajuan di
   * dasar layar — jadi ketiganya mustahil saling berselisih.
   */
  const angkaNomor = jumlahAngkaNomor(telepon);
  const cek = {
    nama: nama.trim().length >= 2,
    jk: jk !== null,
    unit: unit.trim().length >= 2,
    diwakili: !mewakili || diwakili.trim().length >= 2,
    telepon: angkaNomor >= NOMOR_MIN && angkaNomor <= NOMOR_MAKS,
    ttd: ttd !== null,
  };
  // Isian "mewakili" hanya dihitung selama sakelarnya menyala — kalau tidak,
  // layar yang belum disentuh sama sekali sudah mengaku "1/6 terisi".
  const langkah = [cek.nama, cek.jk, cek.unit, cek.telepon, cek.ttd, ...(mewakili ? [cek.diwakili] : [])];
  const terisi = langkah.filter(Boolean).length;
  const lengkap = terisi === langkah.length;

  /** "Bukan saya" — kosongkan formulir sekaligus lupakan simpanannya. */
  const bukanSaya = () => {
    lupakanPeserta();
    setNama('');
    setUnit('');
    setTelepon('');
    setJk(null);
    setDariPerangkat(false);
  };

  /** Mematikan sakelar ikut membuang isiannya — tidak ada nilai tersembunyi yang terkirim. */
  const ubahMewakili = (aktif: boolean) => {
    setMewakili(aktif);
    if (!aktif) setDiwakili('');
  };

  /* ---- Keterangan rapat tidak termuat: tautan salah, server ramai, atau terganggu ---- */
  if (!info) {
    const layar = LAYAR_MASALAH[masalah ?? 'tidak-dikenal'];
    const Ikon = layar.cobaLagi ? CloudOff : LinkIcon;

    return (
      <Layar>
        <StatusBar />
        <div className="min-h-[80dvh] flex flex-col items-center justify-center px-8 text-center">
          <span
            className={`w-16 h-16 rounded-3xl ring-1 flex items-center justify-center ${
              layar.cobaLagi ? 'bg-amber-50 ring-amber-100' : 'bg-rose-50 ring-rose-100'
            }`}
          >
            <Ikon className={`w-7 h-7 ${layar.cobaLagi ? 'text-amber-600' : 'text-rose-500'}`} />
          </span>
          <h1 className="mt-5 text-[18px] font-black text-slate-900">{layar.judul}</h1>
          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-xs">{layar.isi}</p>

          {layar.cobaLagi && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-7 w-full max-w-xs inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-[15px] py-4 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              Muat Ulang
            </button>
          )}
        </div>
      </Layar>
    );
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    /*
     * Teguran urut dari atas ke bawah, satu per satu — yang disebut adalah
     * isian pertama yang masih kurang, persis yang akan ditemui peserta bila
     * menggulir naik. Isian teks sudah dijaga `required` milik peramban;
     * yang diperiksa di sini adalah yang tidak dapat dijaga atribut HTML.
     */
    const kurang = !cek.jk
      ? 'Pilih jenis kelamin Anda.'
      : !cek.diwakili
        ? 'Tulis nama atau jabatan yang Anda wakili, atau matikan pilihan "Hadir mewakili".'
        : !cek.telepon
          ? `Nomor HP tidak valid. Tulis nomor lengkap (${NOMOR_MIN}–${NOMOR_MAKS} angka), misalnya 0812 3456 7890.`
          : !ttd
            ? 'Tanda tangan wajib diisi. Goreskan tanda tangan Anda pada kotak di atas.'
            : null;

    if (kurang) {
      setGalat(kurang);

      return;
    }

    setGalat('');
    setMengirim(true);

    try {
      const res = await fetch(`${API_BASE_URL}/absensi/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: nama,
          gender: jk,
          department: unit,
          represents: mewakili ? diwakili.trim() : null,
          phone: telepon.trim(),
          signature: ttd,
        }),
      });
      const json = await res.json().catch(() => null);
      setMengirim(false);

      if (!res.ok || !json?.success) {
        setGalat(json?.message ?? 'Kehadiran gagal dikirim. Coba lagi.');

        return;
      }

      /*
       * Ingat identitasnya untuk rapat berikutnya — SESUDAH server menerima,
       * bukan saat tombol ditekan. Isian yang ditolak backend (nomor ganda,
       * absensi keburu ditutup) tidak layak diingat sebagai identitas sah.
       *
       * Tanda tangannya sengaja tidak ikut. Lihat `lib/absensiPerangkat.ts`.
       */
      simpanPeserta({ name: nama, department: unit, phone: telepon.trim(), gender: jk ?? undefined });
      setBerhasil(nama);
    } catch {
      setMengirim(false);
      setGalat('Tidak dapat terhubung. Periksa sambungan internet Anda.');
    }
  };

  /**
   * Bersihkan untuk peserta berikutnya — satu ponsel dipakai bergantian.
   *
   * Formulirnya dikosongkan, TIDAK diisi ulang dari simpanan perangkat:
   * orang di belakang antrean bukan orang yang barusan mengisi.
   */
  const pesertaBerikutnya = () => {
    setBerhasil(null);
    setNama('');
    setUnit('');
    setTelepon('');
    setJk(null);
    setMewakili(false);
    setDiwakili('');
    setTtd(null);
    setDariPerangkat(false);
    setKunciKanvas((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layar>
      {/* ================= KEPALA: kartu bergaya boarding pass ================= */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-blue-700 to-sky-600">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
        <StatusBar />

        <div className="relative px-5 pt-6 pb-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
              Daftar Hadir Rapat
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-black ring-1 ${
                info.is_active
                  ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30'
                  : 'bg-amber-400/15 text-amber-100 ring-amber-300/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${info.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`} />
              {info.is_active ? 'Absensi dibuka' : 'Absensi ditutup'}
            </span>
          </div>

          <h1 className="mt-3 text-[22px] font-black text-white leading-[1.2]">{info.title}</h1>

          {/* takik perforasi, motif boarding pass yang dipakai portal */}
          <div className="relative my-5 border-t-2 border-dashed border-white/25">
            <span className="absolute -top-[7px] -left-[19px] w-3.5 h-3.5 rounded-full bg-slate-50" />
            <span className="absolute -top-[7px] -right-[19px] w-3.5 h-3.5 rounded-full bg-slate-50" />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Keterangan icon={CalendarDays} label="Tanggal" value={tanggalPanjang(info.date)} />
            <Keterangan icon={Clock} label="Mulai" value={`${info.start_time?.slice(0, 5) ?? '—'} WITA`} />
            <Keterangan icon={MapPin} label="Tempat" value={info.location} />
            <Keterangan icon={User} label="Penyelenggara" value={info.organizer} />
          </div>
        </div>
      </header>

      <main className="px-5 pt-5 pb-40">
        {/* ================= Absensi ditutup ================= */}
        {!info.is_active ? (
          <div className="rounded-3xl bg-white ring-1 ring-slate-200 px-6 py-12 text-center">
            <span className="w-14 h-14 rounded-2xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center mx-auto">
              <DoorClosed className="w-6 h-6 text-amber-600" />
            </span>
            <p className="mt-4 text-[15px] font-black text-slate-900">Daftar hadir sudah ditutup</p>
            <p className="mt-2 text-[12.5px] text-slate-500 leading-relaxed">
              Penyelenggara telah menutup absensi rapat ini. Hubungi penyelenggara bila kehadiran
              Anda belum tercatat.
            </p>
          </div>
        ) : (
          <form onSubmit={kirim} className="space-y-4">
            {/* Jaminan tanpa akun. Ditulis terang di muka karena pertanyaan
                pertama peserta di pintu selalu "harus login dulu tidak?" */}
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-blue-50 ring-1 ring-blue-100 px-4 py-2.5 text-[11.5px] font-bold text-blue-800">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Tanpa perlu masuk akun — cukup isi lalu tanda tangani.
            </p>

            {/*
              Pemberitahuan bahwa isiannya datang dari ponsel ini.

              WAJIB ADA, bukan kemudahan yang diam-diam. Formulir yang tiba-tiba
              terisi nama orang lain — ponsel yang dipinjam, atau ponsel petugas
              yang dipakai bergantian — adalah cara tercepat mencatatkan
              kehadiran yang salah. Karena itu asalnya dinyatakan terang, dan
              jalan keluarnya disediakan tepat di sebelahnya.
            */}
            {/*
              TANPA `AnimatePresence`. Pemberitahuan ini hanya pernah menghilang
              — sekali "bukan saya" ditekan, ia tidak muncul lagi sepanjang layar
              terbuka — jadi animasi keluarnya tidak berguna. Dan `exit` yang
              menyusutkan tinggi ke nol di sini terbukti menyelesaikan animasinya
              TANPA melepas simpulnya: wadah setinggi nol itu tetap memuat tombol
              "bukan saya" yang masih dapat dicapai lewat tombol Tab, sementara
              tidak ada apa pun yang terlihat di layar. Render bersyarat biasa
              melepasnya dengan pasti.
            */}
            {dariPerangkat && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="flex items-start gap-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3.5"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-emerald-900 leading-snug">
                    Terisi dari absensi Anda sebelumnya di ponsel ini.
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-emerald-800/85 leading-relaxed">
                    Periksa dan ubah bila perlu — tanda tangan tetap harus digoreskan ulang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={bukanSaya}
                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:ring-emerald-300 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" /> Bukan saya
                </button>
              </motion.div>
            )}

            {/*
              Empat kartu bernomor, urut seperti lembar daftar hadir kertas:
              siapa, dari mana, cara menghubungi, lalu tanda tangan. Nomornya
              berganti centang begitu kartunya lengkap.
            */}
            <KartuSeksi nomor={1} judul="Data Diri" selesai={cek.nama && cek.jk}>
              <MedanTeks
                label="Nama Lengkap"
                icon={User}
                value={nama}
                onChange={setNama}
                valid={cek.nama}
                galat={cek.nama ? null : 'Tulis nama lengkap Anda.'}
                placeholder="Nama sesuai identitas"
                required maxLength={125} autoComplete="name" autoCapitalize="words" enterKeyHint="next"
              />
              <PilihJenisKelamin value={jk} onChange={setJk} />
            </KartuSeksi>

            <KartuSeksi
              nomor={2}
              judul="Instansi"
              keterangan="Tempat Anda bekerja, dan siapa yang Anda wakili bila diutus"
              selesai={cek.unit && cek.diwakili}
            >
              <MedanTeks
                label="Unit Kerja / Instansi"
                icon={Building2}
                value={unit}
                onChange={setUnit}
                valid={cek.unit}
                galat={cek.unit ? null : 'Tulis unit kerja atau instansi Anda.'}
                placeholder="Contoh: Seksi Teknik & Operasi"
                required maxLength={125} autoComplete="organization" enterKeyHint="next"
              />
              <SakelarMewakili aktif={mewakili} onToggle={ubahMewakili}>
                <MedanTeks
                  label="Yang Diwakili"
                  icon={UserRoundPen}
                  value={diwakili}
                  onChange={setDiwakili}
                  valid={mewakili && cek.diwakili}
                  galat={cek.diwakili ? null : 'Tulis siapa yang Anda wakili.'}
                  placeholder="Contoh: Kepala Dinas Perhubungan"
                  petunjuk="Tercetak di bawah nama Anda: “mewakili …”."
                  autoFocus
                  maxLength={125} autoCapitalize="words" enterKeyHint="next"
                />
              </SakelarMewakili>
            </KartuSeksi>

            {/* WAJIB, bukan opsional. Nomor inilah satu-satunya penanda yang
                membedakan peserta pada daftar hadir tanpa akun, dan yang
                dipakai backend menolak absensi ganda. */}
            <KartuSeksi nomor={3} judul="Kontak" selesai={cek.telepon}>
              <MedanTeks
                label="Nomor HP"
                icon={Phone}
                value={telepon}
                onChange={(v) => setTelepon(rapikanNomor(v))}
                valid={cek.telepon}
                galat={cek.telepon ? null : `Nomor belum lengkap — paling sedikit ${NOMOR_MIN} angka.`}
                placeholder="0812 3456 7890"
                petunjuk={
                  angkaNomor > 0
                    ? `${angkaNomor} angka${cek.telepon ? ' · siap' : ` · minimal ${NOMOR_MIN}`}`
                    : 'Dipakai untuk memastikan satu peserta tercatat sekali saja.'
                }
                type="tel" inputMode="tel" required maxLength={22} autoComplete="tel" enterKeyHint="done"
              />
            </KartuSeksi>

            {/* Label, tombol "Ulangi", dan petunjuknya dibawa komponen kanvas
                sendiri — kartunya cukup memberi nomor urut. */}
            <KartuSeksi nomor={4} judul="Tanda Tangan" selesai={cek.ttd}>
              <TandaTanganKanvas key={kunciKanvas} onChange={setTtd} />
            </KartuSeksi>

            {galat && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3.5 text-[12.5px] font-semibold text-rose-700"
              >
                <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galat}
              </p>
            )}

            {/* Tombol menempel di dasar layar — kanvas tanda tangan membuat
                halaman lebih panjang daripada satu layar ponsel.

                Bilah kemajuan di atasnya menjawab pertanyaan yang muncul
                begitu tombol ditekan dan ditolak: "apa lagi yang kurang?".
                Tombolnya TIDAK dimatikan selama belum lengkap — tombol mati
                tidak menjelaskan apa pun, sedangkan menekannya memunculkan
                teguran yang menyebut isian mana yang kurang. */}
            <div
              className="fixed bottom-0 inset-x-0 z-20 mx-auto w-full max-w-[560px] bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-5 pt-2.5"
              style={{ paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${lengkap ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    initial={false}
                    animate={{ width: `${(terisi / langkah.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                  />
                </div>
                <span className={`text-[11px] font-bold tabular-nums ${lengkap ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {lengkap ? 'Siap dikirim' : `${terisi}/${langkah.length} terisi`}
                </span>
              </div>

              <motion.button
                type="submit"
                disabled={mengirim}
                whileTap={{ scale: 0.98 }}
                animate={lengkap ? { boxShadow: '0 12px 28px -10px rgba(16,185,129,0.6)' } : { boxShadow: '0 12px 28px -10px rgba(37,99,235,0.45)' }}
                className={`w-full rounded-2xl text-white font-black text-[15.5px] py-4 transition-colors cursor-pointer disabled:bg-slate-300 ${
                  lengkap ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {mengirim ? 'Mengirim…' : 'Catat Kehadiran Saya'}
              </motion.button>
            </div>
          </form>
        )}
      </main>

      {/* ================= Layar berhasil ================= */}
      <AnimatePresence>
        {berhasil && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-slate-50 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-[560px] min-h-[100dvh] flex flex-col items-center justify-center px-8 text-center">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="w-24 h-24 rounded-full bg-emerald-50 ring-8 ring-emerald-100/60 flex items-center justify-center"
              >
                <CircleCheck className="w-12 h-12 text-emerald-600" strokeWidth={2.2} />
              </motion.span>

              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Kehadiran Tercatat
              </p>
              <h2 className="mt-2 text-[24px] font-black text-slate-900 leading-tight break-words">
                {berhasil}
              </h2>
              <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-xs">
                Nama Anda sudah masuk daftar hadir <span className="font-bold text-slate-700">{info.title}</span>.
                Tidak perlu mengisi ulang.
              </p>

              {/*
                Beranda portal jadi tindakan UTAMA sesudah kehadiran tercatat.
                Urusan peserta ini selesai; membiarkan layar buntu di ujungnya
                berarti ia menutup tab dan portal kehilangan satu-satunya
                kesempatan mengantarnya ke isi yang lain.

                TIDAK dialihkan otomatis. Satu ponsel kerap dipakai beberapa
                peserta berurutan, dan pengalihan yang berjalan sendiri
                melempar orang di belakangnya keluar dari daftar hadir yang
                belum sempat ia isi — ia harus memindai ulang QR di pintu.
                Karena itu jalan untuk peserta berikutnya tetap ada, satu
                tingkat di bawahnya.
              */}
              <Link
                href="/"
                className="mt-9 w-full max-w-xs inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-[15px] py-4 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </Link>

              {/*
                Tidak ada lagi kalimat "serahkan perangkat ini kepada peserta
                di belakang Anda". Peserta rapat datang membawa ponselnya
                masing-masing, jadi kalimat itu menggambarkan keadaan yang
                nyaris tidak pernah terjadi — dan menyuruh orang menyerahkan
                ponselnya sendiri kepada orang lain.

                Tombolnya tetap ada untuk keadaan yang memang terjadi: satu
                ponsel dipinjamkan kepada peserta yang tidak membawa perangkat.
                Labelnya sudah menjelaskan dirinya sendiri, jadi tidak perlu
                kalimat penjelas di bawahnya.
              */}
              <button
                type="button"
                onClick={pesertaBerikutnya}
                className="mt-3 w-full max-w-xs inline-flex items-center justify-center gap-2 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-blue-300 active:scale-[0.99] text-slate-700 font-bold text-[13.5px] py-3.5 transition-all cursor-pointer"
              >
                Catatkan kehadiran peserta lain
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layar>
  );
}
