'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import AuthShell, { Isian } from '@/components/akun/AuthShell';
import { masuk } from '@/lib/akunApi';

/**
 * Masuk ke akun warga.
 *
 * Bila yang masuk ternyata pengelola bandara, ia TIDAK ditolak — ia diantar ke
 * panel. Menolaknya akan membingungkan: kredensialnya benar, akunnya sah, dan
 * satu-satunya masalahnya adalah pintu yang dipakai. Backend sudah menentukan
 * kemampuan tokennya dari peran akun, jadi mengarahkan ke panel di sini tidak
 * memberi kewenangan apa pun yang belum dimiliki.
 */
export default function MasukView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setMengirim(true);

    const res = await masuk(email, sandi);
    setMengirim(false);

    if (!res.ok) {
      setGalat(res.message);

      return;
    }

    const peran = res.data?.user.role;
    router.push(peran === 'admin' || peran === 'staff' ? '/admin/dashboard' : '/akun');
  };

  return (
    <AuthShell
      title="Masuk"
      lead="Masuk untuk mengirim pengajuan layanan bandara dan memantau perkembangannya."
      footer={
        <>
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-bold text-blue-600 hover:text-blue-700">Daftar di sini</Link>
        </>
      }
    >
      <form onSubmit={kirim} className="space-y-4">
        <Isian label="Alamat Surel" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="nama@contoh.id" />
        <Isian label="Kata Sandi" type="password" value={sandi} onChange={setSandi} autoComplete="current-password" />

        {galat && (
          <p role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-[12.5px] font-semibold text-rose-700">
            {galat}
          </p>
        )}

        <button
          type="submit"
          disabled={mengirim}
          className="group w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-[13.5px] py-3.5 shadow-lg shadow-blue-600/25 disabled:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-2"
        >
          {mengirim ? 'Memproses...' : 'Masuk'}
          {!mengirim && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
        </button>
      </form>
    </AuthShell>
  );
}
