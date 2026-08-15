'use client';

/**
 * Absensi rapat — sisi petugas.
 *
 * TIGA KEPUTUSAN BENTUK:
 *
 *  1. **Tautan absensi tidak pernah tampil pada tabel.** Ia diambil lewat
 *     permintaan tersendiri di balik satu tindakan sadar, persis seperti token
 *     Posko Nataru: siapa pun yang membacanya di layar dapat mengisi daftar
 *     hadir. Memutar tautan diberi peringatan tegas — peserta yang sedang
 *     mengantre di pintu akan tertahan dengan tautan yang mendadak mati.
 *
 *  2. **Menutup absensi ditonjolkan, bukan disembunyikan di menu.** Itu
 *     tindakan yang paling sering dilakukan petugas, dan daftar hadir yang
 *     lupa ditutup masih dapat bertambah berjam-jam sesudah rapat bubar.
 *
 *  3. **Daftar peserta dibuka pada panel tersendiri**, bukan diperluas dalam
 *     baris: satu rapat bisa berisi puluhan nama, dan mencetaknya adalah
 *     pekerjaan yang berbeda dari mengelola rapatnya.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, adminDownload } from '@/lib/adminApi';
import type { Meeting, Attendance } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  CalendarCheck, Plus, Pencil, Trash2, RefreshCw, Printer, Link2, Users,
  DoorOpen, DoorClosed, Copy, RotateCcw, Download,
} from 'lucide-react';
import { motion } from 'framer-motion';

const KOSONG = { title: '', date: '', start_time: '', location: '', organizer: '', organizer_nip: '' };

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminRapatPage() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<Meeting | null>(null);

  const [form, setForm] = useState(KOSONG);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tautan absensi — hanya diambil saat diminta.
  const [tautan, setTautan] = useState<{ rapat: Meeting; url: string } | null>(null);
  const [putarUntuk, setPutarUntuk] = useState<Meeting | null>(null);

  // Panel peserta.
  const [peserta, setPeserta] = useState<Meeting | null>(null);
  const [hapusPeserta, setHapusPeserta] = useState<Attendance | null>(null);

  const muat = async () => {
    const res = await adminFetch<Meeting[]>('/meetings');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<Meeting[]>('/meetings');
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
      it.title.toLowerCase().includes(s)
      || it.location.toLowerCase().includes(s)
      || it.organizer.toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    aktif: items.filter((it) => it.is_active).length,
    peserta: items.reduce((n, it) => n + (it.attendances_count ?? 0), 0),
    tanpaPeserta: items.filter((it) => (it.attendances_count ?? 0) === 0).length,
  }), [items]);

  const simpan = async () => {
    setSaving(true);

    const body = { ...form, organizer_nip: form.organizer_nip.trim() || null };
    const res = editId
      ? await adminFetch(`/meetings/${editId}`, { method: 'PUT', body })
      : await adminFetch('/meetings', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const bukaTautan = async (it: Meeting) => {
    const res = await adminFetch<{ token: string; path: string }>(`/meetings/${it.id}/token`);

    if (!res.ok || !res.data) {
      setToast({ text: res.message, kind: 'error' });

      return;
    }

    setTautan({ rapat: it, url: `${window.location.origin}${res.data.path}` });
  };

  const putarTautan = async () => {
    if (!putarUntuk) return;

    const res = await adminFetch<{ path: string }>(`/meetings/${putarUntuk.id}/rotate-token`, { method: 'POST' });
    setPutarUntuk(null);

    if (res.ok && res.data) {
      setTautan({ rapat: putarUntuk, url: `${window.location.origin}${res.data.path}` });
      setToast({ text: res.message, kind: 'success' });
    } else setToast({ text: res.message, kind: 'error' });
  };

  const toggle = async (it: Meeting) => {
    const res = await adminFetch(`/meetings/${it.id}/toggle`, { method: 'PUT' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const bukaPeserta = async (it: Meeting) => {
    const res = await adminFetch<Meeting>(`/meetings/${it.id}`);
    if (res.ok && res.data) setPeserta(res.data);
    else setToast({ text: res.message, kind: 'error' });
  };

  const cetak = async (it: Meeting) => {
    const res = await adminDownload(`/meetings/${it.id}/pdf`, `daftar-hadir-${it.slug}.pdf`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const unduhTtd = async (a: Attendance) => {
    const res = await adminDownload(`/attendances/${a.id}/signature`, `ttd-${a.name}.png`);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const buangPeserta = async () => {
    if (!hapusPeserta) return;
    const res = await adminFetch(`/attendances/${hapusPeserta.id}`, { method: 'DELETE' });
    const rapatId = peserta?.id;
    setHapusPeserta(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      muat();
      if (rapatId) bukaPeserta({ id: rapatId } as Meeting);
    }
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/meetings/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        title="Absensi Rapat"
        subtitle="Rapat, tautan daftar hadir, dan cetakan absensinya"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={() => { setForm({ ...KOSONG, date: new Date().toISOString().slice(0, 10) }); setEditId(null); setOpen(true); }}>
              <Plus className="w-4 h-4" /> Buat Rapat
            </Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Rapat" value={stats.total} icon={CalendarCheck} accent="#38bdf8" />
        <StatCard label="Absensi Terbuka" value={stats.aktif} icon={DoorOpen} accent="#34d399" hint="Masih menerima tanda tangan" />
        <StatCard label="Total Kehadiran" value={stats.peserta} icon={Users} accent="#a78bfa" />
        <StatCard label="Belum Ada Peserta" value={stats.tanpaPeserta} icon={DoorClosed} accent="#fbbf24" />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Tautan absensi <strong>tidak ditampilkan pada tabel</strong> — siapa pun yang membacanya
          dapat mengisi daftar hadir. Ambil lewat tombol tautan, lalu bagikan kepada peserta.
          Tutup absensinya begitu rapat selesai agar tidak ada tanda tangan yang masuk belakangan.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Rapat</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari judul, tempat, penyelenggara..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada rapat" hint="Buat rapat, lalu bagikan tautan absensinya kepada peserta." />
        ) : (
          <Table head={['Rapat', 'Waktu & Tempat', 'Penyelenggara', 'Peserta', 'Absensi', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell><span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.title}</span></Cell>

                <Cell>
                  <span className="text-[var(--adm-body)] text-[11.5px]">
                    {tgl(it.date)} · {it.start_time?.slice(0, 5)}
                  </span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{it.location}</span>
                </Cell>

                <Cell>
                  <span className="text-[var(--adm-body)]">{it.organizer}</span>
                  {it.organizer_nip && (
                    <span className="block text-[11px] text-[var(--adm-dim)]">NIP {it.organizer_nip}</span>
                  )}
                </Cell>

                <Cell>
                  <span className="tabular-nums font-bold text-[var(--adm-fg)]">{it.attendances_count ?? 0}</span>
                </Cell>

                <Cell>
                  <Badge text={it.is_active ? 'Terbuka' : 'Ditutup'} color={it.is_active ? '#34d399' : '#94a3b8'} />
                </Cell>

                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => bukaTautan(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Tautan absensi"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggle(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                      title={it.is_active ? 'Tutup absensi' : 'Buka kembali absensi'}
                    >
                      {it.is_active ? <DoorClosed className="w-3 h-3" /> : <DoorOpen className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => bukaPeserta(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-violet-500/20 text-[var(--adm-body)] hover:text-violet-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Daftar peserta"
                    >
                      <Users className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => cetak(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-emerald-500/20 text-[var(--adm-body)] hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Cetak daftar hadir"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setForm({
                          title: it.title, date: String(it.date).slice(0, 10),
                          start_time: it.start_time?.slice(0, 5) ?? '', location: it.location,
                          organizer: it.organizer, organizer_nip: it.organizer_nip ?? '',
                        });
                        setEditId(it.id);
                        setOpen(true);
                      }}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
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

      {/* ---- Formulir rapat ---- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Rapat' : 'Buat Rapat'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
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

      {/* ---- Tautan absensi ---- */}
      <Modal
        open={tautan !== null}
        onClose={() => setTautan(null)}
        title="Tautan Absensi"
        footer={<Btn variant="ghost" onClick={() => setTautan(null)}>Tutup</Btn>}
      >
        {tautan && (
          <div className="space-y-4">
            <p className="text-[12.5px] text-[var(--adm-body)]">
              Bagikan tautan ini kepada peserta rapat <strong>{tautan.rapat.title}</strong>.
            </p>

            <div className="flex gap-2">
              <input
                readOnly
                value={tautan.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12px] text-[var(--adm-fg)] font-mono"
              />
              <Btn variant="ghost" onClick={() => {
                navigator.clipboard?.writeText(tautan.url);
                setToast({ text: 'Tautan disalin', kind: 'success' });
              }}>
                <Copy className="w-4 h-4" /> Salin
              </Btn>
            </div>

            <p className="text-[11.5px] text-[var(--adm-dim)]">
              Siapa pun yang memegang tautan ini dapat mengisi daftar hadir selama absensinya masih
              terbuka. Jangan menayangkannya di layar yang terlihat umum.
            </p>

            <div className="pt-3 border-t border-[var(--adm-line)]">
              <Btn variant="ghost" onClick={() => { setPutarUntuk(tautan.rapat); setTautan(null); }}>
                <RotateCcw className="w-4 h-4" /> Perbarui Tautan
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Daftar peserta ---- */}
      <Modal
        open={peserta !== null}
        onClose={() => setPeserta(null)}
        title="Daftar Peserta"
        footer={<Btn variant="ghost" onClick={() => setPeserta(null)}>Tutup</Btn>}
      >
        {peserta && (
          <div className="space-y-3">
            <p className="text-[12.5px] font-bold text-[var(--adm-fg)]">{peserta.title}</p>

            {(peserta.attendances?.length ?? 0) === 0 ? (
              <p className="text-[12px] text-[var(--adm-dim)]">Belum ada peserta yang mengisi daftar hadir.</p>
            ) : (
              <ul className="space-y-2">
                {peserta.attendances!.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl bg-[var(--adm-inset)] ring-1 ring-[var(--adm-line)] px-4 py-2.5">
                    <span className="w-6 text-[11px] text-[var(--adm-dim)] tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[var(--adm-fg)] truncate">{a.name}</p>
                      <p className="text-[11px] text-[var(--adm-dim)]">
                        {a.department}{a.phone && ` · ${a.phone}`}
                      </p>
                    </div>
                    {a.has_signature ? (
                      <button
                        onClick={() => unduhTtd(a)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Unduh tanda tangan"
                      >
                        <Download className="w-3 h-3" /> TTD
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-amber-300" title="Tanda tangan tidak tersimpan">tanpa TTD</span>
                    )}
                    <button
                      onClick={() => setHapusPeserta(a)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus kehadiran"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={putarUntuk !== null}
        onCancel={() => setPutarUntuk(null)}
        onConfirm={putarTautan}
        message={
          putarUntuk
            ? `Tautan absensi "${putarUntuk.title}" akan diganti dan tautan lama LANGSUNG MATI. Peserta yang sedang mengantre di pintu akan tertahan sampai menerima tautan baru. Lanjutkan?`
            : ''
        }
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
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Rapat "${delItem.title}" akan dihapus permanen BESERTA ${delItem.attendances_count ?? 0} kehadiran dan tanda tangannya. Daftar hadir yang sudah ditandatangani tidak dapat dipulihkan. Lanjutkan?`
            : ''
        }
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
