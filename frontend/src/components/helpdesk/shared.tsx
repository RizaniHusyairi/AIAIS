'use client';

/**
 * Bagian Pusat Bantuan yang dipakai bersama halaman web dan layar PWA.
 *
 * Segala sesuatu di berkas ini muncul di dua tempat. Kalau sebuah bagian
 * hanya dipakai satu tempat, ia tidak seharusnya ada di sini — biarkan di
 * berkas halamannya sendiri.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Send, Copy, Check, Clock, CircleCheck, CircleAlert, MessageCircle,
} from 'lucide-react';
import { submitRating, markRated, type Hasil } from '@/lib/helpdesk';
import type { ChatMessage, ChatStatus, ComplaintStatus } from '@/types';

/* ================================================================
   Lencana status — satu palet untuk seluruh kanal
   ================================================================ */

type AnyStatus = ChatStatus | ComplaintStatus;

export const STATUS_META: Record<AnyStatus, { label: string; chip: string; dot: string }> = {
  // chat
  open: { label: 'Menunggu balasan petugas', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  active: { label: 'Sedang ditangani', chip: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  resolved: { label: 'Selesai', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Sesi ditutup', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  // pengaduan
  submitted: { label: 'Diterima, menunggu diproses', chip: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'Sedang ditindaklanjuti', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  rejected: { label: 'Tidak dapat ditindaklanjuti', chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

export function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status as AnyStatus] ?? {
    label: status,
    chip: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${meta.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** Status yang berarti penanganan sudah selesai — hanya ini yang boleh dinilai. */
export const isClosed = (status?: string) =>
  ['resolved', 'closed', 'rejected', 'fulfilled'].includes(String(status));

/* ================================================================
   Potongan tiket bergaya boarding pass
   ================================================================ */

export function TicketStub({ ticket, subtitle }: { ticket: string; subtitle?: string }) {
  const [disalin, setDisalin] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(ticket);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2000);
    } catch {
      /* peramban tanpa izin papan klip — nomornya tetap terbaca di layar */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1e5b] to-[#123a8f] text-white p-5">
      {/* takik perforasi tiket */}
      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50" aria-hidden="true" />
      <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50" aria-hidden="true" />

      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-cyan-200">Nomor Tiket</p>

      <div className="mt-1.5 flex items-center gap-3">
        <p className="text-[19px] sm:text-[22px] font-black tracking-tight font-mono">{ticket}</p>
        <button
          type="button"
          onClick={salin}
          className="w-8 h-8 rounded-lg bg-white/12 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          aria-label="Salin nomor tiket"
        >
          {disalin ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <p className="mt-2 text-[11.5px] text-blue-100/85 leading-relaxed">
        {subtitle ?? 'Simpan nomor ini untuk melacak penanganan tanpa perlu membuat akun.'}
      </p>
    </div>
  );
}

/* ================================================================
   Gelembung percakapan
   ================================================================ */

const jam = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' })
    : '';

/**
 * Satu gelembung pesan.
 *
 * `rapat` menyatakan pesan ini menyusul pesan lain dari pengirim yang sama, dan
 * `akhirGrup` menyatakan ia yang terakhir dalam giliran itu. Nama dan jam hanya
 * dicetak sekali di KAKI giliran — bukan di tiap gelembung, dan bukan pula di
 * kepalanya, karena yang ingin diketahui pembaca adalah kapan giliran itu
 * berakhir. Tanpa ini, tiap baris mengulang "Anda · 11.41 WITA".
 */
export function MessageBubble({
  msg, rapat = false, akhirGrup = true,
}: {
  msg: ChatMessage;
  rapat?: boolean;
  akhirGrup?: boolean;
}) {
  const dariPetugas = msg.sender_type === 'admin';

  return (
    <motion.div
      /* Masuk dari sisi pengirimnya masing-masing; pegas pendek supaya terasa
         seperti pesan yang mendarat, bukan panel yang memudar. */
      initial={{ opacity: 0, y: 10, x: dariPetugas ? -10 : 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`flex ${dariPetugas ? 'justify-start' : 'justify-end'} ${rapat ? 'mt-1' : 'mt-3'}`}
    >
      <div className="max-w-[82%] min-w-0">
        <div
          className={`px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
            dariPetugas
              ? `bg-white ring-1 ring-slate-200 text-slate-700 shadow-slate-200/70 ${
                  rapat ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tl-sm'
                }`
              : `bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-blue-600/25 ${
                  rapat ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tr-sm'
                }`
          }`}
        >
          {msg.message}
        </div>

        {akhirGrup && (
          <p className={`mt-1 text-[10.5px] text-slate-400 ${dariPetugas ? 'text-left' : 'text-right'}`}>
            {dariPetugas ? msg.sender_name : 'Anda'} · {jam(msg.created_at)} WITA
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Penanda hari di antara pesan.
 *
 * Percakapan bantuan kerap menggantung semalam: warga bertanya sore, petugas
 * membalas pagi berikutnya. Tanpa penanda ini keduanya terbaca berurutan
 * dalam hitungan detik.
 */
export function PemisahHari({ iso }: { iso: string }) {
  const d = new Date(iso);
  const hariIni = new Date();
  const sama = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const kemarin = new Date(hariIni);
  kemarin.setDate(kemarin.getDate() - 1);

  const label = sama(d, hariIni)
    ? 'Hari ini'
    : sama(d, kemarin)
      ? 'Kemarin'
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-3 my-4" aria-hidden="true">
      <span className="flex-1 h-px bg-slate-200" />
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

/**
 * Seluruh isi percakapan: penanda hari, pengelompokan, dan gelembungnya.
 *
 * Dipakai halaman web DAN layar PWA. Sebelumnya keduanya memetakan
 * `messages.map(...)` sendiri-sendiri, sehingga tiap perbaikan tampilan
 * percakapan harus dikerjakan dua kali — dan pengelompokan seperti ini akan
 * menyimpang di antara keduanya pada suntingan pertama.
 */
export function DaftarPesan({ messages }: { messages: ChatMessage[] }) {
  return (
    <>
      {messages.map((m, i) => {
        const sebelum = messages[i - 1];
        const sesudah = messages[i + 1];

        const hariBaru =
          !sebelum ||
          new Date(sebelum.created_at).toDateString() !== new Date(m.created_at).toDateString();

        /* Satu giliran bicara: pengirim sama, hari sama, jarak kurang dari
           lima menit. */
        const seGiliran = (a?: ChatMessage, b?: ChatMessage) =>
          !!a && !!b &&
          a.sender_type === b.sender_type &&
          new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString() &&
          Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < 5 * 60 * 1000;

        const rapat = !hariBaru && seGiliran(sebelum, m);
        const akhirGrup = !seGiliran(m, sesudah);

        return (
          <React.Fragment key={m.id}>
            {hariBaru && <PemisahHari iso={m.created_at} />}
            <MessageBubble msg={m} rapat={rapat} akhirGrup={akhirGrup} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Tiga titik "menunggu balasan".
 *
 * SENGAJA BUKAN "petugas sedang mengetik". Portal ini tidak punya kanal
 * langsung ke papan ketik petugas — denyutnya lima detik sekali dan hanya
 * membawa pesan yang sudah terkirim. Menampilkan indikator mengetik berarti
 * mengarang keadaan yang tidak diketahui, dan warga akan menunggu balasan yang
 * belum tentu sedang ditulis.
 */
export function MenungguBalasan() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start mt-3"
    >
      <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm shadow-slate-200/70">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-300"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
          />
        ))}
        <span className="ml-1 text-[11.5px] text-slate-400">Menunggu balasan petugas</span>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Penilaian kepuasan
   ================================================================ */

const NILAI_LABEL = ['', 'Sangat tidak puas', 'Tidak puas', 'Cukup', 'Puas', 'Sangat puas'];

/**
 * Panel penilaian, muncul hanya saat penanganan tiket sudah selesai.
 *
 * Hasilnya menjadi angka Survei Kepuasan Masyarakat yang selama ini disebut
 * pada halaman Standar Pelayanan tanpa pernah dikumpulkan. Backend menolak
 * penilaian atas tiket yang belum selesai maupun yang sudah pernah dinilai —
 * penjagaan di sini hanya untuk kenyamanan, bukan pengaman.
 */
export function RatingPanel({ ticket, onDone }: { ticket: string; onDone?: () => void }) {
  const [skor, setSkor] = useState(0);
  const [hover, setHover] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [kirim, setKirim] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [galat, setGalat] = useState('');

  const simpan = async () => {
    if (skor < 1) {
      setGalat('Pilih dulu jumlah bintangnya.');
      return;
    }

    setKirim(true);
    setGalat('');
    const res: Hasil<{ score: number }> = await submitRating(ticket, skor, komentar);
    setKirim(false);

    if (!res.ok) {
      setGalat(res.message);
      return;
    }

    markRated(ticket);
    setSelesai(true);
    onDone?.();
  };

  if (selesai) {
    return (
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-5 flex items-start gap-3">
        <CircleCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13.5px] font-black text-emerald-900">Terima kasih atas penilaian Anda</p>
          <p className="mt-0.5 text-[12px] text-emerald-800/80 leading-relaxed">
            Masukan ini kami pakai untuk memperbaiki layanan bandara.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
      <p className="text-[13.5px] font-black text-slate-900">Bagaimana penanganan tiket ini?</p>
      <p className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">
        Penilaian Anda menjadi bagian dari Survei Kepuasan Masyarakat bandara.
      </p>

      <div className="mt-4 flex items-center gap-1.5" role="radiogroup" aria-label="Nilai kepuasan">
        {[1, 2, 3, 4, 5].map((n) => {
          const aktif = n <= (hover || skor);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={skor === n}
              aria-label={`${n} bintang — ${NILAI_LABEL[n]}`}
              onClick={() => setSkor(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1 cursor-pointer transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 transition-colors ${aktif ? 'text-amber-400' : 'text-slate-300'}`}
                fill={aktif ? 'currentColor' : 'none'}
              />
            </button>
          );
        })}

        <span className="ml-2 text-[12px] font-semibold text-slate-600">
          {NILAI_LABEL[hover || skor] || ''}
        </span>
      </div>

      <textarea
        value={komentar}
        onChange={(e) => setKomentar(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Ceritakan pengalaman Anda (opsional)"
        className="mt-3 w-full px-4 py-3 bg-slate-50 rounded-xl ring-1 ring-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
      />

      {galat && (
        <p className="mt-2 flex items-start gap-1.5 text-[11.5px] font-semibold text-rose-600">
          <CircleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> {galat}
        </p>
      )}

      <button
        type="button"
        onClick={simpan}
        disabled={kirim}
        className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-[13px] px-5 py-2.5 rounded-full transition-colors cursor-pointer"
      >
        {kirim ? 'Mengirim...' : <>Kirim Penilaian <Send className="w-3.5 h-3.5" /></>}
      </button>
    </div>
  );
}

/* ================================================================
   Kanal alternatif
   ================================================================ */

export const ALT_CHANNELS = [
  {
    name: 'SP4N-LAPOR!',
    desc: 'Kanal pengaduan nasional milik pemerintah',
    // Tanpa `www` — host `www.lapor.go.id` tidak ada. Lihat lib/relatedLinks.ts.
    href: 'https://lapor.go.id/',
    external: true,
  },
  {
    name: 'Instagram @aptpranotoairport',
    desc: 'Pesan langsung ke akun resmi bandara',
    href: 'https://www.instagram.com/aptpranotoairport',
    external: true,
  },
  {
    name: 'Permohonan Informasi Publik',
    desc: 'Untuk permintaan dokumen resmi (UU 14/2008)',
    href: '/ppid/pengajuan-informasi',
    external: false,
  },
  {
    name: 'Kotak saran terminal',
    desc: 'Tersedia di area kedatangan dan keberangkatan',
    href: null,
    external: false,
  },
] as const;

/**
 * Pemberitahuan di luar jam layanan.
 *
 * Tidak menghalangi pengiriman — pesan tetap masuk antrean dan dijawab pada
 * jam kerja berikutnya. Yang penting pengunjung tahu itu sejak awal, bukan
 * menunggu balasan yang tidak akan datang malam itu juga.
 */
export function OutsideHoursNotice() {
  return (
    <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex items-start gap-3">
      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] font-black text-amber-900">Di luar jam layanan</p>
        <p className="mt-0.5 text-[12px] text-amber-800/85 leading-relaxed">
          Petugas bertugas pukul 07.00–20.00 WITA. Pesan Anda tetap kami terima dan akan
          dijawab pada jam layanan berikutnya. Untuk keadaan mendesak, gunakan kanal di bawah.
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   Keadaan kosong percakapan
   ================================================================ */

export function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-blue-600/25 flex items-center justify-center"
      >
        <MessageCircle className="w-7 h-7 text-white" />
        {/* Denyut halus — menandakan ruangnya hidup dan sedang menunggu, bukan
            layar yang gagal memuat. */}
        <motion.span
          className="absolute inset-0 rounded-2xl ring-2 ring-sky-400/50"
          animate={{ scale: [1, 1.28], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.span>
      <p className="mt-4 text-[13.5px] font-bold text-slate-700">Percakapan dimulai</p>
      <p className="mt-1 text-[11.5px] text-slate-400 max-w-[15rem] leading-relaxed">
        Tulis pertanyaan Anda di bawah. Petugas menjawab pada jam layanan 07.00–20.00 WITA.
      </p>
    </div>
  );
}

export { AnimatePresence };
