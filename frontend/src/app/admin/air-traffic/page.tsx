'use client';

/**
 * Pencatatan lalu lintas udara harian.
 *
 * Satu baris per tanggal; tanggalnya unik di basis data. Itu bukan formalitas:
 * satu hari yang tercatat dua kali dengan angka berbeda merusak seluruh
 * agregat tanpa ada yang menyadarinya. Backend menolaknya, dan pesan galatnya
 * mengarahkan petugas menyunting catatan yang lama alih-alih membuat yang baru.
 *
 * Delapan angka per hari — empat kategori dikali kedatangan/keberangkatan —
 * disusun berpasangan supaya sepasang angka yang berhubungan selalu terbaca
 * berdampingan, bukan berjejer delapan kolom.
 *
 * Bagasi dan kargo dicatat dalam KILOGRAM, pesawat dan penumpang per satuan.
 * Satuannya ditulis di tiap isian; tanpa itu angka 14.520 tidak punya arti.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import type { AirTrafficLog } from '@/types';
import { KATEGORI, angka } from '@/lib/airTraffic';
import {
  PageHeader, Panel, Btn, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { BarChart3, Plus, Pencil, Trash2, RefreshCw, CalendarDays, Plane, Users, Printer } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = Record<string, string>;

const kunciAngka = KATEGORI.flatMap((k) => [`${k.key}_arrival`, `${k.key}_departure`]);

const EMPTY: FormState = {
  date: '',
  ...Object.fromEntries(kunciAngka.map((k) => [k, '0'])),
};

export default function AdminAirTrafficPage() {
  const [items, setItems] = useState<AirTrafficLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  /* Periode cetak. Bawaannya bulan berjalan; petugas biasanya mencetak bulan
     yang baru saja lewat, tetapi menebak bulan lalu justru menyesatkan pada
     awal bulan. */
  const [bulanCetak, setBulanCetak] = useState(() => new Date().toISOString().slice(0, 7));
  const [mencetak, setMencetak] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<AirTrafficLog[]>('/air-traffic');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<AirTrafficLog[]>('/air-traffic');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim();
    return items.filter((l) => !s || String(l.date).includes(s));
  }, [items, q]);

  const stats = useMemo(() => {
    const total = (kunci: string) => items.reduce((n, l) => n + Number((l as unknown as Record<string, number>)[kunci] ?? 0), 0);

    return {
      hari: items.length,
      pesawat: total('aircraft_arrival') + total('aircraft_departure'),
      penumpang: total('passenger_arrival') + total('passenger_departure'),
      terakhir: items[0]?.date ?? '—',
    };
  }, [items]);

  const openCreate = () => {
    // Tanggal hari ini sebagai bawaan; pencatatan biasanya dilakukan untuk
    // hari yang baru saja lewat.
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (l: AirTrafficLog) => {
    const rec = l as unknown as Record<string, number | string>;
    setForm({
      date: String(l.date).slice(0, 10),
      ...Object.fromEntries(kunciAngka.map((k) => [k, String(rec[k] ?? 0)])),
    });
    setEditId(l.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    const body: Record<string, string | number> = { date: form.date };
    kunciAngka.forEach((k) => { body[k] = Number(form[k]) || 0; });

    const res = editId
      ? await adminFetch(`/air-traffic/${editId}`, { method: 'PUT', body })
      : await adminFetch('/air-traffic', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Catatan diperbarui' : 'Catatan ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /**
   * Unduh rekapitulasi bulanan.
   *
   * Lewat `adminDownload` — berkasnya diambil sebagai blob melalui proksi
   * bersesi, jadi tidak pernah ada URL yang dapat dibuka tanpa token.
   */
  const cetak = async () => {
    setMencetak(true);
    const res = await adminDownload(
      `/air-traffic/export-pdf?month=${bulanCetak}`,
      `lalu-lintas-udara-${bulanCetak}.pdf`,
    );
    setMencetak(false);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/air-traffic/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Catatan dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Lalu Lintas Udara"
        subtitle="Catatan harian pergerakan pesawat, penumpang, bagasi, dan kargo"
        action={
          <div className="flex gap-2">
            {/* Periode cetak menempel pada tombolnya, bukan di modal tersendiri:
                mencetak laporan bulanan adalah tindakan satu langkah, dan modal
                untuk satu isian hanya menambah klik. */}
            <input
              type="month"
              value={bulanCetak}
              onChange={(e) => setBulanCetak(e.target.value)}
              aria-label="Periode laporan yang dicetak"
              className="bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-[12.5px] text-[var(--adm-fg)] focus:outline-none focus:border-[var(--adm-accent)] transition-colors"
            />
            <Btn variant="ghost" onClick={cetak} disabled={mencetak}>
              <Printer className="w-4 h-4" /> {mencetak ? 'Menyiapkan...' : 'Cetak PDF'}
            </Btn>
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Catatan</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Hari Tercatat" value={stats.hari} icon={CalendarDays} accent="#38bdf8" />
        <StatCard label="Total Pergerakan Pesawat" value={angka(stats.pesawat)} icon={Plane} accent="#34d399" />
        <StatCard label="Total Penumpang" value={angka(stats.penumpang)} icon={Users} accent="#a78bfa" />
        <StatCard label="Catatan Terakhir" value={String(stats.terakhir).slice(0, 10)} icon={CalendarDays} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Catatan Harian</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tanggal (2025-11)..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada catatan" hint="Tambahkan catatan harian agar statistik publik terisi." />
        ) : (
          <Table head={['Tanggal', ...KATEGORI.map((k) => k.label)]}>
            {visible.map((l) => {
              const rec = l as unknown as Record<string, number>;

              return (
                <Row key={l.id}>
                  <Cell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--adm-fg)] text-[12.5px] tabular-nums">{String(l.date).slice(0, 10)}</span>
                      <span className="flex gap-1">
                        <button onClick={() => openEdit(l)} className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDelId(l.id)} className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                  </Cell>

                  {KATEGORI.map((k) => (
                    <Cell key={k.key}>
                      <span className="tabular-nums text-[var(--adm-body)]">{angka(rec[`${k.key}_arrival`] ?? 0)}</span>
                      <span className="text-[var(--adm-dim)]"> / </span>
                      <span className="tabular-nums text-[var(--adm-body)]">{angka(rec[`${k.key}_departure`] ?? 0)}</span>
                    </Cell>
                  ))}
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Catatan Harian' : 'Tambah Catatan Harian'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tanggal" required type="date" value={form.date} onChange={(v) => setForm({ ...form, date: String(v) })} />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Satu tanggal hanya boleh punya satu catatan. Bila tanggalnya sudah tercatat, sunting
            catatan yang ada — jangan membuat yang baru.
          </p>

          {KATEGORI.map((k) => (
            <div key={k.key} className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[12px] font-bold text-[var(--adm-body)]">
                {k.label} <span className="font-medium text-[var(--adm-dim)]">({k.unit})</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Kedatangan" type="number"
                  value={form[`${k.key}_arrival`]}
                  onChange={(v) => setForm({ ...form, [`${k.key}_arrival`]: String(v) })}
                />
                <Field
                  label="Keberangkatan" type="number"
                  value={form[`${k.key}_departure`]}
                  onChange={(v) => setForm({ ...form, [`${k.key}_departure`]: String(v) })}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Catatan hari ini akan dihapus permanen dan angkanya keluar dari statistik publik. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
