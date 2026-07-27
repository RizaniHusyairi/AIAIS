'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { adminFetch } from '@/lib/adminApi';
import { BACKGROUND_META, DEFAULT_SETTINGS, invalidateSettings, BackgroundKey } from '@/lib/settings';
import {
  PageHeader, Panel, Btn, Badge, Toast, ToastMsg, Loading, InfoNote, stagger, riseIn,
} from '@/components/admin/ui';
import {
  ImageIcon, RefreshCw, Save, RotateCcw, ExternalLink, Check, AlertTriangle, Monitor, Smartphone, Link2,
} from 'lucide-react';

type Draft = Record<string, string>;

export default function AdminAppearancePage() {
  const [saved, setSaved] = useState<Draft>({});
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  /* Baca pengaturan dari endpoint publik (GET /settings) */
  const loadSettings = async () => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const r = await fetch(`${base}/settings`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const json = await r.json().catch(() => null);
      const data: Draft = { ...DEFAULT_SETTINGS, ...(json?.data ?? {}) };
      setSaved(data);
      setDraft(data);
    } catch {
      setSaved({ ...DEFAULT_SETTINGS });
      setDraft({ ...DEFAULT_SETTINGS });
      setToast({ text: 'Tidak dapat memuat pengaturan dari server', kind: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const dirtyKeys = useMemo(
    () => BACKGROUND_META.filter((m) => (draft[m.key] ?? '') !== (saved[m.key] ?? '')).map((m) => m.key),
    [draft, saved]
  );

  const setValue = (key: string, v: string) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setBroken((b) => ({ ...b, [key]: false }));
  };

  const resetOne = (key: BackgroundKey) => setValue(key, DEFAULT_SETTINGS[key]);

  const saveAll = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);

    // Nilai yang sama dengan bawaan dikirim kosong agar barisnya dihapus —
    // dengan begitu halaman tetap mengikuti gambar bawaan bila kelak diperbarui.
    const body: Draft = {};
    dirtyKeys.forEach((k) => {
      body[k] = draft[k] === DEFAULT_SETTINGS[k] ? '' : draft[k];
    });

    const res = await adminFetch<Record<string, string>>('/settings', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      const fresh = { ...DEFAULT_SETTINGS, ...(res.data ?? {}) };
      setSaved(fresh);
      setDraft(fresh);
      invalidateSettings();
      setToast({ text: `${dirtyKeys.length} latar berhasil diperbarui`, kind: 'success' });
    } else {
      setToast({ text: res.message, kind: 'error' });
    }
  };

  const discard = () => setDraft(saved);

  if (loading) return <Loading text="Memuat pengaturan tampilan..." />;

  return (
    <>
      <PageHeader
        icon={ImageIcon}
        title="Tampilan & Latar Halaman"
        subtitle="Ganti gambar latar pada header/hero setiap halaman portal dan aplikasi mobile"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={loadSettings}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            {dirtyKeys.length > 0 && <Btn variant="ghost" onClick={discard}><RotateCcw className="w-4 h-4" /> Batalkan</Btn>}
            <Btn onClick={saveAll} disabled={saving || dirtyKeys.length === 0}>
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : dirtyKeys.length > 0 ? `Simpan (${dirtyKeys.length})` : 'Tersimpan'}
            </Btn>
          </div>
        }
      />

      <InfoNote>
        Tempelkan URL gambar (format <span className="text-cyan-300 font-semibold">.jpg / .png / .webp</span>) pada kolom di bawah.
        Pratinjau langsung muncul sebelum disimpan. Mengosongkan kolom lalu menyimpan akan mengembalikan latar ke gambar bawaan.
        Perubahan langsung tampil di halaman publik setelah disimpan.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {BACKGROUND_META.map((m) => {
          const value = draft[m.key] ?? '';
          const isDirty = value !== (saved[m.key] ?? '');
          const isDefault = value === DEFAULT_SETTINGS[m.key];
          const isMobile = m.page === 'Aplikasi Mobile';

          return (
            <motion.div key={m.key} variants={riseIn}>
              <Panel>
                {/* preview */}
                <div className="relative h-44 bg-[#0a1428] overflow-hidden">
                  {value ? (
                    <img
                      key={value}
                      src={value}
                      alt={`Pratinjau latar ${m.label}`}
                      className="w-full h-full object-cover"
                      onError={() => setBroken((b) => ({ ...b, [m.key]: true }))}
                      onLoad={() => setBroken((b) => ({ ...b, [m.key]: false }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1428] via-transparent to-transparent" />

                  {/* label overlay */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-white font-black text-[15px] leading-tight drop-shadow">{m.label}</p>
                      <p className="text-slate-300 text-[11px] mt-0.5">{m.note}</p>
                    </div>
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur border border-white/20 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Lihat <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* badges */}
                  <div className="absolute top-3 left-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                      {m.page}
                    </span>
                    {isDirty && <Badge text="Belum disimpan" color="#fbbf24" />}
                  </div>

                  {broken[m.key] && value && (
                    <div className="absolute inset-0 bg-[#0a1428]/85 flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                      <p className="text-rose-300 text-[12px] font-semibold">Gambar tidak dapat dimuat</p>
                      <p className="text-slate-500 text-[11px]">Periksa kembali URL-nya</p>
                    </div>
                  )}
                </div>

                {/* input */}
                <div className="p-4 space-y-3">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">URL Gambar Latar</label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={value}
                      onChange={(e) => setValue(m.key, e.target.value)}
                      placeholder="https://contoh.com/gambar.jpg"
                      className="w-full bg-[#0a1428] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      {isDefault ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-400" /> Menggunakan gambar bawaan</>
                      ) : (
                        <>Gambar khusus</>
                      )}
                    </span>
                    <button
                      onClick={() => resetOne(m.key)}
                      disabled={isDefault}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-300 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Kembalikan bawaan
                    </button>
                  </div>
                </div>
              </Panel>
            </motion.div>
          );
        })}
      </motion.div>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
