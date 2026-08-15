'use client';

/**
 * Pencatatan keuangan: pemasukan, anggaran, dan rincian pos anggaran.
 *
 * DUA HAL YANG DITEGASKAN DI LAYAR INI, keduanya berasal dari sifat datanya:
 *
 *  1. **"Terinci" bukan "terpakai".** Halaman publik menampilkan seberapa jauh
 *     tiap anggaran sudah dipecah ke pos belanja. Selama rinciannya belum
 *     diketik, angka publiknya rendah — bukan karena bandaranya tidak
 *     membelanjakan, melainkan karena datanya belum masuk. Petugas perlu tahu
 *     itu, jadi tiap anggaran membawa penanda sisa yang belum terinci.
 *
 *  2. **Menghapus anggaran ikut menghapus rinciannya.** Basis datanya memakai
 *     penghapusan berantai peninggalan v1. Konfirmasinya menyebut jumlah
 *     rincian yang ikut hilang, bukan sekadar "yakin?".
 *
 * Rincian dikelola pada modal terpisah, bukan di dalam formulir anggaran:
 * jumlahnya bisa banyak, dan menyuntingnya adalah pekerjaan yang berbeda dari
 * mengubah pagu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { Finance, BudgetExpense } from '@/types';
import { rupiah, rupiahRingkas } from '@/lib/finance';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Wallet, Plus, Pencil, Trash2, RefreshCw, TrendingUp, ListChecks, CircleAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormCatatan = {
  date: string;
  flow_type: 'in' | 'budget';
  amount: string;
  source: string;
  note: string;
};

const KOSONG: FormCatatan = { date: '', flow_type: 'budget', amount: '', source: '', note: '' };

/** Label jenis arus dana; dipakai tabel, formulir, dan penyaring. */
const JENIS = [
  { value: 'in', label: 'Pemasukan' },
  { value: 'budget', label: 'Anggaran' },
];

const namaJenis = (t: string) => JENIS.find((j) => j.value === t)?.label ?? t;

export default function AdminKeuanganPage() {
  const [items, setItems] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormCatatan>(KOSONG);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delItem, setDelItem] = useState<Finance | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  // Modal rincian: id anggaran yang sedang dibuka.
  const [rincianId, setRincianId] = useState<number | null>(null);
  const [rincianForm, setRincianForm] = useState({ description: '', amount: '' });
  const [rincianEditId, setRincianEditId] = useState<number | null>(null);
  const [rincianSaving, setRincianSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Finance[]>('/finances');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<Finance[]>('/finances');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((f) =>
      String(f.date).includes(s)
      || (f.source ?? '').toLowerCase().includes(s)
      || (f.note ?? '').toLowerCase().includes(s)
      || namaJenis(f.flow_type).toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => {
    const anggaran = items.filter((f) => f.flow_type === 'budget');
    const pagu = anggaran.reduce((n, f) => n + f.amount, 0);
    const terinci = anggaran.reduce((n, f) => n + f.expenses_total, 0);

    return {
      pemasukan: items.filter((f) => f.flow_type === 'in').reduce((n, f) => n + f.amount, 0),
      pagu,
      terinci,
      // Anggaran yang rinciannya belum lengkap — inilah pekerjaan yang tersisa.
      belumLengkap: anggaran.filter((f) => (f.remaining ?? 0) !== 0).length,
    };
  }, [items]);

  const anggaranAktif = rincianId !== null ? items.find((f) => f.id === rincianId) ?? null : null;

  const openCreate = () => {
    setForm({ ...KOSONG, date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (f: Finance) => {
    setForm({
      date: String(f.date).slice(0, 10),
      flow_type: f.flow_type,
      amount: String(f.amount),
      source: f.source ?? '',
      note: f.note ?? '',
    });
    setEditId(f.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    const body = {
      date: form.date,
      flow_type: form.flow_type,
      amount: Number(form.amount) || 0,
      source: form.source.trim() || null,
      note: form.note.trim() || null,
    };

    const res = editId
      ? await adminFetch(`/finances/${editId}`, { method: 'PUT', body })
      : await adminFetch('/finances', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: res.message, kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/finances/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  /* ------------------------- rincian anggaran ------------------------- */

  const simpanRincian = async () => {
    if (rincianId === null) return;
    setRincianSaving(true);

    const body = {
      description: rincianForm.description.trim(),
      amount: Number(rincianForm.amount) || 0,
    };

    const res = rincianEditId
      ? await adminFetch(`/finance-expenses/${rincianEditId}`, { method: 'PUT', body })
      : await adminFetch(`/finances/${rincianId}/expenses`, { method: 'POST', body });
    setRincianSaving(false);

    // Pesan backend sekalian melaporkan sisa anggarannya — ditampilkan apa
    // adanya, karena angka itulah yang dicari petugas sesudah menyimpan.
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setRincianForm({ description: '', amount: '' });
      setRincianEditId(null);
      load();
    }
  };

  const hapusRincian = async (r: BudgetExpense) => {
    const res = await adminFetch(`/finance-expenses/${r.id}`, { method: 'DELETE' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Kinerja Keuangan"
        subtitle="Pemasukan, anggaran, dan rincian pos belanja bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Catatan</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pemasukan" value={rupiahRingkas(stats.pemasukan)} icon={TrendingUp} accent="#34d399" />
        <StatCard label="Total Anggaran" value={rupiahRingkas(stats.pagu)} icon={Wallet} accent="#38bdf8" />
        <StatCard label="Sudah Terinci" value={rupiahRingkas(stats.terinci)} icon={ListChecks} accent="#a78bfa" />
        <StatCard
          label="Anggaran Belum Terinci Penuh"
          value={stats.belumLengkap}
          icon={CircleAlert}
          accent="#fbbf24"
          hint="Catatan yang rinciannya belum menutup pagu"
        />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Angka <strong>terinci</strong> pada halaman publik adalah bagian pagu yang sudah dipecah ke
          pos belanja di sini — bukan uang yang sudah dibelanjakan. Anggaran yang rinciannya belum
          diketik akan tampak seolah serapannya rendah, jadi lengkapi rinciannya agar angka publiknya
          mewakili keadaan sebenarnya.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Catatan Keuangan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tanggal, sumber, atau catatan..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada catatan" hint="Tambahkan pemasukan atau anggaran agar halaman keuangan publik terisi." />
        ) : (
          <Table head={['Tanggal', 'Jenis', 'Nominal', 'Sumber Dana', 'Rincian', 'Aksi']}>
            {visible.map((f) => {
              const sisa = f.remaining;

              return (
                <Row key={f.id}>
                  <Cell>
                    <span className="font-bold text-[var(--adm-fg)] text-[12.5px] tabular-nums">
                      {String(f.date).slice(0, 10)}
                    </span>
                  </Cell>

                  <Cell>
                    <Badge
                      text={namaJenis(f.flow_type)}
                      color={f.flow_type === 'in' ? '#34d399' : '#38bdf8'}
                    />
                  </Cell>

                  <Cell>
                    <span className="tabular-nums text-[var(--adm-fg)] font-semibold" title={rupiah(f.amount)}>
                      {rupiah(f.amount)}
                    </span>
                  </Cell>

                  <Cell>
                    {f.source
                      ? <span className="text-[var(--adm-body)]">{f.source}</span>
                      : <span className="text-[var(--adm-dim)]" title="Sumber dana belum diisi">—</span>}
                  </Cell>

                  <Cell>
                    {f.flow_type !== 'budget' ? (
                      <span className="text-[var(--adm-dim)]">—</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[var(--adm-body)] tabular-nums">{f.budget_expenses.length} pos</span>
                        {sisa === 0 ? (
                          <Badge text="Lengkap" color="#34d399" />
                        ) : (sisa ?? 0) > 0 ? (
                          <Badge text={`Sisa ${rupiahRingkas(sisa!)}`} color="#fbbf24" />
                        ) : (
                          <Badge text={`Lebih ${rupiahRingkas(Math.abs(sisa!))}`} color="#fb7185" />
                        )}
                      </div>
                    )}
                  </Cell>

                  <Cell>
                    <span className="flex gap-1">
                      {f.flow_type === 'budget' && (
                        <button
                          onClick={() => { setRincianId(f.id); setRincianEditId(null); setRincianForm({ description: '', amount: '' }); }}
                          className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-violet-500/20 text-[var(--adm-body)] hover:text-violet-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Kelola rincian"
                        >
                          <ListChecks className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(f)}
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                        title="Ubah"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDelItem(f)}
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      {/* ---- Formulir catatan ---- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Catatan Keuangan' : 'Tambah Catatan Keuangan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tanggal" required type="date" value={form.date} onChange={(v) => setForm({ ...form, date: String(v) })} />

          <Field
            label="Jenis" required type="select" options={JENIS}
            value={form.flow_type}
            onChange={(v) => setForm({ ...form, flow_type: v as 'in' | 'budget' })}
          />

          <Field
            label="Nominal (rupiah)" required type="number"
            value={form.amount}
            placeholder="1200000000"
            onChange={(v) => setForm({ ...form, amount: String(v) })}
          />
          {/* Angka besar sulit diperiksa sekilas; pratinjaunya membantu
              menangkap satu nol yang kelebihan sebelum tersimpan. */}
          {form.amount !== '' && Number(form.amount) > 0 && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-accent)]">{rupiah(Number(form.amount))}</p>
          )}

          <Field
            label="Sumber Dana" value={form.source}
            placeholder="PNBP BLU / Rupiah Murni"
            onChange={(v) => setForm({ ...form, source: String(v) })}
          />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Boleh dikosongkan. Catatan tanpa sumber dana tidak muncul pada rekap sumber dana publik.
          </p>

          <Field label="Keterangan" type="textarea" rows={3} value={form.note} onChange={(v) => setForm({ ...form, note: String(v) })} />
        </div>
      </Modal>

      {/* ---- Rincian pos anggaran ---- */}
      <Modal
        open={anggaranAktif !== null}
        onClose={() => setRincianId(null)}
        title="Rincian Pos Anggaran"
        footer={<Btn variant="ghost" onClick={() => setRincianId(null)}>Tutup</Btn>}
      >
        {anggaranAktif && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)]">
                Anggaran {String(anggaranAktif.date).slice(0, 10)}
              </p>
              <p className="mt-1 text-[18px] font-black text-[var(--adm-fg)] tabular-nums">{rupiah(anggaranAktif.amount)}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                Terinci {rupiah(anggaranAktif.expenses_total)}
                {anggaranAktif.remaining !== null && anggaranAktif.remaining !== 0 && (
                  <span className={anggaranAktif.remaining > 0 ? ' text-amber-300' : ' text-rose-300'}>
                    {anggaranAktif.remaining > 0
                      ? ` · sisa ${rupiah(anggaranAktif.remaining)}`
                      : ` · melampaui pagu ${rupiah(Math.abs(anggaranAktif.remaining))}`}
                  </span>
                )}
              </p>
            </div>

            {anggaranAktif.budget_expenses.length === 0 ? (
              <p className="text-[12px] text-[var(--adm-muted)]">Belum ada pos rincian pada anggaran ini.</p>
            ) : (
              <ul className="space-y-2">
                {anggaranAktif.budget_expenses.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[var(--adm-fg)] truncate">{r.description}</p>
                      <p className="text-[11.5px] text-[var(--adm-muted)] tabular-nums">{rupiah(r.amount)}</p>
                    </div>
                    <button
                      onClick={() => { setRincianEditId(r.id); setRincianForm({ description: r.description, amount: String(r.amount) }); }}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah rincian"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => hapusRincian(r)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus rincian"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
              <p className="text-[12px] font-bold text-[var(--adm-body)]">
                {rincianEditId ? 'Ubah Pos Rincian' : 'Tambah Pos Rincian'}
              </p>
              <Field
                label="Uraian" required
                value={rincianForm.description}
                placeholder="Gaji Pegawai"
                onChange={(v) => setRincianForm({ ...rincianForm, description: String(v) })}
              />
              <Field
                label="Nominal (rupiah)" required type="number"
                value={rincianForm.amount}
                onChange={(v) => setRincianForm({ ...rincianForm, amount: String(v) })}
              />
              {rincianForm.amount !== '' && Number(rincianForm.amount) > 0 && (
                <p className="-mt-1 text-[11.5px] text-[var(--adm-accent)]">{rupiah(Number(rincianForm.amount))}</p>
              )}
              <div className="flex gap-2">
                <Btn onClick={simpanRincian} disabled={rincianSaving}>
                  {rincianSaving ? 'Menyimpan...' : rincianEditId ? 'Simpan Perubahan' : 'Tambah'}
                </Btn>
                {rincianEditId && (
                  <Btn variant="ghost" onClick={() => { setRincianEditId(null); setRincianForm({ description: '', amount: '' }); }}>
                    Batal
                  </Btn>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem && delItem.budget_expenses.length > 0
            ? `Catatan ini akan dihapus permanen BESERTA ${delItem.budget_expenses.length} pos rinciannya, dan angkanya keluar dari halaman keuangan publik. Lanjutkan?`
            : 'Catatan ini akan dihapus permanen dan angkanya keluar dari halaman keuangan publik. Lanjutkan?'
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
