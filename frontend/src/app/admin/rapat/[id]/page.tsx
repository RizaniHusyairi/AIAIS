'use client';

/**
 * Rincian satu rapat beserta daftar hadirnya.
 *
 * KENAPA HALAMAN, BUKAN MODAL. Sebelumnya daftar peserta, penutupan absensi,
 * dan cetakan PDF menempel sebagai tiga ikon kecil pada baris tabel, dan
 * pesertanya dibuka di dalam modal. Tiga hal itu adalah pekerjaan yang berbeda
 * dari *mengelola daftar rapat*: satu rapat bisa berisi puluhan nama, tiap
 * nama punya tanda tangan yang mungkin perlu diperiksa satu per satu, dan
 * modal setinggi layar bukan tempat untuk itu. Barisnya kini hanya menawarkan
 * satu pintu — "Detail" — dan seluruh perkakas per-rapat tinggal di sini.
 *
 * SATU PERMINTAAN, SATU SUMBER. Identitas rapat, jumlah kehadiran, dan seluruh
 * pesertanya datang dari `GET /admin/meetings/{id}` yang sama. Tidak ada angka
 * yang dihitung ulang dari sumber lain, jadi ringkasan dan tabelnya mustahil
 * berselisih.
 *
 * TAUTAN DAN QR DITAMPILKAN LANGSUNG, tidak lagi di balik modal seperti pada
 * halaman daftar. Alasan menyembunyikannya di sana tetap berlaku — tabel rapat
 * kerap terbuka di layar yang terlihat umum — tetapi halaman ini dibuka dengan
 * sengaja untuk satu rapat tertentu, dan di situlah petugas memang sedang
 * bersiap membagikan tautannya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import QrTautan from '@/components/admin/QrTautan';
import type { Meeting, Attendance } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  CalendarCheck, ArrowLeft, RefreshCw, Users, DoorOpen, DoorClosed, Printer,
  Pencil, Trash2, Download, Copy, RotateCcw, PenLine, CalendarDays, Clock,
  MapPin, UserCog, TriangleAlert,
} from 'lucide-react';

/* ================================================================
   Bentuk tanggal & waktu
   ================================================================ */

/** Zona bandara. Cap waktu tersimpan dalam UTC; yang dibaca petugas WITA. */
const ZONA = 'Asia/Makassar';

const tglPanjang = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const tglPendek = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Jam kehadiran dalam waktu bandara.
 *
 * `timeZone` WAJIB. Tanpa itu jamnya mengikuti zona komputer petugas — dan
 * daftar hadir yang sama akan terbaca berbeda di laptop yang zonanya belum
 * disetel, sementara cetakan PDF-nya (yang memakai `CetakanPdf::waktu`) tetap
 * WITA. Dua angka berbeda untuk kehadiran yang sama adalah cacat bukti.
 */
const jamHadir = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: ZONA, hour: '2-digit', minute: '2-digit',
  });

const tglHadir = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    timeZone: ZONA, day: 'numeric', month: 'short',
  });

/**
 * Alamat gambar tanda tangan.
 *
 * Ditulis apa adanya sebagai `src` sebuah `<img>`, bukan diambil lewat
 * `adminFetch`. Berkasnya ada di cakram PRIVAT dan hanya dilayani endpoint
 * admin, tetapi proksi `/api/admin/*` di sisi server Next-lah yang memasang
 * tokennya dari cookie `httpOnly` — jadi permintaan gambar biasa pun ikut
 * terautentikasi, tanpa satu pun nilai token menyentuh skrip di halaman.
 *
 * Konsekuensinya: jangan pernah menyusun alamat ini langsung ke `API_BASE_URL`.
 * Tanpa proksinya, permintaan gambar berangkat tanpa kredensial dan yang
 * tampil hanyalah gambar rusak.
 */
const urlTtd = (a: Attendance) => `/api/admin/attendances/${a.id}/signature`;

/* ================================================================
   Potongan tampilan
   ================================================================ */

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
};

/** Satu keterangan rapat, bergaya medan boarding pass. */
function Medan({
  icon: Icon,
  label,
  value,
  catatan,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  catatan?: string | null;
}) {
  return (
    <motion.div variants={rise} className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--adm-dim)]">
        <Icon className="w-3 h-3 flex-shrink-0" />
        {label}
      </p>
      <p className="mt-1.5 text-[13px] font-bold text-[var(--adm-fg)] leading-snug break-words">{value}</p>
      {catatan && <p className="mt-0.5 text-[11px] text-[var(--adm-dim)]">{catatan}</p>}
    </motion.div>
  );
}

/**
 * Kurva kedatangan peserta.
 *
 * Digambar sendiri sebagai SVG, bukan lewat Recharts: datanya paling banyak
 * beberapa puluh titik dan bentuknya satu garis naik: memuat pustaka grafik
 * untuk itu adalah ongkos yang tidak dibayar apa pun.
 *
 * Yang ditunjukkannya nyata dan tidak terbaca dari tabel: apakah peserta
 * datang serentak menjelang rapat dimulai, atau menetes sepanjang acara —
 * dan pada jam berapa nama terakhir masuk.
 */
function KurvaKedatangan({ peserta }: { peserta: Attendance[] }) {
  const titik = useMemo(() => {
    const urut = [...peserta].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const awal = new Date(urut[0].created_at).getTime();
    const akhir = new Date(urut[urut.length - 1].created_at).getTime();
    const rentang = Math.max(akhir - awal, 1);

    return urut.map((a, i) => ({
      x: ((new Date(a.created_at).getTime() - awal) / rentang) * 100,
      y: ((i + 1) / urut.length) * 100,
      nama: a.name,
      jam: jamHadir(a.created_at),
    }));
  }, [peserta]);

  const garis = titik.map((t) => `${t.x},${100 - t.y}`).join(' ');

  return (
    <div className="px-5 py-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[10.5px] font-black uppercase tracking-[0.16em] text-[var(--adm-dim)]">
          Kurva Kedatangan
        </p>
        <p className="text-[11px] text-[var(--adm-dim)] tabular-nums">
          {titik[0].jam} – {titik[titik.length - 1].jam} WITA
        </p>
      </div>

      <div className="relative h-24">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {/* garis bantu */}
          {[0, 50, 100].map((y) => (
            <line
              key={y} x1="0" y1={y} x2="100" y2={y}
              stroke="var(--adm-line)" strokeWidth="0.4" strokeDasharray="2 2" vectorEffect="non-scaling-stroke"
            />
          ))}

          <motion.polyline
            points={garis}
            fill="none"
            stroke="var(--adm-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />

          {titik.map((t, i) => (
            <motion.circle
              key={i}
              cx={t.x} cy={100 - t.y} r="3.2"
              fill="var(--adm-accent)"
              vectorEffect="non-scaling-stroke"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.03, type: 'spring', stiffness: 400, damping: 20 }}
            >
              <title>{`${t.nama} · ${t.jam} WITA`}</title>
            </motion.circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ================================================================
   Halaman
   ================================================================ */

const KOSONG = { title: '', date: '', start_time: '', location: '', organizer: '', organizer_nip: '' };

export default function AdminRapatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [rapat, setRapat] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);

  const [tautan, setTautan] = useState<string>('');
  const [putarBuka, setPutarBuka] = useState(false);

  const [form, setForm] = useState(KOSONG);
  const [ubahBuka, setUbahBuka] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hapusRapat, setHapusRapat] = useState(false);
  const [hapusPeserta, setHapusPeserta] = useState<Attendance | null>(null);
  const [pratinjau, setPratinjau] = useState<Attendance | null>(null);

  const muat = async () => {
    const res = await adminFetch<Meeting>(`/meetings/${id}`);

    if (res.ok && res.data) setRapat(res.data);
    else setToast({ text: res.message, kind: 'error' });

    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;

    let batal = false;

    (async () => {
      const [rincian, token] = await Promise.all([
        adminFetch<Meeting>(`/meetings/${id}`),
        adminFetch<{ token: string; path: string }>(`/meetings/${id}/token`),
      ]);

      if (batal) return;

      if (rincian.ok && rincian.data) setRapat(rincian.data);
      if (token.ok && token.data) setTautan(`${window.location.origin}${token.data.path}`);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, [id]);

  const peserta = useMemo(() => rapat?.attendances ?? [], [rapat]);

  const terlihat = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return peserta;

    return peserta.filter((a) =>
      a.name.toLowerCase().includes(s)
      || a.department.toLowerCase().includes(s)
      || (a.phone ?? '').toLowerCase().includes(s));
  }, [peserta, q]);

  const stats = useMemo(() => ({
    total: peserta.length,
    berTtd: peserta.filter((a) => a.has_signature).length,
    tanpaTtd: peserta.filter((a) => !a.has_signature).length,
    unit: new Set(peserta.map((a) => a.department.trim().toLowerCase())).size,
  }), [peserta]);

  /* ---------------------- tindakan ---------------------- */

  const toggle = async () => {
    const res = await adminFetch(`/meetings/${id}/toggle`, { method: 'PUT' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const cetak = async () => {
    if (!rapat) return;

    const res = await adminDownload(`/meetings/${id}/pdf`, `daftar-hadir-${rapat.slug}.pdf`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const unduhTtd = async (a: Attendance) => {
    const res = await adminDownload(`/attendances/${a.id}/signature`, `ttd-${a.name}.png`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const putarTautan = async () => {
    setPutarBuka(false);

    const res = await adminFetch<{ path: string }>(`/meetings/${id}/rotate-token`, { method: 'POST' });

    if (res.ok && res.data) {
      setTautan(`${window.location.origin}${res.data.path}`);
      setToast({ text: res.message, kind: 'success' });
    } else setToast({ text: res.message, kind: 'error' });
  };

  const simpan = async () => {
    setSaving(true);

    const body = { ...form, organizer_nip: form.organizer_nip.trim() || null };
    const res = await adminFetch(`/meetings/${id}`, { method: 'PUT', body });
    setSaving(false);

    if (res.ok) {
      setUbahBuka(false);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const buangPeserta = async () => {
    if (!hapusPeserta) return;

    const res = await adminFetch(`/attendances/${hapusPeserta.id}`, { method: 'DELETE' });
    setHapusPeserta(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const buangRapat = async () => {
    const res = await adminFetch(`/meetings/${id}`, { method: 'DELETE' });
    setHapusRapat(false);

    if (res.ok) router.push('/admin/rapat');
    else setToast({ text: res.message, kind: 'error' });
  };

  /* ---------------------- tampilan ---------------------- */

  if (loading) {
    return (
      <>
        <PageHeader icon={CalendarCheck} title="Rincian Rapat" subtitle="Memuat daftar hadirnya..." />
        <Panel><Loading /></Panel>
      </>
    );
  }

  if (!rapat) {
    return (
      <>
        <PageHeader
          icon={CalendarCheck}
          title="Rapat tidak ditemukan"
          subtitle="Rapat ini mungkin sudah dihapus petugas lain."
          action={
            <Link href="/admin/rapat">
              <Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Daftar Rapat</Btn>
            </Link>
          }
        />
        <Panel>
          <EmptyState text="Rincian tidak dapat dimuat" hint="Kembali ke daftar rapat, lalu muat ulang." />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        title={rapat.title}
        subtitle={`${tglPanjang(rapat.date)} · ${rapat.start_time?.slice(0, 5) ?? '—'} WITA · ${rapat.location}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/rapat">
              <Btn variant="ghost"><ArrowLeft className="w-4 h-4" /> Daftar Rapat</Btn>
            </Link>
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
          </div>
        }
      />

      {/* ================= RINGKASAN ================= */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Kehadiran" value={stats.total} icon={Users} accent="#38bdf8" />
        <StatCard
          label="Bertanda Tangan"
          value={stats.berTtd}
          icon={PenLine}
          accent="#34d399"
          hint={stats.tanpaTtd > 0 ? `${stats.tanpaTtd} tanpa tanda tangan` : 'Seluruhnya lengkap'}
        />
        <StatCard label="Unit Kerja" value={stats.unit} icon={UserCog} accent="#a78bfa" hint="Instansi berbeda yang hadir" />
        <StatCard
          label="Status Absensi"
          value={rapat.is_active ? 'Terbuka' : 'Ditutup'}
          icon={rapat.is_active ? DoorOpen : DoorClosed}
          accent={rapat.is_active ? '#34d399' : '#fbbf24'}
          hint={rapat.is_active ? 'Masih menerima tanda tangan' : 'Tidak menerima tanda tangan baru'}
        />
      </motion.div>

      {/* Peringatan yang benar-benar perlu ditindaklanjuti: rapat yang sudah
          lewat tetapi absensinya lupa ditutup masih dapat diisi siapa pun. */}
      {rapat.is_active && new Date(rapat.date) < new Date(new Date().toDateString()) && (
        <div className="mt-4">
          <InfoNote>
            <strong>Absensi rapat ini masih terbuka</strong> padahal tanggalnya sudah lewat. Selama
            terbuka, siapa pun yang memegang tautannya masih dapat menambahkan tanda tangan.
            Tutup absensinya agar daftar hadir ini menjadi final.
          </InfoNote>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ================= RINCIAN + TINDAKAN ================= */}
        <div className="xl:col-span-2 space-y-4">
          <Panel title="Rincian Rapat">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-5 px-5 py-5"
            >
              <Medan icon={CalendarDays} label="Hari / Tanggal" value={tglPanjang(rapat.date)} />
              <Medan icon={Clock} label="Jam Mulai" value={`${rapat.start_time?.slice(0, 5) ?? '—'} WITA`} />
              <Medan icon={MapPin} label="Tempat" value={rapat.location} />
              <Medan
                icon={UserCog}
                label="Penyelenggara"
                value={rapat.organizer}
                catatan={rapat.organizer_nip ? `NIP ${rapat.organizer_nip}` : null}
              />
              <Medan icon={Users} label="Tercatat Hadir" value={`${stats.total} orang`} />
              <motion.div variants={rise} className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--adm-dim)]">
                  <DoorOpen className="w-3 h-3 flex-shrink-0" /> Status
                </p>
                <span className="mt-1.5 inline-block">
                  <Badge
                    text={rapat.is_active ? 'Absensi Terbuka' : 'Absensi Ditutup'}
                    color={rapat.is_active ? '#34d399' : '#94a3b8'}
                  />
                </span>
              </motion.div>
            </motion.div>

            {/* Tindakan per-rapat, seluruhnya berkumpul di sini. */}
            <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-[var(--adm-line)]">
              <Btn onClick={toggle}>
                {rapat.is_active
                  ? <><DoorClosed className="w-4 h-4" /> Tutup Absensi</>
                  : <><DoorOpen className="w-4 h-4" /> Buka Kembali Absensi</>}
              </Btn>
              <Btn variant="ghost" onClick={cetak}>
                <Printer className="w-4 h-4" /> Cetak Daftar Hadir
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setForm({
                    title: rapat.title,
                    date: String(rapat.date).slice(0, 10),
                    start_time: rapat.start_time?.slice(0, 5) ?? '',
                    location: rapat.location,
                    organizer: rapat.organizer,
                    organizer_nip: rapat.organizer_nip ?? '',
                  });
                  setUbahBuka(true);
                }}
              >
                <Pencil className="w-4 h-4" /> Ubah Rapat
              </Btn>
              <Btn variant="danger" onClick={() => setHapusRapat(true)}>
                <Trash2 className="w-4 h-4" /> Hapus Rapat
              </Btn>
            </div>
          </Panel>

          {/* Kurva hanya berarti bila ada lebih dari satu kedatangan; satu
              titik bukan kurva, dan nol titik bukan apa-apa. */}
          {peserta.length > 1 && <Panel title="Pola Kedatangan"><KurvaKedatangan peserta={peserta} /></Panel>}
        </div>

        {/* ================= TAUTAN & QR ================= */}
        <Panel title="Tautan Daftar Hadir">
          <div className="px-5 py-5 space-y-4">
            {tautan ? (
              <>
                <QrTautan
                  url={tautan}
                  judul={rapat.title}
                  detail={[
                    { label: 'Tanggal', value: tglPendek(rapat.date) },
                    { label: 'Waktu', value: `${rapat.start_time?.slice(0, 5) ?? '—'} WITA` },
                    { label: 'Tempat', value: rapat.location },
                    { label: 'Penyelenggara', value: rapat.organizer },
                  ]}
                  namaBerkas={`qr-absensi-${rapat.id}`}
                />

                <div className="flex gap-2">
                  <input
                    readOnly
                    value={tautan}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12px] text-[var(--adm-fg)] font-mono"
                  />
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard?.writeText(tautan);
                      setToast({ text: 'Tautan disalin', kind: 'success' });
                    }}
                  >
                    <Copy className="w-4 h-4" /> Salin
                  </Btn>
                </div>

                <p className="flex items-start gap-2 text-[11.5px] text-[var(--adm-dim)] leading-relaxed">
                  <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Siapa pun yang memegang tautan ini dapat mengisi daftar hadir selama absensinya
                  masih terbuka. Jangan menayangkannya di layar yang terlihat umum.
                </p>

                <div className="pt-3 border-t border-[var(--adm-line)]">
                  <Btn variant="ghost" onClick={() => setPutarBuka(true)}>
                    <RotateCcw className="w-4 h-4" /> Perbarui Tautan
                  </Btn>
                </div>
              </>
            ) : (
              <EmptyState text="Tautan belum dapat dimuat" hint="Muat ulang halaman ini." />
            )}
          </div>
        </Panel>
      </div>

      {/* ================= DAFTAR PESERTA ================= */}
      <div className="mt-4">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
            <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-[var(--adm-fg)]">
              <Users className="w-4 h-4 text-[var(--adm-accent)]" />
              Daftar Peserta
              <span className="text-[11.5px] font-semibold text-[var(--adm-dim)] tabular-nums">
                ({terlihat.length} dari {stats.total})
              </span>
            </h2>
            <SearchBox value={q} onChange={setQ} placeholder="Cari nama, unit kerja, telepon..." />
          </div>

          {peserta.length === 0 ? (
            <EmptyState
              text="Belum ada peserta yang mengisi daftar hadir"
              hint="Bagikan tautan atau tempel kode QR-nya di pintu ruang rapat."
            />
          ) : terlihat.length === 0 ? (
            <EmptyState text="Tidak ada peserta yang cocok" hint="Coba kata kunci lain." />
          ) : (
            <Table head={['No', 'Nama', 'Unit Kerja / Instansi', 'Telepon', 'Waktu Hadir', 'Tanda Tangan', 'Aksi']}>
              <AnimatePresence initial={false}>
                {terlihat.map((a, i) => (
                  <Row key={a.id}>
                    <Cell>
                      <span className="tabular-nums text-[var(--adm-dim)]">{i + 1}</span>
                    </Cell>

                    <Cell>
                      <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{a.name}</span>
                    </Cell>

                    <Cell><span className="text-[var(--adm-body)]">{a.department}</span></Cell>

                    <Cell>
                      <span className="text-[var(--adm-body)] tabular-nums">{a.phone || '—'}</span>
                    </Cell>

                    <Cell>
                      <span className="text-[var(--adm-body)] tabular-nums">{jamHadir(a.created_at)} WITA</span>
                      <span className="block text-[11px] text-[var(--adm-dim)]">{tglHadir(a.created_at)}</span>
                    </Cell>

                    <Cell>
                      {a.has_signature ? (
                        /*
                         * Tanda tangannya DITAMPILKAN, bukan disembunyikan di
                         * balik tombol unduh. Yang diperiksa petugas sebelum
                         * mencetak adalah goresannya — apakah benar-benar tanda
                         * tangan, atau sekadar coretan asal — dan mengunduh
                         * puluhan PNG satu per satu untuk itu adalah pekerjaan
                         * yang tidak perlu ada.
                         */
                        <button
                          onClick={() => setPratinjau(a)}
                          className="block rounded-lg bg-white ring-1 ring-[var(--adm-line)] hover:ring-cyan-400/60 p-1 transition-all cursor-pointer"
                          title="Perbesar tanda tangan"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={urlTtd(a)}
                            alt={`Tanda tangan ${a.name}`}
                            /* `lazy`: satu rapat bisa berisi puluhan baris, dan
                               memuat semuanya sekaligus berarti puluhan
                               permintaan bertoken serentak. */
                            loading="lazy"
                            className="h-9 w-[104px] object-contain"
                          />
                        </button>
                      ) : (
                        /* Ditandai terang, bukan dikosongkan: peserta tanpa
                           tanda tangan tetap tercatat hadir, dan petugas harus
                           tahu barisnya yang mana sebelum mencetak. */
                        <Badge text="tanpa TTD" color="#fbbf24" />
                      )}
                    </Cell>

                    <Cell>
                      <button
                        onClick={() => setHapusPeserta(a)}
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus kehadiran"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Cell>
                  </Row>
                ))}
              </AnimatePresence>
            </Table>
          )}
        </Panel>
      </div>

      {/* ---- Ubah rapat ---- */}
      <Modal
        open={ubahBuka}
        onClose={() => setUbahBuka(false)}
        title="Ubah Rapat"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setUbahBuka(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Rapat" required value={form.title} onChange={(v) => setForm({ ...form, title: String(v) })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal" required type="date" value={form.date} onChange={(v) => setForm({ ...form, date: String(v) })} />
            <Field label="Jam Mulai" required type="time" value={form.start_time} onChange={(v) => setForm({ ...form, start_time: String(v) })} />
          </div>
          <Field label="Tempat" required value={form.location} onChange={(v) => setForm({ ...form, location: String(v) })} />
          <Field label="Penyelenggara" required value={form.organizer} onChange={(v) => setForm({ ...form, organizer: String(v) })} />
          <Field label="NIP Penyelenggara" value={form.organizer_nip} onChange={(v) => setForm({ ...form, organizer_nip: String(v) })} />
        </div>
      </Modal>

      {/* ---- Tanda tangan diperbesar ---- */}
      <Modal
        open={pratinjau !== null}
        onClose={() => setPratinjau(null)}
        title="Tanda Tangan Peserta"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPratinjau(null)}>Tutup</Btn>
            {pratinjau && (
              <Btn onClick={() => unduhTtd(pratinjau)}>
                <Download className="w-4 h-4" /> Unduh PNG
              </Btn>
            )}
          </>
        }
      >
        {pratinjau && (
          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{pratinjau.name}</p>
              <p className="text-[11.5px] text-[var(--adm-dim)]">
                {pratinjau.department}
                {pratinjau.phone && ` · ${pratinjau.phone}`}
                {` · ${jamHadir(pratinjau.created_at)} WITA`}
              </p>
            </div>

            {/* Latar putih dipasang eksplisit: goresannya hitam, dan pada tema
                gelap tanda tangan tanpa alas praktis tak terlihat. */}
            <div className="rounded-2xl bg-white ring-1 ring-[var(--adm-line)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlTtd(pratinjau)}
                alt={`Tanda tangan ${pratinjau.name}`}
                className="w-full max-h-[280px] object-contain"
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={putarBuka}
        onCancel={() => setPutarBuka(false)}
        onConfirm={putarTautan}
        message={`Tautan absensi "${rapat.title}" akan diganti dan tautan lama LANGSUNG MATI. Peserta yang sedang mengantre di pintu akan tertahan sampai menerima tautan baru, dan kode QR yang sudah tertempel harus dicetak ulang. Lanjutkan?`}
      />

      <ConfirmDialog
        open={hapusPeserta !== null}
        onCancel={() => setHapusPeserta(null)}
        onConfirm={buangPeserta}
        message={
          hapusPeserta
            ? `Kehadiran "${hapusPeserta.name}" akan dihapus permanen beserta tanda tangannya. Lanjutkan?`
            : ''
        }
      />

      <ConfirmDialog
        open={hapusRapat}
        onCancel={() => setHapusRapat(false)}
        onConfirm={buangRapat}
        message={`Rapat "${rapat.title}" akan dihapus permanen BESERTA ${stats.total} kehadiran dan tanda tangannya. Daftar hadir yang sudah ditandatangani tidak dapat dipulihkan. Lanjutkan?`}
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
