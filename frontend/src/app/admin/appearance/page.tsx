'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { adminFetch } from '@/lib/adminApi';
import { API_BASE_URL } from '@/lib/api';
import { BACKGROUND_META, DEFAULT_SETTINGS, invalidateSettings, SKM_KEYS, TENTANG_KEYS, BackgroundKey } from '@/lib/settings';
import {
  PageHeader, Panel, Btn, Badge, Toast, ToastMsg, Loading, InfoNote, stagger, riseIn,
} from '@/components/admin/ui';
import {
  ImageIcon, RefreshCw, Save, RotateCcw, ExternalLink, Check, AlertTriangle, Monitor, Smartphone, Link2, Star, Info, PlayCircle,
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
      // Pakai konstanta bersama — jangan menyusun ulang alamat API di sini,
      // itu yang dulu membuat prefiks versi tertinggal saat berpindah.
      const r = await fetch(`${API_BASE_URL}/settings`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
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

  // Latar DAN blok SKM sama-sama dihitung, supaya satu tombol Simpan menutup
  // keduanya — dua tombol simpan pada satu halaman selalu berakhir dengan
  // salah satunya terlupakan.
  const dirtyKeys = useMemo(
    () => [...BACKGROUND_META.map((m) => m.key as string), ...SKM_KEYS, ...TENTANG_KEYS]
      .filter((k) => (draft[k] ?? '') !== (saved[k] ?? '')),
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
      setToast({ text: `${dirtyKeys.length} pengaturan berhasil diperbarui`, kind: 'success' });
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
        Tempelkan URL gambar (format <span className="text-[var(--adm-accent)] font-semibold">.jpg / .png / .webp</span>) pada kolom di bawah.
        Pratinjau langsung muncul sebelum disimpan. Mengosongkan kolom lalu menyimpan akan mengembalikan latar ke gambar bawaan.
        Perubahan langsung tampil di halaman publik setelah disimpan.
      </InfoNote>

      {/* ---- Survei Kepuasan Masyarakat ----
          Ditaruh di atas daftar latar karena isinya bukan hiasan: tautan mati
          pada halaman kewajiban UU 25/2009 adalah hal yang harus segera
          terlihat dan dapat dibetulkan petugas sendiri. */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Survei Kepuasan Masyarakat
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setValue('skm_is_active', draft.skm_is_active === '0' ? '1' : '0')}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors ${draft.skm_is_active === '0' ? 'bg-white/15' : 'bg-emerald-500'}`}
              aria-pressed={draft.skm_is_active !== '0'}
            >
              <motion.span layout className="block w-5 h-5 rounded-full bg-white" style={{ marginLeft: draft.skm_is_active === '0' ? 0 : 16 }} />
            </button>
            <span className="text-[12px] font-semibold text-[var(--adm-body)]">
              {draft.skm_is_active === '0' ? 'Disembunyikan' : 'Ditampilkan'}
            </span>
          </label>
        </div>

        <div className="p-5 space-y-4">
          <InfoNote>
            Blok ini tampil pada halaman <span className="font-semibold">Standar Pelayanan</span>.
            Tautannya milik Kemenhub dan dapat berganti sewaktu-waktu — betulkan di sini bila mati,
            atau sembunyikan sementara lewat sakelar di atas.
          </InfoNote>

          {[
            { key: 'skm_title', label: 'Judul Ajakan', textarea: false },
            { key: 'skm_text', label: 'Kalimat Pengantar', textarea: true },
            { key: 'skm_label', label: 'Teks Tombol', textarea: false },
            { key: 'skm_url', label: 'Tautan Survei', textarea: false },
          ].map((f) => {
            const value = draft[f.key] ?? '';
            const isDirty = value !== (saved[f.key] ?? '');
            const isDefault = value === DEFAULT_SETTINGS[f.key];

            return (
              <div key={f.key}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-dim)]">{f.label}</span>
                  <span className="flex items-center gap-2">
                    {isDirty && <Badge text="Belum disimpan" color="#fbbf24" />}
                    <button
                      onClick={() => setValue(f.key, DEFAULT_SETTINGS[f.key])}
                      disabled={isDefault}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--adm-body)] hover:text-[var(--adm-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Bawaan
                    </button>
                  </span>
                </div>

                {f.textarea ? (
                  <textarea
                    rows={2}
                    value={value}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    className="mt-1.5 w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] focus:outline-none focus:border-[var(--adm-accent)] transition-colors resize-y"
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    className="mt-1.5 w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] focus:outline-none focus:border-[var(--adm-accent)] transition-colors"
                  />
                )}

                {f.key === 'skm_url' && value && (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--adm-accent)] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Uji tautan ini
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ============ TENTANG BANDARA (BERANDA) ============ */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)] flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" /> Tentang Bandara (Beranda)
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <InfoNote>
            Blok &ldquo;Tentang Bandar Udara APT Pranoto&rdquo; pada beranda.
            <b> Isian yang dibiarkan kosong memakai teks bawaan portal</b>, bukan menjadi kosong —
            jadi mengosongkan isian Inggris membuat halaman berbahasa Inggris kembali memakai
            terjemahan bawaannya, bukan teks Indonesia di sebelahnya.
            Angka-angka di bawah blok ini dikelola terpisah di menu <b>Angka Bandara</b>.
          </InfoNote>

          {[
            { key: 'tentang_kicker_id', label: 'Kicker (Indonesia)', textarea: false },
            { key: 'tentang_kicker_en', label: 'Kicker (Inggris)', textarea: false },
            { key: 'tentang_judul_id', label: 'Judul (Indonesia)', textarea: false },
            { key: 'tentang_judul_en', label: 'Judul (Inggris)', textarea: false },
            { key: 'tentang_teks_id', label: 'Paragraf (Indonesia)', textarea: true },
            { key: 'tentang_teks_en', label: 'Paragraf (Inggris)', textarea: true },
            { key: 'tentang_caption_id', label: 'Tulisan di Gambar (Indonesia)', textarea: false },
            { key: 'tentang_caption_en', label: 'Tulisan di Gambar (Inggris)', textarea: false },
            { key: 'tentang_gambar', label: 'Gambar Sampul (URL)', textarea: false },
            { key: 'tentang_video_url', label: 'Video Profil (URL YouTube)', textarea: false },
          ].map((f) => {
            const value = draft[f.key] ?? '';
            const isDirty = value !== (saved[f.key] ?? '');

            return (
              <div key={f.key}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--adm-dim)]">{f.label}</span>
                  <span className="flex items-center gap-2">
                    {isDirty && <Badge text="Belum disimpan" color="#fbbf24" />}
                    {/* Tombol "Bawaan" pada blok ini berarti MENGOSONGKAN,
                        bukan mengembalikan sebuah teks: nilai bawaan seluruh
                        kunci di sini memang string kosong, dan kosong itulah
                        yang menyalakan teks cadangan dari kamus portal. */}
                    <button
                      onClick={() => setValue(f.key, '')}
                      disabled={value === ''}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--adm-body)] hover:text-[var(--adm-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Kosongkan
                    </button>
                  </span>
                </div>

                {f.textarea ? (
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder="Kosongkan untuk memakai teks bawaan portal"
                    className="mt-1.5 w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent)] transition-colors resize-y"
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder="Kosongkan untuk memakai teks bawaan portal"
                    className="mt-1.5 w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent)] transition-colors"
                  />
                )}

                {/* Pratinjau sampul: satu-satunya cara petugas tahu URL-nya
                    benar tanpa membuka beranda di tab lain. */}
                {f.key === 'tentang_gambar' && value && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={value}
                    alt=""
                    className="mt-2 h-28 w-full max-w-sm object-cover rounded-xl border border-[var(--adm-line)]"
                  />
                )}

                {f.key === 'tentang_video_url' && (
                  <p className="mt-1.5 text-[11.5px] text-[var(--adm-muted)]">
                    {value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-[var(--adm-accent)] hover:underline"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Buka video ini
                      </a>
                    ) : (
                      <>Dibiarkan kosong: tombol putar tidak ditampilkan sama sekali di beranda.</>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

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
                <div className="relative h-44 bg-[var(--adm-inset)] overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center text-[var(--adm-dim)]">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1428] via-transparent to-transparent" />

                  {/* label overlay */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[var(--adm-fg)] font-black text-[15px] leading-tight drop-shadow">{m.label}</p>
                      <p className="text-[var(--adm-body)] text-[11px] mt-0.5">{m.note}</p>
                    </div>
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur border border-[var(--adm-line)] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Lihat <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* badges */}
                  <div className="absolute top-3 left-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur border border-[var(--adm-line)] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                      {m.page}
                    </span>
                    {isDirty && <Badge text="Belum disimpan" color="#fbbf24" />}
                  </div>

                  {broken[m.key] && value && (
                    <div className="absolute inset-0 bg-[var(--adm-inset)]/85 flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                      <p className="text-rose-300 text-[12px] font-semibold">Gambar tidak dapat dimuat</p>
                      <p className="text-[var(--adm-dim)] text-[11px]">Periksa kembali URL-nya</p>
                    </div>
                  )}
                </div>

                {/* input */}
                <div className="p-4 space-y-3">
                  <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider">URL Gambar Latar</label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-[var(--adm-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={value}
                      onChange={(e) => setValue(m.key, e.target.value)}
                      placeholder="https://contoh.com/gambar.jpg"
                      className="w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl pl-10 pr-3 py-2.5 text-[12px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-cyan-400/50 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--adm-dim)] flex items-center gap-1.5">
                      {isDefault ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-400" /> Menggunakan gambar bawaan</>
                      ) : (
                        <>Gambar khusus</>
                      )}
                    </span>
                    <button
                      onClick={() => resetOne(m.key)}
                      disabled={isDefault}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--adm-body)] hover:text-[var(--adm-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
