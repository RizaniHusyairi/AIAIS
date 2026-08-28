'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Pencil, Trash2, Send, KeyRound, ShieldAlert } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { DEFAULT_SETTINGS, WA_KEYS, invalidateSettings } from '@/lib/settings';
import { API_BASE_URL } from '@/lib/api';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast,
  Loading, EmptyState, Table, Row, Cell, InfoNote,
  type ToastMsg,
} from '@/components/admin/ui';

/**
 * Notifikasi WhatsApp ke petugas piket.
 *
 * Halaman ini menyentuh TIGA penyimpanan yang sengaja terpisah, dan
 * pemisahannya bukan kerumitan yang bisa disederhanakan:
 *
 *   settings        — sakelar, alamat gateway, pagar harian. Bukan rahasia,
 *                     dan `GET /settings` memang publik.
 *   wa_credentials  — kunci API. TIDAK PERNAH dibaca balik ke peramban; yang
 *                     dikirim server hanya empat huruf terakhirnya.
 *   wa_recipients   — nomor ponsel petugas. Data pribadi menurut UU 27/2022,
 *                     hanya lewat endpoint bertoken.
 *
 * Menggabungkan ketiganya ke `settings` akan menyiarkan kunci gateway dan
 * seluruh nomor petugas ke setiap pengunjung portal.
 */

type Penerima = {
  id: number;
  nama: string;
  nomor: string;
  jenis: string[] | null;
  is_active: boolean;
};

type Status = {
  terpasang: boolean;
  petunjuk: string | null;
  siap: boolean;
  jumlah_nomor: number;
  terpakai_hari_ini: number;
  sisa_kuota: number;
  jenis: { kunci: string; judul: string }[];
};

type Draf = { nama: string; nomor: string; jenis: string[]; is_active: boolean };

const DRAF_KOSONG: Draf = { nama: '', nomor: '', jenis: [], is_active: true };

export default function AdminWhatsAppPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [daftar, setDaftar] = useState<Penerima[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  /* Penyetelan non-rahasia; bentuknya peta teks, sama dengan halaman Tampilan. */
  const [setelan, setSetelan] = useState<Record<string, string>>({});
  const [setelanAwal, setSetelanAwal] = useState<Record<string, string>>({});
  const [menyimpanSetelan, setMenyimpanSetelan] = useState(false);

  const [tokenBaru, setTokenBaru] = useState('');
  const [menyimpanKunci, setMenyimpanKunci] = useState(false);

  const [nomorUji, setNomorUji] = useState('');
  const [menguji, setMenguji] = useState(false);

  const [buka, setBuka] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [draf, setDraf] = useState<Draf>(DRAF_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapusId, setHapusId] = useState<number | null>(null);

  const muatStatus = async () => {
    const [st, rec] = await Promise.all([
      adminFetch<Status>('/wa/status'),
      adminFetch<Penerima[]>('/wa/recipients'),
    ]);
    if (st.ok) setStatus(st.data);
    if (rec.ok) setDaftar(Array.isArray(rec.data) ? rec.data : []);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const [st, rec, cfg] = await Promise.all([
        adminFetch<Status>('/wa/status'),
        adminFetch<Penerima[]>('/wa/recipients'),
        // Penyetelan dibaca lewat endpoint publiknya, sama seperti halaman
        // Tampilan — isinya memang bukan rahasia.
        fetch(`${API_BASE_URL}/settings`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (batal) return;

      if (st.ok) setStatus(st.data);
      else setToast({ text: st.message, kind: 'error' });

      if (rec.ok) setDaftar(Array.isArray(rec.data) ? rec.data : []);

      const isi = { ...DEFAULT_SETTINGS, ...(cfg?.data ?? {}) };
      const hanyaWa = Object.fromEntries(WA_KEYS.map((k) => [k, isi[k] ?? '']));
      setSetelan(hanyaWa);
      setSetelanAwal(hanyaWa);

      setMemuat(false);
    })();

    return () => { batal = true; };
  }, []);

  const setelanKotor = WA_KEYS.some((k) => (setelan[k] ?? '') !== (setelanAwal[k] ?? ''));

  const simpanSetelan = async () => {
    setMenyimpanSetelan(true);
    const res = await adminFetch<Record<string, string>>('/settings', { method: 'POST', body: setelan });
    setMenyimpanSetelan(false);

    if (!res.ok) { setToast({ text: res.message, kind: 'error' }); return; }

    setSetelanAwal({ ...setelan });
    invalidateSettings();
    setToast({ text: 'Penyetelan gateway berhasil disimpan', kind: 'success' });
    muatStatus();
  };

  const simpanKunci = async () => {
    setMenyimpanKunci(true);
    /* `device_id` tidak dikirim sama sekali; server menyimpannya sebagai '0',
       penanda "pakai perangkat bawaan kunci API". Kunci gateway bandara selalu
       punya perangkat bawaan, jadi isiannya hanya akan menjadi satu cara lagi
       untuk mematikan pengiriman tanpa disadari. */
    const res = await adminFetch('/wa/credential', {
      method: 'POST',
      body: { token: tokenBaru },
    });
    setMenyimpanKunci(false);

    if (!res.ok) { setToast({ text: res.message, kind: 'error' }); return; }

    // Kuncinya dilupakan dari state begitu tersimpan; ia tidak pernah perlu
    // ada di peramban lebih lama dari itu.
    setTokenBaru('');
    setToast({ text: 'Kunci gateway berhasil disimpan', kind: 'success' });
    muatStatus();
  };

  const uji = async () => {
    setMenguji(true);
    const res = await adminFetch('/wa/test', { method: 'POST', body: { nomor: nomorUji } });
    setMenguji(false);
    setToast({ text: res.ok ? 'Pesan uji terkirim. Periksa ponsel tujuan.' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muatStatus();
  };

  const simpan = async () => {
    setMenyimpan(true);
    const res = editId
      ? await adminFetch(`/wa/recipients/${editId}`, { method: 'PUT', body: draf })
      : await adminFetch('/wa/recipients', { method: 'POST', body: draf });
    setMenyimpan(false);

    if (!res.ok) { setToast({ text: res.message, kind: 'error' }); return; }

    setBuka(false);
    setToast({ text: editId ? 'Nomor berhasil diperbarui' : 'Nomor berhasil ditambahkan', kind: 'success' });
    muatStatus();
  };

  const hapus = async () => {
    if (hapusId === null) return;
    const res = await adminFetch(`/wa/recipients/${hapusId}`, { method: 'DELETE' });
    setHapusId(null);
    setToast(res.ok ? { text: 'Nomor berhasil dihapus', kind: 'success' } : { text: res.message, kind: 'error' });
    if (res.ok) muatStatus();
  };

  const jenisTersedia = status?.jenis ?? [];

  const toggleJenis = (kunci: string) => {
    setDraf((d) => ({
      ...d,
      jenis: d.jenis.includes(kunci) ? d.jenis.filter((j) => j !== kunci) : [...d.jenis, kunci],
    }));
  };

  if (memuat) return <Loading text="Memuat penyetelan WhatsApp..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="Notifikasi WhatsApp"
        subtitle="Gateway dan nomor petugas yang dikabari saat ada kiriman baru"
      />

      <InfoNote>
        Gateway WhatsApp yang menumpang WhatsApp Web <b>tidak resmi menurut ketentuan Meta</b>, dan
        nomor pengirimnya dapat diblokir permanen kapan saja. Karena itu nomor yang dipasang pada
        perangkat gateway wajib <b>nomor bot terpisah</b> — bukan nomor layanan publik bandara.
        Bila diblokir, yang hilang hanya kanal notifikasi internal.
      </InfoNote>

      {/* ---------------- Status sambungan ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Status Sambungan</h2>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12.5px]">
          <Ringkas label="Pengiriman" nilai={status?.siap ? 'Siap' : 'Belum siap'} warna={status?.siap ? '#34d399' : '#f87171'} />
          <Ringkas label="Kunci API" nilai={status?.terpasang ? (status.petunjuk ?? 'Terpasang') : 'Belum ada'} warna={status?.terpasang ? '#34d399' : '#fbbf24'} />
          <Ringkas label="Nomor aktif" nilai={String(status?.jumlah_nomor ?? 0)} />
          <Ringkas label="Kuota hari ini" nilai={`${status?.terpakai_hari_ini ?? 0} terpakai · ${status?.sisa_kuota ?? 0} sisa`} />
        </div>
      </Panel>

      {/* ---------------- Penyetelan gateway ---------------- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Penyetelan Gateway</h2>
          <Btn onClick={simpanSetelan} disabled={menyimpanSetelan || !setelanKotor}>
            {menyimpanSetelan ? 'Menyimpan...' : setelanKotor ? 'Simpan' : 'Tersimpan'}
          </Btn>
        </div>
        <div className="p-5 space-y-4">
          <InfoNote>
            Isian yang dikosongkan memakai nilai dari berkas <code>.env</code> di server.
            Bentuk permintaan gateway — nama header, json/form, nama medan — memang tetap di
            <code> .env</code>: keduanya hanya berubah saat berganti vendor, dan salah satu isian
            yang keliru cukup untuk mematikan pengiriman tanpa gejala yang terbaca.
          </InfoNote>

          <Field
            label="Aktifkan pengiriman"
            type="checkbox"
            value={setelan.wa_enabled === '1'}
            onChange={(v) => setSetelan({ ...setelan, wa_enabled: v ? '1' : '0' })}
          />
          <Field
            label="Alamat endpoint"
            value={setelan.wa_endpoint ?? ''}
            onChange={(v) => setSetelan({ ...setelan, wa_endpoint: v })}
            placeholder="https://wg.aptpairport.id/api/v1/messages/send"
          />
          <Field
            label="Pagar kiriman harian"
            value={setelan.wa_daily_cap ?? ''}
            onChange={(v) => setSetelan({ ...setelan, wa_daily_cap: v })}
            placeholder="200"
          />
        </div>
      </Panel>

      {/* ---------------- Kunci API ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" /> Kunci API Gateway
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <InfoNote>
            Kunci <b>tidak pernah dikirim balik</b> ke halaman ini setelah disimpan — yang tampil
            hanya empat huruf terakhirnya. Untuk menggantinya, tempel kunci baru; yang lama
            dihapus, bukan ditumpuk.
          </InfoNote>

          <Field
            label="Kunci API"
            type="password"
            value={tokenBaru}
            onChange={setTokenBaru}
            placeholder="wag_xxx.yyy"
          />
          <Btn onClick={simpanKunci} disabled={menyimpanKunci || tokenBaru.trim().length < 8}>
            {menyimpanKunci ? 'Menyimpan...' : 'Simpan Kunci'}
          </Btn>
        </div>
      </Panel>

      {/* ---------------- Uji kirim ---------------- */}
      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Uji Kirim</h2>
        </div>
        <div className="p-5 space-y-4">
          <InfoNote>
            Dikirim ke <b>satu</b> nomor yang Anda ketik, bukan ke seluruh daftar piket —
            memastikan sambungan tidak perlu membunyikan ponsel semua orang. Kiriman uji tetap
            memotong kuota harian.
          </InfoNote>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nomor tujuan" value={nomorUji} onChange={setNomorUji} placeholder="08123456789" className="flex-1 min-w-[200px]" />
            <Btn onClick={uji} disabled={menguji || nomorUji.trim().length < 8}>
              <Send className="w-4 h-4" /> {menguji ? 'Mengirim...' : 'Kirim Uji'}
            </Btn>
          </div>
        </div>
      </Panel>

      {/* ---------------- Nomor piket ---------------- */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Nomor Penerima</h2>
          <Btn onClick={() => { setEditId(null); setDraf(DRAF_KOSONG); setBuka(true); }}>
            <Plus className="w-4 h-4" /> Tambah Nomor
          </Btn>
        </div>

        <div className="px-5 pt-5">
          <InfoNote>
            <ShieldAlert className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-amber-400" />
            Nomor ponsel adalah <b>data pribadi</b> menurut UU 27/2022. Daftar ini tidak pernah
            tampil di portal publik. Isi hanya nomor petugas yang memang bertugas menerima kabar
            piket, dan hapus nomor yang sudah tidak menjabat.
          </InfoNote>
        </div>

        {daftar.length === 0 ? (
          <EmptyState text="Belum ada nomor" hint="Tanpa satu pun nomor aktif, notifikasi WhatsApp tidak dikirim ke mana pun." />
        ) : (
          <Table head={['Nama', 'Nomor', 'Menerima', 'Status', '']}>
            {daftar.map((r) => (
              <Row key={r.id}>
                <Cell className="font-semibold">{r.nama}</Cell>
                <Cell className="tabular-nums">{r.nomor}</Cell>
                <Cell>
                  <span className="flex flex-wrap gap-1">
                    {!r.jenis || r.jenis.length === 0
                      ? <Badge text="Semua jenis" />
                      : r.jenis.map((j) => (
                          <Badge key={j} text={jenisTersedia.find((x) => x.kunci === j)?.judul ?? j} />
                        ))}
                  </span>
                </Cell>
                <Cell>
                  {r.is_active ? <Badge text="Aktif" color="#34d399" /> : <Badge text="Nonaktif" color="#94a3b8" />}
                </Cell>
                <Cell>
                  <span className="flex gap-2 justify-end">
                    <Btn
                      variant="ghost"
                      onClick={() => {
                        setEditId(r.id);
                        setDraf({ nama: r.nama, nomor: r.nomor, jenis: r.jenis ?? [], is_active: r.is_active });
                        setBuka(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Ubah
                    </Btn>
                    <Btn variant="danger" onClick={() => setHapusId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={buka}
        onClose={() => setBuka(false)}
        title={editId ? 'Ubah Nomor' : 'Tambah Nomor'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setBuka(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama" value={draf.nama} onChange={(v) => setDraf({ ...draf, nama: v })} required />
          <Field label="Nomor WhatsApp" value={draf.nomor} onChange={(v) => setDraf({ ...draf, nomor: v })} placeholder="08123456789" required />

          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider">
              Jenis kabar yang diterima
            </p>
            <p className="text-[11.5px] text-[var(--adm-muted)]">
              Tidak ada yang dicentang berarti <b>menerima semua jenis</b>.
            </p>
            {jenisTersedia.map((j) => (
              <Field
                key={j.kunci}
                label={j.judul}
                type="checkbox"
                value={draf.jenis.includes(j.kunci)}
                onChange={() => toggleJenis(j.kunci)}
              />
            ))}
          </div>

          <div className="border-t border-[var(--adm-line)] pt-4">
            <Field label="Aktif" type="checkbox" value={draf.is_active} onChange={(v) => setDraf({ ...draf, is_active: v })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={hapusId !== null}
        onCancel={() => setHapusId(null)}
        onConfirm={hapus}
        title="Hapus nomor"
        message="Nomor ini tidak akan lagi menerima notifikasi. Untuk menghentikannya sementara, cukup matikan statusnya."
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Ringkas({ label, nilai, warna }: { label: string; nilai: string; warna?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--adm-dim)]">{label}</p>
      <p className="mt-1 font-bold" style={warna ? { color: warna } : undefined}>{nilai}</p>
    </div>
  );
}
