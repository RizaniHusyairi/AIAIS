'use client';

/**
 * Pendaftaran akun warga di dalam PWA.
 *
 * Sebelumnya tautan "Daftar di sini" dari layar Akun membuka `/daftar` — satu
 * formulir enam medan bergaya desktop yang, di ponsel, berarti menggulir
 * melewati papan ketik yang menutupi separuh layar sambil menebak medan mana
 * yang ditolak server. Di sini medannya dibagi tiga langkah pendek, masing-
 * masing diperiksa sebelum boleh lanjut, dan langkah terakhir memperlihatkan
 * seluruh isian sebelum dikirim.
 *
 * Aturan pemeriksaan di sisi klien MENIRU `AuthController::register` dan
 * hanya bertugas memberi tahu lebih cepat — server tetap penentunya. Galat
 * dari server dipetakan balik ke medannya, dan layar melompat ke langkah
 * pertama yang memuat galat itu (mis. surel yang ternyata sudah terdaftar).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { daftar, muatSesiWarga, type DataDaftar } from '@/lib/akunApi';
import type { AdminUser } from '@/types';
import { StatusBar, AppHeader, Memuat } from '@/components/pwa/ui';
import { Field, inputCls } from '@/components/ui/FormField';
import {
  UserRound, KeyRound, ClipboardCheck, ArrowRight, ArrowLeft, Check, CircleCheck,
  CircleAlert, Eye, EyeOff, Pencil, Phone, Mail, MapPin, LogIn, FileText, Info,
} from 'lucide-react';

type Kunci = keyof DataDaftar;
type Galat = Partial<Record<Kunci, string>>;

const KOSONG: DataDaftar = {
  name: '', email: '', phone: '', address: '', password: '', password_confirmation: '',
};

const LANGKAH = [
  { judul: 'Data Diri', icon: UserRound, medan: ['name', 'phone', 'address'] as Kunci[] },
  { judul: 'Akun', icon: KeyRound, medan: ['email', 'password', 'password_confirmation'] as Kunci[] },
  { judul: 'Periksa', icon: ClipboardCheck, medan: [] as Kunci[] },
];

/** Cermin aturan validasi backend; pesannya disamakan dengan pesan server. */
function periksa(k: Kunci, f: DataDaftar): string | undefined {
  const v = f[k].trim();

  switch (k) {
    case 'name':
      if (!v) return 'Nama lengkap wajib diisi.';
      if (v.length > 255) return 'Nama terlalu panjang.';
      return;
    case 'phone':
      if (!v) return 'Nomor telepon wajib diisi.';
      if (!/^\d+$/.test(v)) return 'Nomor telepon hanya boleh berisi angka.';
      if (v.length < 10 || v.length > 13) return 'Nomor telepon harus 10 sampai 13 angka.';
      return;
    case 'address':
      if (!v) return 'Alamat wajib diisi.';
      if (v.length > 500) return 'Alamat terlalu panjang (maks. 500 karakter).';
      return;
    case 'email':
      if (!v) return 'Alamat surel wajib diisi.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Alamat surel tidak sah.';
      return;
    case 'password':
      if (!f.password) return 'Kata sandi wajib diisi.';
      if (f.password.length < 8) return 'Kata sandi minimal 8 karakter.';
      return;
    case 'password_confirmation':
      if (!f.password_confirmation) return 'Ulangi kata sandi Anda.';
      if (f.password_confirmation !== f.password) return 'Konfirmasi kata sandi tidak cocok.';
      return;
  }
}

/**
 * Kekuatan kata sandi, 0–4.
 *
 * Hanya penunjuk bagi pengisi. Server mensyaratkan delapan karakter saja, dan
 * menolak kata sandi yang lolos aturan itu di sisi klien akan menjadi aturan
 * kedua yang tidak dikenal backend.
 */
function kekuatan(s: string): number {
  if (!s) return 0;
  let n = 0;
  if (s.length >= 8) n++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++;
  if (/\d/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s) || s.length >= 12) n++;
  return n;
}

const LABEL_KEKUATAN = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
const WARNA_KEKUATAN = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

export default function DaftarAkunScreen() {
  const [sesi, setSesi] = useState<AdminUser | null | undefined>(undefined);
  const [langkah, setLangkah] = useState(0);
  const [arah, setArah] = useState(1);
  const [form, setForm] = useState<DataDaftar>(KOSONG);
  const [disentuh, setDisentuh] = useState<Partial<Record<Kunci, boolean>>>({});
  const [galatServer, setGalatServer] = useState<Galat>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<AdminUser | null>(null);
  const [lihatSandi, setLihatSandi] = useState(false);

  const ref = useRef<Partial<Record<Kunci, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  // Orang yang sudah masuk tidak perlu mendaftar lagi; tanpa pemeriksaan ini
  // ia bisa membuat akun kedua tanpa sadar dan bingung mengapa pengajuannya
  // "hilang".
  useEffect(() => {
    let batal = false;
    muatSesiWarga().then((u) => { if (!batal) setSesi(u); });
    return () => { batal = true; };
  }, []);

  const galatKlien = useMemo(() => {
    const g: Galat = {};
    (Object.keys(KOSONG) as Kunci[]).forEach((k) => { g[k] = periksa(k, form); });
    return g;
  }, [form]);

  /** Galat yang DITAMPILKAN: server lebih dulu, lalu klien bila medan pernah disentuh. */
  const galatTampil = (k: Kunci) => galatServer[k] ?? (disentuh[k] ? galatKlien[k] : undefined);
  const sah = (k: Kunci) => !galatKlien[k] && !galatServer[k];

  const ubah = (k: Kunci, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Galat server untuk medan ini usang begitu isinya diubah.
    if (galatServer[k]) setGalatServer((g) => ({ ...g, [k]: undefined }));
    setGalatUmum('');
  };

  const sentuh = (k: Kunci) => setDisentuh((d) => ({ ...d, [k]: true }));

  const keLangkah = (n: number) => {
    setArah(n > langkah ? 1 : -1);
    setLangkah(n);
  };

  const lanjut = (e?: React.FormEvent) => {
    e?.preventDefault();
    const medan = LANGKAH[langkah].medan;
    setDisentuh((d) => ({ ...d, ...Object.fromEntries(medan.map((k) => [k, true])) }));

    const salah = medan.find((k) => !sah(k));
    if (salah) {
      ref.current[salah]?.focus();
      return;
    }
    keLangkah(langkah + 1);
  };

  const kirim = async () => {
    setGalatUmum('');
    setMengirim(true);
    const res = await daftar({ ...form, name: form.name.trim(), email: form.email.trim(), address: form.address.trim() });
    setMengirim(false);

    if (res.ok && res.data) {
      setBerhasil(res.data.user);
      return;
    }

    if (res.fieldErrors) {
      const g = Object.fromEntries(
        Object.entries(res.fieldErrors).map(([k, v]) => [k, v[0]]),
      ) as Galat;
      setGalatServer(g);

      // Pindah ke langkah pertama yang memuat medan bermasalah.
      const idx = LANGKAH.findIndex((l) => l.medan.some((k) => g[k]));
      if (idx >= 0) {
        setGalatUmum('Ada isian yang perlu diperbaiki. Periksa kolom yang ditandai merah.');
        keLangkah(idx);
        return;
      }
    }

    setGalatUmum(res.message);
  };

  /* ---------------- keadaan khusus ---------------- */

  if (berhasil) return <LayarBerhasil warga={berhasil} />;

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      {/* ===== kepala ===== */}
      <div className="bg-gradient-to-b from-[#123a8f] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <AppHeader title="Daftar Akun" tone="light" />

        <div className="px-5 pb-6">
          <Penunjuk langkah={langkah} onPilih={(n) => n < langkah && keLangkah(n)} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 -mt-3 relative z-10">
        {sesi === undefined && <Memuat label="Memeriksa sesi…" />}

        {sesi && <SudahMasuk warga={sesi} />}

        {sesi === null && (
          <AnimatePresence mode="wait" custom={arah} initial={false}>
            <motion.div
              key={langkah}
              custom={arah}
              initial={{ opacity: 0, x: arah * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: arah * -40 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            >
              {galatUmum && (
                <p role="alert" className="mb-3 flex items-start gap-2 rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
                  <CircleAlert className="w-4 h-4 flex-shrink-0 mt-px" /> {galatUmum}
                </p>
              )}

              {langkah === 0 && (
                <form onSubmit={lanjut} noValidate className="space-y-3">
                  <Kartu>
                    <JudulLangkah
                      judul="Kenalkan diri Anda"
                      lead="Data ini dipakai petugas untuk menghubungi Anda tentang pengajuan layanan."
                    />

                    <Medan
                      label="Nama Lengkap"
                      hint="Tulis sesuai kartu identitas."
                      galat={galatTampil('name')}
                      sah={disentuh.name && sah('name')}
                    >
                      <input
                        ref={(el) => { ref.current.name = el; }}
                        className={inputCls + ' pr-10'}
                        value={form.name}
                        onChange={(e) => ubah('name', e.target.value)}
                        onBlur={() => sentuh('name')}
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        placeholder="mis. Siti Rahmawati"
                      />
                    </Medan>

                    <Medan
                      label="Nomor Telepon / WhatsApp"
                      hint="10–13 angka, diawali 08. Tanpa spasi atau tanda hubung."
                      galat={galatTampil('phone')}
                      sah={disentuh.phone && sah('phone')}
                      ekor={
                        <span className={`text-[11px] font-bold tabular-nums ${form.phone.length >= 10 && form.phone.length <= 13 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {form.phone.length}/13
                        </span>
                      }
                    >
                      <input
                        ref={(el) => { ref.current.phone = el; }}
                        className={inputCls + ' pr-20'}
                        value={form.phone}
                        // Huruf, spasi, dan tanda hubung dibuang saat diketik —
                        // server menolaknya, dan lebih ramah mencegah daripada menolak.
                        onChange={(e) => ubah('phone', e.target.value.replace(/\D/g, '').slice(0, 13))}
                        onBlur={() => sentuh('phone')}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        enterKeyHint="next"
                        placeholder="081234567890"
                      />
                    </Medan>

                    <Medan
                      label="Alamat Domisili"
                      galat={galatTampil('address')}
                      sah={disentuh.address && sah('address')}
                    >
                      <textarea
                        ref={(el) => { ref.current.address = el; }}
                        className={inputCls + ' pr-10 resize-none'}
                        rows={3}
                        value={form.address}
                        onChange={(e) => ubah('address', e.target.value)}
                        onBlur={() => sentuh('address')}
                        autoComplete="street-address"
                        placeholder="Nama jalan, nomor rumah, kelurahan, kota"
                      />
                    </Medan>
                  </Kartu>

                  <BilahAksi>
                    <TombolUtama type="submit">Lanjut <ArrowRight className="w-4 h-4" /></TombolUtama>
                  </BilahAksi>
                </form>
              )}

              {langkah === 1 && (
                <form onSubmit={lanjut} noValidate className="space-y-3">
                  <Kartu>
                    <JudulLangkah
                      judul="Buat data masuk"
                      lead="Surel dan kata sandi ini yang Anda pakai untuk masuk ke akun nanti."
                    />

                    <Medan
                      label="Alamat Surel"
                      galat={galatTampil('email')}
                      sah={disentuh.email && sah('email')}
                    >
                      <input
                        ref={(el) => { ref.current.email = el; }}
                        className={inputCls + ' pr-10'}
                        value={form.email}
                        onChange={(e) => ubah('email', e.target.value)}
                        onBlur={() => sentuh('email')}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        enterKeyHint="next"
                        placeholder="nama@contoh.id"
                      />
                    </Medan>

                    <Medan label="Kata Sandi" galat={galatTampil('password')}>
                      <span className="relative block">
                        <input
                          ref={(el) => { ref.current.password = el; }}
                          className={inputCls + ' pr-12'}
                          value={form.password}
                          onChange={(e) => ubah('password', e.target.value)}
                          onBlur={() => sentuh('password')}
                          type={lihatSandi ? 'text' : 'password'}
                          autoComplete="new-password"
                          enterKeyHint="next"
                          placeholder="Minimal 8 karakter"
                        />
                        <TombolLihat lihat={lihatSandi} onClick={() => setLihatSandi((v) => !v)} />
                      </span>
                      <MeterSandi sandi={form.password} />
                    </Medan>

                    <Medan
                      label="Ulangi Kata Sandi"
                      galat={galatTampil('password_confirmation')}
                      sah={!!form.password_confirmation && sah('password_confirmation')}
                    >
                      <input
                        ref={(el) => { ref.current.password_confirmation = el; }}
                        className={inputCls + ' pr-10'}
                        value={form.password_confirmation}
                        onChange={(e) => ubah('password_confirmation', e.target.value)}
                        onBlur={() => sentuh('password_confirmation')}
                        type={lihatSandi ? 'text' : 'password'}
                        autoComplete="new-password"
                        enterKeyHint="done"
                      />
                    </Medan>
                  </Kartu>

                  <BilahAksi>
                    <TombolKembali onClick={() => keLangkah(0)} />
                    <TombolUtama type="submit">Lanjut <ArrowRight className="w-4 h-4" /></TombolUtama>
                  </BilahAksi>
                </form>
              )}

              {langkah === 2 && (
                <div className="space-y-3">
                  <Kartu>
                    <JudulLangkah
                      judul="Periksa sekali lagi"
                      lead="Pastikan semuanya benar. Ketuk Ubah untuk memperbaiki."
                    />

                    <Ringkasan judul="Data Diri" onUbah={() => keLangkah(0)}>
                      <Baris icon={UserRound} label="Nama" nilai={form.name.trim()} />
                      <Baris icon={Phone} label="Telepon" nilai={form.phone} />
                      <Baris icon={MapPin} label="Alamat" nilai={form.address.trim()} />
                    </Ringkasan>

                    <Ringkasan judul="Akun" onUbah={() => keLangkah(1)}>
                      <Baris icon={Mail} label="Surel" nilai={form.email.trim()} />
                      <Baris icon={KeyRound} label="Kata sandi" nilai={'•'.repeat(Math.min(form.password.length, 12))} />
                    </Ringkasan>

                    <p className="flex items-start gap-2 rounded-2xl bg-blue-50 px-3.5 py-3 text-[12px] text-blue-800 leading-relaxed">
                      <Info className="w-4 h-4 flex-shrink-0 mt-px" />
                      Akun langsung aktif setelah didaftarkan — tidak perlu menunggu persetujuan.
                    </p>
                  </Kartu>

                  <BilahAksi>
                    <TombolKembali onClick={() => keLangkah(1)} />
                    <TombolUtama type="button" onClick={kirim} disabled={mengirim}>
                      {mengirim ? 'Mendaftarkan…' : <>Daftarkan Akun <Check className="w-4 h-4" /></>}
                    </TombolUtama>
                  </BilahAksi>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {sesi === null && (
          <p className="text-center text-[12.5px] text-slate-500 pt-2 pb-6">
            Sudah punya akun?{' '}
            <Link href="/app/akun" className="font-bold text-blue-600">Masuk di sini</Link>
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Tiga titik langkah dengan garis penghubung yang terisi bertahap. */
function Penunjuk({ langkah, onPilih }: { langkah: number; onPilih: (n: number) => void }) {
  return (
    <div>
      <ol className="flex items-start">
        {LANGKAH.map((l, i) => {
          const selesai = i < langkah;
          const aktif = i === langkah;
          const Icon = l.icon;
          return (
            <li key={l.judul} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span className="absolute top-5 right-1/2 w-full h-0.5 bg-white/20 -z-0">
                  <motion.span
                    className="block h-full bg-white"
                    initial={false}
                    animate={{ width: i <= langkah ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={() => onPilih(i)}
                disabled={!selesai}
                aria-current={aktif ? 'step' : undefined}
                aria-label={`Langkah ${i + 1}: ${l.judul}`}
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  aktif ? 'bg-white text-blue-700 shadow-lg shadow-blue-900/30'
                    : selesai ? 'bg-emerald-400 text-white'
                    : 'bg-white/15 text-white/70'
                }`}
              >
                {selesai ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-[18px] h-[18px]" />}
              </button>
              <span className={`mt-1.5 text-[11.5px] font-bold ${aktif ? 'text-white' : 'text-blue-100/80'}`}>
                {l.judul}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-[11.5px] text-blue-100/90">
        Langkah {langkah + 1} dari {LANGKAH.length}
      </p>
    </div>
  );
}

function Kartu({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-5 space-y-4">{children}</div>;
}

function JudulLangkah({ judul, lead }: { judul: string; lead: string }) {
  return (
    <div>
      <p className="text-[16px] font-black text-slate-900">{judul}</p>
      <p className="mt-1 text-[12.5px] text-slate-500 leading-relaxed">{lead}</p>
    </div>
  );
}

/** `Field` dengan tanda centang di sisi kanan saat isiannya sudah benar. */
function Medan({
  label, hint, galat, sah, ekor, children,
}: {
  label: string;
  hint?: string;
  galat?: string;
  sah?: boolean;
  ekor?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={galat}>
      <span className="relative block">
        {children}
        <span className="absolute right-3 top-3 flex items-center gap-1.5 pointer-events-none">
          {ekor}
          <AnimatePresence>
            {sah && !galat && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <CircleCheck className="w-[18px] h-[18px] text-emerald-500" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>
    </Field>
  );
}

function TombolLihat({ lihat, onClick }: { lihat: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 active:bg-slate-100"
    >
      {lihat ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
    </button>
  );
}

function MeterSandi({ sandi }: { sandi: string }) {
  const n = kekuatan(sandi);
  const syarat = [
    { ok: sandi.length >= 8, teks: 'Minimal 8 karakter', wajib: true },
    { ok: /[a-z]/.test(sandi) && /[A-Z]/.test(sandi), teks: 'Huruf besar dan kecil' },
    { ok: /\d/.test(sandi), teks: 'Memuat angka' },
  ];

  return (
    <span className="block mt-2.5">
      <span className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.span
              className={`block h-full ${WARNA_KEKUATAN[n]}`}
              initial={false}
              animate={{ width: i <= n ? '100%' : '0%' }}
              transition={{ duration: 0.25 }}
            />
          </span>
        ))}
      </span>
      {sandi && (
        <span className="block mt-1 text-[11px] font-bold text-slate-500">
          Kekuatan: {LABEL_KEKUATAN[n]}
        </span>
      )}
      <span className="mt-2 grid gap-1">
        {syarat.map((s) => (
          <span key={s.teks} className={`flex items-center gap-1.5 text-[11.5px] ${s.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {s.ok ? <CircleCheck className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full ring-1 ring-current" />}
            {s.teks}
            {!s.wajib && <span className="text-slate-400">(disarankan)</span>}
          </span>
        ))}
      </span>
    </span>
  );
}

function Ringkasan({ judul, onUbah, children }: { judul: string; onUbah: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl ring-1 ring-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
        <p className="text-[12px] font-black text-slate-700 uppercase tracking-wide">{judul}</p>
        <button type="button" onClick={onUbah} className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 active:opacity-70">
          <Pencil className="w-3.5 h-3.5" /> Ubah
        </button>
      </div>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </div>
  );
}

function Baris({ icon: Icon, label, nilai }: { icon: React.ElementType; label: string; nilai: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <dt className="w-20 flex-shrink-0 text-[12px] text-slate-500">{label}</dt>
      <dd className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 break-words">{nilai}</dd>
    </div>
  );
}

/** Tombol menempel di bawah wilayah gulir supaya tak tertutup papan ketik. */
function BilahAksi({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-3 bg-gradient-to-t from-slate-50 via-slate-50 to-slate-50/0 flex gap-2.5">
      {children}
    </div>
  );
}

function TombolUtama({
  children, type, onClick, disabled,
}: {
  children: React.ReactNode;
  type: 'submit' | 'button';
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 disabled:opacity-60 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/25"
    >
      {children}
    </motion.button>
  );
}

function TombolKembali({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      type="button"
      onClick={onClick}
      aria-label="Kembali ke langkah sebelumnya"
      className="w-14 inline-flex items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 text-slate-600"
    >
      <ArrowLeft className="w-5 h-5" />
    </motion.button>
  );
}

function SudahMasuk({ warga }: { warga: AdminUser }) {
  return (
    <Kartu>
      <JudulLangkah
        judul="Anda sudah masuk"
        lead={`Saat ini Anda masuk sebagai ${warga.name} (${warga.email}). Tidak perlu mendaftar lagi.`}
      />
      <Link
        href="/app/akun"
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold text-[14px] py-4 rounded-2xl"
      >
        Buka Akun Saya <ArrowRight className="w-4 h-4" />
      </Link>
    </Kartu>
  );
}

function LayarBerhasil({ warga }: { warga: AdminUser }) {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-gradient-to-b from-[#0f766e] to-[#10b981] text-white rounded-b-[2rem]">
        <StatusBar />
        <div className="px-6 pt-12 pb-10 flex flex-col items-center text-center">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl shadow-emerald-900/30"
          >
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
          </motion.span>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-[22px] font-black leading-tight"
          >
            Akun berhasil dibuat
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-1.5 text-[13px] text-emerald-50 leading-relaxed"
          >
            Selamat datang, {warga.name}. Anda sudah masuk dan dapat langsung mengirim pengajuan layanan.
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mx-auto w-full max-w-xl p-4 space-y-3"
      >
        <Link
          href="/akun"
          className="flex items-center gap-3.5 bg-white rounded-3xl shadow-sm shadow-slate-200/60 p-4 active:scale-[0.99] transition-transform"
        >
          <span className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-violet-600" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold text-slate-800">Ajukan Layanan</span>
            <span className="block text-[11.5px] text-slate-500">Kunjungan lapangan, sewa ruang, perizinan</span>
          </span>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </Link>

        <Link
          href="/app/akun"
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/25"
        >
          <LogIn className="w-4 h-4" /> Ke Akun Saya
        </Link>
      </motion.div>
    </div>
  );
}
