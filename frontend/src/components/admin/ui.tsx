'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Plane, X, AlertTriangle, CheckCircle2, Info, Search, Radar as RadarIcon, ChevronRight } from 'lucide-react';
import { useAdminTheme, aksenTeks } from './theme';

/* ================================================================
   Catatan warna
   ================================================================
   Kit ini tidak menyebut warna secara langsung. Semuanya lewat variabel
   `--adm-*` yang dipilih atribut `data-adm-theme` di <html> (lihat
   `components/admin/theme.ts` dan blok "Panel admin" di globals.css).
   Satu-satunya pengecualian adalah warna aksen yang dikirim halaman
   sebagai heks — itu pun dilewatkan `aksenTeks()` supaya tetap terbaca
   di atas kertas terang. */

/* ================================================================
   Motion presets
   ================================================================
   Dipakai bersama seluruh halaman panel. Nilainya sengaja seragam:
   kalau tiap halaman memilih durasinya sendiri, panel terasa seperti
   kumpulan aplikasi berbeda alih-alih satu sistem. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 320, damping: 30 },
  },
};

/* ================================================================
   Radar sweep — hiasan kokpit untuk sudut panel
   ================================================================
   Blip-nya berdenyut pada fase berbeda supaya sapuannya terbaca sebagai
   pemindaian, bukan sekadar lingkaran berputar. */
export function RadarDecor({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="relative w-40 h-40 rounded-full border border-[var(--adm-accent-line)] opacity-60">
        <div className="absolute inset-4 rounded-full border border-[var(--adm-accent-line)] opacity-70" />
        <div className="absolute inset-10 rounded-full border border-[var(--adm-accent-line)] opacity-70" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--adm-accent-line)] opacity-60" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--adm-accent-line)] opacity-60" />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, var(--adm-accent-soft), transparent 28%)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
        />
        {[
          { top: '28%', left: '62%', delay: 0 },
          { top: '64%', left: '38%', delay: 1.7 },
          { top: '46%', left: '78%', delay: 3.1 },
        ].map((b, i) => (
          <motion.span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-[var(--adm-accent-strong)]"
            style={{ top: b.top, left: b.left }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.3, 0.6] }}
            transition={{ repeat: Infinity, duration: 5, delay: b.delay, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Page header
   ================================================================
   Judul memakai marka landasan sebagai garis bawah — penanda visual
   bahwa seluruh halaman panel berasal dari satu sistem yang sama. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative overflow-hidden rounded-2xl adm-glass adm-sweep px-5 py-4 sm:px-6 sm:py-5"
    >
      <RadarDecor className="-right-14 -top-12 opacity-30 hidden sm:block" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon && (
            <motion.span
              initial={{ scale: 0.7, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.08 }}
              className="w-12 h-12 rounded-2xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] flex items-center justify-center flex-shrink-0"
            >
              <Icon className="w-[22px] h-[22px] text-[var(--adm-accent)]" />
            </motion.span>
          )}
          <div className="min-w-0">
            <h1 className="text-[19px] sm:text-xl font-black text-[var(--adm-fg)] tracking-tight truncate">{title}</h1>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              className="block h-[3px] w-24 mt-2 rounded-full adm-runway origin-left"
            />
            {subtitle && <p className="text-[12.5px] text-[var(--adm-muted)] mt-2 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Panel
   ================================================================ */
export function Panel({
  children,
  className = '',
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl adm-glass adm-lift ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          {title && (
            <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] flex-shrink-0" />
              <span className="truncate">{title}</span>
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

/* ================================================================
   Stat card — pencacah beranimasi
   ================================================================ */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = '#22d3ee',
  hint,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: any;
  accent?: string;
  hint?: string;
  delay?: number;
}) {
  const theme = useAdminTheme();
  const fg = aksenTeks(accent, theme);
  /**
   * Angka yang dianimasikan, atau NaN bila nilainya memang teks.
   *
   * Syarat `\d` itu penting: tanpa itu, nilai teks murni seperti
   * "Belum tersambung" berubah menjadi `Number('')` yaitu **0** — angka yang
   * lolos `Number.isFinite` — sehingga kartunya menampilkan "0" alih-alih
   * teksnya. Nilai bercampur seperti "12 unit" tetap dianimasikan ke 12
   * seperti sebelumnya.
   */
  const numeric = typeof value === 'number'
    ? value
    : /\d/.test(String(value)) ? Number(String(value).replace(/[^\d]/g, '')) : NaN;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(numeric)) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1000;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(Math.round(numeric * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric]);

  return (
    <motion.div
      variants={riseIn}
      whileHover={{ y: -5 }}
      transition={{ delay }}
      className="group relative overflow-hidden rounded-2xl adm-glass adm-lift adm-sweep p-5"
    >
      {/* pendar warna aksen di sudut — menandai kategori tanpa perlu teks */}
      <span
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-[var(--adm-muted)] font-semibold truncate">{label}</p>
          <p className="mt-2 text-[28px] font-black text-[var(--adm-fg)] leading-none tabular-nums">
            {Number.isFinite(numeric) ? shown.toLocaleString('id-ID') : value}
          </p>
          {hint && <p className="mt-2 text-[11px] text-[var(--adm-dim)] leading-relaxed">{hint}</p>}
        </div>
        <motion.span
          whileHover={{ rotate: 8 }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}1f`, border: `1px solid ${accent}45` }}
        >
          <Icon className="w-5 h-5" style={{ color: fg }} />
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Badge
   ================================================================ */
export function Badge({ text, color = '#22d3ee' }: { text: string; color?: string }) {
  const theme = useAdminTheme();
  const fg = aksenTeks(color, theme);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color: fg, backgroundColor: `${color}1a`, border: `1px solid ${color}45` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: fg }} />
      {text}
    </span>
  );
}

/* ================================================================
   Buttons
   ================================================================ */
export function Btn({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary:
      'bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] text-[var(--adm-btn-fg)] hover:brightness-110 shadow-md',
    ghost:
      'bg-[var(--adm-hover)] text-[var(--adm-body)] hover:text-[var(--adm-fg)] border border-[var(--adm-line)]',
    danger:
      'bg-[var(--adm-danger-soft)] text-[var(--adm-danger)] hover:brightness-105 border border-[var(--adm-danger-line)]',
  }[variant];

  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${styles} ${className}`}
    >
      {/* kilau yang menyapu saat kursor lewat — hanya pada tombol utama */}
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

/* ================================================================
   Search input
   ================================================================ */
export function SearchBox({ value, onChange, placeholder = 'Cari...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative group">
      <Search className="w-4 h-4 text-[var(--adm-dim)] group-focus-within:text-[var(--adm-accent)] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-64 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent-line)] focus:ring-2 focus:ring-[var(--adm-accent-ring)] focus:w-full sm:focus:w-72 transition-all duration-300"
      />
    </div>
  );
}

/* ================================================================
   Form field
   ================================================================ */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  options,
  rows,
  placeholder,
  required,
  hint,
  error,
  maxLength,
  min,
  max,
  step,
  className = '',
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  // `password` dan `email` dipakai modul akun; keduanya diteruskan apa adanya
  // ke <input type>, sehingga peramban memberi penyembunyian karakter dan
  // papan ketik yang sesuai.
  // `time` dipakai jurnal pemeliharaan inventaris; seperti `date`, ia
  // diteruskan apa adanya sehingga peramban menyediakan pemilih jamnya sendiri.
  // `datetime-local` dipakai catatan barang temuan, yang menuntut tanggal DAN
  // jam dalam satu nilai — memecahnya menjadi dua medan membuka celah petugas
  // mengisi salah satunya saja.
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'datetime-local' | 'number' | 'password' | 'email';
  options?: { value: string; label: string }[];
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const base =
    `w-full bg-[var(--adm-inset)] border rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:ring-2 transition-all duration-200 ${
      error
        ? 'border-[var(--adm-danger)] focus:border-[var(--adm-danger)] focus:ring-[var(--adm-danger-soft)]'
        : 'border-[var(--adm-line)] focus:border-[var(--adm-accent-line)] focus:ring-[var(--adm-accent-ring)]'
    }`;

  if (type === 'checkbox') {
    return (
      <label className={`flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={`w-11 h-6 rounded-full p-0.5 flex-shrink-0 transition-colors ${
            value
              ? 'bg-gradient-to-r from-[var(--adm-btn-from)] to-[var(--adm-btn-to)] shadow-md'
              : 'bg-[var(--adm-line)]'
          }`}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 620, damping: 32 }}
            className="block w-5 h-5 rounded-full bg-white shadow"
            style={{ marginLeft: value ? 20 : 0 }}
          />
        </button>
        <span className="text-[12.5px] text-[var(--adm-body)] font-medium">{label}</span>
      </label>
    );
  }

  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-[var(--adm-danger)]">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={rows ?? 3} placeholder={placeholder} required={required} maxLength={maxLength} aria-invalid={!!error} className={base} />
      ) : type === 'select' ? (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} aria-invalid={!!error} className={base}>
          {options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-[var(--adm-inset)] text-[var(--adm-fg)]">
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!error}
          className={base}
        />
      )}
      {(error || hint || maxLength != null) && (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-[11px] leading-relaxed">
          <span className={error ? 'text-[var(--adm-danger)]' : 'text-[var(--adm-dim)]'}>
            {error || hint}
          </span>
          {maxLength != null && (
            <span className="ml-auto flex-shrink-0 tabular-nums text-[var(--adm-dim)]">
              {String(value ?? '').length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Modal
   ================================================================
   Kepalanya bergaya boarding pass: garis perforasi dan takik di kedua
   sisi, supaya jendela isian terasa seperti "lembar" tersendiri dan
   bukan sekadar kotak abu-abu di atas halaman. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--adm-scrim)] backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col adm-glass rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden`}
          >
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--adm-btn-from)] via-[var(--adm-btn-to)] to-transparent" />

            <div className="relative flex items-center justify-between px-5 py-4">
              <h3 className="font-bold text-[var(--adm-fg)] text-[15px] flex items-center gap-2.5 min-w-0">
                <motion.span
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.12 }}
                  className="w-7 h-7 rounded-lg bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] flex items-center justify-center flex-shrink-0"
                >
                  <Plane className="w-3.5 h-3.5 text-[var(--adm-accent)] rotate-45" />
                </motion.span>
                <span className="truncate">{title}</span>
              </h3>
              <button
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg hover:bg-[var(--adm-hover)] hover:text-[var(--adm-fg)] flex items-center justify-center text-[var(--adm-muted)] transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* perforasi pemisah kepala dan isi */}
            <div className="adm-ticket h-px bg-[repeating-linear-gradient(90deg,var(--adm-line)_0_6px,transparent_6px_12px)]" />

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <div className="px-5 py-4 border-t border-[var(--adm-line)] bg-[var(--adm-hover)] flex flex-wrap justify-end gap-2">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   Confirm dialog
   ================================================================ */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = 'Konfirmasi Hapus',
  message,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onCancel}>Batal</Btn>
          <Btn variant="danger" onClick={onConfirm}>Ya, Hapus</Btn>
        </>
      }
    >
      <div className="flex gap-3">
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="w-11 h-11 rounded-2xl bg-[var(--adm-danger-soft)] border border-[var(--adm-danger-line)] flex items-center justify-center flex-shrink-0"
        >
          <AlertTriangle className="w-5 h-5 text-[var(--adm-danger)]" />
        </motion.span>
        <div className="pt-1">
          <p className="text-[13px] text-[var(--adm-body)] leading-relaxed">{message}</p>
          <p className="mt-1.5 text-[11.5px] text-[var(--adm-dim)]">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================
   Toast
   ================================================================ */
export type ToastMsg = { text: string; kind: 'success' | 'error' } | null;

export function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  const ok = msg?.kind === 'success';

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          role="status"
          className="fixed bottom-6 right-6 z-[120] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
          style={{
            backgroundColor: ok ? 'var(--adm-ok-soft)' : 'var(--adm-danger-soft)',
            borderColor: ok ? 'var(--adm-ok-line)' : 'var(--adm-danger-line)',
          }}
        >
          {/* Latar buram di belakang semburat warna: tanpa ini, pesan
              melayang di atas isi halaman dan sulit dibaca di tema terang. */}
          <span className="absolute inset-0 -z-10 bg-[var(--adm-panel)]" />

          <div className="flex items-center gap-2.5 px-4 py-3">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: ok ? 'var(--adm-ok-soft)' : 'var(--adm-danger-soft)' }}
            >
              {ok ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--adm-ok)]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[var(--adm-danger)]" />
              )}
            </span>
            <p className="text-[12.5px] font-semibold" style={{ color: ok ? 'var(--adm-ok)' : 'var(--adm-danger)' }}>
              {msg.text}
            </p>
          </div>

          {/* bilah waktu — pengguna tahu pesannya akan hilang sendiri */}
          <motion.span
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3.2, ease: 'linear' }}
            className="block h-[3px] origin-left"
            style={{ backgroundColor: ok ? 'var(--adm-ok)' : 'var(--adm-danger)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   Loading / empty states
   ================================================================
   Pemuat digambarkan sebagai pesawat yang berjalan di landasan lengkap
   dengan lampu tepi: pengguna awam membaca "sedang berjalan", bukan
   "macet", meski datanya lama datang. */
export function Loading({ text = 'Memuat data...' }: { text?: string }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5">
      <div className="relative w-52 h-14">
        <motion.span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] flex items-center justify-center"
          animate={{ x: [0, 164, 0], y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        >
          <Plane className="w-5 h-5 text-[var(--adm-accent)] rotate-45" />
        </motion.span>

        {/* landasan + lampu tepi yang menyala berurutan */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-full adm-runway" />
        <div className="absolute inset-x-0 bottom-2 flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-[var(--adm-accent-strong)]"
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
      <p className="text-[var(--adm-muted)] text-[12.5px]">{text}</p>
    </div>
  );
}

export function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-[var(--adm-line)]" />
        <span className="absolute inset-4 rounded-full border border-[var(--adm-line)]" />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, var(--adm-hover), transparent 30%)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
        />
        <RadarIcon className="relative w-7 h-7 text-[var(--adm-dim)]" />
      </div>
      <p className="text-[var(--adm-body)] text-[13px] font-semibold">{text}</p>
      {hint && <p className="text-[var(--adm-dim)] text-[11.5px] max-w-sm leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ================================================================
   Data table
   ================================================================
   Kepala tabel lengket (`sticky`) supaya nama kolom tetap terbaca saat
   daftar panjang digulir — daftar di panel ini kerap ratusan baris. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--adm-panel)] backdrop-blur">
          <tr className="border-b border-[var(--adm-line)]">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[var(--adm-muted)] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody variants={stagger} initial="hidden" animate="show">
          {children}
        </motion.tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <motion.tr
      variants={riseIn}
      className="group border-b border-[var(--adm-line)] transition-colors hover:bg-[var(--adm-accent-soft)]"
    >
      {children}
    </motion.tr>
  );
}

export function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={`px-5 py-3.5 text-[12.5px] text-[var(--adm-body)] align-middle transition-colors group-hover:text-[var(--adm-fg)] first:border-l-2 first:border-transparent group-hover:first:border-[var(--adm-accent-strong)] ${className}`}
    >
      {children}
    </td>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 rounded-xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] p-3.5"
    >
      <Info className="w-4 h-4 text-[var(--adm-accent)] flex-shrink-0 mt-0.5" />
      <p className="text-[11.5px] text-[var(--adm-body)] leading-relaxed">{children}</p>
    </motion.div>
  );
}

/* ================================================================
   Tambahan
   ================================================================ */

/**
 * Kartu tautan pintas bergaya boarding pass.
 *
 * Dipakai dasbor untuk mengantar petugas ke modul lain. Terpisah dari
 * `StatCard` karena yang ditonjolkan adalah tujuannya, bukan angkanya.
 */
export function JumpCard({
  label,
  value,
  icon: Icon,
  color = '#22d3ee',
  href,
}: {
  label: string;
  value: number | string;
  icon: any;
  color?: string;
  href: string;
}) {
  const theme = useAdminTheme();
  const fg = aksenTeks(color, theme);

  return (
    // `Link` dibungkus, bukan dianimasikan langsung: navigasi sisi klien
    // Next.js harus tetap dipakai — `<a href>` biasa memuat ulang seluruh panel.
    <motion.div variants={riseIn} whileHover={{ y: -5 }}>
      <Link href={href} className="group relative block overflow-hidden rounded-xl adm-glass adm-lift p-4">
        <span
          className="absolute -bottom-10 -right-8 w-24 h-24 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-30"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
          style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}45` }}
        >
          <Icon className="w-4 h-4" style={{ color: fg }} />
        </span>
        <p className="relative text-[21px] font-black text-[var(--adm-fg)] leading-none tabular-nums">{value}</p>
        <p className="relative text-[11.5px] text-[var(--adm-muted)] mt-1.5 flex items-center gap-1 group-hover:text-[var(--adm-accent)] transition-colors">
          {label}
          <ChevronRight className="w-3 h-3 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
        </p>
      </Link>
    </motion.div>
  );
}
