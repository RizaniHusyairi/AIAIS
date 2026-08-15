'use client';

/**
 * Peninjauan pengajuan slot penerbangan charter.
 *
 * Kolomnya disusun mengikuti cara petugas membaca: rute lebih dulu, lalu
 * pesawat, lalu jadwal. Jadwal berangkat dan tiba ditaruh bersebelahan pada
 * satu sel — keduanya hanya bermakna sebagai pasangan.
 *
 * `admin_comments` adalah catatan INTERNAL yang tidak ikut ke pemohon; medannya
 * diberi label tegas supaya tidak tertukar dengan `staff_notes` yang justru
 * dibaca pemohon.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import type { SlotSubmission, StatusPengajuan } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { PlaneTakeoff, Trash2, RefreshCw, Download, Gavel, Clock, CircleCheck, CircleX } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_PETUGAS: StatusPengajuan[] = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

const WARNA_STATUS: Record<string, string> = {
  'Diajukan': '#94a3b8',
  'Disetujui': '#34d399',
  'Ditolak': '#fb7185',
  'Revisi Diperlukan': '#fbbf24',
};

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

export default function AdminSlotPage() {
  const [items, setItems] = useState<SlotSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<SlotSubmission | null>(null);

  const [putus, setPutus] = useState<SlotSubmission | null>(null);
  const [status, setStatus] = useState<StatusPengajuan>('Disetujui');
  const [catatan, setCatatan] = useState('');
  const [internal, setInternal] = useState('');
  const [tautan, setTautan] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = async () => {
    const res = await adminFetch<SlotSubmission[]>('/slots');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<SlotSubmission[]>('/slots');
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
      it.aircraft_registration.toLowerCase().includes(s)
      || it.origin_airport.toLowerCase().includes(s)
      || it.destination_airport.toLowerCase().includes(s)
      || (it.user?.name ?? '').toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    baru: items.filter((it) => it.submission_status === 'Diajukan').length,
    disetujui: items.filter((it) => it.submission_status === 'Disetujui').length,
    ditolak: items.filter((it) => it.submission_status === 'Ditolak').length,
  }), [items]);

  const bukaKeputusan = (it: SlotSubmission) => {
    setPutus(it);
    setStatus(it.submission_status === 'Diajukan' ? 'Disetujui' : it.submission_status);
    setCatatan(it.staff_notes ?? '');
    setInternal(it.admin_comments ?? '');
    setTautan(it.reply_document_path ?? '');
  };

  const kurang = (): string => {
    if (status === 'Disetujui' && !tautan.trim()) return 'Tautan surat balasan wajib diisi bila pengajuan disetujui.';
    if (status !== 'Disetujui' && !catatan.trim()) return 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.';

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

    const res = await adminFetch(`/slots/${putus.id}/status`, {
      method: 'PUT',
      body: {
        submission_status: status,
        staff_notes: catatan.trim() || null,
        admin_comments: internal.trim() || null,
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

  const unduh = async (it: SlotSubmission, i: number) => {
    const res = await adminDownload(`/slots/${it.id}/documents/${i}`, `slot-${it.id}-${i + 1}`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/slots/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={PlaneTakeoff}
        title="Slot Charter"
        subtitle="Pengajuan slot penerbangan charter"
        action={<Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pengajuan" value={stats.total} icon={PlaneTakeoff} accent="#38bdf8" />
        <StatCard label="Menunggu Ditinjau" value={stats.baru} icon={Clock} accent="#fbbf24" />
        <StatCard label="Disetujui" value={stats.disetujui} icon={CircleCheck} accent="#34d399" />
        <StatCard label="Ditolak" value={stats.ditolak} icon={CircleX} accent="#fb7185" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pengajuan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari registrasi, kode bandara, pemohon..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengajuan slot" hint="Pengajuan yang dikirim lewat halaman akun warga muncul di sini." />
        ) : (
          <Table head={['Rute', 'Pesawat', 'Jadwal', 'Pemohon', 'Berkas', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px] tracking-wider">
                    {it.origin_airport} <span className="text-[var(--adm-dim)]">→</span> {it.destination_airport}
                  </span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.flight_type}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)]">{it.aircraft_registration}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.aircraft_type}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)] text-[11.5px]">{waktu(it.departure_schedule)}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">tiba {waktu(it.arrival_schedule)}</span>
                </Cell>

                <Cell>
                  {it.user ? (
                    <>
                      <span className="text-[var(--adm-body)]">{it.user.name}</span>
                      <span className="block text-[11px] text-[var(--adm-dim)]">{it.user.phone ?? it.user.email}</span>
                    </>
                  ) : <span className="text-[var(--adm-dim)]">—</span>}
                </Cell>

                <Cell>
                  {it.document_count === 0 ? (
                    <span className="text-[var(--adm-dim)]">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {Array.from({ length: it.document_count }, (_, i) => (
                        <button
                          key={i} onClick={() => unduh(it, i)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] text-[11px] font-bold transition-colors cursor-pointer"
                          title={`Unduh berkas ${i + 1}`}
                        >
                          <Download className="w-3 h-3" /> {i + 1}
                        </button>
                      ))}
                    </span>
                  )}
                </Cell>

                <Cell><Badge text={it.submission_status} color={WARNA_STATUS[it.submission_status] ?? '#94a3b8'} /></Cell>

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
        title="Keputusan Pengajuan Slot"
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
              <p className="text-[13px] font-bold text-[var(--adm-fg)] tracking-wider">
                {putus.origin_airport} → {putus.destination_airport}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {putus.aircraft_registration} · {putus.aircraft_type} · {putus.flight_type}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                Berangkat {waktu(putus.departure_schedule)} · Tiba {waktu(putus.arrival_schedule)}
              </p>
              {putus.flight_more && <p className="mt-2 text-[12px] text-[var(--adm-body)]">{putus.flight_more}</p>}
            </div>

            <Field
              label="Keputusan" required type="select"
              options={STATUS_PETUGAS.map((s) => ({ value: s, label: s }))}
              value={status}
              onChange={(v) => setStatus(v as StatusPengajuan)}
            />

            {status === 'Disetujui' ? (
              <Field
                label="Tautan Surat Balasan" required
                value={tautan} placeholder="https://..."
                onChange={(v) => setTautan(String(v))}
              />
            ) : (
              <Field
                label="Catatan untuk Pemohon" required type="textarea" rows={3}
                value={catatan}
                onChange={(v) => setCatatan(String(v))}
              />
            )}

            <Field
              label="Catatan Internal" type="textarea" rows={3}
              value={internal}
              placeholder="Hanya dibaca petugas."
              onChange={(v) => setInternal(String(v))}
            />
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Catatan internal TIDAK dikirim ke pemohon. Yang dibaca pemohon adalah catatan di atasnya.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Pengajuan slot ${delItem.origin_airport} → ${delItem.destination_airport} akan dihapus dari daftar. Catatannya tetap tersimpan di basis data sebagai jejak operasional. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
