'use client';

/**
 * Peninjauan enam jenis pengajuan layanan, satu halaman.
 *
 * Bentuknya mengikuti halaman kunjungan lapangan yang ditulis lebih dulu, dan
 * menegakkan dua syarat yang sama — menolak wajib disertai catatan, menyetujui
 * wajib melampirkan surat balasan. Lihat `SubmissionController::updateStatus`
 * untuk cacat v1 yang keduanya perbaiki.
 *
 * Jenis diambil dari lintasan; label dan daftar kolomnya dari
 * `/submission-types`, sehingga menambah jenis baru di backend tidak menuntut
 * halaman admin baru.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import { fetchApi } from '@/lib/api';
import type { SubmissionItem, SubmissionType, StatusPengajuan } from '@/types';
import { judul, jenis as jenisDari, tanggal } from '@/lib/submissions';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { ClipboardList, Trash2, RefreshCw, Download, Gavel, Clock, CircleCheck, CircleX } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_PETUGAS: StatusPengajuan[] = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

const WARNA_STATUS: Record<string, string> = {
  'Diajukan': '#94a3b8',
  'Disetujui': '#34d399',
  'Ditolak': '#fb7185',
  'Revisi Diperlukan': '#fbbf24',
};

export default function AdminPengajuanPage() {
  const slug = String(useParams().jenis ?? '');

  const [tipe, setTipe] = useState<SubmissionType | null>(null);
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<SubmissionItem | null>(null);

  const [putus, setPutus] = useState<SubmissionItem | null>(null);
  const [status, setStatus] = useState<StatusPengajuan>('Disetujui');
  const [catatan, setCatatan] = useState('');
  const [tautan, setTautan] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = async () => {
    const res = await adminFetch<SubmissionItem[]>(`/pengajuan/${slug}`);
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const [daftarTipe, daftarItem] = await Promise.all([
        fetchApi<SubmissionType[]>('/submission-types'),
        adminFetch<SubmissionItem[]>(`/pengajuan/${slug}`),
      ]);

      if (batal) return;

      setTipe((daftarTipe.success && daftarTipe.data ? daftarTipe.data : []).find((t) => t.slug === slug) ?? null);
      setItems(Array.isArray(daftarItem.data) ? daftarItem.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, [slug]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) =>
      judul(it, slug).toLowerCase().includes(s)
      || jenisDari(it, slug).toLowerCase().includes(s)
      || (it.user?.name ?? '').toLowerCase().includes(s));
  }, [items, q, slug]);

  const stats = useMemo(() => ({
    total: items.length,
    baru: items.filter((it) => it.submission_status === 'Diajukan').length,
    disetujui: items.filter((it) => it.submission_status === 'Disetujui').length,
    ditolak: items.filter((it) => it.submission_status === 'Ditolak').length,
  }), [items]);

  const bukaKeputusan = (it: SubmissionItem) => {
    setPutus(it);
    setStatus(it.submission_status === 'Diajukan' ? 'Disetujui' : it.submission_status);
    setCatatan(it.staff_notes ?? '');
    setTautan(it.reply_document_path ?? '');
  };

  const kurang = (): string => {
    if (status === 'Disetujui' && !tautan.trim()) {
      return 'Tautan surat balasan wajib diisi bila pengajuan disetujui.';
    }

    if (status !== 'Disetujui' && !catatan.trim()) {
      return 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.';
    }

    return '';
  };

  const simpan = async () => {
    if (!putus) return;

    const belum = kurang();

    if (belum) {
      setToast({ text: belum, kind: 'error' });

      return;
    }

    setSaving(true);

    const res = await adminFetch(`/pengajuan/${slug}/${putus.id}/status`, {
      method: 'PUT',
      body: {
        submission_status: status,
        staff_notes: catatan.trim() || null,
        reply_document_path: status === 'Disetujui' ? tautan.trim() : null,
      },
    });
    setSaving(false);

    if (res.ok) {
      setPutus(null);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const unduh = async (it: SubmissionItem, i: number) => {
    const res = await adminDownload(`/pengajuan/${slug}/${it.id}/documents/${i}`, `syarat-${slug}-${it.id}-${i + 1}`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/pengajuan/${slug}/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title={tipe?.label ?? 'Pengajuan Layanan'}
        subtitle="Pengajuan yang dikirim warga lewat halaman akun"
        action={<Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pengajuan" value={stats.total} icon={ClipboardList} accent="#38bdf8" />
        <StatCard label="Menunggu Ditinjau" value={stats.baru} icon={Clock} accent="#fbbf24" hint="Belum ada keputusan" />
        <StatCard label="Disetujui" value={stats.disetujui} icon={CircleCheck} accent="#34d399" />
        <StatCard label="Ditolak" value={stats.ditolak} icon={CircleX} accent="#fb7185" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pengajuan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari judul atau pemohon..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengajuan" hint="Pengajuan yang dikirim lewat halaman akun warga muncul di sini." />
        ) : (
          <Table head={[tipe?.title_label ?? 'Judul', 'Pemohon', tipe?.type_label ?? 'Jenis', 'Berkas', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{judul(it, slug)}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{tanggal(it.created_at)}</span>
                </Cell>

                <Cell>
                  {it.user ? (
                    <>
                      <span className="text-[var(--adm-body)]">{it.user.name}</span>
                      <span className="block text-[11px] text-[var(--adm-dim)]">{it.user.phone ?? it.user.email}</span>
                    </>
                  ) : (
                    <span className="text-[var(--adm-dim)]" title="Akun pemohon sudah tidak ada">—</span>
                  )}
                </Cell>

                <Cell>{jenisDari(it, slug)}</Cell>

                <Cell>
                  {it.document_count === 0 ? (
                    <span className="text-[var(--adm-dim)]">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {Array.from({ length: it.document_count }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => unduh(it, i)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] text-[11px] font-bold transition-colors cursor-pointer"
                          title={`Unduh berkas ${i + 1}`}
                        >
                          <Download className="w-3 h-3" /> {i + 1}
                        </button>
                      ))}
                    </span>
                  )}
                </Cell>

                <Cell>
                  <Badge text={it.submission_status} color={WARNA_STATUS[it.submission_status] ?? '#94a3b8'} />
                </Cell>

                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => bukaKeputusan(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-emerald-500/20 text-[var(--adm-body)] hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Putuskan"
                    >
                      <Gavel className="w-3 h-3" />
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

      <Modal
        open={putus !== null}
        onClose={() => setPutus(null)}
        title="Keputusan Pengajuan"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPutus(null)}>Batal</Btn>
            <Btn onClick={simpan} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Keputusan'}</Btn>
          </>
        }
      >
        {putus && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{judul(putus, slug)}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {jenisDari(putus, slug)}
                {putus.user && <> · {putus.user.name}</>}
              </p>
              <p className="mt-2 text-[12px] text-[var(--adm-body)] leading-relaxed whitespace-pre-line">
                {putus.description}
              </p>
            </div>

            <Field
              label="Keputusan" required type="select"
              options={STATUS_PETUGAS.map((s) => ({ value: s, label: s }))}
              value={status}
              onChange={(v) => setStatus(v as StatusPengajuan)}
            />

            {status === 'Disetujui' ? (
              <>
                <Field
                  label="Tautan Surat Balasan" required
                  value={tautan} placeholder="https://..."
                  onChange={(v) => setTautan(String(v))}
                />
                <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
                  Wajib diisi. Tanpa surat balasan, pemohon tidak punya apa pun yang dapat
                  ditunjukkan sebagai bukti persetujuan.
                </p>
              </>
            ) : (
              <>
                <Field
                  label="Catatan untuk Pemohon" required type="textarea" rows={4}
                  value={catatan}
                  placeholder="Sebutkan berkas atau keterangan yang perlu diperbaiki."
                  onChange={(v) => setCatatan(String(v))}
                />
                <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
                  Wajib diisi. Pemohon hanya dapat memperbaiki pengajuannya bila tahu apa yang kurang.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Pengajuan "${judul(delItem, slug)}" akan dihapus permanen beserta ${delItem.document_count} berkas syaratnya. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
