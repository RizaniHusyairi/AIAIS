'use client';

/**
 * Profil sendiri: ubah nama/telepon dan ganti kata sandi.
 *
 * Terbuka bagi admin maupun staff — mengganti kata sandi sendiri tidak boleh
 * bergantung pada ketersediaan admin. Sebelum ini satu-satunya cara adalah
 * meminta admin menyetel ulang, dan di v1 itu berarti menerima sandi tetap
 * `Apt123` yang sama untuk semua orang.
 *
 * Mengganti kata sandi mengakhiri SELURUH sesi, termasuk yang sedang dipakai;
 * karena itu halaman ini langsung mengarahkan ke halaman masuk sesudahnya.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, gantiSandi, getUser } from '@/lib/adminApi';
import type { AdminUser } from '@/types';
import { PageHeader, Panel, Btn, Field, Toast, ToastMsg, Badge, InfoNote } from '@/components/admin/ui';
import { UserCircle, Save, KeyRound } from 'lucide-react';

export default function AdminProfilPage() {
  const router = useRouter();
  // Dibaca sekali saat inisialisasi, bukan lewat efek: `getUser()` membaca
  // cache lokal dan tidak berubah selama halaman terbuka, jadi menyetelnya
  // dari dalam efek hanya memicu render berantai tanpa manfaat.
  const [user] = useState<AdminUser | null>(() => getUser());
  const [toast, setToast] = useState<ToastMsg>(null);

  const [sandiLama, setSandiLama] = useState('');
  const [sandiBaru, setSandiBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const simpanSandi = async () => {
    if (sandiBaru !== konfirmasi) {
      setToast({ text: 'Konfirmasi kata sandi tidak cocok.', kind: 'error' });
      return;
    }

    setMenyimpan(true);
    const res = await gantiSandi({
      current_password: sandiLama,
      password: sandiBaru,
      password_confirmation: konfirmasi,
    });
    setMenyimpan(false);

    if (!res.ok) {
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    // Seluruh token sudah dicabut backend; sesi ini pun sudah mati.
    clearSession();
    router.replace('/admin/login?sandi=1');
  };

  return (
    <>
      <PageHeader
        icon={UserCircle}
        title="Profil Saya"
        subtitle="Identitas akun dan penggantian kata sandi"
      />

      <Panel>
        <div className="px-5 py-5 space-y-4">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Identitas Akun</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12.5px]">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--adm-dim)]">Nama</p>
              <p className="mt-1 text-[var(--adm-fg)] font-semibold">{user?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--adm-dim)]">Surel</p>
              <p className="mt-1 text-[var(--adm-fg)] font-semibold break-all">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--adm-dim)]">Peran</p>
              <p className="mt-1">
                <Badge
                  text={user?.role === 'admin' ? 'Admin' : user?.role === 'staff' ? 'Staff' : 'Pengguna'}
                  color={user?.role === 'admin' ? '#fb7185' : '#38bdf8'}
                />
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-300" /> Ganti Kata Sandi
          </h2>
        </div>

        <div className="px-5 py-5 space-y-4 max-w-lg">
          <InfoNote>
            Setelah kata sandi diganti, seluruh sesi Anda di semua perangkat akan berakhir
            dan Anda perlu masuk kembali.
          </InfoNote>

          <Field label="Kata Sandi Saat Ini" required type="password" value={sandiLama} onChange={setSandiLama} />
          <Field
            label="Kata Sandi Baru" required type="password"
            value={sandiBaru} onChange={setSandiBaru} placeholder="Minimal 8 karakter"
          />
          <Field label="Ulangi Kata Sandi Baru" required type="password" value={konfirmasi} onChange={setKonfirmasi} />

          <Btn onClick={simpanSandi} disabled={menyimpan || !sandiLama || !sandiBaru}>
            <Save className="w-4 h-4" /> {menyimpan ? 'Menyimpan...' : 'Simpan Kata Sandi'}
          </Btn>
        </div>
      </Panel>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
