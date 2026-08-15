'use client';

/**
 * Inventaris aset bandara.
 *
 * KEPUTUSAN BENTUK YANG PALING MENENTUKAN: status aset TIDAK dapat diubah
 * lewat formulir sunting. Ia hanya berpindah lewat tindakan tersendiri yang
 * mewajibkan alasan, dan tiap perpindahan menuliskan barisnya ke riwayat.
 *
 * Alasannya adalah gunanya modul ini. Aset yang statusnya bisa diubah diam-diam
 * di antara medan lain akan punya riwayat berlubang, dan pertanyaan "sejak
 * kapan alat ini rusak" — yang justru membuat orang membuka halaman ini —
 * tidak lagi terjawab.
 *
 * Riwayat dan jurnal ditaruh pada satu panel rincian, bukan halaman terpisah:
 * keduanya hanya bermakna di samping asetnya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload, adminDownload } from '@/lib/adminApi';
import type { Inventory, StatusAset } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Boxes, Plus, Pencil, Trash2, RefreshCw, Wrench, CircleCheck, History, NotebookPen, ExternalLink, Printer,
} from 'lucide-react';
import { motion } from 'framer-motion';

const WARNA_STATUS: Record<StatusAset, string> = {
  'Baik': '#34d399',
  'Pemeliharaan': '#fbbf24',
};

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const KOSONG = { name: '', category: '', input_date: '', maintenance_report_link: '' };

export default function AdminInventarisPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<Inventory | null>(null);

  const [form, setForm] = useState(KOSONG);
  const [foto, setFoto] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Perpindahan status.
  const [pindah, setPindah] = useState<Inventory | null>(null);
  const [statusBaru, setStatusBaru] = useState<StatusAset>('Pemeliharaan');
  const [alasan, setAlasan] = useState('');

  // Panel rincian: riwayat + jurnal.
  const [rinci, setRinci] = useState<Inventory | null>(null);
  const [jurnal, setJurnal] = useState({ log_date: '', schedule_time: '', notes: '' });

  const muat = async () => {
    const res = await adminFetch<Inventory[]>('/inventories');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<Inventory[]>('/inventories');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const bukaRincian = async (it: Inventory) => {
    const res = await adminFetch<Inventory>(`/inventories/${it.id}`);
    if (res.ok && res.data) setRinci(res.data);
    else setToast({ text: res.message, kind: 'error' });
  };

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) =>
      it.name.toLowerCase().includes(s) || it.category.toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    baik: items.filter((it) => it.status === 'Baik').length,
    pemeliharaan: items.filter((it) => it.status === 'Pemeliharaan').length,
    kategori: new Set(items.map((it) => it.category)).size,
  }), [items]);

  const bukaTambah = () => {
    setForm({ ...KOSONG, input_date: new Date().toISOString().slice(0, 10) });
    setFoto(null);
    setEditId(null);
    setOpen(true);
  };

  const bukaSunting = (it: Inventory) => {
    setForm({
      name: it.name,
      category: it.category,
      input_date: String(it.input_date).slice(0, 10),
      maintenance_report_link: it.maintenance_report_link ?? '',
    });
    setFoto(null);
    setEditId(it.id);
    setOpen(true);
  };

  const simpan = async () => {
    setSaving(true);

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('input_date', form.input_date);
    if (form.maintenance_report_link.trim()) fd.append('maintenance_report_link', form.maintenance_report_link.trim());
    if (foto) fd.append('photo', foto);

    const res = await adminUpload(editId ? `/inventories/${editId}` : '/inventories', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const simpanStatus = async () => {
    if (!pindah) return;

    if (!alasan.trim()) {
      setToast({ text: 'Alasan perpindahan status wajib diisi.', kind: 'error' });

      return;
    }

    const res = await adminFetch(`/inventories/${pindah.id}/status`, {
      method: 'PUT',
      body: { status: statusBaru, notes: alasan.trim() },
    });

    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setPindah(null);
      setAlasan('');
      muat();
    }
  };

  const simpanJurnal = async () => {
    if (!rinci) return;

    const fd = new FormData();
    fd.append('log_date', jurnal.log_date);
    if (jurnal.schedule_time) fd.append('schedule_time', jurnal.schedule_time);
    fd.append('notes', jurnal.notes);

    const res = await adminUpload(`/inventories/${rinci.id}/logbooks`, fd);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setJurnal({ log_date: '', schedule_time: '', notes: '' });
      bukaRincian(rinci);
    }
  };

  /**
   * Unduh logbook satu aset.
   *
   * Cetakannya memuat jurnal DAN riwayat status sekaligus — pertanyaan yang
   * dibawa orang ke dokumen ini hampir selalu menuntut keduanya.
   */
  const cetakLogbook = async (it: Inventory) => {
    const res = await adminDownload(`/inventories/${it.id}/logbook-pdf`, `logbook-${it.name}.pdf`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/inventories/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={Boxes}
        title="Inventaris Aset"
        subtitle="Aset bandara beserta riwayat status dan jurnal pemeliharaannya"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={bukaTambah}><Plus className="w-4 h-4" /> Tambah Aset</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Aset" value={stats.total} icon={Boxes} accent="#38bdf8" />
        <StatCard label="Kondisi Baik" value={stats.baik} icon={CircleCheck} accent="#34d399" />
        <StatCard label="Dalam Pemeliharaan" value={stats.pemeliharaan} icon={Wrench} accent="#fbbf24" />
        <StatCard label="Kategori" value={stats.kategori} icon={Boxes} accent="#a78bfa" />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Status aset <strong>tidak dapat diubah lewat formulir sunting</strong>. Gunakan tindakan
          ubah status yang mewajibkan alasan — tiap perpindahan tercatat pada riwayat, dan riwayat
          itulah yang menjawab sejak kapan sebuah aset bermasalah.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Aset</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama atau kategori..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada aset" hint="Tambahkan aset agar riwayat status dan jurnal pemeliharaannya dapat dicatat." />
        ) : (
          <Table head={['Aset', 'Kategori', 'Dicatat', 'Laporan', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.name}</span>
                </Cell>
                <Cell>{it.category}</Cell>
                <Cell><span className="text-[var(--adm-body)] text-[11.5px]">{tgl(it.input_date)}</span></Cell>
                <Cell>
                  {it.maintenance_report_link ? (
                    <a
                      href={it.maintenance_report_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)]"
                    >
                      <ExternalLink className="w-3 h-3" /> Buka
                    </a>
                  ) : <span className="text-[var(--adm-dim)]">—</span>}
                </Cell>
                <Cell><Badge text={it.status} color={WARNA_STATUS[it.status] ?? '#94a3b8'} /></Cell>
                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => { setPindah(it); setStatusBaru(it.status === 'Baik' ? 'Pemeliharaan' : 'Baik'); setAlasan(''); }}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah status"
                    >
                      <Wrench className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => cetakLogbook(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-emerald-500/20 text-[var(--adm-body)] hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Cetak logbook PDF"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => bukaRincian(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-violet-500/20 text-[var(--adm-body)] hover:text-violet-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Riwayat & jurnal"
                    >
                      <History className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => bukaSunting(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDelItem(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      {/* ---- Formulir aset: TANPA medan status ---- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Aset' : 'Tambah Aset'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Aset" required value={form.name} onChange={(v) => setForm({ ...form, name: String(v) })} />
          <Field label="Kategori" required value={form.category} placeholder="Kelistrikan" onChange={(v) => setForm({ ...form, category: String(v) })} />
          <Field label="Tanggal Pencatatan" required type="date" value={form.input_date} onChange={(v) => setForm({ ...form, input_date: String(v) })} />
          <Field
            label="Tautan Laporan Pemeliharaan" value={form.maintenance_report_link}
            placeholder="https://..."
            onChange={(v) => setForm({ ...form, maintenance_report_link: String(v) })}
          />

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)]">Foto Aset</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
              <span className="flex-1 min-w-0 text-[12px] text-[var(--adm-muted)] truncate">
                {foto?.name ?? 'Opsional — boleh dilengkapi kemudian'}
              </span>
              <label className="text-[12px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer">
                Pilih
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <p className="text-[11.5px] text-[var(--adm-muted)]">
            Status tidak diisi di sini. Aset baru selalu berstatus Baik; perpindahan sesudahnya lewat
            tindakan ubah status agar tercatat pada riwayat.
          </p>
        </div>
      </Modal>

      {/* ---- Perpindahan status ---- */}
      <Modal
        open={pindah !== null}
        onClose={() => setPindah(null)}
        title="Ubah Status Aset"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPindah(null)}>Batal</Btn>
            <Btn onClick={simpanStatus}>Simpan Perpindahan</Btn>
          </>
        }
      >
        {pindah && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{pindah.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">Status sekarang: {pindah.status}</p>
            </div>

            <Field
              label="Status Baru" required type="select"
              options={[{ value: 'Baik', label: 'Baik' }, { value: 'Pemeliharaan', label: 'Pemeliharaan' }]}
              value={statusBaru}
              onChange={(v) => setStatusBaru(v as StatusAset)}
            />

            <Field
              label="Alasan" required type="textarea" rows={4}
              value={alasan}
              placeholder="Jelaskan kerusakan atau hasil perbaikannya."
              onChange={(v) => setAlasan(String(v))}
            />
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Wajib diisi. Riwayat yang lengkap tanggalnya tetapi kosong isinya sama tak bergunanya
              dengan tidak mencatat sama sekali.
            </p>
          </div>
        )}
      </Modal>

      {/* ---- Riwayat & jurnal ---- */}
      <Modal
        open={rinci !== null}
        onClose={() => setRinci(null)}
        title="Riwayat & Jurnal Aset"
        footer={<Btn variant="ghost" onClick={() => setRinci(null)}>Tutup</Btn>}
      >
        {rinci && (
          <div className="space-y-5">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{rinci.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">{rinci.category} · dicatat {tgl(rinci.input_date)}</p>
            </div>

            <div>
              <p className="text-[12px] font-bold text-[var(--adm-body)] flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[var(--adm-muted)]" /> Riwayat Status
              </p>
              {(rinci.status_logs?.length ?? 0) === 0 ? (
                <p className="mt-2 text-[11.5px] text-[var(--adm-dim)]">Belum ada perpindahan status.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {rinci.status_logs!.map((log) => (
                    <li key={log.id} className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
                      <p className="text-[12px] text-[var(--adm-body)]">
                        <span className="text-[var(--adm-dim)]">{log.previous_status ?? '—'}</span>
                        {' → '}
                        <span className="font-bold">{log.new_status}</span>
                      </p>
                      {log.notes && <p className="mt-1 text-[11.5px] text-[var(--adm-muted)] leading-relaxed">{log.notes}</p>}
                      <p className="mt-1 text-[11px] text-[var(--adm-dim)]">
                        {log.user?.name ?? 'Petugas'} · {tgl(log.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[12px] font-bold text-[var(--adm-body)] flex items-center gap-2">
                <NotebookPen className="w-3.5 h-3.5 text-[var(--adm-muted)]" /> Jurnal Pemeliharaan
              </p>
              {(rinci.logbooks?.length ?? 0) === 0 ? (
                <p className="mt-2 text-[11.5px] text-[var(--adm-dim)]">Belum ada catatan jurnal.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {rinci.logbooks!.map((j) => (
                    <li key={j.id} className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
                      <p className="text-[12px] font-bold text-[var(--adm-body)]">
                        {tgl(j.log_date)}{j.schedule_time && <span className="font-medium text-[var(--adm-muted)]"> · {j.schedule_time}</span>}
                      </p>
                      <p className="mt-1 text-[11.5px] text-[var(--adm-muted)] leading-relaxed">{j.notes}</p>
                      <p className="mt-1 text-[11px] text-[var(--adm-dim)]">{j.user?.name ?? 'Petugas'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
              <p className="text-[12px] font-bold text-[var(--adm-body)]">Tambah Catatan Jurnal</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal" required type="date" value={jurnal.log_date} onChange={(v) => setJurnal({ ...jurnal, log_date: String(v) })} />
                <Field label="Waktu (opsional)" type="time" value={jurnal.schedule_time} onChange={(v) => setJurnal({ ...jurnal, schedule_time: String(v) })} />
              </div>
              <Field label="Catatan Kegiatan" required type="textarea" rows={3} value={jurnal.notes} onChange={(v) => setJurnal({ ...jurnal, notes: String(v) })} />
              <Btn onClick={simpanJurnal}><Plus className="w-4 h-4" /> Tambah</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Aset "${delItem.name}" akan dihapus permanen BESERTA seluruh riwayat status dan jurnal pemeliharaannya. Riwayat itu tidak dapat dipulihkan. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
