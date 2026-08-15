'use client';

/**
 * Suku cadang dan permintaannya.
 *
 * SATU HAL YANG HARUS JELAS DI LAYAR INI: permintaan suku cadang TIDAK
 * mengurangi stok. Tabel warisan v1 tidak menyimpan jumlah maupun status
 * pemenuhan, jadi stok adalah angka yang dikelola petugas — bukan hasil
 * perhitungan.
 *
 * Kalau layar ini diam soal itu, petugas akan mengira stoknya menyusut sendiri
 * setiap ada permintaan, dan angka yang dipercaya orang justru angka yang tidak
 * pernah diperbarui. Karena itu keterangannya ditulis terbuka, dan penyesuaian
 * stok diberi tindakan tersendiri.
 *
 * Penyesuaian menerima SELISIH (+/-), bukan angka akhir: dua petugas yang
 * menyesuaikan bersamaan dengan angka akhir akan saling menimpa tanpa ada yang
 * sadar.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { SparePart, SparePartRequest } from '@/types';
import {
  PageHeader, Panel, Btn, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Wrench, Plus, Pencil, Trash2, RefreshCw, PackagePlus, PackageMinus, ClipboardList, ExternalLink, Package,
} from 'lucide-react';
import { motion } from 'framer-motion';

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminSparePartPage() {
  const [items, setItems] = useState<SparePart[]>([]);
  const [permintaan, setPermintaan] = useState<SparePartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<SparePart | null>(null);

  const [form, setForm] = useState({ name: '', stock: '0' });
  const [foto, setFoto] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stokItem, setStokItem] = useState<SparePart | null>(null);
  const [delta, setDelta] = useState('');

  const [mintaBuka, setMintaBuka] = useState(false);
  const [minta, setMinta] = useState({ spare_part_id: '', subject: '', follow_up_notes: '', memo_link: '' });

  const muat = async () => {
    const [a, b] = await Promise.all([
      adminFetch<SparePart[]>('/spare-parts'),
      adminFetch<SparePartRequest[]>('/spare-part-requests'),
    ]);
    setItems(Array.isArray(a.data) ? a.data : []);
    setPermintaan(Array.isArray(b.data) ? b.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const [a, b] = await Promise.all([
        adminFetch<SparePart[]>('/spare-parts'),
        adminFetch<SparePartRequest[]>('/spare-part-requests'),
      ]);
      if (batal) return;
      setItems(Array.isArray(a.data) ? a.data : []);
      setPermintaan(Array.isArray(b.data) ? b.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();

    return s ? items.filter((it) => it.name.toLowerCase().includes(s)) : items;
  }, [items, q]);

  const stats = useMemo(() => ({
    jenis: items.length,
    total: items.reduce((n, it) => n + it.stock, 0),
    habis: items.filter((it) => it.stock === 0).length,
    permintaan: permintaan.length,
  }), [items, permintaan]);

  const simpan = async () => {
    setSaving(true);

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('stock', String(Number(form.stock) || 0));
    if (foto) fd.append('photo', foto);

    const res = await adminUpload(editId ? `/spare-parts/${editId}` : '/spare-parts', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const simpanStok = async () => {
    if (!stokItem) return;

    const n = Number(delta);

    if (!Number.isInteger(n) || n === 0) {
      setToast({ text: 'Isi selisih penyesuaian dengan bilangan bulat selain nol.', kind: 'error' });

      return;
    }

    const res = await adminFetch(`/spare-parts/${stokItem.id}/stock`, { method: 'PUT', body: { delta: n } });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setStokItem(null);
      setDelta('');
      muat();
    }
  };

  const simpanPermintaan = async () => {
    const res = await adminFetch('/spare-part-requests', {
      method: 'POST',
      body: {
        spare_part_id: Number(minta.spare_part_id),
        subject: minta.subject,
        follow_up_notes: minta.follow_up_notes.trim() || null,
        memo_link: minta.memo_link.trim() || null,
      },
    });

    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setMintaBuka(false);
      setMinta({ spare_part_id: '', subject: '', follow_up_notes: '', memo_link: '' });
      muat();
    }
  };

  const hapusPermintaan = async (r: SparePartRequest) => {
    const res = await adminFetch(`/spare-part-requests/${r.id}`, { method: 'DELETE' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/spare-parts/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={Wrench}
        title="Suku Cadang"
        subtitle="Stok suku cadang dan permintaan pegawai"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn variant="ghost" onClick={() => setMintaBuka(true)}><ClipboardList className="w-4 h-4" /> Catat Permintaan</Btn>
            <Btn onClick={() => { setForm({ name: '', stock: '0' }); setFoto(null); setEditId(null); setOpen(true); }}>
              <Plus className="w-4 h-4" /> Tambah
            </Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Jenis Suku Cadang" value={stats.jenis} icon={Package} accent="#38bdf8" />
        <StatCard label="Total Unit" value={stats.total} icon={PackagePlus} accent="#34d399" />
        <StatCard label="Stok Habis" value={stats.habis} icon={PackageMinus} accent="#fb7185" hint="Perlu pengadaan" />
        <StatCard label="Permintaan Tercatat" value={stats.permintaan} icon={ClipboardList} accent="#a78bfa" />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Permintaan suku cadang <strong>tidak mengurangi stok secara otomatis</strong> — catatan
          permintaan tidak menyimpan jumlah barang. Sesuaikan stok lewat tindakan penyesuaian setiap
          barang benar-benar keluar, agar angka di layar ini tetap mewakili keadaan gudang.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Suku Cadang</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama suku cadang..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada suku cadang" hint="Tambahkan suku cadang beserta stok awalnya." />
        ) : (
          <Table head={['Suku Cadang', 'Stok', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell><span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.name}</span></Cell>
                <Cell>
                  <span className={`tabular-nums font-bold ${it.stock === 0 ? 'text-rose-300' : 'text-[var(--adm-fg)]'}`}>
                    {it.stock}
                  </span>
                  {it.stock === 0 && <span className="ml-2 text-[11px] text-rose-300">habis</span>}
                </Cell>
                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => { setStokItem(it); setDelta(''); }}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-emerald-500/20 text-[var(--adm-body)] hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Sesuaikan stok"
                    >
                      <PackagePlus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setForm({ name: it.name, stock: String(it.stock) }); setFoto(null); setEditId(it.id); setOpen(true); }}
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

      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Permintaan Tercatat</h2>
        </div>

        {loading ? (
          <Loading />
        ) : permintaan.length === 0 ? (
          <EmptyState text="Belum ada permintaan" hint="Catat permintaan pegawai agar kebutuhan suku cadang terdokumentasi." />
        ) : (
          <Table head={['Perihal', 'Suku Cadang', 'Pemohon', 'Nota Dinas', 'Tanggal', 'Aksi']}>
            {permintaan.map((r) => (
              <Row key={r.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{r.subject}</span>
                  {r.follow_up_notes && (
                    <span className="block text-[11px] text-[var(--adm-dim)]">{r.follow_up_notes}</span>
                  )}
                </Cell>
                <Cell>
                  {r.spare_part?.name ?? '—'}
                  {r.spare_part && (
                    <span className="block text-[11px] text-[var(--adm-dim)]">stok {r.spare_part.stock}</span>
                  )}
                </Cell>
                <Cell>{r.user?.name ?? '—'}</Cell>
                <Cell>
                  {r.memo_link ? (
                    <a
                      href={r.memo_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)]"
                    >
                      <ExternalLink className="w-3 h-3" /> Buka
                    </a>
                  ) : <span className="text-[var(--adm-dim)]">—</span>}
                </Cell>
                <Cell><span className="text-[var(--adm-body)] text-[11.5px]">{tgl(r.created_at)}</span></Cell>
                <Cell>
                  <button
                    onClick={() => hapusPermintaan(r)}
                    className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="Hapus permintaan"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Suku Cadang' : 'Tambah Suku Cadang'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Suku Cadang" required value={form.name} onChange={(v) => setForm({ ...form, name: String(v) })} />
          <Field label="Stok" required type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: String(v) })} />
          {editId && (
            <p className="-mt-2 text-[11.5px] text-amber-300">
              Mengubah stok di sini menimpa angkanya langsung. Untuk barang masuk atau keluar, pakai
              penyesuaian stok agar selisihnya terakumulasi dengan benar.
            </p>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)]">Foto</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
              <span className="flex-1 min-w-0 text-[12px] text-[var(--adm-muted)] truncate">{foto?.name ?? 'Opsional'}</span>
              <label className="text-[12px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)] cursor-pointer">
                Pilih
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={stokItem !== null}
        onClose={() => setStokItem(null)}
        title="Penyesuaian Stok"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setStokItem(null)}>Batal</Btn>
            <Btn onClick={simpanStok}>Simpan</Btn>
          </>
        }
      >
        {stokItem && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{stokItem.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">Stok sekarang: {stokItem.stock}</p>
            </div>

            <Field
              label="Selisih" required type="number"
              value={delta}
              placeholder="-3 untuk barang keluar, 12 untuk barang masuk"
              onChange={(v) => setDelta(String(v))}
            />

            {delta !== '' && Number.isInteger(Number(delta)) && Number(delta) !== 0 && (
              <p className="-mt-2 text-[12px] text-[var(--adm-accent)]">
                Stok menjadi <span className="font-bold tabular-nums">{stokItem.stock + Number(delta)}</span>
              </p>
            )}

            <p className="text-[11.5px] text-[var(--adm-muted)]">
              Yang diisi adalah SELISIH, bukan angka akhir. Dua petugas yang menyesuaikan bersamaan
              dengan angka akhir akan saling menimpa; dengan selisih, keduanya terakumulasi.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={mintaBuka}
        onClose={() => setMintaBuka(false)}
        title="Catat Permintaan Suku Cadang"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setMintaBuka(false)}>Batal</Btn>
            <Btn onClick={simpanPermintaan}>Simpan</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Suku Cadang" required type="select"
            options={items.map((it) => ({ value: String(it.id), label: `${it.name} (stok ${it.stock})` }))}
            value={minta.spare_part_id}
            onChange={(v) => setMinta({ ...minta, spare_part_id: String(v) })}
          />
          <Field label="Perihal" required value={minta.subject} onChange={(v) => setMinta({ ...minta, subject: String(v) })} />
          <Field label="Catatan Tindak Lanjut" type="textarea" rows={3} value={minta.follow_up_notes} onChange={(v) => setMinta({ ...minta, follow_up_notes: String(v) })} />
          <Field label="Tautan Nota Dinas" value={minta.memo_link} placeholder="https://..." onChange={(v) => setMinta({ ...minta, memo_link: String(v) })} />
          <p className="text-[11.5px] text-[var(--adm-muted)]">
            Mencatat permintaan tidak mengurangi stok. Sesuaikan stok tersendiri begitu barangnya
            benar-benar keluar.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={delItem ? `Suku cadang "${delItem.name}" akan dihapus permanen. Lanjutkan?` : ''}
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
