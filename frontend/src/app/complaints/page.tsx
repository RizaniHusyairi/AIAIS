'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Complaint } from '@/types';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Send, Search, CheckCircle2, Clock, ShieldCheck, Ticket, Plane, ArrowRight,
  MessageSquare, Copy, Check, AlertCircle, Building2, Users, Luggage, Car, Lock,
  ClipboardCheck, Headphones, XCircle,
} from 'lucide-react';

/* ================================================================
   Lengkung lintasan dekoratif — selaras dengan halaman tenant
   ================================================================ */
function FlightArc({ className = '', d = 'M-20 170 Q 380 50 1020 130' }: { className?: string; d?: string }) {
  return (
    <svg className={`pointer-events-none ${className}`} viewBox="0 0 1000 220" preserveAspectRatio="none" fill="none">
      <motion.path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 9"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/* ================================================================
   Metadata
   ================================================================ */

const CATEGORIES = [
  { value: 'Fasilitas', label: 'Fasilitas & Kebersihan', icon: Building2, color: '#2563eb' },
  { value: 'Pelayanan', label: 'Pelayanan Petugas', icon: Users, color: '#059669' },
  { value: 'Bagasi', label: 'Penanganan Bagasi', icon: Luggage, color: '#d97706' },
  { value: 'Parkir', label: 'Parkir & Transportasi', icon: Car, color: '#0891b2' },
  { value: 'Keamanan', label: 'Keamanan Bandara', icon: ShieldCheck, color: '#e11d48' },
];

/** Tahapan yang dilalui sebuah tiket pengaduan. */
const STEPS = [
  { title: 'Kirim Pengaduan', desc: 'Lengkapi formulir dan dapatkan nomor tiket digital.', icon: Send, color: '#2563eb' },
  { title: 'Verifikasi', desc: 'Petugas memeriksa laporan dan meneruskan ke unit terkait.', icon: ClipboardCheck, color: '#7c3aed' },
  { title: 'Tindak Lanjut', desc: 'Unit terkait menangani dan menyusun tanggapan resmi.', icon: Clock, color: '#d97706' },
  { title: 'Selesai', desc: 'Tanggapan dapat dilihat kapan saja melalui nomor tiket.', icon: CheckCircle2, color: '#059669' },
];

type StatusMeta = { label: string; badge: string; dot: string; step: number };

const STATUS_META: Record<string, StatusMeta> = {
  submitted: { label: 'Diterima', badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500', step: 1 },
  in_progress: { label: 'Sedang Diproses', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500', step: 2 },
  resolved: { label: 'Selesai', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500', step: 3 },
  rejected: { label: 'Ditolak', badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-500', step: 3 },
};

function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.submitted;
}

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

/** Gaya bersama untuk seluruh isian formulir. */
const FIELD =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors';

/* ================================================================ */

export default function ComplaintsPage() {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    category: 'Fasilitas',
    subject: '',
    description: '',
  });

  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [trackTicketNumber, setTrackTicketNumber] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetchApi<{ ticket_number: string }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (res.success && res.data?.ticket_number) {
      setSubmittedTicket(res.data.ticket_number);
      setFormData({
        reporter_name: '',
        reporter_email: '',
        reporter_phone: '',
        category: 'Fasilitas',
        subject: '',
        description: '',
      });
    } else {
      setSubmitError(res.message || 'Pengaduan gagal dikirim. Silakan coba beberapa saat lagi.');
    }
    setSubmitting(false);
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTicketNumber.trim()) return;

    setTracking(true);
    setTrackingError(null);
    setTrackedComplaint(null);

    const res = await fetchApi<Complaint>(`/complaints/track/${trackTicketNumber.trim()}`);
    if (res.success && res.data) {
      setTrackedComplaint(res.data);
    } else {
      setTrackingError(res.message || 'Nomor tiket tidak ditemukan.');
    }
    setTracking(false);
  };

  const copyTicket = async () => {
    if (!submittedTicket) return;
    try {
      await navigator.clipboard.writeText(submittedTicket);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Penyalinan otomatis diblokir peramban — nomor tetap dapat disalin manual.
    }
  };

  return (
    <div className="bg-slate-50 overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e40af]">
        <SkyParticles tone="sky" />

        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />
        <FlightArc className="absolute inset-x-0 top-1/3 w-full h-48 text-white/20" />

        <motion.div
          initial={{ x: -80, y: 34, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[16%] top-[24%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <MessageSquare className="w-14 h-14 text-cyan-200/80 drop-shadow-2xl" strokeWidth={1.2} />
          </motion.div>
        </motion.div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-16 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/20 text-cyan-200 text-[11px] font-bold uppercase tracking-[0.16em] px-3.5 py-2 rounded-full">
              <MessageSquare className="w-3.5 h-3.5" /> Layanan Aspirasi Penumpang
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Pengaduan Online
              <br />
              <span className="text-cyan-300">&amp; Lacak Tiket</span>
            </h1>

            <p className="mt-4 text-blue-100/90 text-[15px] leading-relaxed max-w-xl">
              Sampaikan saran, aspirasi, maupun keluhan Anda. Setiap laporan menerima nomor tiket digital
              yang dapat dipantau perkembangannya kapan saja.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#formulir" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                <Send className="w-4 h-4" /> Kirim Pengaduan
              </Link>
              <Link href="#lacak" className="inline-flex items-center gap-2 bg-white/12 backdrop-blur border border-white/25 text-white font-bold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/20 transition-colors">
                <Ticket className="w-4 h-4" /> Lacak Tiket Saya
              </Link>
            </div>
          </motion.div>
        </div>

        {/* garis landasan */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex gap-2 px-4 opacity-70">
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.08 }}
              className="flex-1 bg-cyan-300 rounded-full"
            />
          ))}
        </div>
      </section>

      {/* ============ ALUR PENANGANAN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.title} variants={rise} whileHover={{ y: -5 }} className="relative overflow-hidden bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 p-5">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}14` }}>
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </span>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: s.color }}>
                    LANGKAH {i + 1}
                  </span>
                </div>
                <p className="text-[15px] font-black text-slate-900 mt-3">{s.title}</p>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ============ FORMULIR & PELACAKAN ============ */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
            <Ticket className="w-3.5 h-3.5" /> Tiket Digital
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 tracking-tight">Suara Anda Kami Tindaklanjuti</h2>
          <p className="mt-2.5 text-slate-500 text-[14px] leading-relaxed">
            Kirim pengaduan baru atau periksa perkembangan tiket yang sudah Anda miliki.
          </p>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ---------- Formulir ---------- */}
          <motion.div
            id="formulir"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden scroll-mt-24"
          >
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <span className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-blue-600" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-[16px]">Formulir Pengaduan Baru</h3>
                <p className="text-[12px] text-slate-500">Isian bertanda * wajib dilengkapi.</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {submittedTicket ? (
                <motion.div
                  key="sukses"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </motion.span>

                    <h4 className="mt-4 text-[19px] font-black text-slate-900">Pengaduan Berhasil Terkirim</h4>
                    <p className="mt-1.5 text-[13px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Simpan nomor tiket berikut untuk memantau tindak lanjut petugas.
                    </p>

                    <div className="mt-4 inline-flex items-center gap-2 bg-white rounded-xl border border-emerald-200 pl-4 pr-2 py-2.5 shadow-sm">
                      <span className="font-black text-[17px] text-slate-900 tracking-wide select-all">{submittedTicket}</span>
                      <button
                        onClick={copyTicket}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => {
                          setTrackTicketNumber(submittedTicket);
                          setSubmittedTicket(null);
                          document.getElementById('lacak')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-full shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
                      >
                        <Ticket className="w-4 h-4" /> Lacak Tiket Ini
                      </button>
                      <button
                        onClick={() => setSubmittedTicket(null)}
                        className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[13px] px-4 py-2.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
                      >
                        Buat Pengaduan Lain
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="formulir"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="p-6 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nama Lengkap" required>
                      <input
                        type="text"
                        required
                        value={formData.reporter_name}
                        onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                        className={FIELD}
                        placeholder="Sesuai KTP / Paspor"
                      />
                    </Field>
                    <Field label="Email Aktif" required>
                      <input
                        type="email"
                        required
                        value={formData.reporter_email}
                        onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                        className={FIELD}
                        placeholder="contoh@email.com"
                      />
                    </Field>
                  </div>

                  <Field label="No. WhatsApp / HP" required>
                    <input
                      type="text"
                      required
                      value={formData.reporter_phone}
                      onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                      className={FIELD}
                      placeholder="08123456789"
                    />
                  </Field>

                  {/* kategori sebagai pilihan visual */}
                  <Field label="Kategori Pengaduan" required>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((c) => {
                        const Icon = c.icon;
                        const on = formData.category === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: c.value })}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-semibold text-left transition-colors cursor-pointer ${
                              on ? 'text-white border-transparent' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            style={on ? { backgroundColor: c.color } : undefined}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="leading-tight">{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Judul Pengaduan" required>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className={FIELD}
                      placeholder="Ringkasan topik pengaduan"
                    />
                  </Field>

                  <Field label="Rincian Pengaduan / Masukan" required>
                    <textarea
                      rows={5}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`${FIELD} resize-y`}
                      placeholder="Jelaskan lokasi kejadian, waktu, dan rincian masalah..."
                    />
                  </Field>

                  {submitError && (
                    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-[12.5px] text-rose-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11.5px] text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    Data pribadi Anda hanya digunakan untuk keperluan tindak lanjut pengaduan.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-[14px] py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <motion.span
                          animate={{ x: [-5, 5, -5] }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                          className="inline-flex"
                        >
                          <Plane className="w-4 h-4 rotate-45" />
                        </motion.span>
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Kirim Pengaduan
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ---------- Pelacakan ---------- */}
          <motion.div
            id="lacak"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 lg:sticky lg:top-24 space-y-4 scroll-mt-24"
          >
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                <span className="w-11 h-11 rounded-2xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-5 h-5 text-cyan-600" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-[16px]">Lacak Status Tiket</h3>
                  <p className="text-[12px] text-slate-500">Masukkan nomor tiket Anda.</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <form onSubmit={handleTrack} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="TKT-20260720-001"
                    value={trackTicketNumber}
                    onChange={(e) => setTrackTicketNumber(e.target.value)}
                    className={`${FIELD} uppercase tracking-wide`}
                  />
                  <button
                    type="submit"
                    disabled={tracking}
                    className="flex-shrink-0 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white font-bold text-[13px] px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" /> Lacak
                  </button>
                </form>

                {tracking && (
                  <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
                    <motion.span
                      animate={{ x: [-4, 4, -4] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      className="inline-flex"
                    >
                      <Plane className="w-4 h-4 text-blue-500 rotate-45" />
                    </motion.span>
                    Mencari data tiket...
                  </div>
                )}

                {trackingError && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-[12.5px] text-rose-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {trackingError}
                  </div>
                )}

                {trackedComplaint && <TicketResult complaint={trackedComplaint} />}

                {!tracking && !trackingError && !trackedComplaint && (
                  <p className="text-[12.5px] text-slate-400 leading-relaxed">
                    Nomor tiket dikirimkan setelah pengaduan Anda berhasil terkirim, dengan format
                    <span className="font-semibold text-slate-500"> TKT-TAHUNBULANTANGGAL-URUTAN</span>.
                  </p>
                )}
              </div>
            </div>

            {/* jaminan layanan */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              {[
                { icon: Lock, color: '#2563eb', text: 'Data pelapor dijaga kerahasiaannya.' },
                { icon: ClipboardCheck, color: '#059669', text: 'Setiap tiket ditindaklanjuti unit terkait.' },
                { icon: Clock, color: '#d97706', text: 'Status dapat dipantau kapan saja.' },
              ].map((it) => {
                const Icon = it.icon;
                return (
                  <div key={it.text} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${it.color}14` }}>
                      <Icon className="w-4 h-4" style={{ color: it.color }} />
                    </span>
                    <p className="text-[12.5px] text-slate-600 leading-relaxed">{it.text}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ BANTUAN ============ */}
      <section className="relative bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] py-14 overflow-hidden">
        <SkyParticles tone="sky" density="low" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-white/[0.07] backdrop-blur border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
          >
            <span className="w-16 h-16 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-8 h-8 text-cyan-300" />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-black text-[19px]">Butuh Bantuan Langsung?</h3>
              <p className="mt-1.5 text-blue-100/85 text-[13px] leading-relaxed">
                Untuk keadaan mendesak di area terminal, hubungi pusat informasi bandara atau temui
                petugas layanan penumpang terdekat.
              </p>
            </div>
            <Link
              href="/downloads"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              Pusat Unduhan <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ================================================================
   Bagian-bagian kecil
   ================================================================ */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function TicketResult({ complaint }: { complaint: Complaint }) {
  const st = statusMeta(complaint.status);
  const rejected = complaint.status === 'rejected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-200">
        <span className="font-black text-[14px] text-slate-900 tracking-wide">{complaint.ticket_number}</span>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* jejak tahapan */}
      <div className="px-4 pt-4">
        <div className="flex items-center">
          {['Diterima', 'Diproses', rejected ? 'Ditolak' : 'Selesai'].map((label, i) => {
            const reached = i < st.step;
            const isLast = i === 2;
            const tone = rejected && isLast ? 'bg-rose-500' : 'bg-blue-600';
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${reached ? tone : 'bg-slate-200'}`}>
                    {rejected && isLast && reached
                      ? <XCircle className="w-3.5 h-3.5 text-white" />
                      : <Check className={`w-3.5 h-3.5 ${reached ? 'text-white' : 'text-slate-400'}`} />}
                  </span>
                  <span className={`text-[10px] font-semibold ${reached ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                </div>
                {!isLast && (
                  <span className={`flex-1 h-0.5 mx-1 -mt-4 rounded ${i + 1 < st.step ? tone : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <Detail label="Pelapor" value={complaint.reporter_name} />
        <Detail label="Subjek" value={complaint.subject} />
        <div>
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Rincian</p>
          <p className="mt-1 text-[12.5px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
            {complaint.description}
          </p>
        </div>

        {complaint.admin_response ? (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
            <p className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider">Tanggapan Resmi Pengelola</p>
            <p className="mt-1 text-[12.5px] text-slate-700 leading-relaxed">{complaint.admin_response}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-800">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Pengaduan sedang dalam proses verifikasi unit terkait.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}
