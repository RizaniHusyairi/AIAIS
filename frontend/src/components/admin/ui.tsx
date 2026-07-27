'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plane, X, AlertTriangle, CheckCircle2, Info, Search, Inbox } from 'lucide-react';

/* ================================================================
   Motion presets
   ================================================================ */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 340, damping: 28 } },
};

/* ================================================================
   Radar sweep — cockpit flavour used as panel decoration
   ================================================================ */
export function RadarDecor({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="relative w-40 h-40 rounded-full border border-cyan-400/15">
        <div className="absolute inset-4 rounded-full border border-cyan-400/10" />
        <div className="absolute inset-10 rounded-full border border-cyan-400/10" />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, rgba(34,211,238,0.22), transparent 28%)' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   Page header
   ================================================================ */
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
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-cyan-300" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-[12.5px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
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
    <div className={`relative overflow-hidden rounded-2xl bg-[#0d1730] border border-white/8 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/8">
          {title && <h2 className="text-[13.5px] font-bold text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ================================================================
   Stat card with animated counter
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
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[^\d]/g, ''));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(numeric)) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
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
      whileHover={{ y: -4 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-2xl bg-[#0d1730] border border-white/8 p-5"
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
          <p className="mt-1.5 text-[26px] font-black text-white leading-none tabular-nums">
            {Number.isFinite(numeric) ? shown.toLocaleString('id-ID') : value}
          </p>
          {hint && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
        </div>
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}1a`, border: `1px solid ${accent}40` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </span>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Badge
   ================================================================ */
export function Badge({ text, color = '#22d3ee' }: { text: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}40` }}
    >
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
    primary: 'bg-cyan-500 text-[#04121f] hover:bg-cyan-400 shadow-lg shadow-cyan-500/20',
    ghost: 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10',
    danger: 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30',
  }[variant];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/* ================================================================
   Search input
   ================================================================ */
export function SearchBox({ value, onChange, placeholder = 'Cari...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-64 bg-[#0a1428] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-[12.5px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50"
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
  className = '',
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  options?: { value: string; label: string }[];
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const base =
    'w-full bg-[#0a1428] border border-white/10 rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors';

  if (type === 'checkbox') {
    return (
      <label className={`flex items-center gap-2.5 cursor-pointer ${className}`}>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`w-10 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-cyan-500' : 'bg-white/15'}`}
        >
          <motion.span layout className="block w-5 h-5 rounded-full bg-white" style={{ marginLeft: value ? 16 : 0 }} />
        </button>
        <span className="text-[12.5px] text-slate-300 font-medium">{label}</span>
      </label>
    );
  }

  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={rows ?? 3} placeholder={placeholder} className={base} />
      ) : type === 'select' ? (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={base}>
          {options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0a1428]">
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value ?? ''} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

/* ================================================================
   Modal
   ================================================================ */
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col bg-[#0d1730] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h3 className="font-bold text-white text-[15px] flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-400 rotate-45" /> {title}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {footer && <div className="px-5 py-4 border-t border-white/8 flex justify-end gap-2">{footer}</div>}
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
        <span className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
        </span>
        <p className="text-[13px] text-slate-300 leading-relaxed pt-1.5">{message}</p>
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

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          className={`fixed bottom-6 right-6 z-[120] flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl text-[12.5px] font-semibold ${
            msg.kind === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          {msg.kind === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   Loading / empty states
   ================================================================ */
export function Loading({ text = 'Memuat data...' }: { text?: string }) {
  return (
    <div className="py-20 flex flex-col items-center gap-4">
      <motion.div
        animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center"
      >
        <Plane className="w-7 h-7 text-cyan-300 rotate-45" />
      </motion.div>
      <p className="text-slate-400 text-[12.5px]">{text}</p>
    </div>
  );
}

export function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-2 text-center px-6">
      <Inbox className="w-10 h-10 text-slate-600" />
      <p className="text-slate-300 text-[13px] font-semibold">{text}</p>
      {hint && <p className="text-slate-500 text-[11.5px]">{hint}</p>}
    </div>
  );
}

/* ================================================================
   Data table
   ================================================================ */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/8">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
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
    <motion.tr variants={riseIn} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      {children}
    </motion.tr>
  );
}

export function Cell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 text-[12.5px] text-slate-300 align-middle ${className}`}>{children}</td>;
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-cyan-500/8 border border-cyan-400/20 p-3.5">
      <Info className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
      <p className="text-[11.5px] text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}
