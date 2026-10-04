'use client';

/**
 * Rekapitulasi LLAU bulanan — pengganti pencatatan lalu lintas harian.
 *
 * Petugas tidak lagi mengetik angka: berkas Excel LLAU diunggah apa adanya,
 * dan seluruh statistik publik (dasbor `/statistik`, angka beranda aplikasi,
 * cetak PDF bulanan) diturunkan darinya.
 *
 * Alurnya dua langkah dengan sengaja. Memilih berkas hanya MEMBACA-nya
 * (`/llau/preview`) — periode, jumlah baris, dan kecocokan dengan baris
 * JUMLAH di Excel ditampilkan dulu. Baru tombol "Terapkan" yang menyimpan.
 * Unggahan bulan yang sama mengganti data lama seluruhnya; karena itu
 * pratinjau menyebut terang-terangan bila ada laporan yang akan tergantikan.
 *
 * Total yang tidak cocok tidak diam-diam ditolak maupun diterima: petugas
 * melihat kolom mana yang selisih, dan hanya bisa menerapkan setelah
 * menyatakan selisih itu diketahui. Pernyataan itu tersimpan dan ditandai di
 * daftar, supaya tetap bisa ditelusuri.
 *
 * Laporan yang membawa peringatan tetap tampil di daftar dengan penandanya —
 * bukan disembunyikan — supaya petugas tahu bulan mana yang perlu diperiksa.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, XCircle, Printer, Trash2,
  CalendarDays, Plane, Users, Timer, RefreshCw, Eye,
} from 'lucide-react';
import { adminFetch, adminUpload, adminDownload } from '@/lib/adminApi';
import { angka } from '@/lib/airTraffic';
import { persen } from '@/lib/llau';
import type { LlauPreview, LlauReport } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, ConfirmDialog, Toast, type ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';

export default function AdminLlauPage() {
  const [items, setItems] = useState<LlauReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<LlauPreview | null>(null);
  const [membaca, setMembaca] = useState(false);
  const [menerapkan, setMenerapkan] = useState(false);
  const [akuiSelisih, setAkuiSelisih] = useState(false);
  const [seret, setSeret] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [delItem, setDelItem] = useState<LlauReport | null>(null);
  const [mencetak, setMencetak] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<LlauReport[]>('/llau');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<LlauReport[]>('/llau');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((l) => !s || `${l.label} ${l.period} ${l.original_name}`.toLowerCase().includes(s));
  }, [items, q]);

  const terbaru = items[0] ?? null;

  const bersihkan = () => {
    setBerkas(null);
    setPratinjau(null);
    setAkuiSelisih(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  /** Baca berkas tanpa menyimpan — langkah pertama. */
  const baca = async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setToast({ text: 'Berkas harus berformat .xlsx (Excel 2007 ke atas).', kind: 'error' });
      return;
    }

    setBerkas(f);
    setPratinjau(null);
    setAkuiSelisih(false);
    setMembaca(true);

    const form = new FormData();
    form.append('file', f);
    const res = await adminUpload<LlauPreview>('/llau/preview', form);
    setMembaca(false);

    if (res.ok && res.data) setPratinjau(res.data);
    else {
      setToast({ text: res.message, kind: 'error' });
      bersihkan();
    }
  };

  const terapkan = async () => {
    if (!berkas || !pratinjau) return;

    setMenerapkan(true);
    const form = new FormData();
    form.append('file', berkas);
    if (pratinjau.mismatches.length > 0 && akuiSelisih) form.append('ignore_mismatch', '1');
    const res = await adminUpload('/llau', form);
    setMenerapkan(false);

    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) {
      bersihkan();
      load();
    }
  };

  const cetak = async (l: LlauReport) => {
    setMencetak(l.period);
    const res = await adminDownload(`/air-traffic/export-pdf?month=${l.period}`, `lalu-lintas-udara-${l.period}.pdf`);
    setMencetak(null);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const hapus = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/llau/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const bisaDiterapkan = !!pratinjau
    && pratinjau.errors.length === 0
    && pratinjau.period !== null
    && (pratinjau.mismatches.length === 0 || akuiSelisih);

  return (
    <>
      <PageHeader
        icon={FileSpreadsheet}
        title="Rekapitulasi LLAU"
        subtitle="Unggah berkas Excel LLAU bulanan — statistik lalu lintas udara di portal dihitung otomatis darinya"
        action={<Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Bulan Terunggah" value={items.length} icon={CalendarDays} accent="#38bdf8" hint={terbaru ? `terbaru ${terbaru.label}` : undefined} />
        <StatCard label="Penerbangan Bulan Terbaru" value={terbaru ? angka(terbaru.flight_count) : '—'} icon={Plane} accent="#34d399" />
        <StatCard label="Penumpang Bulan Terbaru" value={terbaru ? angka(terbaru.passengers) : '—'} icon={Users} accent="#a78bfa" />
        <StatCard label="Tepat Waktu Bulan Terbaru" value={terbaru ? persen(terbaru.otp_rate) : '—'} icon={Timer} accent="#fbbf24" />
      </motion.div>

      <Panel title="Unggah Rekapitulasi">
        <div className="p-5 space-y-5">
          {/* Area unggah: klik atau seret. Memilih berkas langsung membacanya. */}
          <label
            onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
            onDragLeave={() => setSeret(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSeret(false);
              const f = e.dataTransfer.files?.[0];
              if (f) baca(f);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center cursor-pointer transition-colors ${
              seret ? 'border-[var(--adm-accent)] bg-[var(--adm-accent-soft)]' : 'border-[var(--adm-line)] hover:border-[var(--adm-accent-line)] bg-[var(--adm-inset)]'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-[var(--adm-accent)]" />
            <span className="text-[13px] font-bold text-[var(--adm-fg)]">
              {membaca ? 'Membaca berkas…' : berkas ? berkas.name : 'Pilih atau seret berkas rekapitulasi LLAU (.xlsx)'}
            </span>
            <span className="text-[11.5px] text-[var(--adm-muted)]">
              Format templat LLAU Ditjen Hubud apa adanya — lembar &quot;SHEET&quot;, maksimal 10 MB.
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) baca(f); }}
            />
          </label>

          {pratinjau && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[15px] font-black text-[var(--adm-fg)]">
                  {pratinjau.period ? pratinjau.period.label : 'Periode tidak terbaca'}
                </p>
                <Badge text={`${angka(pratinjau.flight_count)} penerbangan`} color="#38bdf8" />
                {pratinjau.errors.length === 0 && pratinjau.mismatches.length === 0 && (
                  <Badge text="Total cocok dengan Excel" color="#34d399" />
                )}
                {pratinjau.replaces && <Badge text="Mengganti data bulan ini" color="#fbbf24" />}
              </div>

              {pratinjau.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-[12px]">
                  {[
                    ['Kedatangan / keberangkatan', `${angka(pratinjau.summary.flights.arrival)} / ${angka(pratinjau.summary.flights.departure)}`],
                    ['Penumpang (termasuk transit)', angka(pratinjau.summary.passengers.total)],
                    ['Kargo', `${angka(pratinjau.summary.cargo.total)} kg`],
                    ['Bagasi', `${angka(pratinjau.summary.baggage.total)} kg`],
                    ['Tepat waktu (berjadwal)', persen(pratinjau.summary.otp.rate)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-[var(--adm-hover)] px-3.5 py-3">
                      <p className="text-[var(--adm-muted)]">{k}</p>
                      <p className="mt-0.5 font-black text-[var(--adm-fg)] tabular-nums text-[14px]">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {pratinjau.replaces && (
                <InfoNote>
                  Rekapitulasi {pratinjau.period?.label} sudah pernah diterapkan. Menerapkan berkas ini
                  akan MENGGANTI seluruh data bulan itu, termasuk statistik harian yang tayang.
                </InfoNote>
              )}

              {pratinjau.errors.length > 0 && (
                <div className="rounded-xl border border-[var(--adm-danger-line)] bg-[var(--adm-danger-soft)] px-4 py-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--adm-danger)]">
                    <XCircle className="w-4 h-4" /> Berkas belum dapat diterapkan
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--adm-body)] list-disc pl-5">
                    {pratinjau.errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                  <p className="mt-2 text-[11.5px] text-[var(--adm-muted)]">Nomor baris merujuk baris pada lembar Excel. Perbaiki lalu unggah ulang.</p>
                </div>
              )}

              {pratinjau.mismatches.length > 0 && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 space-y-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--adm-fg)]">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Hasil hitung tidak sama dengan baris JUMLAH di Excel
                  </p>
                  <Table head={['Kolom', 'Baris JUMLAH Excel', 'Hasil hitung', 'Selisih']}>
                    {pratinjau.mismatches.map((m) => (
                      <Row key={m.column}>
                        <Cell>{m.column} · {m.label}</Cell>
                        <Cell><span className="tabular-nums">{angka(m.excel)}</span></Cell>
                        <Cell><span className="tabular-nums">{angka(m.computed)}</span></Cell>
                        <Cell><span className="tabular-nums font-bold">{angka(m.computed - m.excel)}</span></Cell>
                      </Row>
                    ))}
                  </Table>
                  <p className="text-[11.5px] text-[var(--adm-muted)]">
                    Biasanya rentang rumus SUM di Excel tidak mencakup semua baris. Yang ditayangkan selalu hasil hitung per baris.
                  </p>
                  <Field
                    type="checkbox"
                    label="Saya sudah memeriksa dan tetap menerapkan berkas ini"
                    value={akuiSelisih}
                    onChange={(v) => setAkuiSelisih(!!v)}
                  />
                </div>
              )}

              {pratinjau.warnings.length > 0 && (
                <div className="rounded-xl bg-[var(--adm-hover)] px-4 py-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-[var(--adm-fg)]">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Peringatan (tidak menghalangi penerapan)
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-[var(--adm-body)] list-disc pl-5">
                    {pratinjau.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Btn variant="ghost" onClick={bersihkan}>Batal</Btn>
                <Btn onClick={terapkan} disabled={!bisaDiterapkan || menerapkan}>
                  <CheckCircle2 className="w-4 h-4" /> {menerapkan ? 'Menerapkan…' : 'Terapkan ke Portal'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Laporan Terunggah</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari bulan atau nama berkas..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada rekapitulasi" hint="Unggah berkas LLAU bulanan agar statistik publik terisi." />
        ) : (
          <Table head={['Periode', 'Penerbangan', 'Penumpang', 'Tepat Waktu', 'Diunggah', 'Penanda', '']}>
            {visible.map((l) => (
              <Row key={l.id}>
                <Cell>
                  <Link href={`/admin/llau/${l.id}`} className="font-bold text-[var(--adm-fg)] text-[12.5px] hover:text-[var(--adm-accent)] transition-colors">{l.label}</Link>
                  <p className="text-[11px] text-[var(--adm-dim)] truncate max-w-[220px]" title={l.original_name}>{l.original_name}</p>
                </Cell>
                <Cell><span className="tabular-nums">{angka(l.flight_count)}</span></Cell>
                <Cell><span className="tabular-nums">{angka(l.passengers)}</span></Cell>
                <Cell><span className="tabular-nums">{persen(l.otp_rate)}</span></Cell>
                <Cell>
                  <p className="text-[12px]">{l.updated_at ? new Date(l.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                  {l.uploaded_by && <p className="text-[11px] text-[var(--adm-dim)]">{l.uploaded_by}</p>}
                </Cell>
                <Cell>
                  <div className="flex flex-wrap gap-1.5">
                    {l.mismatch_ignored && <Badge text="Total tak cocok" color="#f87171" />}
                    {l.warnings.length > 0 && (
                      <span title={l.warnings.join('\n')}><Badge text={`${l.warnings.length} peringatan`} color="#fbbf24" /></span>
                    )}
                    {!l.mismatch_ignored && l.warnings.length === 0 && <Badge text="Bersih" color="#34d399" />}
                  </div>
                </Cell>
                <Cell>
                  <div className="flex gap-1.5 justify-end">
                    <Link
                      href={`/admin/llau/${l.id}`}
                      className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors"
                      title="Lihat rincian"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => cetak(l)}
                      disabled={mencetak === l.period}
                      className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                      title="Cetak rekap harian (PDF)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDelItem(l)}
                      className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={hapus}
        message={`Rekapitulasi ${delItem?.label ?? ''} beserta statistik harian bulan itu akan dihapus dan tidak lagi tayang di portal. Lanjutkan?`}
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
