'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, { Isian } from '@/components/akun/AuthShell';
import { daftar, type DataDaftar } from '@/lib/akunApi';

/**
 * Pendaftaran akun warga.
 *
 * Akunnya langsung aktif — tidak ada antrean persetujuan. Gerbang persetujuan
 * di basis data melindungi PANEL pengelolaan, dan akun dari sini tidak pernah
 * bisa menyentuhnya: tokennya hanya berkemampuan `citizen`.
 *
 * Galat validasi ditempelkan ke medannya masing-masing. Menampilkan seluruh
 * pesan sebagai satu paragraf di atas formulir memaksa pengisi menebak medan
 * mana yang salah — pada formulir enam medan, itu tebakan yang mahal.
 */

const MEDAN: { key: keyof DataDaftar; label: string; type?: string; placeholder?: string; autoComplete?: string; hint?: string }[] = [
  { key: 'name', label: 'Nama Lengkap', autoComplete: 'name', placeholder: 'Nama sesuai identitas' },
  { key: 'email', label: 'Alamat Surel', type: 'email', autoComplete: 'email', placeholder: 'nama@contoh.id' },
  { key: 'phone', label: 'Nomor Telepon', autoComplete: 'tel', placeholder: '081234567890', hint: '10–13 angka, tanpa spasi atau tanda hubung.' },
  { key: 'address', label: 'Alamat', autoComplete: 'street-address', placeholder: 'Alamat domisili' },
  { key: 'password', label: 'Kata Sandi', type: 'password', autoComplete: 'new-password', hint: 'Sekurang-kurangnya 8 karakter.' },
  { key: 'password_confirmation', label: 'Ulangi Kata Sandi', type: 'password', autoComplete: 'new-password' },
];

const KOSONG: DataDaftar = {
  name: '', email: '', phone: '', address: '', password: '', password_confirmation: '',
};

export default function DaftarView() {
  const router = useRouter();
  const [form, setForm] = useState<DataDaftar>(KOSONG);
  const [galat, setGalat] = useState<Partial<Record<keyof DataDaftar, string>>>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat({});
    setGalatUmum('');
    setMengirim(true);

    const res = await daftar(form);
    setMengirim(false);

    if (res.ok) {
      router.push('/akun');

      return;
    }

    // Backend mengirim galat per medan; dipetakan ke medannya masing-masing
    // supaya pengisi langsung melihat yang mana.
    const perMedan = res.fieldErrors;

    if (perMedan) {
      setGalat(Object.fromEntries(
        Object.entries(perMedan).map(([k, v]) => [k, v[0]]),
      ) as Partial<Record<keyof DataDaftar, string>>);
    } else {
      setGalatUmum(res.message);
    }
  };

  return (
    <AuthShell
      title="Daftar Akun"
      lead="Akun diperlukan untuk mengirim pengajuan layanan bandara — kunjungan lapangan, sewa ruang, perizinan, dan lainnya."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-bold text-blue-600 hover:text-blue-700">Masuk di sini</Link>
        </>
      }
    >
      <form onSubmit={kirim} className="space-y-4">
        {MEDAN.map((m) => (
          <Isian
            key={m.key}
            label={m.label}
            type={m.type}
            value={form[m.key]}
            onChange={(v) => setForm({ ...form, [m.key]: v })}
            placeholder={m.placeholder}
            autoComplete={m.autoComplete}
            hint={m.hint}
            error={galat[m.key]}
          />
        ))}

        {galatUmum && (
          <p role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
            {galatUmum}
          </p>
        )}

        <button
          type="submit"
          disabled={mengirim}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[13.5px] py-3.5 transition-colors cursor-pointer"
        >
          {mengirim ? 'Mendaftarkan...' : 'Daftar'}
        </button>
      </form>
    </AuthShell>
  );
}
