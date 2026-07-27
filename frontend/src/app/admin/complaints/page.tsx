'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Complaint } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import { MessageSquareWarning, RefreshCw, CheckCircle2, Clock, AlertTriangle, Reply, Mail, Phone, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Menunggu', color: '#fb7185' },
  in_progress: { label: 'Diproses', color: '#38bdf8' },
  resolved: { label: 'Selesai', color: '#34d399' },
  rejected: { label: 'Ditolak', color: '#94a3b8' },
};

export default function AdminComplaintsPage() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'submitted' | 'in_progress' | 'resolved'>('all');

  const [active, setActive] = useState<Complaint | null>(null);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Complaint[]>('/complaints');
    const raw: any = res.data;
    setItems(Array.isArray(raw) ? raw : raw?.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((c) => {
      const byTab = tab === 'all' || c.status === tab;
      const byQ = !q || [c.ticket_number, c.reporter_name, c.subject, c.category].some((v) => String(v ?? '').toLowerCase().includes(s));
      return byTab && byQ;
    });
  }, [items, q, tab]);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((c) => c.status === 'submitted').length,
    progress: items.filter((c) => c.status === 'in_progress').length,
    resolved: items.filter((c) => c.status === 'resolved').length,
  }), [items]);

  const openReply = (c: Complaint) => {
    setActive(c);
    setReply(c.admin_response ?? '');
    setNewStatus(c.status === 'submitted' ? 'in_progress' : 'resolved');
  };

  const submitReply = async () => {
    if (!active) return;
    setSaving(true);
    const res = await adminFetch(`/complaints/${active.id}/resolve`, {
      method: 'PUT',
      body: { status: newStatus, admin_response: reply },
    });
    setSaving(false);

    if (res.ok) {
      setActive(null);
      setToast({ text: 'Tanggapan berhasil dikirim', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

  return (
    <>
      <PageHeader
        icon={MessageSquareWarning}
        title="Manajemen Pengaduan Publik"
        subtitle="Tinjau dan tanggapi keluhan serta saran yang dikirim pengguna jasa bandara"
        action={<Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Pengaduan" value={stats.total} icon={MessageSquareWarning} accent="#fb7185" />
        <StatCard label="Menunggu Tanggapan" value={stats.pending} icon={AlertTriangle} accent="#fbbf24" />
        <StatCard label="Sedang Diproses" value={stats.progress} icon={Clock} accent="#38bdf8" />
        <StatCard label="Terselesaikan" value={stats.resolved} icon={CheckCircle2} accent="#34d399" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/8">
          <div className="flex gap-2 flex-wrap">
            {([['all', 'Semua'], ['submitted', 'Menunggu'], ['in_progress', 'Diproses'], ['resolved', 'Selesai']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${tab === v ? 'text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {tab === v && (
                  <motion.span layoutId="complaint-tab" className="absolute inset-0 rounded-lg bg-cyan-500/12 border border-cyan-400/30" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tiket / pelapor / subjek..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Tidak ada pengaduan" hint="Belum ada laporan masuk pada filter ini." />
        ) : (
          <Table head={['Tiket', 'Pelapor', 'Subjek', 'Kategori', 'Tanggal', 'Status', 'Aksi']}>
            {visible.map((c) => {
              const st = STATUS[c.status] ?? STATUS.submitted;
              return (
                <Row key={c.id}>
                  <Cell>
                    <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-cyan-300">
                      <Ticket className="w-3.5 h-3.5" /> {c.ticket_number}
                    </span>
                  </Cell>
                  <Cell className="max-w-[160px]">
                    <p className="font-semibold text-white text-[12px] truncate">{c.reporter_name}</p>
                    <p className="text-slate-500 text-[10.5px] truncate">{c.reporter_email}</p>
                  </Cell>
                  <Cell className="max-w-[260px]"><span className="truncate block">{c.subject}</span></Cell>
                  <Cell><Badge text={c.category} color="#a78bfa" /></Cell>
                  <Cell className="whitespace-nowrap">{fmt(c.created_at)}</Cell>
                  <Cell><Badge text={st.label} color={st.color} /></Cell>
                  <Cell>
                    <button
                      onClick={() => openReply(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 text-[11.5px] font-bold transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" /> Tanggapi
                    </button>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      {/* detail + reply */}
      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        wide
        title={`Pengaduan ${active?.ticket_number ?? ''}`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setActive(null)}>Tutup</Btn>
            <Btn onClick={submitReply} disabled={saving || !reply.trim()}>{saving ? 'Mengirim...' : 'Kirim Tanggapan'}</Btn>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            {/* reporter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Pelapor', value: active.reporter_name, icon: MessageSquareWarning },
                { label: 'Email', value: active.reporter_email, icon: Mail },
                { label: 'Telepon', value: active.reporter_phone || '-', icon: Phone },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="rounded-xl bg-[#0a1428] border border-white/8 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      <Icon className="w-3 h-3" /> {f.label}
                    </p>
                    <p className="text-[12px] text-slate-200 mt-1 truncate">{f.value}</p>
                  </div>
                );
              })}
            </div>

            {/* content */}
            <div className="rounded-xl bg-[#0a1428] border border-white/8 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-bold text-white text-[13.5px]">{active.subject}</p>
                <Badge text={active.category} color="#a78bfa" />
              </div>
              <p className="text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-line">{active.description}</p>
            </div>

            {active.admin_response && (
              <InfoNote>
                <span className="font-bold text-cyan-200">Tanggapan sebelumnya:</span> {active.admin_response}
              </InfoNote>
            )}

            {/* reply */}
            <Field
              label="Status Penanganan" type="select" value={newStatus} onChange={setNewStatus}
              options={[
                { value: 'in_progress', label: 'Sedang Diproses' },
                { value: 'resolved', label: 'Selesai' },
                { value: 'rejected', label: 'Ditolak' },
              ]}
            />
            <Field label="Tanggapan Resmi" required type="textarea" rows={5} value={reply} onChange={setReply} placeholder="Tuliskan tanggapan resmi untuk pelapor..." />
          </div>
        )}
      </Modal>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
