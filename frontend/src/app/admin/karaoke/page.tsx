'use client';

/**
 * Panitia lomba karaoke.
 *
 * Tiga hal yang hanya bisa dikerjakan dari sini, dan tidak dari papan juri:
 * mendaftarkan peserta, membagikan tautan penilaian, dan mengunci nilai.
 *
 * TAUTAN JURI TIDAK IKUT MUAT BERSAMA HALAMAN. Ia diambil lewat permintaan
 * terpisah dan hanya ketika petugas menekan tombolnya — alasan yang sama
 * dengan token rapat: layar panitia kerap terbuka di ruangan berisi banyak
 * orang, dan token yang tampil di sana sudah bocor sebelum sempat dibagikan.
 *
 * Bobot kriteria TIDAK ditulis di berkas ini; ia datang dari `detail.criteria`,
 * yaitu dari basis data.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { labelKriteria, nilaiTampil, rekapSah } from '@/lib/karaokeKriteria';
import type {
  KaraokeEvent, KaraokeDetailAdmin, KaraokeTautanJuri, KaraokeScore,
} from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Mic, Plus, Pencil, Trash2, RefreshCw, Lock, LockOpen, Users, UserRound,
  Trophy, Link as LinkIcon, Copy, RotateCcw, CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';

type FormAcara = { title: string; held_on: string; location: string };
type FormPeserta = { name: string; number: string; song_title: string };

const ACARA_KOSONG: FormAcara = { title: '', held_on: '', location: '' };
const PESERTA_KOSONG: FormPeserta = { name: '', number: '', song_title: '' };

/** Sasaran ConfirmDialog: tiga jenis penghapusan berbagi satu dialog. */
type Hapus = { jenis: 'acara' | 'juri' | 'peserta'; id: number } | null;

export default function AdminKaraokePage() {
  const [events, setEvents] = useState<KaraokeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [selId, setSelId] = useState<number | null>(null);
  const [detail, setDetail] = useState<KaraokeDetailAdmin | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tautan, setTautan] = useState<KaraokeTautanJuri[] | null>(null);

  const [formAcara, setFormAcara] = useState<FormAcara>(ACARA_KOSONG);
  const [editAcaraId, setEditAcaraId] = useState<number | null>(null);
  const [openAcara, setOpenAcara] = useState(false);

  const [formPeserta, setFormPeserta] = useState<FormPeserta>(PESERTA_KOSONG);
  const [editPesertaId, setEditPesertaId] = useState<number | null>(null);
  const [openPeserta, setOpenPeserta] = useState(false);

  const [namaJuri, setNamaJuri] = useState('');
  const [editJuriId, setEditJuriId] = useState<number | null>(null);
  const [openJuri, setOpenJuri] = useState(false);

  const [saving, setSaving] = useState(false);
  const [hapus, setHapus] = useState<Hapus>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  /* ---------------------------------------------------------------- */
  /*  Pemuatan                                                         */
  /* ---------------------------------------------------------------- */

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<KaraokeEvent[]>('/karaoke');
    setEvents(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<KaraokeEvent[]>('/karaoke');
      if (batal) return;
      setEvents(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    // Tautan juri dibuang tiap kali detail dimuat ulang: token yang sudah
    // tampil tidak boleh tertinggal di layar setelah petugas berpindah acara.
    setTautan(null);
    const res = await adminFetch<KaraokeDetailAdmin>(`/karaoke/${id}`);
    setDetail(res.ok ? rekapSah(res.data) : null);
    setLoadingDetail(false);
    if (!res.ok) setToast({ text: res.message, kind: 'error' });
  };

  const pilih = (id: number) => { setSelId(id); loadDetail(id); };

  const segarkan = async () => {
    await load();
    if (selId !== null) await loadDetail(selId);
  };

  /* ---------------------------------------------------------------- */
  /*  Acara                                                            */
  /* ---------------------------------------------------------------- */

  const simpanAcara = async () => {
    setSaving(true);
    const body = {
      title: formAcara.title,
      held_on: formAcara.held_on,
      location: formAcara.location || null,
    };

    const res = editAcaraId
      ? await adminFetch(`/karaoke/${editAcaraId}`, { method: 'PUT', body })
      : await adminFetch('/karaoke', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpenAcara(false);
      setToast({ text: editAcaraId ? 'Acara diperbarui' : 'Acara dibuat beserta tiga juri', kind: 'success' });
      await segarkan();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const toggleKunci = async (ev: KaraokeEvent) => {
    const res = await adminFetch<KaraokeEvent>(`/karaoke/${ev.id}/toggle`, { method: 'PUT' });
    setToast({ text: res.ok ? res.message : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) await segarkan();
  };

  /* ---------------------------------------------------------------- */
  /*  Peserta & juri                                                   */
  /* ---------------------------------------------------------------- */

  const simpanPeserta = async () => {
    if (selId === null) return;
    setSaving(true);
    const body = {
      name: formPeserta.name,
      number: formPeserta.number ? Number(formPeserta.number) : null,
      song_title: formPeserta.song_title || null,
    };

    const res = editPesertaId
      ? await adminFetch(`/karaoke-contestants/${editPesertaId}`, { method: 'PUT', body })
      : await adminFetch(`/karaoke/${selId}/contestants`, { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpenPeserta(false);
      setToast({ text: editPesertaId ? 'Peserta diperbarui' : 'Peserta ditambahkan', kind: 'success' });
      await loadDetail(selId);
      await load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const simpanJuri = async () => {
    if (selId === null) return;
    setSaving(true);
    const body = { name: namaJuri };

    const res = editJuriId
      ? await adminFetch(`/karaoke-judges/${editJuriId}`, { method: 'PUT', body })
      : await adminFetch(`/karaoke/${selId}/judges`, { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpenJuri(false);
      setToast({ text: editJuriId ? 'Nama juri diperbarui' : 'Juri ditambahkan', kind: 'success' });
      await loadDetail(selId);
      await load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const jalankanHapus = async () => {
    if (!hapus) return;
    const path =
      hapus.jenis === 'acara' ? `/karaoke/${hapus.id}`
        : hapus.jenis === 'juri' ? `/karaoke-judges/${hapus.id}`
          : `/karaoke-contestants/${hapus.id}`;

    const res = await adminFetch(path, { method: 'DELETE' });
    const jenis = hapus.jenis;
    setHapus(null);
    setToast({ text: res.ok ? res.message : res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      if (jenis === 'acara') { setSelId(null); setDetail(null); await load(); }
      else await segarkan();
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Tautan juri                                                      */
  /* ---------------------------------------------------------------- */

  const ambilTautan = async () => {
    if (selId === null) return;
    const res = await adminFetch<KaraokeTautanJuri[]>(`/karaoke/${selId}/tokens`);
    if (res.ok) setTautan(Array.isArray(res.data) ? res.data : []);
    else setToast({ text: res.message, kind: 'error' });
  };

  const putarToken = async (juriId: number) => {
    const res = await adminFetch(`/karaoke-judges/${juriId}/rotate-token`, { method: 'POST' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) await ambilTautan();
  };

  /** Alamat papan juri. Disusun dari asal halaman ini, bukan dari env —
   *  tautannya harus menunjuk portal yang sedang dibuka petugas. */
  const alamatJuri = (token: string) =>
    typeof window === 'undefined' ? `/karaoke/${token}` : `${window.location.origin}/karaoke/${token}`;

  const salin = async (token: string, nama: string) => {
    try {
      await navigator.clipboard.writeText(alamatJuri(token));
      setToast({ text: `Tautan ${nama} disalin`, kind: 'success' });
    } catch {
      // Peramban lama, atau halaman yang tidak dianggap konteks aman.
      setToast({ text: 'Peramban menolak menyalin. Salin tautannya secara manual.', kind: 'error' });
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Turunan                                                          */
  /* ---------------------------------------------------------------- */

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return events.filter((e) => !q || [e.title, e.location].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [events, q]);

  const stats = useMemo(() => ({
    total: events.length,
    terbuka: events.filter((e) => e.status === 'open').length,
    peserta: events.reduce((n, e) => n + (e.contestants_count ?? 0), 0),
    juri: events.reduce((n, e) => n + (e.judges_count ?? 0), 0),
  }), [events]);

  /** Nilai mentah, dikunci pada "juriId:pesertaId" untuk tabel rekap. */
  const matriks = useMemo(() => {
    const peta = new Map<string, KaraokeScore>();
    for (const s of detail?.scores ?? []) {
      peta.set(`${s.karaoke_judge_id}:${s.karaoke_contestant_id}`, s);
    }
    return peta;
  }, [detail]);

  const peringkat = useMemo(
    () => [...(detail?.totals ?? [])].sort((a, b) => b.final_score - a.final_score),
    [detail],
  );

  const tanggal = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        icon={Mic}
        title="Lomba Karaoke"
        subtitle="Acara, peserta, tautan penilaian juri, dan rekap nilai"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={segarkan}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={() => { setFormAcara(ACARA_KOSONG); setEditAcaraId(null); setOpenAcara(true); }}>
              <Plus className="w-4 h-4" /> Buat Acara
            </Btn>
          </div>
        }
      />

      <InfoNote>
        Papan skor terbuka di <code>/karaoke</code> — halaman ini tidak terdaftar di menu portal
        dan tidak diindeks mesin pencari. Setiap juri menilai lewat tautannya sendiri; tautan itu
        satu-satunya penjaga papan nilainya, jadi bagikan lewat jalur pribadi dan ganti tautannya
        bila pernah terkirim ke orang yang keliru.
      </InfoNote>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Acara" value={stats.total} icon={CalendarDays} accent="#38bdf8" />
        <StatCard label="Penilaian Terbuka" value={stats.terbuka} icon={LockOpen} accent="#34d399" />
        <StatCard label="Total Peserta" value={stats.peserta} icon={Users} accent="#a78bfa" />
        <StatCard label="Total Juri" value={stats.juri} icon={UserRound} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Acara</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari acara..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada acara lomba" hint="Buat acara terlebih dahulu; tiga juri beserta tautannya dibuatkan otomatis." />
        ) : (
          <Table head={['Acara', 'Tanggal', 'Juri', 'Peserta', 'Status', 'Aksi']}>
            {visible.map((e) => (
              <Row key={e.id}>
                <Cell className="max-w-[320px]">
                  <button onClick={() => pilih(e.id)} className="text-left cursor-pointer">
                    <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">{e.title}</p>
                    {e.location && <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5">{e.location}</p>}
                  </button>
                </Cell>
                <Cell>{tanggal(e.held_on)}</Cell>
                <Cell>{e.judges_count ?? '—'}</Cell>
                <Cell>{e.contestants_count ?? '—'}</Cell>
                <Cell>
                  <button onClick={() => toggleKunci(e)} className="cursor-pointer" title="Klik untuk mengunci atau membuka penilaian">
                    <Badge text={e.status === 'open' ? 'Penilaian dibuka' : 'Terkunci'} color={e.status === 'open' ? '#34d399' : '#f59e0b'} />
                  </button>
                </Cell>
                <Cell>
                  <div className="flex gap-1.5">
                    <button onClick={() => pilih(e.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Kelola">
                      <Trophy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setFormAcara({ title: e.title, held_on: e.held_on.slice(0, 10), location: e.location ?? '' });
                        setEditAcaraId(e.id);
                        setOpenAcara(true);
                      }}
                      className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Ubah"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setHapus({ jenis: 'acara', id: e.id })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      {selId !== null && (loadingDetail ? <Panel><Loading text="Memuat detail acara..." /></Panel> : detail && (
        <>
          {/* Juri dan tautan penilaiannya */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">
                Juri — {detail.event.title}
              </h2>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={ambilTautan}><LinkIcon className="w-4 h-4" /> Tampilkan Tautan</Btn>
                <Btn onClick={() => { setNamaJuri(''); setEditJuriId(null); setOpenJuri(true); }}>
                  <Plus className="w-4 h-4" /> Tambah Juri
                </Btn>
              </div>
            </div>

            {detail.judges.length === 0 ? (
              <EmptyState text="Belum ada juri" hint="Tambahkan minimal satu juri agar papan penilaian dapat dibagikan." />
            ) : (
              <Table head={['Juri', 'Tautan Penilaian', 'Aksi']}>
                {detail.judges.map((j) => {
                  const t = tautan?.find((x) => x.id === j.id);
                  return (
                    <Row key={j.id}>
                      <Cell><span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{j.name}</span></Cell>
                      <Cell className="max-w-[420px]">
                        {t ? (
                          <span className="break-all text-[11.5px] text-[var(--adm-body)]">{alamatJuri(t.token)}</span>
                        ) : (
                          <span className="text-[11.5px] text-[var(--adm-muted)]">
                            Tersembunyi — tekan “Tampilkan Tautan”.
                          </span>
                        )}
                      </Cell>
                      <Cell>
                        <div className="flex gap-1.5">
                          {t && (
                            <button onClick={() => salin(t.token, j.name)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Salin tautan">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => putarToken(j.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer" title="Ganti tautan (tautan lama langsung mati)">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setNamaJuri(j.name); setEditJuriId(j.id); setOpenJuri(true); }}
                            className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                            title="Ubah nama"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setHapus({ jenis: 'juri', id: j.id })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus juri beserta nilainya">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Cell>
                    </Row>
                  );
                })}
              </Table>
            )}
          </Panel>

          {/* Peserta */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Peserta</h2>
              <Btn onClick={() => { setFormPeserta(PESERTA_KOSONG); setEditPesertaId(null); setOpenPeserta(true); }}>
                <Plus className="w-4 h-4" /> Tambah Peserta
              </Btn>
            </div>

            {detail.contestants.length === 0 ? (
              <EmptyState text="Belum ada peserta" hint="Juri hanya dapat menilai peserta yang didaftarkan di sini." />
            ) : (
              <Table head={['No.', 'Nama', 'Lagu', 'Aksi']}>
                {detail.contestants.map((c) => (
                  <Row key={c.id}>
                    <Cell>{c.number ?? '—'}</Cell>
                    <Cell><span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{c.name}</span></Cell>
                    <Cell>{c.song_title ?? '—'}</Cell>
                    <Cell>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setFormPeserta({ name: c.name, number: c.number ? String(c.number) : '', song_title: c.song_title ?? '' });
                            setEditPesertaId(c.id);
                            setOpenPeserta(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                          title="Ubah"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setHapus({ jenis: 'peserta', id: c.id })} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Panel>

          {/* Rekap */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Rekap Nilai</h2>
              <Btn
                variant={detail.event.status === 'open' ? 'danger' : 'ghost'}
                onClick={() => toggleKunci(detail.event)}
              >
                {detail.event.status === 'open'
                  ? <><Lock className="w-4 h-4" /> Kunci Penilaian</>
                  : <><LockOpen className="w-4 h-4" /> Buka Kembali</>}
              </Btn>
            </div>

            {peringkat.length === 0 ? (
              <EmptyState text="Belum ada nilai" hint="Rekap muncul setelah juri mulai menilai." />
            ) : (
              <Table head={['Peringkat', 'Peserta', ...detail.judges.map((j) => j.name), 'Nilai Akhir']}>
                {peringkat.map((t, i) => {
                  const p = detail.contestants.find((c) => c.id === t.contestant_id);
                  return (
                    <Row key={t.contestant_id}>
                      <Cell>{i + 1}</Cell>
                      <Cell>
                        <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{p?.name ?? '—'}</span>
                        {!t.is_complete && <span className="ml-2 text-[11px] text-amber-400">belum lengkap</span>}
                      </Cell>
                      {t.by_judge.map((b) => (
                        <Cell key={b.judge_id}>{nilaiTampil(b.total)}</Cell>
                      ))}
                      <Cell><span className="font-bold text-[var(--adm-fg)]">{nilaiTampil(t.final_score)}</span></Cell>
                    </Row>
                  );
                })}
              </Table>
            )}

            {/* Rincian per kriteria — yang menjelaskan dari mana subtotal datang. */}
            {detail.scores.length > 0 && (
              <div className="px-5 py-4 border-t border-[var(--adm-line)]">
                <h3 className="text-[12.5px] font-bold text-[var(--adm-fg)] mb-2">Rincian per Kriteria</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--adm-line)] text-[var(--adm-muted)]">
                        <th className="text-left py-2 pr-3 font-medium">Peserta</th>
                        <th className="text-left py-2 pr-3 font-medium">Juri</th>
                        {detail.criteria.map((c) => (
                          <th key={c.key} className="text-right py-2 pr-3 font-medium">
                            {labelKriteria(c.key)} <span className="opacity-70">({c.weight}%)</span>
                          </th>
                        ))}
                        <th className="text-right py-2 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.contestants.flatMap((p) =>
                        detail.judges.map((j) => {
                          const s = matriks.get(`${j.id}:${p.id}`);
                          return (
                            <tr key={`${j.id}:${p.id}`} className="border-b border-[var(--adm-line)] text-[var(--adm-body)]">
                              <td className="py-2 pr-3">{p.name}</td>
                              <td className="py-2 pr-3">{j.name}</td>
                              {detail.criteria.map((c) => (
                                <td key={c.key} className="py-2 pr-3 text-right">
                                  {(s as unknown as Record<string, number | null> | undefined)?.[c.key] ?? '—'}
                                </td>
                              ))}
                              <td className="py-2 text-right font-bold text-[var(--adm-fg)]">
                                {s ? nilaiTampil(s.weighted_total) : '—'}
                              </td>
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </>
      ))}

      <Modal
        open={openAcara}
        onClose={() => setOpenAcara(false)}
        title={editAcaraId ? 'Ubah Acara' : 'Buat Acara'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenAcara(false)}>Batal</Btn>
            <Btn onClick={simpanAcara} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Acara" required value={formAcara.title} onChange={(v) => setFormAcara({ ...formAcara, title: v })} placeholder="Lomba Karaoke HUT RI ke-81" />
          <Field label="Tanggal Pelaksanaan" required type="date" value={formAcara.held_on} onChange={(v) => setFormAcara({ ...formAcara, held_on: v })} />
          <Field label="Tempat" value={formAcara.location} onChange={(v) => setFormAcara({ ...formAcara, location: v })} placeholder="Aula Kantor Bandara" />
          {!editAcaraId && (
            <p className="-mt-2 text-[11.5px] text-[var(--adm-muted)]">
              Tiga juri beserta tautan penilaiannya dibuat otomatis. Namanya dapat diubah, dan juri
              keempat dapat ditambahkan sesudahnya.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={openPeserta}
        onClose={() => setOpenPeserta(false)}
        title={editPesertaId ? 'Ubah Peserta' : 'Tambah Peserta'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenPeserta(false)}>Batal</Btn>
            <Btn onClick={simpanPeserta} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Peserta" required value={formPeserta.name} onChange={(v) => setFormPeserta({ ...formPeserta, name: v })} />
          <Field label="Nomor Undian" type="number" value={formPeserta.number} onChange={(v) => setFormPeserta({ ...formPeserta, number: String(v) })} />
          <Field label="Judul Lagu" value={formPeserta.song_title} onChange={(v) => setFormPeserta({ ...formPeserta, song_title: v })} />
        </div>
      </Modal>

      <Modal
        open={openJuri}
        onClose={() => setOpenJuri(false)}
        title={editJuriId ? 'Ubah Nama Juri' : 'Tambah Juri'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenJuri(false)}>Batal</Btn>
            <Btn onClick={simpanJuri} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <Field label="Nama Juri" required value={namaJuri} onChange={setNamaJuri} placeholder="Nama lengkap juri" />
      </Modal>

      <ConfirmDialog
        open={hapus !== null}
        onCancel={() => setHapus(null)}
        onConfirm={jalankanHapus}
        message={
          hapus?.jenis === 'acara'
            ? 'Acara ini akan dihapus beserta seluruh juri, peserta, dan nilainya. Lanjutkan?'
            : hapus?.jenis === 'juri'
              ? 'Juri ini akan dihapus beserta seluruh nilai yang sudah diberikannya. Lanjutkan?'
              : 'Peserta ini akan dihapus beserta nilainya dari seluruh juri. Lanjutkan?'
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
