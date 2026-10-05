'use client';

/**
 * Pengingat antrean sesudah login.
 *
 * Muncul SEKALI, tepat setelah petugas masuk, dan hanya bila ada kiriman warga
 * yang menunggu tindakan — pengaduan, chat, laporan kehilangan, permohonan
 * informasi, maupun pengajuan layanan. Sebelumnya antrean itu hanya terlihat
 * di dasbor, dan petugas yang langsung menuju modul lain tidak pernah tahu.
 *
 * "Sekali" dijaga penanda `sessionStorage` dari `login()`, dihabiskan setelah
 * jawabannya diterima: memuat ulang halaman atau berpindah modul tidak
 * memunculkannya lagi. Kegagalan memuat data didiamkan — ini pelengkap, bukan gerbang masuk panel.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { animate, motion, useReducedMotion } from 'framer-motion';
import {
  MessageSquareWarning, MessagesSquare, PackageSearch, ScrollText, School, Store, Building2,
  BadgeCheck, Megaphone, Gavel, HardHat, PlaneTakeoff, Clock3, ClipboardList, Clock,
  AlertTriangle, ArrowRight, Inbox, LayoutDashboard, BellRing,
} from 'lucide-react';
import { adminFetch, adaPenandaMasuk, habiskanPenandaMasuk, getUser } from '@/lib/adminApi';
import { relatif } from '@/lib/waktuRelatif';
import { Modal, Btn, RadarDecor, stagger, riseIn } from '@/components/admin/ui';
import type { PendingWork, PendingWorkItem } from '@/types';

const ZONA = 'Asia/Makassar';
const SEHARI = 86_400_000;

const IKON: Record<string, React.ElementType> = {
  complaints: MessageSquareWarning,
  chat: MessagesSquare,
  lost_reports: PackageSearch,
  information_requests: ScrollText,
  fieldtrips: School,
  'pengajuan:tenant': Store,
  'pengajuan:sewa': Building2,
  'pengajuan:perizinan-usaha': BadgeCheck,
  'pengajuan:pengiklanan': Megaphone,
  'pengajuan:beauty-contest': Gavel,
  'pengajuan:izin-kerja': HardHat,
  slots: PlaneTakeoff,
  extend_advance: Clock3,
};

type Tingkat = 'kritis' | 'perhatian' | 'normal';

/**
 * Urgensi dari umur antrean terlama. Lewat tenggat PPID selalu kritis —
 * tenggatnya ditetapkan undang-undang, bukan kebiasaan kantor.
 */
function tingkat(it: PendingWorkItem, kini: number): Tingkat {
  if (it.overdue > 0) return 'kritis';
  if (!it.oldest_at) return 'normal';
  const umur = kini - new Date(it.oldest_at).getTime();
  if (umur > 3 * SEHARI) return 'kritis';
  if (umur > SEHARI) return 'perhatian';
  return 'normal';
}

const WARNA: Record<Tingkat, { fg: string; soft: string; line: string; label: string }> = {
  kritis: { fg: 'var(--adm-danger)', soft: 'var(--adm-danger-soft)', line: 'var(--adm-danger-line)', label: 'Mendesak' },
  perhatian: { fg: 'var(--adm-warn)', soft: 'var(--adm-warn-soft)', line: 'var(--adm-warn-line)', label: 'Perlu perhatian' },
  normal: { fg: 'var(--adm-accent)', soft: 'var(--adm-accent-soft)', line: 'var(--adm-accent-line)', label: 'Baru masuk' },
};

function sapaan(): string {
  const jam = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: ZONA })) % 24;
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 19) return 'Selamat sore';
  return 'Selamat malam';
}

/** Angka yang menghitung naik; langsung ke nilai akhir bila gerak dikurangi. */
function AngkaNaik({ nilai }: { nilai: number }) {
  const kurangiGerak = useReducedMotion();
  const [tampil, setTampil] = useState(0);

  useEffect(() => {
    if (kurangiGerak) return;
    const kendali = animate(0, nilai, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setTampil(Math.round(v)),
    });
    return () => kendali.stop();
  }, [nilai, kurangiGerak]);

  return <>{(kurangiGerak ? nilai : tampil).toLocaleString('id-ID')}</>;
}

export default function ModalAntreanMasuk() {
  const router = useRouter();
  const [data, setData] = useState<PendingWork | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'semua' | 'interaksi' | 'pengajuan'>('semua');
  const [kini] = useState(() => Date.now());

  useEffect(() => {
    if (!adaPenandaMasuk()) return;

    let batal = false;
    adminFetch<PendingWork>('/pending-work').then((res) => {
      if (batal) return;
      // Dihabiskan di sini, bukan sebelum fetch — lihat `adaPenandaMasuk`.
      habiskanPenandaMasuk();
      if (!res.ok || !res.data || res.data.total <= 0) return;
      setData(res.data);
      setOpen(true);
    });

    return () => { batal = true; };
  }, []);

  const ringkas = useMemo(() => {
    if (!data) return null;
    const semua = data.groups.flatMap((g) => g.items);
    const terlama = semua
      .map((i) => i.oldest_at)
      .filter((v): v is string => !!v)
      .sort()[0] ?? null;

    return {
      jenis: semua.length,
      overdue: semua.reduce((s, i) => s + i.overdue, 0),
      mendesak: semua.filter((i) => tingkat(i, kini) === 'kritis').length,
      terlama,
      perKelompok: Object.fromEntries(
        data.groups.map((g) => [g.key, g.items.reduce((s, i) => s + i.count, 0)]),
      ) as Record<string, number>,
    };
  }, [data, kini]);

  if (!data || !ringkas) return null;

  const tutup = () => setOpen(false);
  const pergi = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const tabs = [
    { key: 'semua' as const, label: 'Semua', count: data.total },
    ...data.groups.map((g) => ({ key: g.key, label: g.label, count: ringkas.perKelompok[g.key] ?? 0 })),
  ];

  // Tertua lebih dulu: yang paling lama menunggu yang paling layak didahulukan.
  const urut = (items: PendingWorkItem[]) =>
    [...items].sort((a, b) => (b.overdue - a.overdue) || (a.oldest_at ?? '~').localeCompare(b.oldest_at ?? '~'));

  const kelompokTampil = data.groups.filter((g) => tab === 'semua' || g.key === tab);
  const nama = getUser()?.name?.split(' ')[0] ?? 'Petugas';

  return (
    <Modal
      open={open}
      onClose={tutup}
      title="Antrean Menunggu Ditangani"
      wide
      footer={
        <>
          <p className="mr-auto self-center text-[10.5px] text-[var(--adm-dim)] flex items-center gap-1.5">
            <BellRing className="w-3 h-3" /> Pengingat ini tampil sekali setiap kali Anda masuk.
          </p>
          <Btn variant="ghost" onClick={tutup}>Nanti saja</Btn>
          <Btn onClick={() => pergi('/admin/dashboard')}>
            <LayoutDashboard className="w-4 h-4" /> Buka Dasbor
          </Btn>
        </>
      }
    >
      <div className="space-y-5">
        {/* ---------- papan keberangkatan ---------- */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--adm-accent-line)] bg-[var(--adm-inset)] p-5">
          <span className="pointer-events-none absolute -top-16 -left-10 w-48 h-48 rounded-full bg-[var(--adm-glow-a)] blur-[60px]" />
          <RadarDecor className="-right-10 -top-10 opacity-70 hidden sm:block" />

          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--adm-muted)] flex items-center gap-1.5">
              <span className="adm-beacon w-1.5 h-1.5 rounded-full bg-[var(--adm-danger)]" />
              Papan antrean · {new Date(data.generated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: ZONA })} WITA
            </p>
            <h4 className="mt-2 text-[15px] font-bold text-[var(--adm-fg)]">
              {sapaan()}, {nama}.
            </h4>

            <div className="mt-3 flex items-end gap-3">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                className="text-[52px] leading-none font-black tabular-nums bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] bg-clip-text text-transparent"
              >
                <AngkaNaik nilai={data.total} />
              </motion.span>
              <p className="pb-1.5 text-[12.5px] text-[var(--adm-body)] leading-snug">
                kiriman warga
                <br />
                <span className="text-[var(--adm-muted)]">menunggu tindakan petugas</span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip ikon={Inbox}>{ringkas.jenis} jenis layanan</Chip>
              {ringkas.terlama && <Chip ikon={Clock}>Terlama masuk {relatif(ringkas.terlama, kini)}</Chip>}
              {ringkas.mendesak > 0 && (
                <Chip ikon={AlertTriangle} nada="kritis">{ringkas.mendesak} antrean mendesak</Chip>
              )}
              {ringkas.overdue > 0 && (
                <Chip ikon={ScrollText} nada="kritis">{ringkas.overdue} permohonan lewat tenggat</Chip>
              )}
            </div>
          </div>
        </div>

        {/* ---------- tab kelompok ---------- */}
        {data.groups.length > 1 && (
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] overflow-x-auto" role="tablist">
            {tabs.map((t) => {
              const aktif = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={aktif}
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 min-w-max px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
                    aktif ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
                  }`}
                >
                  {aktif && (
                    <motion.span
                      layoutId="antrean-tab"
                      className="absolute inset-0 rounded-lg bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)]"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {t.label}
                    <span className="tabular-nums text-[10.5px] px-1.5 py-0.5 rounded-md bg-[var(--adm-hover)]">{t.count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ---------- kartu antrean ---------- */}
        {kelompokTampil.map((g) => (
          <section key={`${tab}-${g.key}`}>
            {tab === 'semua' && data.groups.length > 1 && (
              <p className="mb-2 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--adm-dim)]">
                {g.label}
                <span className="flex-1 h-px adm-runway opacity-25" />
              </p>
            )}
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {urut(g.items).map((it) => (
                <KartuAntrean key={it.key} item={it} kini={kini} onBuka={() => pergi(it.href)} />
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    </Modal>
  );
}

function Chip({ ikon: Ikon, nada, children }: { ikon: React.ElementType; nada?: Tingkat; children: React.ReactNode }) {
  const w = nada ? WARNA[nada] : null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={
        w
          ? { color: w.fg, background: w.soft, borderColor: w.line }
          : { color: 'var(--adm-body)', background: 'var(--adm-hover)', borderColor: 'var(--adm-line)' }
      }
    >
      <Ikon className="w-3 h-3" />
      {children}
    </span>
  );
}

/** Kartu bergaya boarding pass: sobekan kiri berikon, isi, lalu angka. */
function KartuAntrean({ item, kini, onBuka }: { item: PendingWorkItem; kini: number; onBuka: () => void }) {
  const t = tingkat(item, kini);
  const w = WARNA[t];
  const Ikon = IKON[item.key] ?? ClipboardList;

  return (
    <motion.button
      variants={riseIn}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onBuka}
      className="group relative flex items-stretch text-left rounded-xl border border-[var(--adm-line)] bg-[var(--adm-panel)] hover:border-[var(--adm-accent-line)] overflow-hidden transition-colors cursor-pointer"
    >
      {/* sobekan tiket */}
      <span className="relative flex items-center justify-center w-14 flex-shrink-0" style={{ background: w.soft }}>
        <Ikon className="w-5 h-5" style={{ color: w.fg }} />
        {t === 'kritis' && (
          <motion.span
            className="absolute inset-0"
            style={{ background: w.soft }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}
      </span>
      <span className="w-0 border-l border-dashed border-[var(--adm-line)]" />

      <span className="flex-1 min-w-0 px-3.5 py-3">
        <span className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-[var(--adm-fg)] truncate">{item.label}</span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: w.fg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: w.fg }} />
          {item.overdue > 0 ? `${item.overdue} lewat tenggat` : w.label}
        </span>
        {item.oldest_at && (
          <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[var(--adm-muted)]">
            <Clock className="w-3 h-3" /> Terlama {relatif(item.oldest_at, kini)}
          </span>
        )}
      </span>

      <span className="flex flex-col items-end justify-center pr-3.5 pl-1">
        <span className="text-[24px] font-black leading-none tabular-nums text-[var(--adm-fg)]">{item.count}</span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--adm-accent)]">
          Tangani <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>

      {/* bilah urgensi di kaki kartu */}
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: w.fg, opacity: 0.6 }} />
    </motion.button>
  );
}
