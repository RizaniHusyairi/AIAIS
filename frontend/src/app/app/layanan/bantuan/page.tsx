'use client';

/**
 * Pusat Bantuan versi PWA.
 *
 * Sebelum layar ini ada, pengguna ponsel TIDAK DAPAT memakai fitur bantuan
 * sama sekali: `proxy.ts` mengalihkan `/complaints` ke `/app/layanan`, dan
 * kartu "Pengaduan & Saran" di sana menunjuk ke dirinya sendiri — jalan
 * buntu. Padahal chat justru paling sering dibuka dari ponsel.
 *
 * Logikanya dibagi dengan halaman web lewat `lib/helpdesk.ts`; berkas ini
 * hanya menyusun tampilannya sebagai layar aplikasi, bukan halaman web.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { Field, ImageField, inputCls } from '@/components/ui/FormField';
import {
  StatusChip, TicketStub, MessageBubble, RatingPanel, OutsideHoursNotice,
  EmptyChat, isClosed,
} from '@/components/helpdesk/shared';
import {
  HELP_CATEGORIES, useServiceHours, useChatThread, startChat, sendChatMessage,
  submitComplaint, trackComplaint, ticketKind, savedTicket, saveTicket, clearTicket, isRated,
} from '@/lib/helpdesk';
import type { ComplaintTracking } from '@/types';
import {
  MessageCircle, FileWarning, Ticket, Send, ArrowRight, CircleCheck, CircleAlert,
  X, Paperclip, RefreshCw, Search, CircleHelp,
} from 'lucide-react';

type Tab = 'chat' | 'complaint' | 'track';

const KOSONG_CHAT = { visitor_name: '', visitor_email: '', visitor_phone: '', category: HELP_CATEGORIES[0] as string, subject: '', message: '' };
const KOSONG_ADUAN = { reporter_name: '', reporter_email: '', reporter_phone: '', category: HELP_CATEGORIES[1] as string, subject: '', description: '' };

export default function BantuanScreen() {
  const jamLayanan = useServiceHours();

  const [tab, setTab] = useState<Tab>('chat');
  const [formChat, setFormChat] = useState(KOSONG_CHAT);
  const [formAduan, setFormAduan] = useState(KOSONG_ADUAN);
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [tiketAduan, setTiketAduan] = useState<string | null>(null);

  const [tiketChat, setTiketChat] = useState<string | null>(null);
  const { thread, messages, loading, error, appendLocal } = useChatThread(tiketChat);
  const [pesanBaru, setPesanBaru] = useState('');
  const [mengirimPesan, setMengirimPesan] = useState(false);
  const akhirPesan = useRef<HTMLDivElement>(null);

  const [lacak, setLacak] = useState('');
  const [melacak, setMelacak] = useState(false);
  const [galatLacak, setGalatLacak] = useState('');
  const [hasilAduan, setHasilAduan] = useState<ComplaintTracking | null>(null);

  useEffect(() => {
    const t = savedTicket();
    if (t) setTiketChat(t);
  }, []);

  useEffect(() => {
    akhirPesan.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const petakanGalat = (errors?: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(errors ?? {}).map(([k, v]) => [k, v[0]]));

  const mulaiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat({});
    setGalatUmum('');
    setMengirim(true);

    const res = await startChat(formChat);
    setMengirim(false);

    if (!res.ok || !res.data) {
      setGalat(petakanGalat(res.errors));
      if (!res.errors) setGalatUmum(res.message);
      return;
    }

    saveTicket(res.data.ticket_number);
    setTiketChat(res.data.ticket_number);
    setFormChat(KOSONG_CHAT);
  };

  const kirimAduan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat({});
    setGalatUmum('');
    setMengirim(true);

    const res = await submitComplaint({ ...formAduan, attachment: lampiran });
    setMengirim(false);

    if (!res.ok || !res.data) {
      setGalat(petakanGalat(res.errors));
      if (!res.errors) setGalatUmum(res.message);
      return;
    }

    setTiketAduan(res.data.ticket_number);
    setFormAduan(KOSONG_ADUAN);
    setLampiran(null);
  };

  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    const teks = pesanBaru.trim();
    if (!teks || !tiketChat) return;

    setMengirimPesan(true);
    const res = await sendChatMessage(tiketChat, teks);
    setMengirimPesan(false);

    if (res.ok && res.data) {
      setPesanBaru('');
      appendLocal(res.data.messages ?? []);
    }
  };

  const jalankanLacak = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = lacak.trim().toUpperCase();
    if (!t) return;

    setMelacak(true);
    setGalatLacak('');
    setHasilAduan(null);

    const jenis = ticketKind(t);

    if (jenis === 'chat') {
      saveTicket(t);
      setTiketChat(t);
      setMelacak(false);
      setLacak('');
      return;
    }

    if (jenis === 'complaint') {
      const res = await trackComplaint(t);
      setMelacak(false);
      if (res.ok && res.data) setHasilAduan(res.data);
      else setGalatLacak(res.message);
      return;
    }

    setMelacak(false);
    setGalatLacak(
      jenis === 'information'
        ? 'Permohonan informasi publik dilacak di halaman PPID.'
        : 'Nomor tiket tidak dikenali. Awalannya CHAT- atau TKT-.',
    );
  };

  /* ---------- ruang percakapan menggantikan seluruh layar ---------- */
  if (tiketChat) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="flex-shrink-0 bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
          <StatusBar />
          <AppHeader
            title={thread?.subject ?? 'Percakapan'}
            tone="light"
            action={
              <button
                type="button"
                onClick={() => { clearTicket(); setTiketChat(null); }}
                aria-label="Tutup percakapan"
                className="w-9 h-9 rounded-full bg-white/12 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            }
          />
          <div className="px-4 pb-3 flex items-center gap-2">
            <span className="text-[11px] font-mono text-blue-100/80">{tiketChat}</span>
            {thread && <StatusChip status={thread.status} />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full gap-2 text-slate-400 text-[12.5px]">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-6">
              <CircleAlert className="w-6 h-6 text-rose-400" />
              <p className="text-[13px] text-slate-600">{error}</p>
              <button
                type="button"
                onClick={() => { clearTicket(); setTiketChat(null); }}
                className="text-[12px] font-bold text-blue-600"
              >
                Mulai percakapan baru
              </button>
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat />
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} />)
          )}

          {thread && isClosed(thread.status) && !isRated(tiketChat) && (
            <div className="pt-2"><RatingPanel ticket={tiketChat} /></div>
          )}

          <div ref={akhirPesan} />
        </div>

        <form
          onSubmit={kirimPesan}
          className="flex-shrink-0 bg-white border-t border-slate-100 p-3 flex items-center gap-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <input
            value={pesanBaru}
            onChange={(e) => setPesanBaru(e.target.value)}
            placeholder="Tulis pesan..."
            aria-label="Tulis pesan"
            className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={mengirimPesan || !pesanBaru.trim()}
            aria-label="Kirim pesan"
            className="w-11 h-11 rounded-full bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    );
  }

  /* ---------- layar utama ---------- */
  const TABS: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chat', label: 'Tanya', icon: MessageCircle },
    { id: 'complaint', label: 'Adukan', icon: FileWarning },
    { id: 'track', label: 'Lacak', icon: Ticket },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Pusat Bantuan" />

        <div className="px-4 pb-3 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${jamLayanan ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11.5px] font-semibold text-slate-500">
            {jamLayanan ? 'Petugas sedang bertugas' : 'Di luar jam layanan'} · 07.00–20.00 WITA
          </span>
        </div>

        <div className="flex px-2 pb-1">
          {TABS.map((t) => {
            const on = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setGalat({}); setGalatUmum(''); }}
                aria-pressed={on}
                className="relative flex-1 flex flex-col items-center gap-1 py-2"
              >
                <Icon className={`w-[19px] h-[19px] ${on ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] font-semibold ${on ? 'text-blue-600' : 'text-slate-400'}`}>{t.label}</span>
                {on && <motion.span layoutId="bantuan-tab" className="absolute inset-x-4 bottom-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div variants={listContainer} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
        {!jamLayanan && tab === 'chat' && (
          <motion.div variants={listItem}><OutsideHoursNotice /></motion.div>
        )}

        {galatUmum && (
          <motion.div variants={listItem} className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 flex items-start gap-2.5">
            <CircleAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-semibold text-rose-700">{galatUmum}</p>
          </motion.div>
        )}

        {/* ---------- tanya ---------- */}
        {tab === 'chat' && (
          <motion.form variants={listItem} onSubmit={mulaiChat} className="space-y-4" noValidate>
            <Field label="Nama Anda" error={galat.visitor_name}>
              <input
                className={inputCls}
                value={formChat.visitor_name}
                onChange={(e) => setFormChat({ ...formChat, visitor_name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </Field>

            <Field label="Kategori" error={galat.category}>
              <select
                className={inputCls}
                value={formChat.category}
                onChange={(e) => setFormChat({ ...formChat, category: e.target.value })}
              >
                {HELP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Topik" error={galat.subject}>
              <input
                className={inputCls}
                value={formChat.subject}
                onChange={(e) => setFormChat({ ...formChat, subject: e.target.value })}
                placeholder="Ringkas dalam satu kalimat"
              />
            </Field>

            <Field label="Pertanyaan Anda" error={galat.message}>
              <textarea
                rows={4}
                maxLength={5000}
                className={`${inputCls} resize-none`}
                value={formChat.message}
                onChange={(e) => setFormChat({ ...formChat, message: e.target.value })}
                placeholder="Tuliskan pertanyaan selengkap mungkin."
              />
            </Field>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={mengirim}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 disabled:opacity-60 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/20"
            >
              {mengirim ? 'Membuka percakapan...' : <>Mulai Percakapan <ArrowRight className="w-4 h-4" /></>}
            </motion.button>

            <Link
              href="/faq"
              className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-slate-500 py-2"
            >
              <CircleHelp className="w-4 h-4" /> Lihat dulu pertanyaan yang sering diajukan
            </Link>
          </motion.form>
        )}

        {/* ---------- adukan ---------- */}
        {tab === 'complaint' && (
          tiketAduan ? (
            <motion.div variants={listItem} className="space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CircleCheck className="w-5 h-5" />
                <p className="text-[14px] font-black">Pengaduan Anda sudah kami terima</p>
              </div>

              <TicketStub
                ticket={tiketAduan}
                subtitle="Simpan nomor ini. Buka tab Lacak untuk melihat perkembangan penanganannya."
              />

              <button
                type="button"
                onClick={() => setTiketAduan(null)}
                className="w-full text-[13px] font-bold text-blue-600 py-3"
              >
                Kirim pengaduan lain
              </button>
            </motion.div>
          ) : (
            <motion.form variants={listItem} onSubmit={kirimAduan} className="space-y-4" noValidate>
              <Field label="Nama Pelapor" error={galat.reporter_name}>
                <input
                  className={inputCls}
                  value={formAduan.reporter_name}
                  onChange={(e) => setFormAduan({ ...formAduan, reporter_name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </Field>

              <Field label="Kategori" error={galat.category}>
                <select
                  className={inputCls}
                  value={formAduan.category}
                  onChange={(e) => setFormAduan({ ...formAduan, category: e.target.value })}
                >
                  {HELP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Surel" hint="Tanggapan petugas dikirim ke sini" error={galat.reporter_email}>
                <input
                  type="email"
                  inputMode="email"
                  className={inputCls}
                  value={formAduan.reporter_email}
                  onChange={(e) => setFormAduan({ ...formAduan, reporter_email: e.target.value })}
                  placeholder="nama@email.com"
                />
              </Field>

              <Field label="Telepon" error={galat.reporter_phone}>
                <input
                  inputMode="tel"
                  className={inputCls}
                  value={formAduan.reporter_phone}
                  onChange={(e) => setFormAduan({ ...formAduan, reporter_phone: e.target.value })}
                  placeholder="08xx xxxx xxxx"
                />
              </Field>

              <Field label="Subjek Pengaduan" error={galat.subject}>
                <input
                  className={inputCls}
                  value={formAduan.subject}
                  onChange={(e) => setFormAduan({ ...formAduan, subject: e.target.value })}
                  placeholder="Contoh: Toilet terminal tidak berfungsi"
                />
              </Field>

              <Field label="Uraian Kejadian" hint="Sebutkan lokasi dan waktunya" error={galat.description}>
                <textarea
                  rows={5}
                  maxLength={5000}
                  className={`${inputCls} resize-none`}
                  value={formAduan.description}
                  onChange={(e) => setFormAduan({ ...formAduan, description: e.target.value })}
                  placeholder="Jelaskan apa yang terjadi, di mana, dan kapan."
                />
              </Field>

              <ImageField
                label="Foto Bukti"
                hint="Opsional. Foto keadaan di lapangan jauh lebih cepat ditindaklanjuti."
                file={lampiran}
                onPick={setLampiran}
                error={galat.attachment}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={mengirim}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 disabled:opacity-60 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/20"
              >
                {mengirim ? 'Mengirim...' : <>Kirim Pengaduan <Paperclip className="w-4 h-4" /></>}
              </motion.button>
            </motion.form>
          )
        )}

        {/* ---------- lacak ---------- */}
        {tab === 'track' && (
          <motion.div variants={listItem} className="space-y-4">
            <form onSubmit={jalankanLacak} className="space-y-3">
              <Field label="Nomor Tiket" hint="Awalan CHAT- untuk percakapan, TKT- untuk pengaduan">
                <input
                  value={lacak}
                  onChange={(e) => setLacak(e.target.value)}
                  placeholder="CHAT-… / TKT-…"
                  aria-label="Nomor tiket"
                  className={`${inputCls} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                />
              </Field>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={melacak || !lacak.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 disabled:opacity-40 text-white font-bold text-[14px] py-4 rounded-2xl"
              >
                {melacak ? 'Mencari...' : <>Lacak Tiket <Search className="w-4 h-4" /></>}
              </motion.button>

              {galatLacak && (
                <p className="flex items-start gap-1.5 text-[12px] font-semibold text-rose-600">
                  <CircleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {galatLacak}
                </p>
              )}
            </form>

            <AnimatePresence>
              {hasilAduan && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-black text-slate-900 leading-snug">{hasilAduan.subject}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{hasilAduan.ticket_number}</p>
                    </div>
                    <StatusChip status={hasilAduan.status} />
                  </div>

                  {hasilAduan.attachment_url && (
                    <a
                      href={hasilAduan.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Lihat foto terlampir
                    </a>
                  )}

                  {hasilAduan.admin_response ? (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Tanggapan Petugas
                      </p>
                      <p className="mt-1 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {hasilAduan.admin_response}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-400 leading-relaxed">
                      Belum ada tanggapan. Pengaduan Anda sudah masuk antrean penanganan.
                    </p>
                  )}

                  {isClosed(hasilAduan.status) && !isRated(hasilAduan.ticket_number) && (
                    <RatingPanel ticket={hasilAduan.ticket_number} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
