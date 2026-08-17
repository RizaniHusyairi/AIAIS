'use client';

/**
 * Pusat Bantuan — satu pintu untuk pertanyaan, pengaduan, dan pelacakan.
 *
 * Disusun berjenjang, dari yang paling murah bagi kedua belah pihak:
 *
 *   1. Cari jawaban sendiri di FAQ  → tidak ada tiket yang terbuka
 *   2. Chat dengan petugas          → tanya-jawab ringan
 *   3. Pengaduan formal berlampiran → kasus yang perlu ditindaklanjuti
 *
 * Sebelumnya halaman ini hanya menyediakan chat, dan modul pengaduannya —
 * lengkap dengan kolom lampiran — menganggur tanpa antarmuka sama sekali.
 *
 * Seluruh pemanggilan API ada di `lib/helpdesk.ts` supaya layar PWA memakai
 * alur yang sama persis; berkas ini hanya menyusun tampilannya.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PpidHero, { FlightArc } from '@/components/ppid/PpidHero';
import { Field, ImageField, inputCls } from '@/components/ui/FormField';
import {
  StatusChip, TicketStub, DaftarPesan, RatingPanel, OutsideHoursNotice,
  EmptyChat, ALT_CHANNELS, isClosed,
} from '@/components/helpdesk/shared';
import { gabungFaq, type FaqTampil } from '@/lib/faqData';
import SafeHtml from '@/components/SafeHtml';
import { fetchApi } from '@/lib/api';
import type { FaqItem } from '@/types';
import {
  HELP_CATEGORIES, useServiceHours, useChatThread, startChat, sendChatMessage,
  submitComplaint, trackComplaint, trackInformationRequest, ticketKind,
  submitLostReport, trackLostReport,
  savedTicket, saveTicket, clearTicket, isRated,
} from '@/lib/helpdesk';
import { KATEGORI_BARANG, AREA_KEHILANGAN, STATUS_LAPORAN } from '@/lib/laporHilang';
import type { ComplaintTracking, LostReportTracking } from '@/types';
import {
  Search, MessageCircle, FileWarning, Ticket, Send, ChevronDown, ArrowRight,
  CircleCheck, CircleAlert, ExternalLink, Sparkles, X, Paperclip, RefreshCw,
  PackageSearch, MapPin, Clock3,
} from 'lucide-react';

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

type Mode = 'chat' | 'complaint' | 'lost';
type Galat = Record<string, string>;

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
 * penolakan itu tidak pernah perlu terjadi. Bentuknya `YYYY-MM-DDTHH:mm`,
 * yang diminta `<input type="datetime-local">`, dan dihitung dalam waktu LOKAL
 * peramban — `toISOString()` akan menggesernya ke UTC dan membuat batasnya
 * meleset delapan jam bagi pengunjung di Samarinda.
 */
function batasWaktuSekarang(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ================================================================ */

/**
 * Petakan `?mode=` ke tab pembuka.
 *
 * Nilainya berasal dari URL — apa pun boleh sampai ke sini. Yang tidak dikenali
 * jatuh ke `chat`, bukan menghasilkan tab kosong.
 */
function modeDariQuery(nilai?: string): Mode {
  if (nilai === 'hilang' || nilai === 'lost') return 'lost';
  if (nilai === 'aduan' || nilai === 'complaint') return 'complaint';
  return 'chat';
}

export default function PusatBantuanView({ modeAwal }: { modeAwal?: string }) {
  const jamLayanan = useServiceHours();

  /* ---------- lapis 1: cari jawaban ---------- */
  const [cari, setCari] = useState('');
  const [faqTerbuka, setFaqTerbuka] = useState<number | null>(null);

  const [faqs, setFaqs] = useState<FaqTampil[]>([]);

  useEffect(() => {
    let batal = false;

    fetchApi<FaqItem[]>('/faqs').then((res) => {
      if (!batal && Array.isArray(res.data)) setFaqs(res.data.map(gabungFaq));
    });

    return () => { batal = true; };
  }, []);

  const hasilFaq = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return [];

    // Pencarian menjangkau isi jawaban, bukan hanya judul pertanyaannya —
    // sebelumnya jawaban berupa JSX sehingga hanya daftar kata kunci yang
    // dapat dicari, dan daftar itu ikut usang tiap kali jawabannya disunting.
    return faqs.filter((f) => f.cariTeks.includes(q));
  }, [cari, faqs]);

  /* ---------- lapis 2 & 3: intake ---------- */
  const [mode, setMode] = useState<Mode>(() => modeDariQuery(modeAwal));
  const [formChat, setFormChat] = useState(KOSONG_CHAT);
  const [formAduan, setFormAduan] = useState(KOSONG_ADUAN);
  const [formHilang, setFormHilang] = useState(KOSONG_HILANG);
  const [fotoHilang, setFotoHilang] = useState<File | null>(null);
  const [tiketHilang, setTiketHilang] = useState<string | null>(null);
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [galat, setGalat] = useState<Galat>({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [tiketAduan, setTiketAduan] = useState<string | null>(null);

  /* ---------- percakapan berjalan ---------- */
  const [tiketChat, setTiketChat] = useState<string | null>(null);
  const { thread, messages, loading, error, appendLocal } = useChatThread(tiketChat);
  const [pesanBaru, setPesanBaru] = useState('');
  const [mengirimPesan, setMengirimPesan] = useState(false);
  const akhirPesan = useRef<HTMLDivElement>(null);

  /* ---------- pelacakan ---------- */
  const [lacak, setLacak] = useState('');
  const [melacak, setMelacak] = useState(false);
  const [galatLacak, setGalatLacak] = useState('');
  const [hasilAduan, setHasilAduan] = useState<ComplaintTracking | null>(null);
  const [hasilHilang, setHasilHilang] = useState<LostReportTracking | null>(null);

  // Pulihkan sesi chat yang tertinggal.
  useEffect(() => {
    const t = savedTicket();
    if (t) setTiketChat(t);
  }, []);

  useEffect(() => {
    akhirPesan.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* ---------- aksi ---------- */

  const petakanGalat = (errors?: Record<string, string[]>): Galat =>
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
      // Disisipkan langsung supaya gelembungnya tampil tanpa menunggu denyut
      // berikutnya; `appendLocal` menyaring duplikat berdasarkan id.
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

    // Awalan tiket menentukan endpointnya — pengunjung tidak perlu ingat
    // tiketnya berjenis apa, cukup menempelkan nomornya.
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

    if (jenis === 'information') {
      const res = await trackInformationRequest(t);
      setMelacak(false);
      if (res.ok) {
        // Permohonan informasi punya halamannya sendiri dengan tampilan
        // tenggat 10 hari kerja; di sini cukup diantar ke sana.
        window.location.href = `/ppid/pengajuan-informasi?ticket=${encodeURIComponent(t)}`;
      } else setGalatLacak(res.message);
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
    setGalatLacak('Nomor tiket tidak dikenali. Awalannya CHAT-, TKT-, PIP-, atau HLG-.');
  };

  const tutupChat = () => {
    clearTicket();
    setTiketChat(null);
  };

  /* ================================================================ */

  return (
    <div className="bg-slate-50 min-h-screen">
      <PpidHero
        title="Pusat"
        accent="Bantuan"
        subtitle="Bandar Udara APT Pranoto Samarinda"
        lead="Cari jawabannya sendiri, tanyakan langsung kepada petugas, sampaikan pengaduan resmi berlampiran bukti, atau laporkan barang yang tertinggal di bandara. Semua dapat dilacak dengan nomor tiket — tanpa perlu membuat akun."
        showBack={false}
      >
        {/* Lencana jam layanan dihitung dari waktu Samarinda yang sebenarnya.
            Sebelumnya nilainya tetap, sehingga tertulis "Online" pukul tiga pagi. */}
        <div className="mt-6 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm ring-1 ring-white/25 px-3.5 py-2 rounded-full">
          <span className={`w-2 h-2 rounded-full ${jamLayanan ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-[11.5px] font-bold text-white/95">
            {jamLayanan ? 'Petugas sedang bertugas' : 'Di luar jam layanan'} · 07.00–20.00 WITA
          </span>
        </div>
      </PpidHero>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* ============ LAPIS 1 — CARI JAWABAN ============ */}
        <motion.section variants={container} initial="hidden" animate="show">
          <motion.div variants={rise} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-[0.16em] bg-blue-50 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Langkah Pertama
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Mungkin jawabannya sudah ada
            </h2>
            <p className="mt-2 text-slate-500 text-[13.5px] leading-relaxed">
              Sebagian besar pertanyaan sudah terjawab di sini. Coba cari dulu — lebih cepat
              daripada menunggu balasan petugas.
            </p>
          </motion.div>

          <motion.div variants={rise} className="mt-6 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Contoh: tarif parkir, bagasi hilang, jam operasional..."
                aria-label="Cari jawaban"
                className="w-full bg-white rounded-2xl ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 pl-12 pr-11 py-4 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {cari && (
                <button
                  type="button"
                  onClick={() => setCari('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {cari.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 space-y-2.5"
                >
                  {hasilFaq.length === 0 ? (
                    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 text-center">
                      <p className="text-[13px] text-slate-600">
                        Tidak ada jawaban siap untuk &ldquo;{cari.trim()}&rdquo;.
                      </p>
                      <p className="mt-1 text-[12px] text-slate-400">
                        Silakan tanyakan langsung lewat formulir di bawah.
                      </p>
                    </div>
                  ) : (
                    hasilFaq.map((f) => {
                      const buka = faqTerbuka === f.id;
                      const Icon = f.icon;
                      return (
                        <div key={f.id} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setFaqTerbuka(buka ? null : f.id)}
                            aria-expanded={buka}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
                          >
                            <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </span>
                            <span className="flex-1 text-[13px] font-bold text-slate-800 leading-snug">
                              {f.question}
                            </span>
                            <motion.span animate={{ rotate: buka ? 180 : 0 }} className="flex-shrink-0">
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {buka && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                {/* Jawaban HTML dari panel admin; disaring lebih dulu. */}
                                <SafeHtml className="px-4 pb-4 pt-1 border-t border-slate-100 faq-answer" html={f.answerHtml} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}

                  <Link
                    href="/faq"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:text-blue-700 px-1"
                  >
                    Lihat seluruh FAQ <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.section>

        {/* ============ RUANG CHAT (bila ada sesi berjalan) ============ */}
        <AnimatePresence>
          {tiketChat && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
                <div className="bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] px-5 py-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white/12 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-cyan-200" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-black text-white truncate">
                      {thread?.subject ?? 'Percakapan'}
                    </p>
                    <p className="text-[11px] text-blue-100/80 font-mono">{tiketChat}</p>
                  </div>
                  {thread && <StatusChip status={thread.status} />}
                  <button
                    type="button"
                    onClick={tutupChat}
                    aria-label="Tutup percakapan"
                    className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tanpa `space-y-3`: jarak antarpesan kini urusan
                    `DaftarPesan`, yang merapatkan pesan berurutan dari
                    pengirim yang sama. */}
                <div className="h-[420px] overflow-y-auto bg-slate-50 px-4 py-4">
                  {loading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full gap-2 text-slate-400 text-[12.5px]">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Memuat percakapan...
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                      <CircleAlert className="w-6 h-6 text-rose-400" />
                      <p className="text-[13px] text-slate-600">{error}</p>
                      <button type="button" onClick={tutupChat} className="text-[12px] font-bold text-blue-600 cursor-pointer">
                        Mulai percakapan baru
                      </button>
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyChat />
                  ) : (
                    <DaftarPesan messages={messages} />
                  )}
                  <div ref={akhirPesan} />
                </div>

                <form onSubmit={kirimPesan} className="border-t border-slate-100 p-3 flex items-center gap-2">
                  <input
                    value={pesanBaru}
                    onChange={(e) => setPesanBaru(e.target.value)}
                    placeholder="Tulis pesan..."
                    aria-label="Tulis pesan"
                    className="flex-1 bg-slate-50 rounded-full ring-1 ring-slate-200 px-4 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={mengirimPesan || !pesanBaru.trim()}
                    aria-label="Kirim pesan"
                    className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Penilaian hanya ditawarkan setelah penanganannya selesai. */}
              {thread && isClosed(thread.status) && !isRated(tiketChat) && (
                <div className="mt-4">
                  <RatingPanel ticket={tiketChat} />
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ============ LAPIS 2 & 3 — INTAKE ============ */}
        {!tiketChat && (
          <motion.section
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            id="ajukan"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start scroll-mt-24"
          >
            <motion.div variants={rise} className="lg:col-span-2">
              <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                {/* Pemilih mode. Bertumpuk di layar sempit: tiga tab
                    bersebelahan pada lebar ponsel menyisakan sekitar 120 px per
                    tab, dan labelnya terpotong justru di bagian yang
                    membedakannya. */}
                <div className="flex flex-col sm:flex-row border-b border-slate-100 divide-y sm:divide-y-0 divide-slate-100">
                  {([
                    { id: 'chat' as Mode, label: 'Tanya Petugas', desc: 'Jawaban lewat percakapan', icon: MessageCircle },
                    { id: 'complaint' as Mode, label: 'Pengaduan Resmi', desc: 'Berlampiran foto, ditindaklanjuti', icon: FileWarning },
                    { id: 'lost' as Mode, label: 'Lapor Kehilangan', desc: 'Barang tertinggal di bandara', icon: PackageSearch },
                  ]).map((t) => {
                    const on = mode === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setMode(t.id); setGalat({}); setGalatUmum(''); }}
                        aria-pressed={on}
                        className={`relative flex-1 flex items-start gap-3 px-5 py-4 text-left transition-colors cursor-pointer ${
                          on ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-100'}`}>
                          <Icon className={`w-5 h-5 ${on ? 'text-white' : 'text-slate-400'}`} />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[13.5px] font-black ${on ? 'text-blue-700' : 'text-slate-700'}`}>
                            {t.label}
                          </span>
                          <span className="block text-[11.5px] text-slate-500 leading-snug mt-0.5">{t.desc}</span>
                        </span>
                        {on && (
                          <motion.span layoutId="intake-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-5 sm:p-6">
                  {!jamLayanan && mode === 'chat' && (
                    <div className="mb-5"><OutsideHoursNotice /></div>
                  )}

                  {galatUmum && (
                    <div className="mb-5 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 flex items-start gap-2.5">
                      <CircleAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[12.5px] font-semibold text-rose-700">{galatUmum}</p>
                    </div>
                  )}

                  {/* ---------- tiket laporan kehilangan terbit ---------- */}
                  {mode === 'lost' && tiketHilang ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 text-emerald-700">
                        <CircleCheck className="w-5 h-5" />
                        <p className="text-[14px] font-black">Laporan kehilangan Anda sudah kami terima</p>
                      </div>

                      <TicketStub
                        ticket={tiketHilang}
                        subtitle="Simpan nomor ini. Tempelkan pada kotak lacak di samping untuk melihat perkembangan pencariannya."
                      />

                      {/* Harapan yang jujur. Barang temuan kerap baru sampai ke
                          pos beberapa hari sesudah tertinggal, dan pelapor yang
                          mengira pencarian berlangsung seketika akan menyimpulkan
                          laporannya diabaikan. */}
                      <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 flex items-start gap-2.5">
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
                        className="text-[12.5px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Laporkan kehilangan lain
                      </button>
                    </div>
                  ) : mode === 'complaint' && tiketAduan ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 text-emerald-700">
                        <CircleCheck className="w-5 h-5" />
                        <p className="text-[14px] font-black">Pengaduan Anda sudah kami terima</p>
                      </div>

                      <TicketStub
                        ticket={tiketAduan}
                        subtitle="Simpan nomor ini. Tempelkan pada kotak lacak di samping untuk melihat perkembangan penanganannya."
                      />

                      <button
                        type="button"
                        onClick={() => setTiketAduan(null)}
                        className="text-[12.5px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Kirim pengaduan lain
                      </button>
                    </div>
                  ) : mode === 'chat' ? (
                    /* ---------- formulir chat ---------- */
                    <form onSubmit={mulaiChat} className="space-y-4" noValidate>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Surel" required={false} hint="Opsional — untuk kami hubungi bila perlu" error={galat.visitor_email}>
                          <input
                            type="email"
                            className={inputCls}
                            value={formChat.visitor_email}
                            onChange={(e) => setFormChat({ ...formChat, visitor_email: e.target.value })}
                            placeholder="nama@email.com"
                          />
                        </Field>

                        <Field label="Telepon" required={false} hint="Opsional" error={galat.visitor_phone}>
                          <input
                            className={inputCls}
                            value={formChat.visitor_phone}
                            onChange={(e) => setFormChat({ ...formChat, visitor_phone: e.target.value })}
                            placeholder="08xx xxxx xxxx"
                          />
                        </Field>
                      </div>

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
                          placeholder="Tuliskan pertanyaan selengkap mungkin agar petugas dapat langsung menjawabnya."
                        />
                      </Field>

                      <button
                        type="submit"
                        disabled={mengirim}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-[13.5px] px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
                      >
                        {mengirim ? 'Membuka percakapan...' : <>Mulai Percakapan <ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </form>
                  ) : mode === 'complaint' ? (
                    /* ---------- formulir pengaduan ---------- */
                    <form onSubmit={kirimAduan} className="space-y-4" noValidate>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Surel" hint="Tanggapan petugas dikirim ke sini" error={galat.reporter_email}>
                          <input
                            type="email"
                            className={inputCls}
                            value={formAduan.reporter_email}
                            onChange={(e) => setFormAduan({ ...formAduan, reporter_email: e.target.value })}
                            placeholder="nama@email.com"
                          />
                        </Field>

                        <Field label="Telepon" error={galat.reporter_phone}>
                          <input
                            className={inputCls}
                            value={formAduan.reporter_phone}
                            onChange={(e) => setFormAduan({ ...formAduan, reporter_phone: e.target.value })}
                            placeholder="08xx xxxx xxxx"
                          />
                        </Field>
                      </div>

                      <Field label="Subjek Pengaduan" error={galat.subject}>
                        <input
                          className={inputCls}
                          value={formAduan.subject}
                          onChange={(e) => setFormAduan({ ...formAduan, subject: e.target.value })}
                          placeholder="Contoh: Toilet terminal kedatangan tidak berfungsi"
                        />
                      </Field>

                      <Field label="Uraian Kejadian" hint="Sebutkan lokasi dan waktunya agar petugas dapat langsung menuju titiknya" error={galat.description}>
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
                        hint="Opsional, tetapi sangat membantu — foto keadaan di lapangan jauh lebih cepat ditindaklanjuti daripada uraian teks."
                        file={lampiran}
                        onPick={setLampiran}
                        error={galat.attachment}
                      />

                      <button
                        type="submit"
                        disabled={mengirim}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-[13.5px] px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
                      >
                        {mengirim ? 'Mengirim...' : <>Kirim Pengaduan <Paperclip className="w-4 h-4" /></>}
                      </button>
                    </form>
                  ) : (
                    /* ---------- formulir lapor kehilangan ---------- */
                    <form onSubmit={kirimLaporanHilang} className="space-y-4" noValidate>
                      <div className="rounded-xl bg-blue-50 ring-1 ring-blue-200 px-4 py-3 flex items-start gap-2.5">
                        <PackageSearch className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] text-blue-900 leading-relaxed">
                          Semakin rinci ciri-ciri barang yang Anda sebutkan, semakin besar
                          kemungkinan petugas mengenalinya di antara barang temuan lain.
                          Sebutkan merek, warna, dan tanda khusus yang hanya Anda ketahui.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className={inputCls}
                            value={formHilang.reporter_phone}
                            onChange={(e) => setFormHilang({ ...formHilang, reporter_phone: e.target.value })}
                            placeholder="08xx xxxx xxxx"
                          />
                        </Field>
                      </div>

                      {/* `required={false}` — tanpa itu `Field` memasang tanda
                          bintang merah di sebelah label yang keterangannya
                          berbunyi "Opsional". */}
                      <Field label="Surel" hint="Opsional" required={false} error={galat.reporter_email}>
                        <input
                          type="email"
                          className={inputCls}
                          value={formHilang.reporter_email}
                          onChange={(e) => setFormHilang({ ...formHilang, reporter_email: e.target.value })}
                          placeholder="nama@email.com"
                        />
                      </Field>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

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

                      <button
                        type="submit"
                        disabled={mengirim}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-[13.5px] px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
                      >
                        {mengirim ? 'Mengirim...' : <>Kirim Laporan <PackageSearch className="w-4 h-4" /></>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ---------- kolom kanan: lacak + kanal lain ---------- */}
            <motion.div variants={rise} className="space-y-5">
              <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5 text-violet-600" />
                  </span>
                  <div>
                    <h3 className="text-[14px] font-black text-slate-900">Lacak Tiket</h3>
                    <p className="text-[11.5px] text-slate-500">
                      Chat, pengaduan, permohonan informasi, atau laporan kehilangan
                    </p>
                  </div>
                </div>

                <form onSubmit={jalankanLacak} className="mt-4 space-y-2.5">
                  <input
                    value={lacak}
                    onChange={(e) => setLacak(e.target.value)}
                    placeholder="CHAT-… / TKT-… / PIP-… / HLG-…"
                    aria-label="Nomor tiket"
                    className={`${inputCls} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                  />

                  <button
                    type="submit"
                    disabled={melacak || !lacak.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-[13px] py-3 rounded-full transition-colors cursor-pointer"
                  >
                    {melacak ? 'Mencari...' : <>Lacak <Search className="w-3.5 h-3.5" /></>}
                  </button>

                  {galatLacak && (
                    <p className="flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600">
                      <CircleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {galatLacak}
                    </p>
                  )}
                </form>

                {/* hasil pelacakan pengaduan */}
                <AnimatePresence>
                  {hasilAduan && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-900 leading-snug">{hasilAduan.subject}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{hasilAduan.ticket_number}</p>
                          </div>
                          <StatusChip status={hasilAduan.status} />
                        </div>

                        {hasilAduan.attachment_url && (
                          <a
                            href={hasilAduan.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> Lihat foto terlampir
                          </a>
                        )}

                        {hasilAduan.admin_response ? (
                          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
                            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                              Tanggapan Petugas
                            </p>
                            <p className="mt-1 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {hasilAduan.admin_response}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11.5px] text-slate-400 leading-relaxed">
                            Belum ada tanggapan. Pengaduan Anda sudah masuk antrean penanganan.
                          </p>
                        )}

                        {isClosed(hasilAduan.status) && !isRated(hasilAduan.ticket_number) && (
                          <RatingPanel ticket={hasilAduan.ticket_number} />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* hasil pelacakan laporan kehilangan */}
                <AnimatePresence>
                  {hasilHilang && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-900 leading-snug">
                              {hasilHilang.category}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {hasilHilang.ticket_number}
                            </p>
                          </div>
                          {/* Lencana status memakai palet `STATUS_LAPORAN`, bukan
                              `StatusChip` — status laporan kehilangan berbeda
                              dari status pengaduan, dan memaksakan satu komponen
                              untuk keduanya akan menampilkan label yang keliru. */}
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
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-blue-600 hover:text-blue-700"
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* kanal alternatif — ditonjolkan di luar jam layanan */}
              <div className={`rounded-3xl p-5 ring-1 ${jamLayanan ? 'bg-white ring-slate-200' : 'bg-amber-50/60 ring-amber-200'}`}>
                <h3 className="text-[14px] font-black text-slate-900">Kanal Lain</h3>
                <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">
                  {jamLayanan
                    ? 'Selain lewat portal, Anda dapat menghubungi kami melalui:'
                    : 'Petugas sedang tidak bertugas. Kanal berikut tetap dapat digunakan:'}
                </p>

                <ul className="mt-3 space-y-2">
                  {ALT_CHANNELS.map((k) => (
                    <li key={k.name}>
                      {k.href ? (
                        k.external ? (
                          <a
                            href={k.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-start gap-2 text-[12.5px] text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-blue-600" />
                            <span>
                              <span className="font-bold block">{k.name}</span>
                              <span className="text-[11px] text-slate-500">{k.desc}</span>
                            </span>
                          </a>
                        ) : (
                          <Link
                            href={k.href}
                            className="group flex items-start gap-2 text-[12.5px] text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-blue-600" />
                            <span>
                              <span className="font-bold block">{k.name}</span>
                              <span className="text-[11px] text-slate-500">{k.desc}</span>
                            </span>
                          </Link>
                        )
                      ) : (
                        <span className="flex items-start gap-2 text-[12.5px] text-slate-600">
                          <span className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            <span className="font-bold block">{k.name}</span>
                            <span className="text-[11px] text-slate-500">{k.desc}</span>
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.section>
        )}
      </div>

      {/* ============ PENUTUP ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#123a8f]">
        <FlightArc className="absolute inset-x-0 top-4 h-44 text-white/12" d="M-20 190 Q 420 40 1020 120" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">Butuh dokumen resmi bandara?</h2>
          <p className="mt-2 text-[13.5px] text-blue-100/85 leading-relaxed max-w-xl mx-auto">
            Permintaan salinan dokumen diatur UU 14/2008 dan ditangani PPID lewat jalur tersendiri,
            dengan tenggat 10 hari kerja.
          </p>
          <Link
            href="/ppid/pengajuan-informasi"
            className="mt-5 inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[13.5px] px-5 py-3 rounded-full shadow-lg transition-colors"
          >
            Ajukan Permohonan Informasi <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
