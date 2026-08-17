'use client';

/**
 * Pusat Bantuan versi PWA.
 *
 * Empat pintu masuk yang sama dengan halaman web — Tanya, Adukan, Lapor
 * Kehilangan, Lacak — memakai logika yang sama dari `lib/helpdesk.ts`. Berkas
 * ini hanya menyusun tampilannya sebagai layar aplikasi.
 *
 * TAB LAPOR KEHILANGAN SEBELUMNYA TIDAK ADA DI SINI. Menu navbar menunjuk
 * `/complaints?mode=hilang`, proxy mengalihkannya ke layar ini lalu membuang
 * query-nya, dan layar ini hanya punya tiga tab — sehingga fitur lapor
 * kehilangan tidak pernah sampai ke satu pun pengunjung ponsel. Query kini
 * dipertahankan (`lib/pwaRoutes.ts`) dan tabnya ada.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { Field, ImageField, inputCls } from '@/components/ui/FormField';
import {
  StatusChip, TicketStub, DaftarPesan, MenungguBalasan, RatingPanel,
  OutsideHoursNotice, EmptyChat, isClosed,
} from '@/components/helpdesk/shared';
import {
  HELP_CATEGORIES, useServiceHours, useChatThread, startChat, sendChatMessage,
  submitComplaint, trackComplaint, submitLostReport, trackLostReport,
  ticketKind, savedTicket, saveTicket, clearTicket, isRated,
} from '@/lib/helpdesk';
import { KATEGORI_BARANG, AREA_KEHILANGAN, STATUS_LAPORAN } from '@/lib/laporHilang';
import type { ComplaintTracking, LostReportTracking } from '@/types';
import {
  MessageCircle, FileWarning, Ticket, Send, ArrowRight, CircleCheck, CircleAlert,
  Paperclip, RefreshCw, Search, CircleHelp, PackageSearch, MapPin, Clock3,
  ChevronLeft, Headset, Plane,
} from 'lucide-react';

type Tab = 'chat' | 'complaint' | 'lost' | 'track';

const KOSONG_CHAT = { visitor_name: '', visitor_email: '', visitor_phone: '', category: HELP_CATEGORIES[0] as string, subject: '', message: '' };
const KOSONG_ADUAN = { reporter_name: '', reporter_email: '', reporter_phone: '', category: HELP_CATEGORIES[1] as string, subject: '', description: '' };
const KOSONG_HILANG = {
  reporter_name: '', reporter_phone: '', reporter_email: '',
  category: KATEGORI_BARANG[0] as string,
  item_description: '',
  lost_area: AREA_KEHILANGAN[0] as string,
  lost_at: '',
  flight_number: '',
};

/**
 * Batas atas medan waktu kehilangan.
 *
 * Backend menolak tanggal di masa depan; memberi batasnya di peramban membuat
 * penolakan itu tidak pernah perlu terjadi. Bentuknya `YYYY-MM-DDTHH:mm` dan
 * dihitung dalam waktu LOKAL — `toISOString()` akan menggesernya ke UTC dan
 * membuat batasnya meleset delapan jam bagi pengunjung di Samarinda.
 */
function batasWaktuSekarang(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** `?mode=` → tab pembuka. Nilai apa pun boleh sampai ke sini; yang asing jatuh ke `chat`. */
function tabDariQuery(nilai?: string): Tab {
  if (nilai === 'hilang' || nilai === 'lost') return 'lost';
  if (nilai === 'aduan' || nilai === 'complaint') return 'complaint';
  if (nilai === 'lacak' || nilai === 'track') return 'track';
  return 'chat';
}

export default function BantuanView({ modeAwal }: { modeAwal?: string }) {
  const jamLayanan = useServiceHours();

  const [tab, setTab] = useState<Tab>(() => tabDariQuery(modeAwal));
  const [formChat, setFormChat] = useState(KOSONG_CHAT);
  const [formAduan, setFormAduan] = useState(KOSONG_ADUAN);
  const [formHilang, setFormHilang] = useState(KOSONG_HILANG);
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [fotoHilang, setFotoHilang] = useState<File | null>(null);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [tiketAduan, setTiketAduan] = useState<string | null>(null);
  const [tiketHilang, setTiketHilang] = useState<string | null>(null);

  const [tiketChat, setTiketChat] = useState<string | null>(null);
  const { thread, messages, loading, error, appendLocal } = useChatThread(tiketChat);
  const [pesanBaru, setPesanBaru] = useState('');
  const [mengirimPesan, setMengirimPesan] = useState(false);
  const akhirPesan = useRef<HTMLDivElement>(null);

  const [lacak, setLacak] = useState('');
  const [melacak, setMelacak] = useState(false);
  const [galatLacak, setGalatLacak] = useState('');
  const [hasilAduan, setHasilAduan] = useState<ComplaintTracking | null>(null);
  const [hasilHilang, setHasilHilang] = useState<LostReportTracking | null>(null);

  useEffect(() => {
    const t = savedTicket();
    if (t) setTiketChat(t);
  }, []);

  useEffect(() => {
    akhirPesan.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const petakanGalat = (errors?: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(errors ?? {}).map(([k, v]) => [k, v[0]]));

  const pindahTab = (t: Tab) => {
    setTab(t);
    setGalat({});
    setGalatUmum('');
  };

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

  const kirimLaporanHilang = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat({});
    setGalatUmum('');
    setMengirim(true);

    const res = await submitLostReport({ ...formHilang, photo: fotoHilang });
    setMengirim(false);

    if (!res.ok || !res.data) {
      setGalat(petakanGalat(res.errors));
      if (!res.errors) setGalatUmum(res.message);
      return;
    }

    setTiketHilang(res.data.ticket_number);
    setFormHilang(KOSONG_HILANG);
    setFotoHilang(null);
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
    setHasilHilang(null);

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

    if (jenis === 'lost') {
      const res = await trackLostReport(t);
      setMelacak(false);
      if (res.ok && res.data) setHasilHilang(res.data);
      else setGalatLacak(res.message);
      return;
    }

    setMelacak(false);
    setGalatLacak(
      jenis === 'information'
        ? 'Permohonan informasi publik dilacak di halaman PPID.'
        : 'Nomor tiket tidak dikenali. Awalannya CHAT-, TKT-, atau HLG-.',
    );
  };

  /* ---------- ruang percakapan menggantikan seluruh layar ---------- */
  if (tiketChat) {
    /* Sesi yang sudah ditutup tidak lagi menerima pesan — backend menolaknya.
       Kolom ketik dimatikan supaya penolakan itu tidak pernah perlu terjadi. */
    const sesiTutup = !!thread && isClosed(thread.status);

    /* Titik-titik menunggu hanya wajar bila memang ada yang ditunggu: pesan
       terakhir dari warga, dan sesinya belum ditutup. */
    const pesanTerakhir = messages[messages.length - 1];
    const menunggu =
      !!thread && !sesiTutup && !!pesanTerakhir && pesanTerakhir.sender_type === 'visitor';

    return (
      /* `flex-1 min-h-0`, BUKAN `h-full`. Pembungkus transisi di
         `app/app/template.tsx` bertinggi `min-height:100%` sehingga persentase
         tinggi tidak pernah terpecahkan — dengan `h-full` layar ini menciut
         setinggi isinya dan menempelkan kolom ketik di bawah pesan pertama. */
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
        {/* ---------- kepala ---------- */}
        <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] via-[#123a8f] to-[#1e50b8]">
          {/* Pesawat yang melintas pelan di balik kepala — satu-satunya gerak
              latar di sini, cukup lambat untuk tidak mengganggu membaca. */}
          <motion.div
            aria-hidden="true"
            className="absolute top-2 left-0 text-white/10"
            initial={{ x: -60 }}
            animate={{ x: 460 }}
            transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          >
            <Plane className="w-16 h-16 rotate-[24deg]" />
          </motion.div>

          <div className="relative">
            <StatusBar />

            <div className="flex items-center gap-3 px-4 h-14">
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={() => { clearTicket(); setTiketChat(null); }}
                aria-label="Kembali ke Pusat Bantuan"
                className="w-9 h-9 -ml-1 rounded-full text-white hover:bg-white/15 active:bg-white/15 flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>

              {/* Lambang lawan bicara. Percakapan tanpa wajah di seberang
                  terasa seperti mengisi formulir, bukan bertanya kepada orang. */}
              <span className="w-9 h-9 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Headset className="w-[18px] h-[18px] text-white" />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-bold text-white truncate leading-tight">
                  {thread?.subject ?? 'Percakapan'}
                </p>
                <p className="text-[10.5px] text-blue-100/75 truncate">
                  Petugas Pusat Bantuan · {jamLayanan ? 'sedang bertugas' : 'di luar jam layanan'}
                </p>
              </div>
            </div>

            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-blue-100/80">{tiketChat}</span>
              {thread && <StatusChip status={thread.status} />}
            </div>
          </div>
        </div>

        {/* ---------- daftar pesan ----------
             `justify-end` mendorong percakapan ke KAKI wadah selama isinya
             belum setinggi layar. Tanpa itu, dua pesan pertama menggantung di
             puncak dengan setengah layar kosong menganga di bawahnya, dan
             pesan baru muncul jauh dari tempat mata sedang menunggu — yakni
             tepat di atas kolom ketik. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col justify-end">
          <div className="mx-auto w-full max-w-2xl">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-[12.5px]">
                <RefreshCw className="w-4 h-4 animate-spin" /> Memuat percakapan…
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-16 px-6">
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
              <>
                <DaftarPesan messages={messages} />
                <AnimatePresence>{menunggu && <MenungguBalasan />}</AnimatePresence>
              </>
            )}

            {thread && isClosed(thread.status) && !isRated(tiketChat) && (
              <div className="pt-4"><RatingPanel ticket={tiketChat} /></div>
            )}

            <div ref={akhirPesan} />
          </div>
        </div>

        {/* ---------- kolom ketik ---------- */}
        <div
          className="flex-shrink-0 bg-white border-t border-slate-100 px-3 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {sesiTutup ? (
            <p className="flex items-center justify-center gap-2 py-2.5 text-[12px] text-slate-500 text-center">
              <CircleCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              Sesi ini sudah ditutup. Mulai percakapan baru bila masih ada yang perlu ditanyakan.
            </p>
          ) : (
            <form onSubmit={kirimPesan} className="mx-auto w-full max-w-2xl flex items-end gap-2">
              {/* `textarea` yang tumbuh sendiri, bukan `input` satu baris:
                  pertanyaan warga kerap beberapa kalimat, dan kolom satu baris
                  memaksanya mengetik tanpa dapat membaca ulang tulisannya. */}
              <textarea
                value={pesanBaru}
                onChange={(e) => setPesanBaru(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  // Enter mengirim hanya bila ada papan ketik fisik; di ponsel
                  // Enter tetap berarti baris baru.
                  if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                    e.preventDefault();
                    kirimPesan(e);
                  }
                }}
                rows={1}
                placeholder="Tulis pesan…"
                aria-label="Tulis pesan"
                className="flex-1 resize-none bg-slate-100 rounded-3xl px-4 py-3 text-[13px] leading-snug text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-h-[120px]"
              />

              <motion.button
                whileTap={{ scale: 0.88 }}
                type="submit"
                disabled={mengirimPesan || !pesanBaru.trim()}
                aria-label="Kirim pesan"
                /* Tombolnya menyala hanya saat benar-benar dapat ditekan —
                   sebelumnya ia tetap biru penuh meski kolomnya kosong. */
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  pesanBaru.trim() && !mengirimPesan
                    ? 'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {mengirimPesan ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <motion.span
                    animate={pesanBaru.trim() ? { x: [0, 2, 0] } : { x: 0 }}
                    transition={{ duration: 1.6, repeat: pesanBaru.trim() ? Infinity : 0, ease: 'easeInOut' }}
                  >
                    <Send className="w-4 h-4" />
                  </motion.span>
                )}
              </motion.button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ---------- layar utama ---------- */
  const TABS: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chat', label: 'Tanya', icon: MessageCircle },
    { id: 'complaint', label: 'Adukan', icon: FileWarning },
    { id: 'lost', label: 'Hilang', icon: PackageSearch },
    { id: 'track', label: 'Lacak', icon: Ticket },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Pusat Bantuan" back={false} />

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
                onClick={() => pindahTab(t.id)}
                aria-pressed={on}
                className="relative flex-1 flex flex-col items-center gap-1 py-2 min-h-[44px]"
              >
                <Icon className={`w-[19px] h-[19px] ${on ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={on ? 2.4 : 2} />
                <span className={`text-[11px] font-semibold ${on ? 'text-blue-600' : 'text-slate-400'}`}>{t.label}</span>
                {on && <motion.span layoutId="bantuan-tab" className="absolute inset-x-4 bottom-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulir dibatasi lebarnya di tablet. Medan isian selebar 900px membuat
          mata kehilangan pasangan label–kolomnya di baris berikutnya. */}
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-2xl px-4 py-4 space-y-4"
      >
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

            {/* Tetap di dalam `/app`: tautan ke luar `scope` manifest akan
                melompat keluar aplikasi terpasang, ke peramban. */}
            <Link
              href="/app/faq"
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

        {/* ---------- lapor kehilangan ---------- */}
        {tab === 'lost' && (
          tiketHilang ? (
            <motion.div variants={listItem} className="space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CircleCheck className="w-5 h-5" />
                <p className="text-[14px] font-black">Laporan kehilangan Anda sudah kami terima</p>
              </div>

              <TicketStub
                ticket={tiketHilang}
                subtitle="Simpan nomor ini. Buka tab Lacak untuk melihat perkembangan pencariannya."
              />

              {/* Harapan yang jujur. Barang temuan kerap baru sampai ke pos
                  beberapa hari sesudah tertinggal, dan pelapor yang mengira
                  pencarian berlangsung seketika akan menyimpulkan laporannya
                  diabaikan. */}
              <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 flex items-start gap-2.5">
                <Clock3 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-800 leading-relaxed">
                  Barang temuan sering baru diserahkan ke pos layanan beberapa hari setelah
                  tertinggal. Petugas akan menghubungi nomor yang Anda cantumkan bila ada
                  barang yang cocok — mohon menunggu, dan periksa status laporan Anda dari
                  waktu ke waktu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTiketHilang(null)}
                className="w-full text-[13px] font-bold text-blue-600 py-3"
              >
                Laporkan kehilangan lain
              </button>
            </motion.div>
          ) : (
            <motion.form variants={listItem} onSubmit={kirimLaporanHilang} className="space-y-4" noValidate>
              <div className="rounded-2xl bg-blue-50 ring-1 ring-blue-200 px-4 py-3 flex items-start gap-2.5">
                <PackageSearch className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-900 leading-relaxed">
                  Semakin rinci ciri-ciri barang yang Anda sebutkan, semakin besar kemungkinan
                  petugas mengenalinya di antara barang temuan lain. Sebutkan merek, warna, dan
                  tanda khusus yang hanya Anda ketahui.
                </p>
              </div>

              <Field label="Nama Anda" error={galat.reporter_name}>
                <input
                  className={inputCls}
                  value={formHilang.reporter_name}
                  onChange={(e) => setFormHilang({ ...formHilang, reporter_name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </Field>

              <Field
                label="Telepon"
                hint="Petugas menghubungi nomor ini bila barangnya ditemukan"
                error={galat.reporter_phone}
              >
                <input
                  inputMode="tel"
                  className={inputCls}
                  value={formHilang.reporter_phone}
                  onChange={(e) => setFormHilang({ ...formHilang, reporter_phone: e.target.value })}
                  placeholder="08xx xxxx xxxx"
                />
              </Field>

              {/* `required={false}` — tanpa itu `Field` memasang tanda bintang
                  merah di sebelah label yang keterangannya berbunyi
                  "Opsional", dan pengisi berhenti mencari apa yang salah. */}
              <Field label="Surel" hint="Opsional" required={false} error={galat.reporter_email}>
                <input
                  type="email"
                  inputMode="email"
                  className={inputCls}
                  value={formHilang.reporter_email}
                  onChange={(e) => setFormHilang({ ...formHilang, reporter_email: e.target.value })}
                  placeholder="nama@email.com"
                />
              </Field>

              <Field label="Jenis Barang" error={galat.category}>
                <select
                  className={inputCls}
                  value={formHilang.category}
                  onChange={(e) => setFormHilang({ ...formHilang, category: e.target.value })}
                >
                  {KATEGORI_BARANG.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Lokasi Perkiraan" error={galat.lost_area}>
                <select
                  className={inputCls}
                  value={formHilang.lost_area}
                  onChange={(e) => setFormHilang({ ...formHilang, lost_area: e.target.value })}
                >
                  {AREA_KEHILANGAN.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="Perkiraan Waktu Kehilangan" error={galat.lost_at}>
                <input
                  type="datetime-local"
                  max={batasWaktuSekarang()}
                  className={inputCls}
                  value={formHilang.lost_at}
                  onChange={(e) => setFormHilang({ ...formHilang, lost_at: e.target.value })}
                />
              </Field>

              <Field
                label="Nomor Penerbangan"
                hint="Opsional — sangat membantu bila barang tertinggal di pesawat atau bagasi"
                required={false}
                error={galat.flight_number}
              >
                <input
                  className={`${inputCls} uppercase placeholder:normal-case`}
                  value={formHilang.flight_number}
                  onChange={(e) => setFormHilang({ ...formHilang, flight_number: e.target.value })}
                  placeholder="Contoh: GA-561"
                />
              </Field>

              <Field
                label="Ciri-ciri Barang"
                hint="Merek, warna, ukuran, isi, dan tanda khusus. Sebutkan hal yang hanya pemiliknya tahu."
                error={galat.item_description}
              >
                <textarea
                  rows={5}
                  maxLength={5000}
                  className={`${inputCls} resize-none`}
                  value={formHilang.item_description}
                  onChange={(e) => setFormHilang({ ...formHilang, item_description: e.target.value })}
                  placeholder="Contoh: Dompet kulit cokelat merek Eiger, ada jahitan lepas di sudut kanan bawah, berisi kartu ATM dan SIM A."
                />
              </Field>

              <ImageField
                label="Foto Barang"
                hint="Opsional. Foto lama barang tersebut sangat mempercepat pengenalan oleh petugas."
                file={fotoHilang}
                onPick={setFotoHilang}
                error={galat.photo}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={mengirim}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 disabled:opacity-60 text-white font-bold text-[14px] py-4 rounded-2xl shadow-lg shadow-blue-600/20"
              >
                {mengirim ? 'Mengirim...' : <>Kirim Laporan <PackageSearch className="w-4 h-4" /></>}
              </motion.button>
            </motion.form>
          )
        )}

        {/* ---------- lacak ---------- */}
        {tab === 'track' && (
          <motion.div variants={listItem} className="space-y-4">
            <form onSubmit={jalankanLacak} className="space-y-3">
              <Field label="Nomor Tiket" hint="CHAT- percakapan · TKT- pengaduan · HLG- kehilangan">
                <input
                  value={lacak}
                  onChange={(e) => setLacak(e.target.value)}
                  placeholder="CHAT-… / TKT-… / HLG-…"
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

              {hasilHilang && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-black text-slate-900 leading-snug">{hasilHilang.category}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{hasilHilang.ticket_number}</p>
                    </div>
                    {/* Palet `STATUS_LAPORAN`, bukan `StatusChip` — status laporan
                        kehilangan berbeda dari status pengaduan, dan memaksakan
                        satu komponen untuk keduanya menampilkan label yang keliru. */}
                    <span
                      className="flex-shrink-0 text-[10.5px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: STATUS_LAPORAN[hasilHilang.status].latar,
                        color: STATUS_LAPORAN[hasilHilang.status].warna,
                      }}
                    >
                      {STATUS_LAPORAN[hasilHilang.status].label}
                    </span>
                  </div>

                  <p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" />
                    {hasilHilang.lost_area}
                    {hasilHilang.flight_number && ` · ${hasilHilang.flight_number}`}
                  </p>

                  {hasilHilang.photo_url && (
                    <a
                      href={hasilHilang.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Lihat foto yang Anda lampirkan
                    </a>
                  )}

                  {/* Keterangan status lebih dulu, catatan petugas sesudahnya.
                      Yang pertama selalu ada dan menjawab "apa yang harus saya
                      lakukan"; yang kedua hanya ada bila petugas menulis sesuatu. */}
                  <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
                    <p className="text-[12.5px] text-slate-700 leading-relaxed">
                      {STATUS_LAPORAN[hasilHilang.status].jelas}
                    </p>
                  </div>

                  {hasilHilang.admin_note && (
                    <div className="rounded-xl bg-blue-50 ring-1 ring-blue-200 p-3">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-blue-500">
                        Catatan Petugas
                      </p>
                      <p className="mt-1 text-[12.5px] text-blue-900 leading-relaxed whitespace-pre-wrap">
                        {hasilHilang.admin_note}
                      </p>
                    </div>
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
