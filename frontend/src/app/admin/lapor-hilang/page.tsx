'use client';

/**
 * Panel Lapor Kehilangan Barang.
 *
 * Dua sisi dalam satu halaman, karena pekerjaannya memang bolak-balik: petugas
 * membaca laporan warga, lalu menengok gudang barang temuan, lalu kembali lagi.
 * Memisahkannya menjadi dua menu memaksa perpindahan halaman pada setiap
 * putaran.
 *
 * ────────────────────────────────────────────────────────────────────────
 * DUA HAL YANG TIDAK BOLEH DIUBAH TANPA MEMBACA ALASANNYA
 *
 *  1. Status `matched` TIDAK ADA di pilihan ubah status. Ia hanya lahir dari
 *     pencocokan yang benar-benar menautkan sebuah barang, dan backend
 *     menolaknya lewat endpoint status. Menambahkannya ke sini hanya
 *     menghasilkan galat 422 yang membingungkan.
 *
 *  2. Nomor identitas pengambil TIDAK PERNAH tampil di layar ini, karena
 *     backend tidak pernah mengirimkannya. Ia hanya tercetak pada berita
 *     acara. Jangan menambahkan medannya ke tabel atau dialog.
 * ────────────────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { adminFetch, adminUpload, adminDownload } from '@/lib/adminApi';
import type { FoundItem, LostReport, LostReportStatus } from '@/types';
import { KATEGORI_BARANG, AREA_KEHILANGAN, STATUS_LAPORAN } from '@/lib/laporHilang';
import {
  PageHeader, Panel, StatCard, Badge, Btn, Field, Modal, ConfirmDialog, Toast,
  Loading, EmptyState, Table, Row, Cell, SearchBox, InfoNote, stagger,
  type ToastMsg,
} from '@/components/admin/ui';
import {
  PackageSearch, Package, Link2, Link2Off, FileText, Trash2, Plus, Phone,
  MapPin, Clock3, CircleCheck,
} from 'lucide-react';

type Tab = 'laporan' | 'temuan';

/** Warna lencana status barang temuan. */
const STATUS_BARANG: Record<string, { label: string; warna: string }> = {
  stored: { label: 'Tersimpan', warna: '#0ea5e9' },
  matched: { label: 'Dicocokkan', warna: '#f59e0b' },
  returned: { label: 'Diserahkan', warna: '#22c55e' },
  disposed: { label: 'Dimusnahkan', warna: '#64748b' },
};

const JENIS_IDENTITAS = ['KTP', 'SIM', 'Paspor', 'KITAS', 'Kartu Pelajar', 'Lainnya'];

/**
 * Instan tersimpan → nilai `<input type="datetime-local">`, dalam waktu LOKAL.
 *
 * Dibangun dari `getFullYear()`/`getHours()` dan bukan `toISOString()`: yang
 * terakhir menggeser ke UTC, sehingga petugas di Samarinda membuka formulir
 * dan melihat jam yang delapan jam lebih awal daripada yang ia catat.
 */
function untukInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Kebalikannya: nilai `datetime-local` (waktu lokal) → instan UTC untuk dikirim.
 *
 * WAJIB dipakai sebelum menyimpan. `<input type="datetime-local">` menghasilkan
 * teks TANPA zona waktu, dan Laravel membacanya sebagai UTC karena
 * `APP_TIMEZONE=UTC`. Tanpa perubahan ini, barang yang ditemukan pukul 09.15
 * WITA tersimpan sebagai 09.15 UTC — delapan jam meleset — yang merusak jendela
 * pencocokan terhadap `lost_at` sekaligus jam pada berita acaranya.
 */
function keInstanUtc(nilaiLokal: string): string {
  if (!nilaiLokal) return '';
  const d = new Date(nilaiLokal);
  return Number.isNaN(d.getTime()) ? nilaiLokal : d.toISOString();
}

function waktuTampil(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const KOSONG_BARANG = {
  category: KATEGORI_BARANG[0] as string,
  description: '',
  found_area: '',
  found_at: '',
  finder_name: '',
  storage_location: '',
};

const KOSONG_SERAH = {
  receiver_name: '',
  receiver_id_type: 'KTP',
  receiver_id_number: '',
  handover_officer: '',
  handover_note: '',
};

export default function LaporHilangPage() {
  const [tab, setTab] = useState<Tab>('laporan');
  const [memuat, setMemuat] = useState(true);
  const [toast, setToast] = useState<ToastMsg>(null);

  const [laporan, setLaporan] = useState<LostReport[]>([]);
  const [barang, setBarang] = useState<FoundItem[]>([]);
  const [cari, setCari] = useState('');

  /* ---------- dialog laporan ---------- */
  const [dibuka, setDibuka] = useState<LostReport | null>(null);
  const [kandidat, setKandidat] = useState<FoundItem[]>([]);
  const [memuatKandidat, setMemuatKandidat] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [statusBaru, setStatusBaru] = useState<LostReportStatus>('searching');
  const [menyimpan, setMenyimpan] = useState(false);

  /* ---------- dialog barang ---------- */
  const [formBarang, setFormBarang] = useState(KOSONG_BARANG);
  const [barangDiubah, setBarangDiubah] = useState<FoundItem | null>(null);
  const [dialogBarang, setDialogBarang] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);

  /* ---------- dialog serah terima ---------- */
  const [serahUntuk, setSerahUntuk] = useState<FoundItem | null>(null);
  const [formSerah, setFormSerah] = useState(KOSONG_SERAH);

  const [hapus, setHapus] = useState<{ jenis: Tab; id: number; nama: string } | null>(null);

  /** Tarik kedua daftar sekaligus; keduanya selalu dibaca berpasangan. */
  const ambil = useCallback(
    () => Promise.all([
      adminFetch<LostReport[]>('/lost-reports'),
      adminFetch<FoundItem[]>('/found-items'),
    ]),
    [],
  );

  const terapkan = useCallback((
    a: Awaited<ReturnType<typeof ambil>>[0],
    b: Awaited<ReturnType<typeof ambil>>[1],
  ) => {
    if (a.ok && a.data) setLaporan(a.data);
    if (b.ok && b.data) setBarang(b.data);
    if (!a.ok) setToast({ text: a.message, kind: 'error' });
    setMemuat(false);
  }, []);

  /** Penyegaran sesudah tindakan; dipanggil dari penangan peristiwa, bukan efek. */
  const muat = useCallback(async () => {
    const [a, b] = await ambil();
    terapkan(a, b);
  }, [ambil, terapkan]);

  /*
   * Muatan pertama.
   *
   * Ditulis sebagai rantai `then`, bukan `muat()` langsung, karena dua hal:
   *
   *   1. `setState` yang berjalan serentak di badan efek memicu render
   *      beruntun, dan lint proyek menolaknya. Di dalam callback ia sah —
   *      itulah bentuk yang memang dianjurkan React.
   *   2. Penanda `hidup` membatalkan penerapan bila pemakai berpindah halaman
   *      sebelum permintaannya selesai. Tanpa itu, `setState` berjalan atas
   *      komponen yang sudah dilepas.
   *
   * Halaman panel lain masih memakai bentuk `useEffect(() => { muat(); })`
   * yang lebih ringkas; keduanya berperilaku sama pada jalur bahagia.
   */
  useEffect(() => {
    let hidup = true;
    ambil().then(([a, b]) => { if (hidup) terapkan(a, b); });
    return () => { hidup = false; };
  }, [ambil, terapkan]);

  /* ---------- turunan ---------- */

  const q = cari.trim().toLowerCase();

  const laporanTampil = useMemo(
    () => laporan.filter((l) =>
      !q
      || l.ticket_number.toLowerCase().includes(q)
      || l.reporter_name.toLowerCase().includes(q)
      || l.item_description.toLowerCase().includes(q)
      || l.category.toLowerCase().includes(q)),
    [laporan, q],
  );

  const barangTampil = useMemo(
    () => barang.filter((b) =>
      !q
      || b.code.toLowerCase().includes(q)
      || b.description.toLowerCase().includes(q)
      || b.category.toLowerCase().includes(q)
      || (b.found_area ?? '').toLowerCase().includes(q)),
    [barang, q],
  );

  const belumTertangani = laporan.filter((l) => l.status === 'submitted').length;
  const dicari = laporan.filter((l) => l.status === 'searching').length;
  const diGudang = barang.filter((b) => b.status === 'stored').length;

  /* ---------- aksi laporan ---------- */

  const bukaLaporan = async (l: LostReport) => {
    setDibuka(l);
    setCatatan(l.admin_note ?? '');
    // `matched` sengaja tidak pernah menjadi nilai awal pilihan — lihat kepala
    // berkas.
    setStatusBaru(l.status === 'matched' ? 'searching' : l.status);
    setKandidat([]);
    setMemuatKandidat(true);

    const res = await adminFetch<FoundItem[]>(`/lost-reports/${l.id}/candidates`);
    setMemuatKandidat(false);
    if (res.ok && res.data) setKandidat(res.data);
  };

  const simpanStatus = async () => {
    if (!dibuka) return;
    setMenyimpan(true);
    const res = await adminFetch<LostReport>(`/lost-reports/${dibuka.id}/status`, {
      method: 'PUT',
      body: { status: statusBaru, admin_note: catatan },
    });
    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) { setDibuka(null); muat(); }
  };

  const cocokkan = async (foundItemId: number | null) => {
    if (!dibuka) return;
    setMenyimpan(true);
    const res = await adminFetch<LostReport>(`/lost-reports/${dibuka.id}/match`, {
      method: 'PUT',
      body: { found_item_id: foundItemId, admin_note: catatan },
    });
    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) { setDibuka(null); muat(); }
  };

  /* ---------- aksi barang ---------- */

  const bukaBarangBaru = () => {
    setBarangDiubah(null);
    setFormBarang({ ...KOSONG_BARANG, found_at: untukInput(new Date().toISOString()) });
    setFoto(null);
    setDialogBarang(true);
  };

  const bukaBarangUbah = (b: FoundItem) => {
    setBarangDiubah(b);
    setFormBarang({
      category: b.category,
      description: b.description,
      found_area: b.found_area,
      found_at: untukInput(b.found_at),
      finder_name: b.finder_name ?? '',
      storage_location: b.storage_location ?? '',
    });
    setFoto(null);
    setDialogBarang(true);
  };

  const simpanBarang = async () => {
    setMenyimpan(true);

    // Selalu multipart: satu jalur kirim lebih mudah dijaga daripada bercabang
    // menurut ada tidaknya foto, dan rute `POST /{id}` memang didaftarkan
    // backend justru karena peramban tidak bisa mengirim multipart lewat PUT.
    const form = new FormData();
    Object.entries(formBarang).forEach(([k, v]) => {
      if (!v) return;
      // Waktu penemuan dikirim sebagai instan UTC, bukan teks lokal — lihat
      // `keInstanUtc` di kepala berkas.
      form.append(k, k === 'found_at' ? keInstanUtc(String(v)) : String(v));
    });
    if (foto) form.append('photo', foto);

    const path = barangDiubah ? `/found-items/${barangDiubah.id}` : '/found-items';
    const res = await adminUpload<FoundItem>(path, form);

    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) { setDialogBarang(false); muat(); }
  };

  const simpanSerahTerima = async () => {
    if (!serahUntuk) return;
    setMenyimpan(true);
    const res = await adminFetch<FoundItem>(`/found-items/${serahUntuk.id}/handover`, {
      method: 'PUT',
      body: formSerah,
    });
    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) { setSerahUntuk(null); setFormSerah(KOSONG_SERAH); muat(); }
  };

  const unduhBeritaAcara = async (b: FoundItem) => {
    const res = await adminDownload(
      `/found-items/${b.id}/handover-pdf`,
      `berita-acara-${b.code.toLowerCase()}.pdf`,
    );
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
  };

  const jalankanHapus = async () => {
    if (!hapus) return;
    const path = hapus.jenis === 'laporan' ? `/lost-reports/${hapus.id}` : `/found-items/${hapus.id}`;
    const res = await adminFetch(path, { method: 'DELETE' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    setHapus(null);
    if (res.ok) muat();
  };

  /* ================================================================ */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lapor Kehilangan Barang"
        subtitle="Laporan kehilangan dari pengunjung dan catatan barang temuan di terminal"
        icon={PackageSearch}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Laporan Baru" value={belumTertangani} icon={PackageSearch} accent="#0ea5e9" />
        <StatCard label="Sedang Dicari" value={dicari} icon={Clock3} accent="#f59e0b" />
        <StatCard label="Barang di Gudang" value={diGudang} icon={Package} accent="#22c55e" />
      </motion.div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: 'laporan' as Tab, label: `Laporan Kehilangan (${laporan.length})` },
          { id: 'temuan' as Tab, label: `Barang Temuan (${barang.length})` },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-[12.5px] font-bold transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-[var(--adm-accent-soft)] text-[var(--adm-accent)] border border-[var(--adm-accent-line)]'
                : 'bg-[var(--adm-hover)] text-[var(--adm-body)] border border-[var(--adm-line)]'
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="flex-1 min-w-[220px]">
          <SearchBox value={cari} onChange={setCari} placeholder="Cari tiket, nama, kode, atau ciri barang..." />
        </div>

        {tab === 'temuan' && (
          <Btn onClick={bukaBarangBaru}>
            <Plus className="w-4 h-4" /> Catat Barang Temuan
          </Btn>
        )}
      </div>

      {memuat ? (
        <Loading />
      ) : tab === 'laporan' ? (
        <Panel title="Laporan Kehilangan">
          {laporanTampil.length === 0 ? (
            <EmptyState
              text="Belum ada laporan kehilangan"
              hint="Laporan masuk lewat Pusat Bantuan pada portal publik."
            />
          ) : (
            <Table head={['Tiket', 'Pelapor', 'Barang', 'Lokasi & Waktu', 'Status', '']}>
              {laporanTampil.map((l) => (
                <Row key={l.id}>
                  <Cell className="font-mono text-[11.5px]">{l.ticket_number}</Cell>
                  <Cell>
                    <span className="block font-semibold">{l.reporter_name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-[var(--adm-muted)]">
                      <Phone className="w-3 h-3" /> {l.reporter_phone}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="block font-semibold">{l.category}</span>
                    <span className="block text-[11px] text-[var(--adm-muted)] line-clamp-2 max-w-[280px]">
                      {l.item_description}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="flex items-center gap-1 text-[11.5px]">
                      <MapPin className="w-3 h-3 text-[var(--adm-muted)]" /> {l.lost_area}
                    </span>
                    <span className="block text-[11px] text-[var(--adm-muted)]">{waktuTampil(l.lost_at)}</span>
                  </Cell>
                  <Cell>
                    <Badge
                      text={STATUS_LAPORAN[l.status].label}
                      color={STATUS_LAPORAN[l.status].warna}
                    />
                  </Cell>
                  <Cell>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Btn variant="ghost" onClick={() => bukaLaporan(l)}>Tangani</Btn>
                      <Btn
                        variant="danger"
                        onClick={() => setHapus({ jenis: 'laporan', id: l.id, nama: l.ticket_number })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      ) : (
        <Panel title="Barang Temuan">
          <InfoNote>
            Catatan ini <strong>tidak pernah tampil di portal publik</strong>. Katalog barang temuan
            yang terbuka memberi siapa saja seluruh keterangan yang dibutuhkan untuk mengaku sebagai
            pemiliknya — verifikasi kepemilikan hanya bisa dilakukan berhadapan langsung di loket.
          </InfoNote>

          {barangTampil.length === 0 ? (
            <EmptyState text="Belum ada barang temuan tercatat" hint="Catat barang yang diserahkan ke pos layanan." />
          ) : (
            <Table head={['Kode', 'Barang', 'Ditemukan', 'Penyimpanan', 'Status', '']}>
              {barangTampil.map((b) => (
                <Row key={b.id}>
                  <Cell className="font-mono text-[11.5px]">{b.code}</Cell>
                  <Cell>
                    <span className="block font-semibold">{b.category}</span>
                    <span className="block text-[11px] text-[var(--adm-muted)] line-clamp-2 max-w-[260px]">
                      {b.description}
                    </span>
                  </Cell>
                  <Cell>
                    <span className="block text-[11.5px]">{b.found_area}</span>
                    <span className="block text-[11px] text-[var(--adm-muted)]">{waktuTampil(b.found_at)}</span>
                  </Cell>
                  <Cell className="text-[11.5px]">{b.storage_location || '—'}</Cell>
                  <Cell>
                    <Badge
                      text={STATUS_BARANG[b.status]?.label ?? b.status}
                      color={STATUS_BARANG[b.status]?.warna}
                    />
                    {b.lost_report && (
                      <span className="block mt-1 text-[10.5px] font-mono text-[var(--adm-muted)]">
                        {b.lost_report.ticket_number}
                      </span>
                    )}
                  </Cell>
                  <Cell>
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      {b.status === 'returned' ? (
                        <Btn variant="ghost" onClick={() => unduhBeritaAcara(b)}>
                          <FileText className="w-3.5 h-3.5" /> Berita Acara
                        </Btn>
                      ) : (
                        <>
                          <Btn variant="ghost" onClick={() => bukaBarangUbah(b)}>Ubah</Btn>
                          <Btn onClick={() => { setSerahUntuk(b); setFormSerah(KOSONG_SERAH); }}>
                            <CircleCheck className="w-3.5 h-3.5" /> Serahkan
                          </Btn>
                        </>
                      )}
                      <Btn
                        variant="danger"
                        onClick={() => setHapus({ jenis: 'temuan', id: b.id, nama: b.code })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Panel>
      )}

      {/* ---------------- dialog tangani laporan ---------------- */}
      <Modal
        open={!!dibuka}
        onClose={() => setDibuka(null)}
        title={dibuka ? `Tangani ${dibuka.ticket_number}` : ''}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDibuka(null)}>Tutup</Btn>
            <Btn onClick={simpanStatus} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Simpan Status & Catatan'}
            </Btn>
          </>
        }
      >
        {dibuka && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3.5 space-y-1.5">
              <p className="text-[12.5px] font-bold text-[var(--adm-fg)]">{dibuka.category}</p>
              <p className="text-[12px] text-[var(--adm-body)] whitespace-pre-wrap">{dibuka.item_description}</p>
              <p className="text-[11.5px] text-[var(--adm-muted)]">
                {dibuka.lost_area} · {waktuTampil(dibuka.lost_at)}
                {dibuka.flight_number && ` · ${dibuka.flight_number}`}
              </p>
              <p className="text-[11.5px] text-[var(--adm-muted)]">
                {dibuka.reporter_name} · {dibuka.reporter_phone}
                {dibuka.reporter_email && ` · ${dibuka.reporter_email}`}
              </p>
              {dibuka.photo_url && (
                <a
                  href={dibuka.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-[11.5px] font-bold text-[var(--adm-accent)]"
                >
                  Lihat foto dari pelapor
                </a>
              )}
            </div>

            {/* ---- pencocokan ---- */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-2">
                Pencocokan Barang Temuan
              </p>

              {dibuka.found_item ? (
                <div className="rounded-xl bg-[var(--adm-accent-soft)] border border-[var(--adm-accent-line)] p-3.5 space-y-2">
                  <p className="text-[12.5px] font-bold text-[var(--adm-fg)]">
                    {dibuka.found_item.code} · {dibuka.found_item.category}
                  </p>
                  <p className="text-[12px] text-[var(--adm-body)]">{dibuka.found_item.description}</p>
                  <p className="text-[11.5px] text-[var(--adm-muted)]">
                    Disimpan di {dibuka.found_item.storage_location || 'lokasi belum dicatat'}
                  </p>
                  <Btn variant="ghost" onClick={() => cocokkan(null)} disabled={menyimpan}>
                    <Link2Off className="w-3.5 h-3.5" /> Lepas Pencocokan
                  </Btn>
                </div>
              ) : memuatKandidat ? (
                <Loading text="Mencari kandidat..." />
              ) : kandidat.length === 0 ? (
                <p className="text-[12px] text-[var(--adm-muted)] leading-relaxed">
                  Belum ada barang temuan berkategori sama yang tercatat di sekitar waktu kehilangan.
                  Kandidat dicari pada rentang satu hari sebelum sampai tujuh hari sesudahnya — barang
                  kerap baru diserahkan ke pos beberapa hari kemudian.
                </p>
              ) : (
                <div className="space-y-2">
                  {kandidat.map((k) => (
                    <div
                      key={k.id}
                      className="rounded-xl bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[var(--adm-fg)]">
                          {k.code} · {waktuTampil(k.found_at)}
                        </p>
                        <p className="text-[11.5px] text-[var(--adm-body)] line-clamp-2">{k.description}</p>
                        <p className="text-[11px] text-[var(--adm-muted)]">
                          {k.found_area} · {k.storage_location || 'penyimpanan belum dicatat'}
                        </p>
                      </div>
                      <Btn onClick={() => cocokkan(k.id)} disabled={menyimpan}>
                        <Link2 className="w-3.5 h-3.5" /> Cocokkan
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Field
              label="Status"
              type="select"
              value={statusBaru}
              onChange={(v) => setStatusBaru(v as LostReportStatus)}
              options={[
                { value: 'submitted', label: 'Laporan Diterima' },
                { value: 'searching', label: 'Sedang Dicari' },
                { value: 'returned', label: 'Sudah Diserahkan' },
                { value: 'not_found', label: 'Belum Ditemukan' },
              ]}
            />

            <Field
              label="Catatan untuk Pelapor"
              type="textarea"
              rows={3}
              value={catatan}
              onChange={setCatatan}
              placeholder="Terbaca oleh pelapor pada halaman pelacakan. Jangan mencantumkan lokasi penyimpanan barang."
            />
          </div>
        )}
      </Modal>

      {/* ---------------- dialog barang temuan ---------------- */}
      <Modal
        open={dialogBarang}
        onClose={() => setDialogBarang(false)}
        title={barangDiubah ? `Ubah ${barangDiubah.code}` : 'Catat Barang Temuan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDialogBarang(false)}>Batal</Btn>
            <Btn onClick={simpanBarang} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </Btn>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field
            label="Kategori"
            type="select"
            required
            value={formBarang.category}
            onChange={(v) => setFormBarang({ ...formBarang, category: v })}
            options={KATEGORI_BARANG.map((c) => ({ value: c, label: c }))}
          />

          <Field
            label="Ciri-ciri Barang"
            type="textarea"
            rows={3}
            required
            value={formBarang.description}
            onChange={(v) => setFormBarang({ ...formBarang, description: v })}
            placeholder="Merek, warna, ukuran, isi, dan tanda khusus."
          />

          <Field
            label="Lokasi Penemuan"
            type="select"
            required
            value={formBarang.found_area}
            onChange={(v) => setFormBarang({ ...formBarang, found_area: v })}
            options={AREA_KEHILANGAN.map((a) => ({ value: a, label: a }))}
          />

          <Field
            label="Waktu Penemuan"
            type="datetime-local"
            required
            value={formBarang.found_at}
            onChange={(v) => setFormBarang({ ...formBarang, found_at: v })}
          />

          <Field
            label="Penemu / Petugas Penyerah"
            value={formBarang.finder_name}
            onChange={(v) => setFormBarang({ ...formBarang, finder_name: v })}
            placeholder="Opsional"
          />

          <Field
            label="Lokasi Penyimpanan"
            value={formBarang.storage_location}
            onChange={(v) => setFormBarang({ ...formBarang, storage_location: v })}
            placeholder="Contoh: Loker Pos AVSEC Nomor 7"
          />

          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
              Foto Barang
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              className="w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-bold file:bg-[var(--adm-hover)] file:text-[var(--adm-fg)]"
            />
          </div>
        </div>
      </Modal>

      {/* ---------------- dialog serah terima ---------------- */}
      <Modal
        open={!!serahUntuk}
        onClose={() => setSerahUntuk(null)}
        title={serahUntuk ? `Serah Terima ${serahUntuk.code}` : ''}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setSerahUntuk(null)}>Batal</Btn>
            <Btn onClick={simpanSerahTerima} disabled={menyimpan}>
              {menyimpan ? 'Menyimpan...' : 'Catat Serah Terima'}
            </Btn>
          </>
        }
      >
        <div className="space-y-3.5">
          <InfoNote>
            Periksa identitas pengambil dan cocokkan ciri barang sebelum menyerahkan. Setelah
            dicatat, berita acara dapat diunduh dan ditandatangani kedua pihak.
          </InfoNote>

          <Field
            label="Nama Pengambil"
            required
            value={formSerah.receiver_name}
            onChange={(v) => setFormSerah({ ...formSerah, receiver_name: v })}
          />

          <Field
            label="Jenis Identitas"
            type="select"
            required
            value={formSerah.receiver_id_type}
            onChange={(v) => setFormSerah({ ...formSerah, receiver_id_type: v })}
            options={JENIS_IDENTITAS.map((j) => ({ value: j, label: j }))}
          />

          <Field
            label="Nomor Identitas"
            required
            value={formSerah.receiver_id_number}
            onChange={(v) => setFormSerah({ ...formSerah, receiver_id_number: v })}
            placeholder="Tercatat untuk berita acara; tidak ditampilkan lagi setelah tersimpan."
          />

          <Field
            label="Petugas yang Menyerahkan"
            required
            value={formSerah.handover_officer}
            onChange={(v) => setFormSerah({ ...formSerah, handover_officer: v })}
          />

          <Field
            label="Catatan"
            type="textarea"
            rows={2}
            value={formSerah.handover_note}
            onChange={(v) => setFormSerah({ ...formSerah, handover_note: v })}
            placeholder="Opsional — kondisi barang, kelengkapan isi, dan sebagainya."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!hapus}
        onCancel={() => setHapus(null)}
        onConfirm={jalankanHapus}
        title={hapus?.jenis === 'laporan' ? 'Hapus laporan kehilangan?' : 'Hapus catatan barang temuan?'}
        message={
          hapus?.jenis === 'laporan'
            ? `Laporan ${hapus?.nama} akan dihapus permanen beserta fotonya. Pelapor tidak akan dapat melacaknya lagi.`
            : `Catatan ${hapus?.nama} akan dihapus. Laporan yang tertaut TIDAK ikut terhapus — ia kembali berstatus sedang dicari.`
        }
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  );
}
