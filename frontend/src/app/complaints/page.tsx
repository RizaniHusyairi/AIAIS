'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { ChatThread, ChatMessage } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Send, Search, CheckCircle2, Clock, ShieldCheck, Ticket, Plane, ArrowRight,
  MessageSquare, Copy, Check, AlertCircle, Building2, Users, Luggage, Car, Lock,
  Headphones, RefreshCw, MessageCircle, User, Sparkles, X, ChevronRight, HelpCircle,
  Box, CornerDownLeft
} from 'lucide-react';

const CATEGORIES = [
  { value: 'Informasi Penerbangan', label: 'Informasi Penerbangan', icon: Plane, color: '#2563eb' },
  { value: 'Fasilitas & Kebersihan', label: 'Fasilitas & Kebersihan', icon: Building2, color: '#059669' },
  { value: 'Kritik & Saran', label: 'Kritik & Saran Operasional', icon: MessageSquare, color: '#7c3aed' },
  { value: 'Parkir & Transportasi', label: 'Parkir & Transportasi', icon: Car, color: '#0891b2' },
  { value: 'Kargo & EMPU', label: 'Kargo & Layanan EMPU', icon: Box, color: '#d97706' },
  { value: 'Lainnya', label: 'Pertanyaan Umum Lainnya', icon: HelpCircle, color: '#e11d48' },
];

const QUICK_CHIPS = [
  'Bagaimana jadwal penerbangan hari ini?',
  'Berapa tarif parkir inap kendaraan di bandara?',
  'Di mana lokasi unit Lost and Found?',
  'Apakah ada fasilitas pendampingan disabilitas?',
];

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  open: { label: 'Menunggu Balasan Admin', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500 animate-pulse' },
  active: { label: 'Sedang Berlangsung', badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  resolved: { label: 'Selesai', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Sesi Ditutup', badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
};

export default function ChatPublicPage() {
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);

  // Form State
  const [form, setForm] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    category: 'Informasi Penerbangan',
    subject: '',
    message: '',
  });
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Track Ticket State
  const [inputTicket, setInputTicket] = useState('');
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Message Send State
  const [newMessage, setNewMessage] = useState('');
  const [copiedTicket, setCopiedTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Poll chat messages every 4 seconds when in active chat room
  useEffect(() => {
    if (!activeTicket) return;

    const fetchThread = async () => {
      const res = await fetchApi<ChatThread>(`/chat/${activeTicket}`);
      if (res.success && res.data) {
        setCurrentThread(res.data);
      }
    };

    fetchThread();
    const interval = setInterval(fetchThread, 4000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages]);

  // Load chat session by ticket
  const loadChat = async (ticket: string) => {
    setLoadingChat(true);
    setTrackError('');
    const res = await fetchApi<ChatThread>(`/chat/${ticket}`);
    setLoadingChat(false);

    if (res.success && res.data) {
      setActiveTicket(ticket);
      setCurrentThread(res.data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_chat_ticket', ticket);
      }
    } else {
      setTrackError(res.message || 'Sesi percakapan tidak ditemukan. Periksa nomor tiket Anda.');
    }
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_chat_ticket');
      if (saved) {
        loadChat(saved);
      }
    }
  }, []);

  // Handle start chat submission
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.visitor_name.trim() || !form.subject.trim() || !form.message.trim()) {
      setErrorMsg('Nama, Subjek/Topik, dan Pesan Wajib diisi.');
      return;
    }

    setStarting(true);
    const res = await fetchApi<ChatThread>('/chat/start', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setStarting(false);

    if (res.success && res.data) {
      setActiveTicket(res.data.ticket_number);
      setCurrentThread(res.data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('active_chat_ticket', res.data.ticket_number);
      }
    } else {
      setErrorMsg(res.message || 'Gagal memulai sesi percakapan chat. Coba lagi.');
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newMessage.trim() || sendingMsg) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    setSendingMsg(true);

    const res = await fetchApi<ChatThread>(`/chat/${activeTicket}/message`, {
      method: 'POST',
      body: JSON.stringify({ message: msgText }),
    });

    setSendingMsg(false);

    if (res.success && res.data) {
      setCurrentThread(res.data);
    }
  };

  // Copy Ticket Code
  const copyTicket = () => {
    if (!activeTicket) return;
    navigator.clipboard.writeText(activeTicket);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const resetChat = () => {
    setActiveTicket(null);
    setCurrentThread(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active_chat_ticket');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white pt-24 pb-16 px-4 sm:px-6">
        <SkyParticles />
        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Customer Service CS Bandara — Online (07.00 - 20.00 WITA)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pusat Layanan Chat, Informasi, Kritik & Saran
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Sampaikan pertanyaan, masukan, atau kritik secara langsung melalui saluran percakapan resmi Customer Service Bandara A.P.T. Pranoto.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        {!activeTicket || !currentThread ? (
          /* ============================================================
             MODE 1: FORM INISIASI PERCAKAPAN & LACAK TIKET
             ============================================================ */
          <div className="space-y-6">
            {/* Split Grid: Start New Chat & Track Chat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form Percakapan Baru */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    Mulai Percakapan Baru
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Isi identitas singkat Anda untuk memulai sesi percakapan dengan petugas bandara.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleStartChat} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.visitor_name}
                        onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        No. WhatsApp / HP <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.visitor_phone}
                        onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                        placeholder="Contoh: 08123456789"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Kategori Layanan
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Topik Percakapan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Ringkasan topik (misal: Menanyakan rute perintis Long Apung)"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Pesan Pertama <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tuliskan pertanyaan, kritik, atau saran Anda secara rinci di sini..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    ></textarea>
                  </div>

                  {/* Quick Chips Selection */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Rekomendasi Pertanyaan Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setForm({ ...form, subject: chip, message: chip })}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 text-[11.5px] rounded-xl text-slate-600 dark:text-slate-300 font-medium transition-colors text-left"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={starting}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {starting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memulai Sesi Chat...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Mulai Percakapan Chat</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right 1 Col: Track Existing Chat Ticket */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-600" />
                    Lanjutkan Chat Saya
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan Kode Tiket Chat yang sudah Anda miliki untuk melanjutkan percakapan.
                  </p>

                  {trackError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium">
                      {trackError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={inputTicket}
                      onChange={(e) => setInputTicket(e.target.value.toUpperCase())}
                      placeholder="Format: CHAT-20260804-XXXX"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />

                    <button
                      type="button"
                      disabled={!inputTicket.trim() || loadingChat}
                      onClick={() => loadChat(inputTicket.trim())}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingChat ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Buka Sesi Chat</span>
                    </button>
                  </div>
                </div>

                {/* Banner Info Jam Operasional */}
                <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-blue-300">
                    <Clock className="w-4 h-4" />
                    <span>Layanan Live Response</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Petugas Customer Service aktif membalas percakapan setiap hari pukul <strong>07.00 – 20.00 WITA</strong>. Pesan yang dikirim di luar jam kerja akan ditanggapi pada jam operasional berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             MODE 2: RUANG CHAT INTERAKTIF (LIVE CHAT ROOM UI)
             ============================================================ */
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col h-[750px] max-h-[85vh]">
            {/* Top Chat Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  <Headphones className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/60">
                      {currentThread.ticket_number}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_META[currentThread.status]?.badge ?? 'bg-slate-800 text-slate-300'}`}>
                      {STATUS_META[currentThread.status]?.label ?? currentThread.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white truncate mt-0.5">
                    {currentThread.subject}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={copyTicket}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                  title="Salin Kode Tiket"
                >
                  {copiedTicket ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedTicket ? 'Tersalin' : 'Salin Tiket'}</span>
                </button>

                <button
                  onClick={resetChat}
                  className="p-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                  title="Tutup Percakapan"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Info Banner */}
            <div className="bg-slate-100 dark:bg-slate-800/60 px-4 py-2 text-[11.5px] text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <span className="truncate">Pengunjung: <strong>{currentThread.visitor_name}</strong> ({currentThread.category})</span>
              <span className="font-mono text-[10.5px]">Auto-update 4s</span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
              {/* Greeting initial note */}
              <div className="text-center my-2">
                <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200/60 dark:border-blue-900/60 font-medium">
                  Sesi percakapan dimulai • Simpan kode tiket <strong>{currentThread.ticket_number}</strong>
                </span>
              </div>

              {currentThread.messages && currentThread.messages.length > 0 ? (
                currentThread.messages.map((msg) => {
                  const isVisitor = msg.sender_type === 'visitor';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isVisitor ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isVisitor && (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md">
                          CS
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-4 shadow-sm space-y-1 ${
                          isVisitor
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[11px] opacity-80 pb-0.5 border-b border-white/10 dark:border-slate-700">
                          <span className="font-bold">{msg.sender_name}</span>
                          <span className="text-[10px]">
                            {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                          {msg.message}
                        </p>
                      </div>

                      {isVisitor && (
                        <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-slate-400 text-xs py-10">Belum ada pesan dalam percakapan ini.</p>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Question Chips inside Chat Room */}
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 whitespace-nowrap pl-2">Tanya Cepat:</span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setNewMessage(chip)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 text-[11.5px] text-slate-700 dark:text-slate-200 rounded-xl whitespace-nowrap border border-slate-200 dark:border-slate-600 font-medium transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Bottom Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Tulis pesan atau masukan Anda..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />

              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMsg}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-colors shadow-md disabled:opacity-40 flex-shrink-0"
              >
                {sendingMsg ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
