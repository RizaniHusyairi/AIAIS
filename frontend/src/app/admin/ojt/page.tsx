'use client';

/**
 * Pengelolaan peserta OJT.
 *
 * Bukan setuju/tolak melainkan perjalanan peserta: mendaftar → berjalan →
 * selesai. Dua tindakan petugas yang berbeda sifatnya karena itu dipisah ke
 * dua modal: mengubah TAHAPAN, dan mengisi NILAI.
 *
 * Rata-rata, predikat, dan huruf mutu TIDAK diketik petugas — ketiganya
 * dihitung server dari komponen nilainya, dan layar ini hanya menampilkan
 * hasilnya. Membiarkan petugas mengetik rata-rata berarti dua angka yang bisa
 * bertentangan pada dokumen yang sama, sementara yang tercetak di sertifikat
 * cuma satu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminUpload, adminDownload } from '@/lib/adminApi';
import type { OjtStudent, OjtGrade, StatusOjt } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import {
  GraduationCap, Trash2, RefreshCw, Download, ListChecks, Users, CircleCheck, Play, Plus, X, Award, Lock, Unlock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUSES: StatusOjt[] = ['Mendaftar', 'Berjalan', 'Selesai', 'Batal'];

const WARNA_STATUS: Record<string, string> = {
  'Mendaftar': '#94a3b8',
  'Berjalan': '#38bdf8',
  'Selesai': '#34d399',
  'Batal': '#fb7185',
};

const BERKAS: { kolom: string; jenis: string; label: string }[] = [
  { kolom: 'identity_card_path', jenis: 'identity_card', label: 'KTP' },
  { kolom: 'photo_path', jenis: 'photo', label: 'Foto' },
  { kolom: 'final_certificate_path', jenis: 'final_certificate', label: 'Sertifikat' },
];

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminOjtPage() {
  const [items, setItems] = useState<OjtStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<OjtStudent | null>(null);

  const [tahap, setTahap] = useState<OjtStudent | null>(null);
  const [status, setStatus] = useState<StatusOjt>('Berjalan');
  const [catatan, setCatatan] = useState('');

  const [nilaiItem, setNilaiItem] = useState<OjtStudent | null>(null);
  const [nilai, setNilai] = useState<OjtGrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [batalkan, setBatalkan] = useState<OjtStudent | null>(null);

  const muat = async () => {
    const res = await adminFetch<OjtStudent[]>('/ojt');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<OjtStudent[]>('/ojt');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) =>
      it.name.toLowerCase().includes(s)
      || it.institution.toLowerCase().includes(s)
      || it.major.toLowerCase().includes(s)
      || it.id_number.toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    mendaftar: items.filter((it) => it.status === 'Mendaftar').length,
    berjalan: items.filter((it) => it.status === 'Berjalan').length,
    selesai: items.filter((it) => it.status === 'Selesai').length,
  }), [items]);

  /** Rata-rata pratinjau; angka yang tersimpan tetap dihitung server. */
  const rataPratinjau = useMemo(() => {
    const angka = nilai.map((n) => Number(n.score)).filter((n) => !Number.isNaN(n));

    return angka.length > 0 ? Math.round((angka.reduce((a, b) => a + b, 0) / angka.length) * 100) / 100 : null;
  }, [nilai]);

  const simpanTahap = async () => {
    if (!tahap) return;
    setSaving(true);

    const res = await adminFetch(`/ojt/${tahap.id}/status`, {
      method: 'PUT',
      body: { status, staff_notes: catatan.trim() || null },
    });
    setSaving(false);

    if (res.ok) {
      setTahap(null);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const simpanNilai = async () => {
    if (!nilaiItem) return;

    const bersih = nilai.filter((n) => n.component.trim() !== '');

    if (bersih.length === 0) {
      setToast({ text: 'Isi sekurang-kurangnya satu komponen penilaian.', kind: 'error' });

      return;
    }

    setSaving(true);

    const res = await adminFetch(`/ojt/${nilaiItem.id}/grades`, {
      method: 'PUT',
      body: { grades: bersih.map((n) => ({ component: n.component.trim(), score: Number(n.score) })) },
    });
    setSaving(false);

    if (res.ok) {
      setNilaiItem(null);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  /* ---------------- sertifikat & finalisasi ---------------- */

  const cetakSertifikat = async (it: OjtStudent) => {
    const res = await adminDownload(`/ojt/${it.id}/certificate`, `sertifikat-${it.name}.pdf`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  /**
   * Unggah sertifikat bertanda tangan.
   *
   * Sesudah ini nilainya terkunci — sertifikat yang sudah beredar tidak boleh
   * bertentangan dengan angka di basis data.
   */
  const finalisasi = async (it: OjtStudent, berkas: File | null) => {
    if (!berkas) return;

    const fd = new FormData();
    fd.append('signed_certificate', berkas);

    const res = await adminUpload(`/ojt/${it.id}/finalize`, fd);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const batalFinal = async () => {
    if (!batalkan) return;
    const res = await adminFetch(`/ojt/${batalkan.id}/finalize`, { method: 'DELETE' });
    setBatalkan(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const unduh = async (it: OjtStudent, jenis: string, label: string) => {
    const res = await adminDownload(`/ojt/${it.id}/files/${jenis}`, `${label}-${it.name}`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/ojt/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="Peserta OJT"
        subtitle="Praktik kerja lapangan di Bandar Udara APT Pranoto"
        action={<Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Peserta" value={stats.total} icon={Users} accent="#38bdf8" />
        <StatCard label="Mendaftar" value={stats.mendaftar} icon={Plus} accent="#94a3b8" />
        <StatCard label="Sedang Berjalan" value={stats.berjalan} icon={Play} accent="#a78bfa" />
        <StatCard label="Selesai" value={stats.selesai} icon={CircleCheck} accent="#34d399" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Peserta</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama, institusi, nomor induk..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada peserta OJT" hint="Pendaftaran yang dikirim lewat halaman akun warga muncul di sini." />
        ) : (
          <Table head={['Peserta', 'Institusi', 'Periode', 'Berkas', 'Nilai', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.name}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.id_number} · {it.phone_number}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)]">{it.institution}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.major}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)] text-[11.5px]">{tgl(it.start_date)}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">s/d {tgl(it.end_date)}</span>
                </Cell>

                <Cell>
                  {it.available_files.length === 0 ? (
                    <span className="text-[var(--adm-dim)]">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {BERKAS.filter((b) => it.available_files.includes(b.kolom)).map((b) => (
                        <button
                          key={b.jenis}
                          onClick={() => unduh(it, b.jenis, b.label)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> {b.label}
                        </button>
                      ))}
                    </span>
                  )}
                </Cell>

                <Cell>
                  {it.average_score === null ? (
                    <span className="text-[var(--adm-dim)]" title="Nilai belum diisi">—</span>
                  ) : (
                    <>
                      <span className="text-[var(--adm-fg)] font-bold tabular-nums">{it.average_score}</span>
                      <span className="block text-[11px] text-[var(--adm-dim)]">{it.predicate} ({it.letter_grade})</span>
                    </>
                  )}
                </Cell>

                <Cell><Badge text={it.status} color={WARNA_STATUS[it.status] ?? '#94a3b8'} /></Cell>

                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => { setTahap(it); setStatus(it.status); setCatatan(it.staff_notes ?? ''); }}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah tahapan"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    {/* Nilai terkunci sesudah sertifikat terbit — tombolnya
                        dimatikan disertai alasan, bukan disembunyikan. */}
                    <button
                      onClick={() => { setNilaiItem(it); setNilai(it.grades?.length ? [...it.grades] : [{ component: '', score: 0 }]); }}
                      disabled={it.is_finalized}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] enabled:hover:bg-violet-500/20 text-[var(--adm-body)] enabled:hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                      title={it.is_finalized ? 'Nilai terkunci — sertifikat sudah diterbitkan' : 'Isi nilai'}
                    >
                      {it.is_finalized ? <Lock className="w-3 h-3" /> : <ListChecks className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => cetakSertifikat(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Cetak sertifikat"
                    >
                      <Award className="w-3 h-3" />
                    </button>

                    {it.is_finalized ? (
                      <button
                        onClick={() => setBatalkan(it)}
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Batalkan finalisasi"
                      >
                        <Unlock className="w-3 h-3" />
                      </button>
                    ) : (
                      <label
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-emerald-500/20 text-[var(--adm-body)] hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Unggah sertifikat bertanda tangan (finalisasi)"
                      >
                        <CircleCheck className="w-3 h-3" />
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => { finalisasi(it, e.target.files?.[0] ?? null); e.target.value = ''; }}
                        />
                      </label>
                    )}
                    <button
                      onClick={() => setDelItem(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      <Modal
        open={tahap !== null}
        onClose={() => setTahap(null)}
        title="Tahapan Peserta"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setTahap(null)}>Batal</Btn>
            <Btn onClick={simpanTahap} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        {tahap && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{tahap.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">{tahap.institution} · {tahap.major}</p>
            </div>

            <Field
              label="Tahapan" required type="select"
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              value={status}
              onChange={(v) => setStatus(v as StatusOjt)}
            />

            <Field
              label="Catatan" type="textarea" rows={3}
              value={catatan}
              onChange={(v) => setCatatan(String(v))}
            />
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Sesudah tahapannya lewat dari Mendaftar, peserta tidak lagi dapat menyunting datanya
              sendiri — nama dan nomor identitasnya tercetak di sertifikat.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={nilaiItem !== null}
        onClose={() => setNilaiItem(null)}
        title="Nilai Peserta"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setNilaiItem(null)}>Batal</Btn>
            <Btn onClick={simpanNilai} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Nilai'}</Btn>
          </>
        }
      >
        {nilaiItem && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{nilaiItem.name}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">{nilaiItem.institution} · {nilaiItem.major}</p>
            </div>

            <div className="space-y-2">
              {nilai.map((n, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Field
                      label={i === 0 ? 'Komponen' : ''}
                      value={n.component}
                      placeholder="Kedisiplinan"
                      onChange={(v) => setNilai(nilai.map((x, j) => j === i ? { ...x, component: String(v) } : x))}
                    />
                  </div>
                  <div className="w-24">
                    <Field
                      label={i === 0 ? 'Nilai' : ''} type="number"
                      value={String(n.score)}
                      onChange={(v) => setNilai(nilai.map((x, j) => j === i ? { ...x, score: Number(v) } : x))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNilai(nilai.filter((_, j) => j !== i))}
                    className="w-9 h-9 mb-0.5 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-muted)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="Buang komponen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Btn variant="ghost" onClick={() => setNilai([...nilai, { component: '', score: 0 }])}>
              <Plus className="w-4 h-4" /> Tambah Komponen
            </Btn>

            {/* Pratinjau saja — angka yang tersimpan dihitung ulang server. */}
            {rataPratinjau !== null && (
              <p className="text-[12px] text-[var(--adm-accent)]">
                Perkiraan rata-rata: <span className="font-bold tabular-nums">{rataPratinjau}</span>
                <span className="ml-2 text-[var(--adm-muted)]">
                  Nilai akhir, predikat, dan huruf mutu dihitung server saat disimpan.
                </span>
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={batalkan !== null}
        onCancel={() => setBatalkan(null)}
        onConfirm={batalFinal}
        message={
          batalkan
            ? `Finalisasi "${batalkan.name}" akan dibatalkan dan sertifikat bertanda tangan yang tersimpan AKAN DIHAPUS, agar tidak ada dua sertifikat dengan nilai berbeda. Sertifikat yang sudah terlanjur beredar di tangan peserta tidak dapat ditarik kembali. Lanjutkan?`
            : ''
        }
      />

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Data peserta "${delItem.name}" akan dihapus permanen beserta kartu identitas, foto, dan sertifikatnya. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
