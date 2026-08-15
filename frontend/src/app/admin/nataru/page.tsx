'use client';

/**
 * Kelola periode Posko Nataru.
 *
 * TAUTAN PETUGAS ADALAH RAHASIA. Siapa pun yang memegangnya dapat menulis data
 * penerbangan tanpa akun — itu memang rancangannya, karena petugas lapangan
 * berganti tiap giliran jaga. Konsekuensinya di halaman ini:
 *
 *   - tokennya TIDAK ikut pada daftar; ia diambil lewat permintaan tersendiri
 *     hanya ketika petugas hendak dibagikan tautannya;
 *   - tautannya ditampilkan di balik satu tindakan sadar, bukan terpampang
 *     pada tabel yang bisa terlihat siapa saja yang lewat di depan monitor;
 *   - memutar token diberi peringatan tegas, karena tautan lama langsung mati
 *     dan petugas yang sedang bertugas akan tertahan di tengah giliran.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';
import type { NataruEvent } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  CalendarRange, Plus, Pencil, Trash2, RefreshCw, Link2, RotateCcw, Copy, Check,
  PlaneTakeoff, Eye, EyeOff, ListChecks, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = {
  name: string;
  start_date: string;
  end_date: string;
  peak_date: string;
  description: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: '', start_date: '', end_date: '', peak_date: '', description: '', is_active: true,
};

export default function AdminNataruPage() {
  const [items, setItems] = useState<NataruEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [putarId, setPutarId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  /** Token yang sedang ditampilkan, per periode. Tidak pernah disimpan. */
  const [tautan, setTautan] = useState<Record<number, string>>({});
  const [disalin, setDisalin] = useState<number | null>(null);
  /** Tautan layar TV, terpisah dari tautan petugas. */
  const [tautanLayar, setTautanLayar] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<NataruEvent[]>('/nataru/events');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<NataruEvent[]>('/nataru/events');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    aktif: items.filter((e) => e.is_active).length,
    penerbangan: items.reduce((n, e) => n + (e.flights_count ?? 0), 0),
    terbaru: items[0]?.name ?? '—',
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (e: NataruEvent) => {
    setForm({
      name: e.name,
      start_date: String(e.start_date).slice(0, 10),
      end_date: String(e.end_date).slice(0, 10),
      peak_date: e.peak_date ? String(e.peak_date).slice(0, 10) : '',
      description: e.description ?? '',
      is_active: e.is_active,
    });
    setEditId(e.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      peak_date: form.peak_date || null,
      description: form.description || null,
      is_active: form.is_active,
    };

    const res = editId
      ? await adminFetch(`/nataru/events/${editId}`, { method: 'PUT', body })
      : await adminFetch('/nataru/events', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Periode diperbarui' : 'Periode dibuat', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /** Ambil tokennya — hanya saat petugas hendak dibagikan tautannya. */
  const tampilkanTautan = async (e: NataruEvent) => {
    if (tautan[e.id]) {
      setTautan((t) => { const s = { ...t }; delete s[e.id]; return s; });
      return;
    }

    const res = await adminFetch<{ input_path: string; display_path: string }>(`/nataru/events/${e.id}/token`);

    if (!res.ok || !res.data) {
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    setTautan((t) => ({ ...t, [e.id]: `${window.location.origin}${res.data!.input_path}` }));
    // Tautan layar TV DIPISAH: ia hanya dapat membaca, dan dipasang di tempat
    // yang berbeda — pada layar ruang posko, bukan di ponsel petugas. v1
    // memakai satu tautan untuk keduanya, sehingga URL yang terbaca di layar
    // ruang publik ikut memberi kemampuan menulis.
    setTautanLayar((t) => ({ ...t, [e.id]: `${window.location.origin}${res.data!.display_path}` }));
  };

  const salin = async (id: number) => {
    try {
      await navigator.clipboard.writeText(tautan[id]);
      setDisalin(id);
      setTimeout(() => setDisalin(null), 2000);
    } catch {
      setToast({ text: 'Peramban menolak menyalin. Salin manual dari kotak di atas.', kind: 'error' });
    }
  };

  const putarToken = async () => {
    if (putarId == null) return;

    const res = await adminFetch<{ public_token: string }>(`/nataru/events/${putarId}/rotate-token`, { method: 'POST' });
    const id = putarId;
    setPutarId(null);

    if (res.ok && res.data) {
      setTautan((t) => ({ ...t, [id]: `${window.location.origin}/posko/${res.data!.public_token}` }));
      setToast({ text: res.message, kind: 'success' });
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/nataru/events/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Periode dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const tanggal = (t: string) =>
    new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <PageHeader
        icon={CalendarRange}
        title="Posko Nataru"
        subtitle="Periode pemantauan arus Natal dan Tahun Baru beserta catatan penerbangannya"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Buat Periode</Btn>
          </div>
        }
      />

      <InfoNote>
        Tautan petugas memungkinkan pengiriman data <strong>tanpa akun</strong> — siapa pun yang
        memegangnya dapat menulis catatan penerbangan. Bagikan hanya kepada petugas yang sedang
        bertugas, dan terbitkan token baru bila tautannya terlanjur tersebar.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Periode" value={stats.total} icon={CalendarRange} accent="#38bdf8" />
        <StatCard label="Sedang Terbuka" value={stats.aktif} icon={Eye} accent="#34d399" />
        <StatCard label="Catatan Penerbangan" value={stats.penerbangan} icon={PlaneTakeoff} accent="#a78bfa" />
        <StatCard label="Periode Terbaru" value={String(stats.terbaru).slice(0, 22)} icon={ListChecks} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Periode</h2>
        </div>

        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="Belum ada periode posko" hint="Buat periode agar petugas dapat mulai mengirim data." />
        ) : (
          <Table head={['Periode', 'Rentang', 'Catatan', 'Status', 'Tautan Petugas', 'Aksi']}>
            {items.map((e) => (
              <Row key={e.id}>
                <Cell className="max-w-[260px]">
                  {/* Nama periode adalah tautan utama ke detail — tempat yang
                      pertama diklik orang saat ingin "membuka" satu baris. */}
                  <Link href={`/admin/nataru/${e.id}`} className="group/nm inline-flex items-center gap-1.5">
                    <span className="font-bold text-[var(--adm-fg)] group-hover/nm:text-[var(--adm-accent)] text-[12.5px] transition-colors">
                      {e.name}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--adm-dim)] -translate-x-1 opacity-0 group-hover/nm:translate-x-0 group-hover/nm:opacity-100 transition-all" />
                  </Link>
                  {e.peak_date && (
                    <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5">Puncak: {tanggal(e.peak_date)}</p>
                  )}
                </Cell>

                <Cell className="whitespace-nowrap">
                  {tanggal(e.start_date)} – {tanggal(e.end_date)}
                </Cell>

                <Cell>
                  <Link
                    href={`/admin/nataru/${e.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] text-[var(--adm-accent)] hover:brightness-110 text-[11.5px] font-semibold transition-all"
                  >
                    <PlaneTakeoff className="w-3.5 h-3.5" />
                    {e.flights_count ?? 0} penerbangan
                  </Link>
                </Cell>

                <Cell>
                  <Badge
                    text={e.is_active ? 'Terbuka' : 'Ditutup'}
                    color={e.is_active ? '#34d399' : '#64748b'}
                  />
                </Cell>

                <Cell className="max-w-[300px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => tampilkanTautan(e)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-[var(--adm-hover)] text-[var(--adm-body)] text-[11.5px] font-semibold cursor-pointer"
                      title={tautan[e.id] ? 'Sembunyikan tautan' : 'Tampilkan tautan petugas'}
                    >
                      {tautan[e.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      {tautan[e.id] ? 'Sembunyikan' : 'Tampilkan'}
                    </button>

                    {tautan[e.id] && (
                      <>
                        <button
                          onClick={() => salin(e.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-[var(--adm-accent)] text-[11.5px] font-semibold cursor-pointer"
                        >
                          {disalin === e.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {disalin === e.id ? 'Tersalin' : 'Salin'}
                        </button>
                        <button
                          onClick={() => setPutarId(e.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-[11.5px] font-semibold cursor-pointer"
                          title="Terbitkan token baru"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Putar
                        </button>
                      </>
                    )}
                  </div>

                  {tautan[e.id] && (
                    <>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--adm-dim)]">
                        Tautan petugas — dapat MENULIS data
                      </p>
                      <p className="text-[10.5px] text-[var(--adm-muted)] font-mono break-all leading-relaxed">
                        {tautan[e.id]}
                      </p>

                      {/* Tautan layar sengaja ditampilkan berdampingan supaya
                          petugas melihat keduanya BERBEDA — di v1 keduanya satu,
                          dan tautan yang terbaca dari layar ruang publik ikut
                          membuka penulisan data. */}
                      {tautanLayar[e.id] && (
                        <>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                            Tautan layar TV — hanya menampilkan
                          </p>
                          <p className="text-[10.5px] text-[var(--adm-muted)] font-mono break-all leading-relaxed">
                            {tautanLayar[e.id]}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(tautanLayar[e.id]);
                              setToast({ text: 'Tautan layar disalin', kind: 'success' });
                            }}
                            className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Salin tautan layar
                          </button>
                        </>
                      )}
                    </>
                  )}
                </Cell>

                <Cell>
                  <div className="flex gap-1.5">
                    <Link
                      href={`/admin/nataru/${e.id}`}
                      className="w-8 h-8 rounded-lg bg-[var(--adm-accent-soft)] hover:brightness-110 text-[var(--adm-accent)] flex items-center justify-center transition-all"
                      title="Lihat detail posko"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => openEdit(e)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDelId(e.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Periode Posko' : 'Buat Periode Posko'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Periode" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Posko Nataru 2025/2026" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal Mulai" required type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: String(v) })} />
            <Field label="Tanggal Selesai" required type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: String(v) })} />
          </div>

          <Field label="Perkiraan Hari Puncak" type="date" value={form.peak_date} onChange={(v) => setForm({ ...form, peak_date: String(v) })} />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
            Formulir petugas menolak tanggal di luar rentang mulai–selesai, jadi pastikan rentangnya
            benar sebelum tautannya dibagikan.
          </p>

          <Field label="Keterangan" type="textarea" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Tampil di bagian atas formulir petugas — mis. instruksi khusus giliran jaga." />

          <Field label="Posko terbuka (menerima kiriman petugas)" type="checkbox" value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={putarId !== null}
        onCancel={() => setPutarId(null)}
        onConfirm={putarToken}
        message="Token baru akan diterbitkan dan tautan lama LANGSUNG tidak berlaku. Petugas yang sedang bertugas akan tertahan sampai menerima tautan barunya. Lanjutkan?"
      />
      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Periode ini akan dihapus permanen. Periode yang masih memuat catatan penerbangan tidak dapat dihapus."
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
