'use client';

/**
 * Manajemen Permohonan Informasi Publik (UU 14/2008).
 *
 * Berpasangan dengan halaman publik `/ppid/pengajuan-informasi`. Susunannya
 * mengikuti `admin/complaints` supaya petugas tidak perlu belajar dua pola.
 *
 * Dua hal khas halaman ini:
 *   1. **Tenggat.** UU 14/2008 memberi PPID 10 hari kerja untuk menjawab,
 *      dapat diperpanjang 7 hari kerja. Sisa waktunya ditonjolkan, dan yang
 *      lewat tenggat diberi tanda merah — angka itu hak hukum pemohon, bukan
 *      sekadar target internal.
 *   2. **Berkas syarat.** Scan KTP dan surat pernyataan tidak punya URL
 *      publik; keduanya diambil sebagai blob bertoken lewat `adminDownload`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import { InformationRequest } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger, InfoNote,
} from '@/components/admin/ui';
import {
  FileText, RefreshCw, CheckCircle2, Clock, AlertTriangle, Reply, Mail, Phone,
  Ticket, Download, MapPin, Briefcase, Hash, CalendarClock, ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Menunggu', color: '#fb7185' },
  in_progress: { label: 'Diproses', color: '#38bdf8' },
  fulfilled: { label: 'Dijawab', color: '#34d399' },
  rejected: { label: 'Ditolak', color: '#94a3b8' },
};

/** Sisa hari kerja menuju tenggat. Negatif berarti sudah lewat. */
function sisaHariKerja(due?: string | null): number | null {
  if (!due) return null;
  const target = new Date(due);
  if (Number.isNaN(target.getTime())) return null;

  const hari = new Date();
  hari.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const arah = target >= hari ? 1 : -1;
  let n = 0;
  const cursor = new Date(arah === 1 ? hari : target);
  const akhir = arah === 1 ? target : hari;

  while (cursor < akhir) {
    cursor.setDate(cursor.getDate() + 1);
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) n++;
  }

  return arah * n;
}

export default function AdminInformationRequestsPage() {
  const [items, setItems] = useState<InformationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'submitted' | 'in_progress' | 'fulfilled'>('all');

  const [active, setActive] = useState<InformationRequest | null>(null);
  const [reply, setReply] = useState('');
  const [link, setLink] = useState('');
  const [newStatus, setNewStatus] = useState('fulfilled');
  const [perpanjang, setPerpanjang] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<InformationRequest[]>('/information-requests');
    const raw: any = res.data;
    setItems(Array.isArray(raw) ? raw : raw?.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((r) => {
      const byTab = tab === 'all' || r.status === tab;
      const byQ = !q || [r.ticket_number, r.name, r.email, r.request_from, r.information_details]
        .some((v) => String(v ?? '').toLowerCase().includes(s));
      return byTab && byQ;
    });
  }, [items, q, tab]);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((r) => r.status === 'submitted').length,
    progress: items.filter((r) => r.status === 'in_progress').length,
    // Lewat tenggat DAN belum dijawab — inilah yang melanggar UU.
    telat: items.filter((r) => {
      const s = sisaHariKerja(r.due_date);
      return s !== null && s < 0 && (r.status === 'submitted' || r.status === 'in_progress');
    }).length,
  }), [items]);

  const openReply = (r: InformationRequest) => {
    setActive(r);
    setReply(r.admin_response ?? '');
    setLink(r.response_link ?? '');
    setNewStatus(r.status === 'submitted' ? 'in_progress' : 'fulfilled');
    setPerpanjang(false);
  };

  const submitReply = async () => {
    if (!active) return;
    setSaving(true);
    const res = await adminFetch(`/information-requests/${active.id}/respond`, {
      method: 'PUT',
      body: {
        status: newStatus,
        admin_response: reply,
        response_link: link.trim() || null,
        is_extended: perpanjang || active.is_extended,
      },
    });
    setSaving(false);

    if (res.ok) {
      setActive(null);
      setToast({ text: 'Tanggapan berhasil disimpan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const unduh = async (r: InformationRequest, jenis: 'ktp' | 'surat-pernyataan') => {
    const res = await adminDownload(
      `/information-requests/${r.id}/file/${jenis}`,
      `${r.ticket_number}-${jenis}`,
    );
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
  };

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  /** Lencana sisa waktu; merah bila sudah lewat tenggat. */
  const Tenggat = ({ r }: { r: InformationRequest }) => {
    const sisa = sisaHariKerja(r.due_date);
    const selesai = r.status === 'fulfilled' || r.status === 'rejected';

    if (sisa === null) return <span className="text-[var(--adm-dim)]">-</span>;
    if (selesai) return <span className="text-[var(--adm-muted)] text-[11.5px]">{fmt(r.due_date)}</span>;

    return (
      <span className="whitespace-nowrap">
        <span className={`text-[11.5px] font-bold ${sisa < 0 ? 'text-rose-400' : sisa <= 3 ? 'text-amber-300' : 'text-[var(--adm-body)]'}`}>
          {sisa < 0 ? `Lewat ${Math.abs(sisa)} hari kerja` : `${sisa} hari kerja lagi`}
        </span>
        <span className="block text-[var(--adm-dim)] text-[10.5px]">
          {fmt(r.due_date)}{r.is_extended && ' · diperpanjang'}
        </span>
      </span>
    );
  };

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Permohonan Informasi Publik"
        subtitle="Tinjau dan jawab permohonan warga sesuai UU 14/2008 — batas jawaban 10 hari kerja"
        action={<Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Permohonan" value={stats.total} icon={FileText} accent="#38bdf8" />
        <StatCard label="Menunggu Ditinjau" value={stats.pending} icon={AlertTriangle} accent="#fbbf24" />
        <StatCard label="Sedang Diproses" value={stats.progress} icon={Clock} accent="#a78bfa" />
        <StatCard label="Lewat Tenggat" value={stats.telat} icon={CalendarClock} accent="#fb7185" />
      </motion.div>

      {stats.telat > 0 && (
        <InfoNote>
          <span className="font-bold text-rose-300">{stats.telat} permohonan sudah melewati batas 10 hari kerja</span>
          {' '}dan belum dijawab. UU 14/2008 Pasal 22 mewajibkan PPID menjawab dalam tenggat itu,
          atau memberitahukan perpanjangan 7 hari kerja secara tertulis.
        </InfoNote>
      )}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <div className="flex gap-2 flex-wrap">
            {([['all', 'Semua'], ['submitted', 'Menunggu'], ['in_progress', 'Diproses'], ['fulfilled', 'Dijawab']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${tab === v ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-muted)] hover:text-[var(--adm-body)]'}`}
              >
                {tab === v && (
                  <motion.span layoutId="inforeq-tab" className="absolute inset-0 rounded-lg bg-cyan-500/12 border border-cyan-400/30" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tiket / pemohon / rincian..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Tidak ada permohonan" hint="Belum ada permohonan informasi pada filter ini." />
        ) : (
          <Table head={['Tiket', 'Pemohon', 'Rincian Diminta', 'Masuk', 'Batas Jawaban', 'Status', 'Aksi']}>
            {visible.map((r) => {
              const st = STATUS[r.status] ?? STATUS.submitted;
              return (
                <Row key={r.id}>
                  <Cell>
                    <span className="flex items-center gap-1.5 font-mono text-[11.5px] font-bold text-[var(--adm-accent)] whitespace-nowrap">
                      <Ticket className="w-3.5 h-3.5" /> {r.ticket_number}
                    </span>
                  </Cell>
                  <Cell className="max-w-[170px]">
                    <p className="font-semibold text-[var(--adm-fg)] text-[12px] truncate">{r.name}</p>
                    <p className="text-[var(--adm-dim)] text-[10.5px] truncate">{r.request_from}</p>
                  </Cell>
                  <Cell className="max-w-[280px]"><span className="truncate block">{r.information_details}</span></Cell>
                  <Cell className="whitespace-nowrap">{fmt(r.created_at)}</Cell>
                  <Cell><Tenggat r={r} /></Cell>
                  <Cell><Badge text={st.label} color={st.color} /></Cell>
                  <Cell>
                    <button
                      onClick={() => openReply(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-[var(--adm-accent)] hover:bg-cyan-500/25 text-[11.5px] font-bold transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" /> Tinjau
                    </button>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        wide
        title={`Permohonan ${active?.ticket_number ?? ''}`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setActive(null)}>Tutup</Btn>
            <Btn onClick={submitReply} disabled={saving || !reply.trim()}>
              {saving ? 'Menyimpan...' : 'Simpan Tanggapan'}
            </Btn>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            {/* Identitas pemohon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[
                { label: 'Nama Pemohon', value: active.name, icon: FileText },
                { label: 'Email', value: active.email, icon: Mail },
                { label: 'Telepon', value: active.phone, icon: Phone },
                { label: 'Pekerjaan', value: active.occupation, icon: Briefcase },
                { label: 'NPWP', value: active.npwp, icon: Hash },
                { label: 'Alamat', value: active.address, icon: MapPin },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">
                      <Icon className="w-3 h-3" /> {f.label}
                    </p>
                    <p className="text-[12px] text-[var(--adm-body)] mt-1 break-words">{f.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Berkas syarat */}
            <div className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">
                Berkas Syarat
              </p>
              <p className="mt-1 text-[11px] text-[var(--adm-muted)] leading-relaxed">
                Berkas tersimpan pada penyimpanan tertutup dan tidak memiliki alamat publik.
                Perlakukan sebagai data pribadi.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => unduh(active, 'ktp')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--adm-hover)] border border-[var(--adm-line)] text-[var(--adm-body)] hover:bg-[var(--adm-hover)] text-[11.5px] font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Scan KTP
                </button>
                <button
                  onClick={() => unduh(active, 'surat-pernyataan')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--adm-hover)] border border-[var(--adm-line)] text-[var(--adm-body)] hover:bg-[var(--adm-hover)] text-[11.5px] font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Surat Pernyataan
                </button>
              </div>
            </div>

            {/* Isi permohonan */}
            <div className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">Rincian Informasi yang Diminta</p>
                <p className="mt-1 text-[12.5px] text-[var(--adm-body)] leading-relaxed whitespace-pre-line">{active.information_details}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">Tujuan Penggunaan</p>
                <p className="mt-1 text-[12.5px] text-[var(--adm-body)] leading-relaxed whitespace-pre-line">{active.information_purpose}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">Cara Memperoleh</p>
                  <p className="mt-1 text-[12px] text-[var(--adm-body)]">{active.obtain_method}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--adm-dim)] font-bold">Cara Mendapat Salinan</p>
                  <p className="mt-1 text-[12px] text-[var(--adm-body)]">{active.copy_method}</p>
                </div>
              </div>
            </div>

            {/* Tenggat */}
            <InfoNote>
              Masuk {fmt(active.created_at)} · batas jawaban <span className="font-bold text-[var(--adm-accent)]">{fmt(active.due_date)}</span>
              {active.is_extended && ' (sudah diperpanjang 7 hari kerja)'}.
              {(() => {
                const s = sisaHariKerja(active.due_date);
                if (s === null || active.status === 'fulfilled' || active.status === 'rejected') return null;
                return s < 0
                  ? <span className="font-bold text-rose-300"> Sudah lewat {Math.abs(s)} hari kerja.</span>
                  : <span> Tersisa {s} hari kerja.</span>;
              })()}
            </InfoNote>

            {active.admin_response && (
              <InfoNote>
                <span className="font-bold text-[var(--adm-accent)]">Tanggapan sebelumnya:</span> {active.admin_response}
              </InfoNote>
            )}

            {/* Tanggapan */}
            <Field
              label="Status Penanganan" type="select" value={newStatus} onChange={setNewStatus}
              options={[
                { value: 'in_progress', label: 'Sedang Diproses' },
                { value: 'fulfilled', label: 'Dijawab / Informasi Diberikan' },
                { value: 'rejected', label: 'Ditolak (wajib disertai alasan)' },
              ]}
            />

            <Field
              label="Tanggapan Resmi" required type="textarea" rows={5} value={reply} onChange={setReply}
              placeholder="Tuliskan jawaban resmi untuk pemohon. Bila ditolak, sebutkan dasar pengecualiannya."
            />

            <Field
              label="Tautan Dokumen Jawaban" type="text" value={link} onChange={setLink}
              placeholder="https://... (opsional)"
            />

            {!active.is_extended && (
              <label className="flex items-start gap-2.5 rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perpanjang}
                  onChange={(e) => setPerpanjang(e.target.checked)}
                  className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <span className="text-[12px] text-[var(--adm-body)] leading-relaxed">
                  Perpanjang tenggat <span className="font-bold text-[var(--adm-fg)]">7 hari kerja</span>{' '}
                  sesuai UU 14/2008 Pasal 22 ayat (7). Pemohon melihat tanggal baru ini saat melacak tiketnya.
                </span>
              </label>
            )}

            {active.response_link && (
              <a
                href={active.response_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka dokumen jawaban tersimpan
              </a>
            )}
          </div>
        )}
      </Modal>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
