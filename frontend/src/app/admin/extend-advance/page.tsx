'use client';

/**
 * Peninjauan Extend Advance.
 *
 * Yang membedakan layar ini dari peninjauan lain: pengajuan TANPA surat
 * pernyataan bertanda tangan tidak dapat diputuskan. Backend menolaknya, dan
 * di sini tombol putusannya pun dimatikan disertai alasan — supaya petugas
 * tahu sebelum menekan, bukan setelah ditolak.
 *
 * Alasannya bukan tata tertib berkas: pernyataan itulah yang membuat risiko
 * penerbangan di luar jam layanan ada yang memikul.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import type { ExtendAdvanceSubmission, StatusPengajuan } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Clock3, Trash2, RefreshCw, Download, Gavel, Clock, CircleCheck, FileSignature, Settings2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_PETUGAS: StatusPengajuan[] = ['Disetujui', 'Ditolak', 'Revisi Diperlukan'];

const WARNA_STATUS: Record<string, string> = {
  'Menunggu Dokumen Ditandatangani': '#a78bfa',
  'Diajukan': '#94a3b8',
  'Disetujui': '#34d399',
  'Ditolak': '#fb7185',
  'Revisi Diperlukan': '#fbbf24',
};

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminExtendAdvancePage() {
  const [items, setItems] = useState<ExtendAdvanceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<ExtendAdvanceSubmission | null>(null);

  const [putus, setPutus] = useState<ExtendAdvanceSubmission | null>(null);
  const [status, setStatus] = useState<StatusPengajuan>('Disetujui');
  const [catatan, setCatatan] = useState('');
  const [tautan, setTautan] = useState('');
  const [saving, setSaving] = useState(false);

  // Pengaturan teks pernyataan.
  const [aturBuka, setAturBuka] = useState(false);
  const [teks, setTeks] = useState('');

  const muat = async () => {
    const res = await adminFetch<ExtendAdvanceSubmission[]>('/extend-advance');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ExtendAdvanceSubmission[]>('/extend-advance');
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
      it.operator.toLowerCase().includes(s)
      || it.registration_and_flight_number.toLowerCase().includes(s)
      || it.pic_name.toLowerCase().includes(s)
      || (it.user?.name ?? '').toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    menungguTtd: items.filter((it) => it.submission_status === 'Menunggu Dokumen Ditandatangani').length,
    baru: items.filter((it) => it.submission_status === 'Diajukan').length,
    disetujui: items.filter((it) => it.submission_status === 'Disetujui').length,
  }), [items]);

  const bukaKeputusan = (it: ExtendAdvanceSubmission) => {
    setPutus(it);
    setStatus(it.submission_status === 'Diajukan' ? 'Disetujui' : (it.submission_status as StatusPengajuan));
    setCatatan(it.staff_notes ?? '');
    setTautan(it.reply_document_path ?? '');
  };

  const simpan = async () => {
    if (!putus) return;

    if (status === 'Disetujui' && !tautan.trim()) {
      setToast({ text: 'Tautan surat balasan wajib diisi bila pengajuan disetujui.', kind: 'error' });

      return;
    }

    if (status !== 'Disetujui' && !catatan.trim()) {
      setToast({ text: 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.', kind: 'error' });

      return;
    }

    setSaving(true);

    const res = await adminFetch(`/extend-advance/${putus.id}/status`, {
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

  const simpanTeks = async () => {
    const res = await adminFetch('/extend-advance/statement', {
      method: 'PUT',
      body: { statement_notes: teks },
    });

    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) setAturBuka(false);
  };

  const unduhTtd = async (it: ExtendAdvanceSubmission) => {
    const res = await adminDownload(`/extend-advance/${it.id}/signed`, `pernyataan-${it.id}.pdf`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/extend-advance/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={Clock3}
        title="Extend Advance"
        subtitle="Permohonan beroperasi di luar jam layanan bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => { setTeks(items[0]?.statement_notes ?? ''); setAturBuka(true); }}>
              <Settings2 className="w-4 h-4" /> Teks Pernyataan
            </Btn>
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pengajuan" value={stats.total} icon={Clock3} accent="#38bdf8" />
        <StatCard label="Menunggu Tanda Tangan" value={stats.menungguTtd} icon={FileSignature} accent="#a78bfa" hint="Belum masuk antrean" />
        <StatCard label="Menunggu Ditinjau" value={stats.baru} icon={Clock} accent="#fbbf24" />
        <StatCard label="Disetujui" value={stats.disetujui} icon={CircleCheck} accent="#34d399" />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Pengajuan yang belum memiliki surat pernyataan bertanda tangan Pilot In Command
          <strong> tidak dapat diputuskan</strong>. Pernyataan itulah yang membuat risiko penerbangan
          di luar jam layanan ada yang memikul.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pengajuan</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari operator, registrasi, PIC..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengajuan" hint="Pengajuan yang dikirim lewat halaman akun warga muncul di sini." />
        ) : (
          <Table head={['Penerbangan', 'Operator & PIC', 'Jadwal', 'Pernyataan', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.registration_and_flight_number}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.aircraft_type} · {it.route}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)]">{it.operator}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">PIC {it.pic_name}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)] text-[11.5px]">{tgl(it.flight_date)}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">EOBT {it.eobt} · AOBT {it.aobt}</span>
                </Cell>

                <Cell>
                  {it.has_signed_document ? (
                    <button
                      onClick={() => unduhTtd(it)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh
                    </button>
                  ) : (
                    <span className="text-amber-300 text-[11px] font-bold" title="Belum dapat diputuskan">
                      Belum ada
                    </span>
                  )}
                </Cell>

                <Cell><Badge text={it.submission_status} color={WARNA_STATUS[it.submission_status] ?? '#94a3b8'} /></Cell>

                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => bukaKeputusan(it)}
                      disabled={!it.has_signed_document}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] enabled:hover:bg-emerald-500/20 text-[var(--adm-body)] enabled:hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                      title={it.has_signed_document ? 'Putuskan' : 'Belum ada pernyataan bertanda tangan PIC'}
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
        title="Keputusan Extend Advance"
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
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{putus.registration_and_flight_number}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {putus.operator} · {putus.aircraft_type} · {putus.route}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {tgl(putus.flight_date)} · EOBT {putus.eobt} · AOBT {putus.aobt} · PIC {putus.pic_name}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">Tujuan: {putus.purpose_of_flight}</p>
            </div>

            {/* Bunyi yang BENAR-BENAR ditandatangani, bukan yang berlaku kini. */}
            {putus.statement_notes && (
              <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-muted)]">
                  Pernyataan yang ditandatangani
                </p>
                <p className="mt-1.5 text-[11.5px] text-[var(--adm-body)] leading-relaxed whitespace-pre-line">
                  {putus.statement_notes}
                </p>
              </div>
            )}

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
                label="Catatan untuk Pemohon" required type="textarea" rows={4}
                value={catatan}
                onChange={(v) => setCatatan(String(v))}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={aturBuka}
        onClose={() => setAturBuka(false)}
        title="Teks Surat Pernyataan"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAturBuka(false)}>Batal</Btn>
            <Btn onClick={simpanTeks}>Simpan</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field
            label="Bunyi Pernyataan" required type="textarea" rows={8}
            value={teks}
            onChange={(v) => setTeks(String(v))}
          />
          <p className="text-[11.5px] text-[var(--adm-muted)]">
            Perubahan hanya berlaku bagi pengajuan BARU. Pengajuan yang sudah dibuat tetap memakai
            bunyi lama — yang mengikat adalah yang benar-benar ditandatangani Pilot In Command.
            Teks ini merujuk NOTAM yang berlaku; jangan mengubahnya tanpa dasar resmi.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Pengajuan ${delItem.registration_and_flight_number} akan dihapus permanen beserta surat pernyataan bertanda tangannya. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
