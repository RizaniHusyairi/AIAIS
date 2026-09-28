'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Send, KeyRound, Trash2, Server, CheckCircle2 } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import {
  PageHeader, Panel, Btn, Field, ConfirmDialog, Toast, Loading, InfoNote,
  type ToastMsg,
} from '@/components/admin/ui';

/**
 * Notifikasi surel — server SMTP dan identitas pengirim.
 *
 * Berbeda dengan halaman WhatsApp, seluruh penyetelannya tinggal di SATU tabel
 * khusus admin (`mail_configs`), bukan di `settings`: `GET /settings` publik,
 * dan nama pengguna serta kata sandi SMTP tidak boleh ikut tersaji ke
 * pengunjung. Kata sandi tidak pernah dibaca balik — panel hanya tahu apakah
 * sudah terpasang.
 *
 * Penyetelan ini dipakai SEMUA surel portal: bukti permohonan informasi ke
 * pemohon dan tautan reset kata sandi petugas.
 */

type Status = {
  terpasang: boolean;
  aktif: boolean;
  host: string | null;
  port: number | null;
  enkripsi: 'tls' | 'ssl' | 'none';
  username: string | null;
  ada_sandi: boolean;
  from_address: string | null;
  from_name: string | null;
  sumber: 'panel' | 'env' | 'tidak-ada';
  siap: boolean;
};

type Draf = {
  aktif: boolean;
  host: string;
  port: string;
  enkripsi: 'tls' | 'ssl' | 'none';
  username: string;
  password: string;
  hapus_sandi: boolean;
  from_address: string;
  from_name: string;
};

/**
 * Pengisian cepat untuk penyedia umum. Nilainya alamat dan port SMTP yang
 * dipublikasikan penyedia masing-masing; kredensialnya tetap diisi petugas.
 */
const PRASETEL = [
  { nama: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: '587', enkripsi: 'tls' as const },
  { nama: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: '587', enkripsi: 'tls' as const },
];

const SUMBER: Record<Status['sumber'], { teks: string; warna: string }> = {
  panel: { teks: 'Panel ini', warna: '#34d399' },
  env: { teks: 'Berkas .env server', warna: '#60a5fa' },
  'tidak-ada': { teks: 'Belum ada', warna: '#f87171' },
};

const dariStatus = (s: Status | null): Draf => ({
  aktif: s?.aktif ?? false,
  host: s?.host ?? '',
  port: s?.port ? String(s.port) : '587',
  enkripsi: s?.enkripsi ?? 'tls',
  username: s?.username ?? '',
  password: '',
  hapus_sandi: false,
  from_address: s?.from_address ?? '',
  from_name: s?.from_name ?? '',
});

export default function AdminSurelPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [draf, setDraf] = useState<Draf>(dariStatus(null));
  const [awal, setAwal] = useState<Draf>(dariStatus(null));
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [alamatUji, setAlamatUji] = useState('');
  const [menguji, setMenguji] = useState(false);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const terapkanStatus = (s: Status) => {
    setStatus(s);
    const d = dariStatus(s);
    setDraf(d);
    setAwal(d);
  };

  const muat = async () => {
    const res = await adminFetch<Status>('/surel');
    if (res.ok && res.data) terapkanStatus(res.data);
    else setToast({ text: res.message, kind: 'error' });
  };

  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await adminFetch<Status>('/surel');
      if (batal) return;
      if (res.ok && res.data) terapkanStatus(res.data);
      else setToast({ text: res.message, kind: 'error' });
      setMemuat(false);
    })();
    return () => { batal = true; };
  }, []);

  const kotor = (Object.keys(draf) as (keyof Draf)[]).some((k) => draf[k] !== awal[k]);
  const lengkap = draf.host.trim() !== '' && draf.port.trim() !== '' && draf.from_address.trim() !== '';

  const simpan = async () => {
    setMenyimpan(true);
    const res = await adminFetch('/surel', {
      method: 'POST',
      body: { ...draf, port: Number(draf.port) },
    });
    setMenyimpan(false);

    if (!res.ok) { setToast({ text: res.message, kind: 'error' }); return; }

    // Kata sandi dilupakan dari state begitu tersimpan.
    setToast({ text: 'Penyetelan surel berhasil disimpan', kind: 'success' });
    muat();
  };

  const uji = async () => {
    setMenguji(true);
    const res = await adminFetch<{ terkirim: boolean }>('/surel/uji', { method: 'POST', body: { alamat: alamatUji } });
    setMenguji(false);
    setToast({
      text: res.message,
      kind: !res.ok ? 'error' : res.data?.terkirim ? 'success' : 'error',
    });
  };

  const hapus = async () => {
    setKonfirmasiHapus(false);
    const res = await adminFetch('/surel', { method: 'DELETE' });
    setToast(res.ok ? { text: res.message, kind: 'success' } : { text: res.message, kind: 'error' });
    if (res.ok) muat();
  };

  if (memuat) return <Loading text="Memuat penyetelan surel..." />;

  const sumber = SUMBER[status?.sumber ?? 'tidak-ada'];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Mail}
        title="Notifikasi Email"
        subtitle="Server SMTP untuk bukti permohonan ke warga dan tautan reset kata sandi petugas"
      />

      {/* ---------------- Status ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Status Pengiriman</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12.5px]">
          <Ringkas
            label="Pengiriman"
            nilai={status?.siap ? 'Siap' : 'Belum siap'}
            warna={status?.siap ? '#34d399' : '#f87171'}
          />
          <Ringkas label="Penyetelan dipakai dari" nilai={sumber.teks} warna={sumber.warna} />
          <Ringkas
            label="Server"
            nilai={status?.host ? `${status.host}:${status.port}` : '—'}
          />
          <Ringkas
            label="Kata sandi"
            nilai={status?.ada_sandi ? 'Tersimpan (terenkripsi)' : 'Belum ada'}
            warna={status?.ada_sandi ? '#34d399' : '#fbbf24'}
          />
        </div>
        {!status?.siap && (
          <div className="px-5 pb-5">
            <InfoNote>
              Selama belum siap, pemohon informasi <b>tidak</b> dikirimi bukti lewat surel, dan
              layar tiket tidak menjanjikannya. Tautan lupa kata sandi petugas juga tidak akan tiba.
            </InfoNote>
          </div>
        )}
      </Panel>

      {/* ---------------- Server SMTP ---------------- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" /> Server SMTP
          </h2>
          <Btn onClick={simpan} disabled={menyimpan || !kotor || !lengkap}>
            {menyimpan ? 'Menyimpan...' : kotor ? 'Simpan' : 'Tersimpan'}
          </Btn>
        </div>
        <div className="p-5 space-y-4">
          <InfoNote>
            Isi dari penyedia kotak surel dinas. Tanpa penyetelan di sini, server memakai
            <code> MAIL_*</code> dari berkas <code>.env</code>. Untuk Gmail/Google Workspace, gunakan
            <b> Sandi Aplikasi</b> — bukan kata sandi akun — dan pastikan verifikasi dua langkahnya aktif.
          </InfoNote>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider">Isi cepat</span>
            {PRASETEL.map((p) => (
              <Btn
                key={p.nama}
                variant="ghost"
                onClick={() => setDraf({ ...draf, host: p.host, port: p.port, enkripsi: p.enkripsi })}
              >
                {p.nama}
              </Btn>
            ))}
          </div>

          <Field
            label="Aktifkan pengiriman surel dari panel"
            type="checkbox"
            value={draf.aktif}
            onChange={(v) => setDraf({ ...draf, aktif: v })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_180px] gap-4">
            <Field label="Alamat server" value={draf.host} onChange={(v) => setDraf({ ...draf, host: v })} placeholder="smtp.contoh.go.id" required />
            <Field label="Port" type="number" value={draf.port} onChange={(v) => setDraf({ ...draf, port: String(v) })} min={1} max={65535} required />
            <Field
              label="Enkripsi"
              type="select"
              value={draf.enkripsi}
              onChange={(v) => {
                const enkripsi = v as Draf['enkripsi'];
                // Port lazim ikut disesuaikan, selama petugas belum mengubahnya sendiri.
                const lazim = { tls: '587', ssl: '465', none: '25' } as const;
                const portLazim = (Object.values(lazim) as string[]).includes(draf.port);
                setDraf({ ...draf, enkripsi, port: portLazim ? lazim[enkripsi] : draf.port });
              }}
              options={[
                { value: 'tls', label: 'TLS (STARTTLS) — 587' },
                { value: 'ssl', label: 'SSL — 465' },
                { value: 'none', label: 'Tanpa enkripsi' },
              ]}
            />
          </div>

          {draf.enkripsi === 'none' && (
            <InfoNote>
              Tanpa enkripsi, kata sandi dan isi surel melintas sebagai teks polos. Pakai hanya untuk
              relai surel di jaringan internal bandara.
            </InfoNote>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama pengguna" value={draf.username} onChange={(v) => setDraf({ ...draf, username: v })} placeholder="ppid@contoh.go.id" />
            <Field
              label="Kata sandi"
              type="password"
              value={draf.password}
              onChange={(v) => setDraf({ ...draf, password: v, hapus_sandi: false })}
              placeholder={status?.ada_sandi ? '•••••••• (kosongkan untuk mempertahankan)' : 'Kata sandi / Sandi Aplikasi'}
            />
          </div>
          {status?.ada_sandi && (
            <Field
              label="Hapus kata sandi tersimpan (relai tanpa autentikasi)"
              type="checkbox"
              value={draf.hapus_sandi}
              onChange={(v) => setDraf({ ...draf, hapus_sandi: v, password: v ? '' : draf.password })}
            />
          )}

          <div className="border-t border-[var(--adm-line)] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Alamat pengirim"
              type="email"
              value={draf.from_address}
              onChange={(v) => setDraf({ ...draf, from_address: v })}
              placeholder="ppid@contoh.go.id"
              hint="Umumnya harus sama dengan nama pengguna, atau surel ditolak/masuk spam."
              required
            />
            <Field
              label="Nama pengirim"
              value={draf.from_name}
              onChange={(v) => setDraf({ ...draf, from_name: v })}
              placeholder="PPID Bandara APT Pranoto Samarinda"
            />
          </div>
        </div>
      </Panel>

      {/* ---------------- Uji kirim ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Uji Kirim</h2>
        </div>
        <div className="p-5 space-y-4">
          <InfoNote>
            Memakai penyetelan yang <b>sudah disimpan</b>, meski sakelarnya belum dinyalakan — pastikan
            server benar dulu, baru aktifkan untuk warga. Simpan perubahan sebelum menguji.
          </InfoNote>
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="Alamat tujuan"
              type="email"
              value={alamatUji}
              onChange={setAlamatUji}
              placeholder="nama@contoh.go.id"
              className="flex-1 min-w-[220px]"
            />
            <Btn onClick={uji} disabled={menguji || kotor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alamatUji.trim())}>
              <Send className="w-4 h-4" /> {menguji ? 'Mengirim...' : 'Kirim Uji'}
            </Btn>
          </div>
          {kotor && (
            <p className="text-[11.5px] text-[var(--adm-muted)]">Ada perubahan yang belum disimpan.</p>
          )}
        </div>
      </Panel>

      {/* ---------------- Dipakai untuk ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" /> Surel yang Dikirim Portal
          </h2>
        </div>
        <ul className="p-5 space-y-2.5 text-[12.5px] text-[var(--adm-body)]">
          <li className="flex gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-px" />
            <span><b>Bukti permohonan informasi publik</b> ke pemohon — nomor tiket, batas jawaban, dan tautan lacak. Maksimal 3 per alamat per hari.</span>
          </li>
          <li className="flex gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-px" />
            <span><b>Tautan reset kata sandi</b> ke petugas yang lupa sandi panel.</span>
          </li>
        </ul>
      </Panel>

      {status?.terpasang && (
        <div className="flex justify-end">
          <Btn variant="danger" onClick={() => setKonfirmasiHapus(true)}>
            <Trash2 className="w-4 h-4" /> Hapus Penyetelan Panel
          </Btn>
        </div>
      )}

      <ConfirmDialog
        open={konfirmasiHapus}
        onCancel={() => setKonfirmasiHapus(false)}
        onConfirm={hapus}
        title="Hapus penyetelan surel"
        message="Server SMTP dan kata sandinya dihapus dari panel. Pengiriman kembali memakai berkas .env server — bila di sana pun kosong, surel berhenti terkirim."
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Ringkas({ label, nilai, warna }: { label: string; nilai: string; warna?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--adm-dim)]">{label}</p>
      <p className="mt-1 font-bold break-all" style={warna ? { color: warna } : undefined}>{nilai}</p>
    </div>
  );
}
