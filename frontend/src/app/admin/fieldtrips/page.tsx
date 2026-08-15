'use client';

/**
 * Peninjauan pengajuan kunjungan lapangan.
 *
 * DUA HAL YANG DITEGAKKAN DI LAYAR INI, keduanya memperbaiki cacat v1 yang
 * penjaganya tidak pernah menyala (lihat FieldTripController::updateStatus):
 *
 *  1. **Menolak atau meminta revisi wajib disertai catatan.** Penolakan kosong
 *     tidak dapat ditindaklanjuti pemohon — ia hanya tahu ditolak, tidak tahu
 *     apa yang harus diperbaiki, dan akan mengajukan ulang dengan kekurangan
 *     yang sama.
 *  2. **Menyetujui wajib melampirkan tautan surat balasan.** Tanpa itu status
 *     "Disetujui" tidak membawa apa pun yang bisa dibawa pemohon ke lapangan.
 *
 * Keduanya diperiksa pula di sini supaya petugas tahu sebelum menekan Simpan,
 * bukan sesudah permintaannya ditolak backend.
 *
 * Berkas syarat diunduh sebagai blob lewat `adminDownload` — isinya surat
 * berkop instansi, dan cakramnya privat tanpa URL publik.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import type { FieldTrip, StatusPengajuan } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import {
  ClipboardList, Trash2, RefreshCw, Download, Gavel, Clock, CircleCheck, CircleX,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_PETUGAS: StatusPengajuan[] = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

const WARNA_STATUS: Record<string, string> = {
  'Diajukan': '#94a3b8',
  'Disetujui': '#34d399',
  'Ditolak': '#fb7185',
  'Revisi Diperlukan': '#fbbf24',
};

export default function AdminFieldTripPage() {
  const [items, setItems] = useState<FieldTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<FieldTrip | null>(null);

  // Keputusan yang sedang disusun.
  const [putus, setPutus] = useState<FieldTrip | null>(null);
  const [status, setStatus] = useState<StatusPengajuan>('Disetujui');
  const [catatan, setCatatan] = useState('');
  const [tautan, setTautan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<FieldTrip[]>('/fieldtrips');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<FieldTrip[]>('/fieldtrips');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) =>
      it.fieldtrip_name.toLowerCase().includes(s)
      || it.fieldtrip_type.toLowerCase().includes(s)
      || (it.user?.name ?? '').toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    baru: items.filter((it) => it.submission_status === 'Diajukan').length,
    disetujui: items.filter((it) => it.submission_status === 'Disetujui').length,
    ditolak: items.filter((it) => it.submission_status === 'Ditolak').length,
  }), [items]);

  const bukaKeputusan = (it: FieldTrip) => {
    setPutus(it);
    setStatus(it.submission_status === 'Diajukan' ? 'Disetujui' : it.submission_status);
    setCatatan(it.staff_notes ?? '');
    setTautan(it.reply_document_path ?? '');
  };

  /** Syarat yang belum terpenuhi, atau string kosong bila sudah boleh disimpan. */
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

    const res = await adminFetch(`/fieldtrips/${putus.id}/status`, {
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
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const unduh = async (it: FieldTrip, i: number) => {
    const res = await adminDownload(`/fieldtrips/${it.id}/documents/${i}`, `syarat-${it.id}-${i + 1}`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/fieldtrips/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Kunjungan Lapangan"
        subtitle="Pengajuan field trip dari sekolah, perguruan tinggi, dan instansi"
        action={<Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
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
          <SearchBox value={q} onChange={setQ} placeholder="Cari kegiatan atau pemohon..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengajuan" hint="Pengajuan yang dikirim lewat halaman akun warga muncul di sini." />
        ) : (
          <Table head={['Kegiatan', 'Pemohon', 'Jenis', 'Berkas', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.fieldtrip_name}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">
                    {new Date(it.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
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

                <Cell>{it.fieldtrip_type}</Cell>

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
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{putus.fieldtrip_name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {putus.fieldtrip_type}
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
                  value={tautan}
                  placeholder="https://..."
                  onChange={(v) => setTautan(String(v))}
                />
                <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
                  Wajib diisi. Tanpa surat balasan, pemohon tidak punya apa pun yang dapat
                  ditunjukkan saat tiba di bandara.
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
                  Wajib diisi. Pemohon hanya dapat memperbaiki pengajuannya bila tahu apa yang
                  kurang.
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
            ? `Pengajuan "${delItem.fieldtrip_name}" akan dihapus permanen beserta ${delItem.document_count} berkas syaratnya. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
