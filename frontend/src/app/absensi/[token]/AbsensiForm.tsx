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
import { bacaPeserta, simpanPeserta, lupakanPeserta } from '@/lib/absensiPerangkat';
import type { AbsensiInfo } from '@/types';
import {
  CalendarDays, MapPin, User, CircleCheck, CircleAlert, Clock, ShieldCheck,
  Building2, Phone, ArrowRight, DoorClosed, LinkIcon, Home, UserCheck, X,
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

/** Label medan isian, seragam untuk keempatnya. */
function LabelMedan({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
      <Icon className="w-3.5 h-3.5 text-blue-600" />
      {children}
    </span>
  );
}

const gaya =
  'mt-2 w-full rounded-2xl px-4 py-4 text-[16px] text-slate-900 bg-white ring-1 ring-slate-200 '
  + 'focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-300';

const tanggalPanjang = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

/* ------------------------------------------------------------------ */
/*  Layar                                                              */
/* ------------------------------------------------------------------ */

export default function AbsensiForm({ token, info }: { token: string; info: AbsensiInfo | null }) {
  const [nama, setNama] = useState('');
  const [unit, setUnit] = useState('');
  const [telepon, setTelepon] = useState('');
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
    setTelepon(tersimpan.phone);
    setDariPerangkat(true);
  }, []);

  /** "Bukan saya" — kosongkan formulir sekaligus lupakan simpanannya. */
  const bukanSaya = () => {
    lupakanPeserta();
    setNama('');
    setUnit('');
    setTelepon('');
    setDariPerangkat(false);
  };

  /* ---- Tautan tidak dikenali: salah ketik, atau sudah diputar petugas ---- */
  if (!info) {
    return (
      <Layar>
        <StatusBar />
        <div className="min-h-[80dvh] flex flex-col items-center justify-center px-8 text-center">
          <span className="w-16 h-16 rounded-3xl bg-rose-50 ring-1 ring-rose-100 flex items-center justify-center">
            <LinkIcon className="w-7 h-7 text-rose-500" />
          </span>
          <h1 className="mt-5 text-[18px] font-black text-slate-900">Tautan absensi tidak dikenali</h1>
          <p className="mt-2 text-[13px] text-slate-500 leading-relaxed max-w-xs">
            Tautannya mungkin salah ketik, atau sudah diperbarui petugas. Mintalah tautan — atau
            pindai ulang kode QR — terbaru kepada penyelenggara rapat.
          </p>
        </div>
      </Layar>
    );
  }

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ttd) {
      setGalat('Tanda tangan wajib diisi. Goreskan tanda tangan Anda pada kotak di atas.');

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
          department: unit,
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
      simpanPeserta({ name: nama, department: unit, phone: telepon.trim() });
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

            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5 space-y-5">
              <label className="block">
                <LabelMedan icon={User}>Nama Lengkap</LabelMedan>
                <input
                  required maxLength={125} autoComplete="name" autoCapitalize="words"
                  placeholder="Nama sesuai identitas"
                  className={gaya}
                  value={nama} onChange={(e) => setNama(e.target.value)}
                />
              </label>

              <label className="block">
                <LabelMedan icon={Building2}>Unit Kerja / Instansi</LabelMedan>
                <input
                  required maxLength={125}
                  placeholder="Contoh: Seksi Teknik & Operasi"
                  className={gaya}
                  value={unit} onChange={(e) => setUnit(e.target.value)}
                />
              </label>

              {/* WAJIB, bukan opsional. Nomor inilah satu-satunya penanda yang
                  membedakan peserta pada daftar hadir tanpa akun, dan yang
                  dipakai backend menolak absensi ganda. */}
              <label className="block">
                <LabelMedan icon={Phone}>Nomor Telepon</LabelMedan>
                <input
                  type="tel" inputMode="numeric" required maxLength={125} autoComplete="tel"
                  placeholder="08xx xxxx xxxx"
                  className={gaya}
                  value={telepon} onChange={(e) => setTelepon(e.target.value)}
                />
                <span className="mt-1.5 block text-[11px] text-slate-400 leading-relaxed">
                  Dipakai untuk memastikan satu peserta tercatat sekali saja.
                </span>
              </label>
            </div>

            {/* Label, tombol "Ulangi", dan petunjuknya dibawa komponen kanvas
                sendiri — jangan menambahkan judul lagi di sini. */}
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5">
              <TandaTanganKanvas key={kunciKanvas} onChange={setTtd} />
            </div>

            {galat && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3.5 text-[12.5px] font-semibold text-rose-700"
              >
                <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /> {galat}
              </p>
            )}

            {/* Tombol menempel di dasar layar — kanvas tanda tangan membuat
                halaman lebih panjang daripada satu layar ponsel. */}
            <div
              className="fixed bottom-0 inset-x-0 z-20 mx-auto w-full max-w-[560px] bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-5 pt-3"
              style={{ paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="submit"
                disabled={mengirim}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300 text-white font-black text-[15.5px] py-4 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                {mengirim ? 'Mengirim…' : 'Catat Kehadiran Saya'}
              </button>
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
