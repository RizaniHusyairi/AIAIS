'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { ChatThread, ChatMessage } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Toast, ToastMsg,
  Loading, EmptyState, StatCard, stagger,
} from '@/components/admin/ui';
import {
  MessageSquare, RefreshCw, CheckCircle2, Clock, AlertTriangle, Reply, Mail, Phone, Ticket,
  Send, User, Headphones, Check, Search, Filter, Sparkles, MessageCircle, X
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_META: Record<string, { label: string; color: string }> = {
  open: { label: 'Menunggu Balasan', color: '#fbbf24' },
  active: { label: 'Sedang Berlangsung', color: '#38bdf8' },
  resolved: { label: 'Selesai', color: '#34d399' },
  closed: { label: 'Ditutup', color: '#94a3b8' },
};

const CANNED_RESPONSES = [
  'Terima kasih atas masukan/kritik Anda. Kami telah menyampaikan laporan ini ke unit teknis terkait untuk ditindaklanjuti.',
  'Informasi penerbangan perintis dapat diakses melalui kontak agen perintis yang tertera pada media sosial resmi kami.',
  'Terima kasih telah menghubungi Customer Service Bandara A.P.T. Pranoto Samarinda. Ada hal lain yang bisa kami bantu?',
  'Layanan parkir inap 24 jam beroperasi setiap hari dengan tarif Rp75.000/24 jam dilengkapi gratis shuttle car.',
];

export default function AdminChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'open' | 'active' | 'resolved'>('all');

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<'open' | 'active' | 'resolved' | 'closed'>('active');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = async (autoSelectActive = false) => {
    setLoading(true);
    const res = await adminFetch<ChatThread[]>('/chat');
    const raw: any = res.data;
    const list: ChatThread[] = Array.isArray(raw) ? raw : raw?.data ?? [];
    setThreads(list);
    setLoading(false);

    if (autoSelectActive && activeThread) {
      const updated = list.find((t) => t.id === activeThread.id);
      if (updated) setActiveThread(updated);
    }
  };

  useEffect(() => {
    loadThreads();
    const interval = setInterval(() => loadThreads(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const visibleThreads = useMemo(() => {
    const s = q.toLowerCase();
    return threads.filter((t) => {
      const matchTab = statusTab === 'all' || t.status === statusTab;
      const matchQ = !q || [t.ticket_number, t.visitor_name, t.subject, t.category].some((v) => String(v ?? '').toLowerCase().includes(s));
      return matchTab && matchQ;
    });
  }, [threads, q, statusTab]);

  const stats = useMemo(() => ({
    total: threads.length,
    pending: threads.filter((t) => t.status === 'open').length,
    active: threads.filter((t) => t.status === 'active').length,
    resolved: threads.filter((t) => t.status === 'resolved').length,
  }), [threads]);

  const selectThread = (t: ChatThread) => {
    setActiveThread(t);
    setNewStatus(t.status === 'open' ? 'active' : t.status);
    setReplyText('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim() || sending) return;

    setSending(true);
    const res = await adminFetch(`/chat/${activeThread.id}/reply`, {
      method: 'POST',
      body: { message: replyText.trim(), status: newStatus },
    });
    setSending(false);

    if (res.ok && res.data) {
      setReplyText('');
      setToast({ text: 'Tanggapan admin berhasil dikirim', kind: 'success' });
      loadThreads(true);
    } else {
      setToast({ text: res.message || 'Gagal mengirim tanggapan', kind: 'error' });
    }
  };

  const handleUpdateStatus = async (status: 'open' | 'active' | 'resolved' | 'closed') => {
    if (!activeThread) return;
    setNewStatus(status);

    const res = await adminFetch(`/chat/${activeThread.id}/status`, {
      method: 'PUT',
      body: { status },
    });

    if (res.ok) {
      setToast({ text: `Status percakapan diubah ke ${STATUS_META[status]?.label}`, kind: 'success' });
      loadThreads(true);
    }
  };

  return (
    <>
      <Toast msg={toast} onDone={() => setToast(null)} />

      <PageHeader
        icon={MessageCircle}
        title="Helpdesk Chat, Kritik & Informasi"
        subtitle="Kelola dan tanggapi percakapan langsung dari pengunjung bandara secara real-time"
        action={
          <Btn variant="ghost" onClick={() => loadThreads(true)}>
            <RefreshCw className="w-4 h-4" /> Muat Ulang
          </Btn>
        }
      />

      {/* Summary Cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Sesi Percakapan" value={stats.total} icon={MessageSquare} accent="#3b82f6" />
        <StatCard label="Menunggu Balasan" value={stats.pending} icon={AlertTriangle} accent="#fbbf24" />
        <StatCard label="Sedang Berlangsung" value={stats.active} icon={Clock} accent="#38bdf8" />
        <StatCard label="Selesai" value={stats.resolved} icon={CheckCircle2} accent="#34d399" />
      </motion.div>

      {/* Helpdesk Split Screen Messenger Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px] mt-4">
        {/* Left 5 Cols: Thread List */}
        <Panel className="lg:col-span-5 flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-white/8 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari tiket, nama, atau topik..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
              {(['all', 'open', 'active', 'resolved'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-1 text-center ${
                    statusTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'Semua' : tab === 'open' ? 'Menunggu' : tab === 'active' ? 'Berlangsung' : 'Selesai'}
                </button>
              ))}
            </div>
          </div>

          {/* Threads Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading && threads.length === 0 ? (
              <Loading />
            ) : visibleThreads.length > 0 ? (
              visibleThreads.map((t) => {
                const isSelected = activeThread?.id === t.id;
                const hasUnread = t.messages?.some((m) => m.sender_type === 'visitor' && !m.is_read);

                return (
                  <button
                    key={t.id}
                    onClick={() => selectThread(t)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 relative ${
                      isSelected ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-white/4'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 border border-white/10">
                      {t.visitor_name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-blue-400">
                          {t.ticket_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(t.last_activity_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-200 truncate mt-0.5">
                        {t.subject}
                      </h4>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {t.visitor_name} • <span className="text-slate-500">{t.category}</span>
                      </p>
                    </div>

                    {hasUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0 mt-1" title="Pesan Belum Dibaca"></span>
                    )}
                  </button>
                );
              })
            ) : (
              <EmptyState text="Tidak ada percakapan" hint="Ubah tab filter atau kata kunci pencarian." />
            )}
          </div>
        </Panel>

        {/* Right 7 Cols: Chat Window & Reply */}
        <Panel className="lg:col-span-7 flex flex-col overflow-hidden h-full">
          {activeThread ? (
            <div className="flex flex-col h-full">
              {/* Header Chat Window */}
              <div className="p-4 border-b border-white/8 flex items-center justify-between gap-3 bg-slate-900/60 flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/60">
                      {activeThread.ticket_number}
                    </span>
                    <Badge
                      text={STATUS_META[activeThread.status]?.label ?? activeThread.status}
                      color={STATUS_META[activeThread.status]?.color}
                    />
                    <span className="text-xs text-slate-400">• {activeThread.category}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-100 mt-1 truncate">
                    {activeThread.subject}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pengunjung: <strong className="text-slate-200">{activeThread.visitor_name}</strong> {activeThread.visitor_phone ? `(${activeThread.visitor_phone})` : ''} {activeThread.visitor_email ? `• ${activeThread.visitor_email}` : ''}
                  </p>
                </div>

                {/* Status Toggle Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={activeThread.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="bg-slate-900 border border-white/15 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-semibold"
                  >
                    <option value="open">Menunggu</option>
                    <option value="active">Berlangsung</option>
                    <option value="resolved">Selesai</option>
                    <option value="closed">Ditutup</option>
                  </select>
                </div>
              </div>

              {/* Chat Stream Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/40">
                {activeThread.messages && activeThread.messages.length > 0 ? (
                  activeThread.messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 text-xs space-y-1 ${
                            isAdmin
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 pb-0.5 border-b border-white/10">
                            <span className="font-bold">{msg.sender_name}</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap font-normal text-xs">{msg.message}</p>
                        </div>

                        {isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            CS
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-slate-500 text-xs py-10">Tidak ada rincian pesan.</p>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Canned Responses Bar */}
              <div className="p-2 bg-slate-900/90 border-t border-white/8 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-500 pl-2 whitespace-nowrap">Template Balasan:</span>
                {CANNED_RESPONSES.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(res)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg whitespace-nowrap border border-white/5 transition-colors"
                  >
                    + Template {i + 1}
                  </button>
                ))}
              </div>

              {/* Admin Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-white/8 bg-slate-900/60 flex items-center gap-2 flex-shrink-0">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ketik balasan resmi Customer Service..."
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Kirim</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3 text-slate-500">
              <Headphones className="w-12 h-12 text-slate-600" />
              <h3 className="font-bold text-sm text-slate-300">Pilih Percakapan di Sisi Kiri</h3>
              <p className="text-xs max-w-xs">
                Klik salah satu sesi percakapan pengunjung dari panel kiri untuk membaca dan membalas pesan.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
