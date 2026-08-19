'use client';

/**
 * Helpdesk — chat dan pengaduan dalam satu halaman.
 *
 * Sebelumnya halaman ini hanya melayani chat meski namanya "Pengaduan", dan
 * modul Complaint beserta seluruh endpoint-nya tidak punya antarmuka sama
 * sekali: pengaduan yang masuk tidak akan pernah terlihat petugas. Tab kedua
 * di bawah menutup lubang itu.
 *
 * Catatan penting soal data: `GET /admin/chat` kini TIDAK lagi memuat seluruh
 * pesan tiap percakapan — hanya pesan terakhir dan jumlah yang belum dibaca.
 * Isi lengkapnya diambil `GET /admin/chat/{id}` saat satu percakapan dibuka.
 * Bentuk lama memuat semua pesan dari semua percakapan setiap lima detik.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { ChatThread, Complaint, RatingSummary } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, StatCard, Table, Row, Cell, SearchBox, stagger,
} from '@/components/admin/ui';
import {
  MessageSquare, RefreshCw, CheckCircle2, Clock, AlertTriangle, Send, User,
  Headphones, Search, MessageCircle, Trash2, Star, FileWarning, Paperclip,
  Mail, Phone, ExternalLink, Reply,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_META: Record<string, { label: string; color: string }> = {
  open: { label: 'Menunggu Balasan', color: '#fbbf24' },
  active: { label: 'Sedang Berlangsung', color: '#38bdf8' },
  resolved: { label: 'Selesai', color: '#34d399' },
  closed: { label: 'Ditutup', color: '#94a3b8' },
  submitted: { label: 'Baru Masuk', color: '#38bdf8' },
  in_progress: { label: 'Ditindaklanjuti', color: '#fbbf24' },
  rejected: { label: 'Ditolak', color: '#fb7185' },
};

const CANNED_RESPONSES = [
  'Terima kasih atas masukan/kritik Anda. Kami telah menyampaikan laporan ini ke unit teknis terkait untuk ditindaklanjuti.',
  'Informasi penerbangan perintis dapat diakses melalui kontak agen perintis yang tertera pada media sosial resmi kami.',
  'Terima kasih telah menghubungi Customer Service Bandara A.P.T. Pranoto Samarinda. Ada hal lain yang bisa kami bantu?',
  'Layanan parkir inap 24 jam beroperasi setiap hari dengan tarif Rp75.000/24 jam dilengkapi gratis shuttle car.',
];

const jam = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

const tanggal = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type Tab = 'chat' | 'complaint';

export default function AdminHelpdeskPage() {
  const [tab, setTab] = useState<Tab>('chat');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [rating, setRating] = useState<RatingSummary | null>(null);

  /* ---------------- chat ---------------- */
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [q, setQ] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'open' | 'active' | 'resolved'>('all');

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [hapusChat, setHapusChat] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- pengaduan ---------------- */
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [qAduan, setQAduan] = useState('');
  const [aduanTerbuka, setAduanTerbuka] = useState<Complaint | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [statusAduan, setStatusAduan] = useState<'in_progress' | 'resolved' | 'rejected'>('resolved');
  const [menyimpanAduan, setMenyimpanAduan] = useState(false);
  const [hapusAduan, setHapusAduan] = useState<number | null>(null);

  /* ---------------- pemuatan ---------------- */

  const loadThreads = async () => {
    const res = await adminFetch<ChatThread[]>('/chat');
    setThreads(Array.isArray(res.data) ? res.data : []);
    setLoadingThreads(false);
  };

  const loadComplaints = async () => {
    const res = await adminFetch<Complaint[]>('/complaints');
    setComplaints(Array.isArray(res.data) ? res.data : []);
    setLoadingComplaints(false);
  };

  const loadRating = async () => {
    const res = await adminFetch<RatingSummary>('/ratings/summary');
    if (res.ok && res.data) setRating(res.data);
  };

  /** Isi lengkap satu percakapan; daftar hanya membawa pesan terakhir. */
  const bukaThread = async (t: ChatThread) => {
    setActiveThread(t);
    setReplyText('');

    const res = await adminFetch<ChatThread>(`/chat/${t.id}`);
    if (!res.ok || !res.data) return;

    setActiveThread(res.data);

    // Membuka percakapan menandai pesan pengunjung terbaca di server; lencana
    // pada daftar dinolkan sekarang juga agar tidak menunggu denyut berikutnya.
    setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, unread_count: 0 } : x)));
  };

  const muatSemua = () => {
    loadThreads();
    loadComplaints();
    loadRating();
    if (activeThread) bukaThread(activeThread);
  };

  useEffect(() => {
    loadThreads();
    loadComplaints();
    loadRating();
  }, []);

  // Denyut hanya menyegarkan DAFTAR; percakapan yang sedang dibuka ikut
  // disegarkan agar balasan pengunjung muncul tanpa memuat ulang halaman.
  useEffect(() => {
    const t = setInterval(() => {
      loadThreads();
      if (activeThread) {
        adminFetch<ChatThread>(`/chat/${activeThread.id}`).then((res) => {
          if (res.ok && res.data) setActiveThread(res.data);
        });
      }
    }, 8000);
    return () => clearInterval(t);
  }, [activeThread?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length]);

  /* ---------------- aksi chat ---------------- */

  const kirimBalasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim() || sending) return;

    setSending(true);
    const res = await adminFetch<ChatThread>(`/chat/${activeThread.id}/reply`, {
      method: 'POST',
      body: { message: replyText.trim(), status: activeThread.status === 'open' ? 'active' : activeThread.status },
    });
    setSending(false);

    if (res.ok && res.data) {
      setReplyText('');
      setActiveThread(res.data);
      setToast({ text: 'Tanggapan berhasil dikirim', kind: 'success' });
      loadThreads();
    } else {
      setToast({ text: res.message || 'Gagal mengirim tanggapan', kind: 'error' });
    }
  };

  const ubahStatus = async (status: string) => {
    if (!activeThread) return;

    const res = await adminFetch<ChatThread>(`/chat/${activeThread.id}/status`, {
      method: 'PUT',
      body: { status },
    });

    if (res.ok && res.data) {
      setActiveThread({ ...activeThread, status: res.data.status });
      setToast({ text: `Status diubah ke ${STATUS_META[status]?.label ?? status}`, kind: 'success' });
      loadThreads();
    }
  };

  const jalankanHapusChat = async () => {
    if (hapusChat == null) return;
    const res = await adminFetch(`/chat/${hapusChat}`, { method: 'DELETE' });
    setHapusChat(null);

    if (res.ok) {
      if (activeThread?.id === hapusChat) setActiveThread(null);
      setToast({ text: 'Percakapan dihapus', kind: 'success' });
      loadThreads();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /* ---------------- aksi pengaduan ---------------- */

  const bukaAduan = (c: Complaint) => {
    setAduanTerbuka(c);
    setTanggapan(c.admin_response ?? '');
    setStatusAduan(c.status === 'submitted' ? 'in_progress' : (c.status as 'in_progress' | 'resolved' | 'rejected'));
  };

  const simpanAduan = async () => {
    if (!aduanTerbuka) return;

    if (!tanggapan.trim()) {
      setToast({ text: 'Tanggapan wajib diisi sebelum status diubah.', kind: 'error' });
      return;
    }

    setMenyimpanAduan(true);
    const res = await adminFetch<Complaint>(`/complaints/${aduanTerbuka.id}/resolve`, {
      method: 'PUT',
      body: { status: statusAduan, admin_response: tanggapan.trim() },
    });
    setMenyimpanAduan(false);

    if (res.ok) {
      setAduanTerbuka(null);
      setToast({ text: 'Pengaduan berhasil diperbarui', kind: 'success' });
      loadComplaints();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const jalankanHapusAduan = async () => {
    if (hapusAduan == null) return;
    const res = await adminFetch(`/complaints/${hapusAduan}`, { method: 'DELETE' });
    setHapusAduan(null);

    if (res.ok) {
      setToast({ text: 'Pengaduan dihapus', kind: 'success' });
      loadComplaints();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /* ---------------- turunan ---------------- */

  const visibleThreads = useMemo(() => {
    const s = q.toLowerCase();
    return threads.filter((t) => {
      const cocokTab = statusTab === 'all' || t.status === statusTab;
      const cocokQ = !q || [t.ticket_number, t.visitor_name, t.subject, t.category]
        .some((v) => String(v ?? '').toLowerCase().includes(s));
      return cocokTab && cocokQ;
    });
  }, [threads, q, statusTab]);

  const visibleComplaints = useMemo(() => {
    const s = qAduan.toLowerCase();
    return complaints.filter((c) => !qAduan || [c.ticket_number, c.reporter_name, c.subject, c.category]
      .some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [complaints, qAduan]);

  const stats = useMemo(() => ({
    total: threads.length + complaints.length,
    pending: threads.filter((t) => t.status === 'open').length
      + complaints.filter((c) => c.status === 'submitted').length,
    active: threads.filter((t) => t.status === 'active').length
      + complaints.filter((c) => c.status === 'in_progress').length,
    resolved: threads.filter((t) => t.status === 'resolved').length
      + complaints.filter((c) => c.status === 'resolved').length,
  }), [threads, complaints]);

  /* ================================================================ */

  return (
    <>
      <Toast msg={toast} onDone={() => setToast(null)} />

      <PageHeader
        icon={Headphones}
        title="Helpdesk Pusat Bantuan"
        subtitle="Percakapan langsung dan pengaduan resmi dari pengunjung bandara"
        action={
          <Btn variant="ghost" onClick={muatSemua}>
            <RefreshCw className="w-4 h-4" /> Muat Ulang
          </Btn>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Total Tiket" value={stats.total} icon={MessageSquare} accent="#3b82f6" />
        <StatCard label="Menunggu" value={stats.pending} icon={AlertTriangle} accent="#fbbf24" />
        <StatCard label="Ditangani" value={stats.active} icon={Clock} accent="#38bdf8" />
        <StatCard label="Selesai" value={stats.resolved} icon={CheckCircle2} accent="#34d399" />
        {/* Rata-rata kepuasan; '—' bila belum ada satu pun penilaian —
            bukan nol, karena nol berarti "dinilai buruk". */}
        <StatCard
          label="Kepuasan (SKM)"
          value={rating?.average != null ? `${rating.average.toFixed(2)} / 5` : '—'}
          icon={Star}
          accent="#f59e0b"
          hint={rating ? `${rating.total} penilaian` : undefined}
        />
      </motion.div>

      {/* pemilih tab */}
      <div className="flex gap-1 bg-[var(--adm-inset)] p-1 rounded-xl border border-[var(--adm-line)] mt-4 w-fit">
        {([
          { id: 'chat' as Tab, label: 'Chat', icon: MessageCircle, count: threads.length },
          { id: 'complaint' as Tab, label: 'Pengaduan', icon: FileWarning, count: complaints.length },
        ]).map((t) => {
          const on = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                on ? 'bg-blue-600 text-white' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${on ? 'bg-[var(--adm-hover)]' : 'bg-[var(--adm-hover)]'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============ TAB CHAT ============ */}
      {tab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px] mt-4">
          <Panel className="lg:col-span-5 flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-[var(--adm-line)] space-y-3 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--adm-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari tiket, nama, atau topik..."
                  className="w-full pl-9 pr-4 py-2 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl text-xs text-[var(--adm-body)] placeholder-[var(--adm-dim)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-1 bg-[var(--adm-inset)] p-1 rounded-xl border border-[var(--adm-line)] overflow-x-auto no-scrollbar">
                {(['all', 'open', 'active', 'resolved'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStatusTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-1 text-center cursor-pointer ${
                      statusTab === t ? 'bg-blue-600 text-white' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
                    }`}
                  >
                    {t === 'all' ? 'Semua' : t === 'open' ? 'Menunggu' : t === 'active' ? 'Berlangsung' : 'Selesai'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--adm-line)]">
              {loadingThreads && threads.length === 0 ? (
                <Loading />
              ) : visibleThreads.length > 0 ? (
                visibleThreads.map((t) => {
                  const dipilih = activeThread?.id === t.id;
                  // Dari `withCount` di backend, bukan lagi dari memindai
                  // seluruh pesan yang dulu ikut terkirim.
                  const belumDibaca = (t.unread_count ?? 0) > 0;

                  return (
                    <div
                      key={t.id}
                      className={`w-full transition-colors flex items-start gap-3 relative ${
                        dipilih ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-[var(--adm-hover)]'
                      }`}
                    >
                      <button onClick={() => bukaThread(t)} className="flex-1 text-left p-4 flex items-start gap-3 min-w-0 cursor-pointer">
                        <div className="w-9 h-9 rounded-xl bg-[var(--adm-inset)] text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 border border-[var(--adm-line)]">
                          {t.visitor_name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold text-blue-400">{t.ticket_number}</span>
                            <span className="text-[10px] text-[var(--adm-dim)]">{jam(t.last_activity_at)}</span>
                          </div>

                          <h4 className="font-bold text-xs text-[var(--adm-body)] truncate mt-0.5">{t.subject}</h4>

                          {t.last_message && (
                            <p className="text-[11px] text-[var(--adm-dim)] truncate mt-0.5">
                              {t.last_message.sender_type === 'admin' ? 'Anda: ' : ''}{t.last_message.message}
                            </p>
                          )}

                          <p className="text-[11px] text-[var(--adm-muted)] truncate mt-0.5">
                            {t.visitor_name} • <span className="text-[var(--adm-dim)]">{t.category}</span>
                          </p>
                        </div>

                        {belumDibaca && (
                          <span
                            className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-1 text-[10px] font-black text-[var(--adm-fg)] tabular-nums"
                            title={`${t.unread_count} pesan belum dibaca`}
                          >
                            {t.unread_count}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setHapusChat(t.id)}
                        title="Hapus percakapan"
                        className="p-2 mr-2 mt-3 rounded-lg text-[var(--adm-dim)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <EmptyState text="Tidak ada percakapan" hint="Ubah tab filter atau kata kunci pencarian." />
              )}
            </div>
          </Panel>

          <Panel className="lg:col-span-7 flex flex-col overflow-hidden h-full">
            {activeThread ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[var(--adm-line)] flex items-start justify-between gap-3 bg-[var(--adm-inset)] flex-shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/60">
                        {activeThread.ticket_number}
                      </span>
                      <Badge
                        text={STATUS_META[activeThread.status]?.label ?? activeThread.status}
                        color={STATUS_META[activeThread.status]?.color}
                      />
                      <span className="text-xs text-[var(--adm-muted)]">• {activeThread.category}</span>
                    </div>

                    <h3 className="font-bold text-sm text-[var(--adm-fg)] mt-1 truncate">{activeThread.subject}</h3>

                    {/* Kontak pengunjung hanya tampil di panel petugas —
                        endpoint publik tidak pernah mengirimkannya. */}
                    <p className="text-xs text-[var(--adm-muted)] mt-0.5 flex flex-wrap items-center gap-x-3">
                      <span className="font-semibold text-[var(--adm-body)]">{activeThread.visitor_name}</span>
                      {activeThread.visitor_phone && (
                        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{activeThread.visitor_phone}</span>
                      )}
                      {activeThread.visitor_email && (
                        <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{activeThread.visitor_email}</span>
                      )}
                    </p>
                  </div>

                  <select
                    value={activeThread.status}
                    onChange={(e) => ubahStatus(e.target.value)}
                    className="bg-[var(--adm-inset)] border border-[var(--adm-line)] text-[var(--adm-body)] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-semibold flex-shrink-0 cursor-pointer"
                  >
                    <option value="open">Menunggu</option>
                    <option value="active">Berlangsung</option>
                    <option value="resolved">Selesai</option>
                    <option value="closed">Ditutup</option>
                  </select>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[var(--adm-bg)]">
                  {activeThread.messages && activeThread.messages.length > 0 ? (
                    activeThread.messages.map((msg) => {
                      const dariPetugas = msg.sender_type === 'admin';
                      return (
                        <div key={msg.id} className={`flex items-end gap-2.5 ${dariPetugas ? 'justify-end' : 'justify-start'}`}>
                          {!dariPetugas && (
                            <div className="w-7 h-7 rounded-full bg-[var(--adm-hover)] text-[var(--adm-body)] flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div
                            className={`max-w-[80%] rounded-2xl p-3.5 text-xs space-y-1 ${
                              dariPetugas
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-[var(--adm-inset)] border border-[var(--adm-line)] text-[var(--adm-body)] rounded-bl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 pb-0.5 border-b border-[var(--adm-line)]">
                              <span className="font-bold">{msg.sender_name}</span>
                              <span>{jam(msg.created_at)}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap font-normal text-xs">{msg.message}</p>
                          </div>

                          {dariPetugas && (
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                              CS
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-[var(--adm-dim)] text-xs py-10">Memuat pesan...</p>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-2 bg-[var(--adm-inset)] border-t border-[var(--adm-line)] flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase text-[var(--adm-dim)] pl-2 whitespace-nowrap">Template:</span>
                  {CANNED_RESPONSES.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(r)}
                      className="px-2.5 py-1 bg-[var(--adm-inset)] hover:bg-[var(--adm-hover)] text-[var(--adm-body)] text-[11px] rounded-lg whitespace-nowrap border border-[var(--adm-line)] transition-colors cursor-pointer"
                    >
                      + Template {i + 1}
                    </button>
                  ))}
                </div>

                <form onSubmit={kirimBalasan} className="p-3 border-t border-[var(--adm-line)] bg-[var(--adm-inset)] flex items-center gap-2 flex-shrink-0">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ketik balasan resmi Customer Service..."
                    className="flex-1 bg-[var(--adm-bg)] border border-[var(--adm-line)] rounded-xl px-3 py-2 text-xs text-[var(--adm-fg)] placeholder-[var(--adm-dim)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />

                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40 flex-shrink-0 cursor-pointer"
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Kirim</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3 text-[var(--adm-dim)]">
                <Headphones className="w-12 h-12 text-[var(--adm-dim)]" />
                <h3 className="font-bold text-sm text-[var(--adm-body)]">Pilih Percakapan di Sisi Kiri</h3>
                <p className="text-xs max-w-xs">
                  Klik salah satu sesi percakapan pengunjung untuk membaca dan membalas pesan.
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ============ TAB PENGADUAN ============ */}
      {tab === 'complaint' && (
        <Panel className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
            <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Pengaduan Resmi</h2>
            <SearchBox value={qAduan} onChange={setQAduan} placeholder="Cari tiket, pelapor, atau subjek..." />
          </div>

          {loadingComplaints ? (
            <Loading />
          ) : visibleComplaints.length === 0 ? (
            <EmptyState
              text="Belum ada pengaduan"
              hint="Pengaduan yang dikirim pengunjung lewat Pusat Bantuan akan muncul di sini."
            />
          ) : (
            <Table head={['Tiket', 'Subjek', 'Kategori', 'Pelapor', 'Masuk', 'Status', 'Aksi']}>
              {visibleComplaints.map((c) => (
                <Row key={c.id}>
                  <Cell className="whitespace-nowrap">
                    <span className="font-mono text-[11px] font-bold text-blue-400">{c.ticket_number}</span>
                  </Cell>

                  <Cell className="max-w-[260px]">
                    <span className="font-bold text-[var(--adm-fg)] text-[12.5px] line-clamp-2">{c.subject}</span>
                    {c.attachment_url && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-amber-300">
                        <Paperclip className="w-3 h-3" /> ada lampiran
                      </span>
                    )}
                  </Cell>

                  <Cell><Badge text={c.category} color="#38bdf8" /></Cell>

                  <Cell className="max-w-[180px]">
                    <span className="block truncate text-[12px] text-[var(--adm-body)]">{c.reporter_name}</span>
                    <span className="block truncate text-[10.5px] text-[var(--adm-dim)]">{c.reporter_phone}</span>
                  </Cell>

                  <Cell className="whitespace-nowrap text-[11.5px]">{tanggal(c.created_at)}</Cell>

                  <Cell>
                    <Badge
                      text={STATUS_META[c.status]?.label ?? c.status}
                      color={STATUS_META[c.status]?.color ?? '#94a3b8'}
                    />
                  </Cell>

                  <Cell>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => bukaAduan(c)}
                        title="Tanggapi"
                        className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setHapusAduan(c.id)}
                        title="Hapus"
                        className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      )}

      {/* ---------- dialog tanggapan pengaduan ---------- */}
      <Modal
        open={aduanTerbuka !== null}
        onClose={() => setAduanTerbuka(null)}
        title={`Tanggapi ${aduanTerbuka?.ticket_number ?? ''}`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAduanTerbuka(null)}>Batal</Btn>
            <Btn onClick={simpanAduan} disabled={menyimpanAduan}>
              {menyimpanAduan ? 'Menyimpan...' : 'Simpan Tanggapan'}
            </Btn>
          </>
        }
      >
        {aduanTerbuka && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-4 space-y-2">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{aduanTerbuka.subject}</p>
              <p className="text-[12px] text-[var(--adm-body)] leading-relaxed whitespace-pre-wrap">
                {aduanTerbuka.description}
              </p>

              <div className="pt-2 border-t border-[var(--adm-line)] flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--adm-muted)]">
                <span>{aduanTerbuka.reporter_name}</span>
                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{aduanTerbuka.reporter_email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{aduanTerbuka.reporter_phone}</span>
              </div>

              {aduanTerbuka.attachment_url && (
                <a
                  href={aduanTerbuka.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)]"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Lihat foto terlampir
                </a>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
                Status <span className="text-rose-400">*</span>
              </label>
              <select
                value={statusAduan}
                onChange={(e) => setStatusAduan(e.target.value as typeof statusAduan)}
                className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] focus:outline-none focus:border-cyan-400/50 cursor-pointer"
              >
                <option value="in_progress">Sedang ditindaklanjuti</option>
                <option value="resolved">Selesai</option>
                <option value="rejected">Tidak dapat ditindaklanjuti</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
                Tanggapan <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={5}
                value={tanggapan}
                onChange={(e) => setTanggapan(e.target.value)}
                placeholder="Tanggapan ini terbaca pelapor saat melacak nomor tiketnya."
                className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={hapusChat !== null}
        onCancel={() => setHapusChat(null)}
        onConfirm={jalankanHapusChat}
        message="Percakapan ini beserta seluruh pesannya akan dihapus permanen. Lanjutkan?"
      />

      <ConfirmDialog
        open={hapusAduan !== null}
        onCancel={() => setHapusAduan(null)}
        onConfirm={jalankanHapusAduan}
        message="Pengaduan ini beserta lampirannya akan dihapus permanen. Lanjutkan?"
      />
    </>
  );
}
