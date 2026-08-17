'use client';

/**
 * Perayaan beranda.
 *
 * MENGAPA HALAMAN INI ADA, DAN BUKAN SEKADAR DAFTAR TANGGAL DI DALAM KODE:
 * hanya sebagian hari besar yang jatuh pada tanggal tetap. Idul Fitri, Tahun
 * Baru Islam, Nyepi, dan Imlek mengikuti kalender Hijriah, Saka, dan Tionghoa;
 * tanggal Masehinya bergeser tiap tahun dan ditetapkan lewat SKB Tiga Menteri.
 * Menuliskannya di dalam kode berarti mengarang tanggal hari besar keagamaan
 * pada portal resmi bandara — dan salah tanggal pada hari besar keagamaan bukan
 * kekeliruan kecil.
 *
 * Petugas mengisinya di sini setiap kali SKB terbit, dan melihat animasinya
 * lebih dulu sebelum ia tayang kepada pengunjung.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, InfoNote, stagger,
} from '@/components/admin/ui';
import { adminFetch } from '@/lib/adminApi';
import { DAFTAR_TEMA, TEMA_EVENT, type SiteEvent, type TemaEvent } from '@/lib/siteEvents';
import { AdeganTema } from '@/components/events/SambutanEvent';
import { PartyPopper, Plus, Pencil, Trash2, Eye, CalendarDays } from 'lucide-react';

type Form = {
  name: string;
  theme: TemaEvent;
  starts_on: string;
  ends_on: string;
  greeting: string;
  subgreeting: string;
  is_active: boolean;
  priority: string;
};

const KOSONG: Form = {
  name: '',
  theme: 'kemerdekaan',
  starts_on: '',
  ends_on: '',
  greeting: '',
  subgreeting: '',
  is_active: true,
  priority: '10',
};

/** "2026-08-17T00:00:00.000000Z" → "2026-08-17" untuk `<input type="date">`. */
const keTanggalInput = (iso: string) => (iso ? iso.slice(0, 10) : '');

const tampilTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** Benar bila hari ini berada di dalam rentangnya. */
function sedangBerlangsung(e: SiteEvent): boolean {
  const hari = new Date().toISOString().slice(0, 10);

  return e.is_active && keTanggalInput(e.starts_on) <= hari && keTanggalInput(e.ends_on) >= hari;
}

export default function AdminPerayaanPage() {
  const [items, setItems] = useState<SiteEvent[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [sibuk, setSibuk] = useState(false);

  const [buka, setBuka] = useState(false);
  const [sunting, setSunting] = useState<SiteEvent | null>(null);
  const [form, setForm] = useState<Form>(KOSONG);

  const [hapus, setHapus] = useState<SiteEvent | null>(null);
  const [pratinjau, setPratinjau] = useState<SiteEvent | null>(null);

  const muat = useCallback(async () => {
    const res = await adminFetch<SiteEvent[]>('/site-events');
    setItems(Array.isArray(res.data) ? res.data : []);
    setMemuat(false);
  }, []);

  useEffect(() => {
    adminFetch<SiteEvent[]>('/site-events').then((res) => {
      setItems(Array.isArray(res.data) ? res.data : []);
      setMemuat(false);
    });
  }, []);

  const bukaBaru = () => {
    setSunting(null);
    setForm(KOSONG);
    setBuka(true);
  };

  const bukaSunting = (e: SiteEvent) => {
    setSunting(e);
    setForm({
      name: e.name,
      theme: e.theme,
      starts_on: keTanggalInput(e.starts_on),
      ends_on: keTanggalInput(e.ends_on),
      greeting: e.greeting ?? '',
      subgreeting: e.subgreeting ?? '',
      is_active: e.is_active,
      priority: String(e.priority),
    });
    setBuka(true);
  };

  const simpan = async () => {
    setSibuk(true);

    const badan = {
      ...form,
      greeting: form.greeting.trim() || null,
      subgreeting: form.subgreeting.trim() || null,
      priority: Number(form.priority) || 10,
    };

    const res = sunting
      ? await adminFetch(`/site-events/${sunting.id}`, { method: 'PUT', body: badan })
      : await adminFetch('/site-events', { method: 'POST', body: badan });

    setSibuk(false);

    if (!res.ok) {
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    setBuka(false);
    setToast({ text: res.message, kind: 'success' });
    muat();
  };

  const jalankanHapus = async () => {
    if (!hapus) return;

    setSibuk(true);
    const res = await adminFetch(`/site-events/${hapus.id}`, { method: 'DELETE' });
    setSibuk(false);
    setHapus(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  if (memuat) return <Loading text="Memuat daftar perayaan..." />;

  const aktifHariIni = items.find(sedangBerlangsung);

  return (
    <>
      <PageHeader
        icon={PartyPopper}
        title="Perayaan"
        subtitle="Animasi sambutan yang muncul di beranda pada hari perayaan"
        action={<Btn onClick={bukaBaru}><Plus className="w-4 h-4" /> Tambah Perayaan</Btn>}
      />

      <Panel className="mt-4">
        <div className="p-5">
          <InfoNote>
            Animasinya tampil <strong>sekali per kunjungan</strong> di beranda portal dan beranda
            aplikasi ponsel, dapat dilewati kapan saja, dan otomatis menjadi tampilan diam bagi
            pengunjung yang menyalakan <em>kurangi gerak</em> di perangkatnya.
            {' '}Tanggal Idul Fitri, Tahun Baru Islam, Nyepi, dan Imlek berubah tiap tahun mengikuti
            SKB Tiga Menteri — <strong>isi tanggalnya di sini setiap kali SKB terbit</strong>.
          </InfoNote>

          {aktifHariIni && (
            <div className="mt-3">
              <InfoNote>
                Hari ini <strong>{aktifHariIni.name}</strong> sedang tayang di beranda.
              </InfoNote>
            </div>
          )}
        </div>
      </Panel>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4">
        <Panel>
          {items.length === 0 ? (
            <EmptyState
              text="Belum ada perayaan"
              hint="Tambahkan hari besar beserta tanggalnya agar animasinya tayang di beranda."
            />
          ) : (
            <Table head={['Perayaan', 'Tema', 'Tanggal', 'Prioritas', 'Status', '']}>
              {items.map((e) => {
                const meta = TEMA_EVENT[e.theme];
                const kini = sedangBerlangsung(e);

                return (
                  <Row key={e.id}>
                    <Cell>
                      <p className="font-semibold text-[var(--adm-fg)]">{e.name}</p>
                      {e.greeting && (
                        <p className="text-[11.5px] text-[var(--adm-dim)] mt-0.5">{e.greeting}</p>
                      )}
                    </Cell>

                    <Cell>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full ring-1 ring-black/10 flex-shrink-0"
                          style={{ background: meta?.aksen ?? '#94a3b8' }}
                        />
                        {meta?.label ?? e.theme}
                      </span>
                    </Cell>

                    <Cell>
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <CalendarDays className="w-3.5 h-3.5 text-[var(--adm-dim)]" />
                        {tampilTanggal(e.starts_on)}
                        {keTanggalInput(e.starts_on) !== keTanggalInput(e.ends_on) && (
                          <> &ndash; {tampilTanggal(e.ends_on)}</>
                        )}
                      </span>
                    </Cell>

                    <Cell>{e.priority}</Cell>

                    <Cell>
                      {kini ? (
                        <Badge text="Sedang tayang" color="#22c55e" />
                      ) : e.is_active ? (
                        <Badge text="Terjadwal" color="#38bdf8" />
                      ) : (
                        <Badge text="Nonaktif" color="#94a3b8" />
                      )}
                    </Cell>

                    <Cell className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPratinjau(e)}
                        aria-label={`Pratinjau ${e.name}`}
                        className="p-2 rounded-lg hover:bg-[var(--adm-soft)] text-[var(--adm-dim)] hover:text-[var(--adm-fg)] transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => bukaSunting(e)}
                        aria-label={`Sunting ${e.name}`}
                        className="p-2 rounded-lg hover:bg-[var(--adm-soft)] text-[var(--adm-dim)] hover:text-[var(--adm-fg)] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHapus(e)}
                        aria-label={`Hapus ${e.name}`}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-[var(--adm-dim)] hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          )}
        </Panel>
      </motion.div>

      {/* ---------------- formulir ---------------- */}
      <Modal
        open={buka}
        onClose={() => setBuka(false)}
        title={sunting ? 'Sunting Perayaan' : 'Tambah Perayaan'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setBuka(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Nama Perayaan"
            required
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Contoh: Hari Raya Idul Fitri 1448 H"
          />

          <Field
            label="Tema Animasi"
            type="select"
            required
            value={form.theme}
            onChange={(v) => setForm({ ...form, theme: v as TemaEvent })}
            options={DAFTAR_TEMA.map((t) => ({ value: t.nilai, label: t.label }))}
          />

          {/* Pratinjau langsung. Petugas menyetel tanggal hari besar keagamaan;
              ia berhak melihat lebih dulu apa yang akan tayang atas namanya,
              bukan menemukannya bersamaan dengan pengunjung. */}
          <div className="relative h-44 rounded-xl overflow-hidden ring-1 ring-[var(--adm-line)]">
            <AdeganTema tema={form.theme} diam={false} />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/65 to-transparent">
              <p className="text-[13px] font-bold text-white leading-snug">
                {form.greeting.trim() || TEMA_EVENT[form.theme].sambutan}
              </p>
              <p className="text-[11px] text-white/75 leading-snug mt-0.5">
                {form.subgreeting.trim() || TEMA_EVENT[form.theme].subsambutan}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Tanggal Mulai"
              type="date"
              required
              value={form.starts_on}
              onChange={(v) => setForm({ ...form, starts_on: v })}
            />
            <Field
              label="Tanggal Selesai"
              type="date"
              required
              value={form.ends_on}
              onChange={(v) => setForm({ ...form, ends_on: v })}
            />
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--adm-dim)]">
            Perayaan sehari cukup mengisi tanggal yang sama pada keduanya.
          </p>

          <Field
            label="Ucapan"
            value={form.greeting}
            onChange={(v) => setForm({ ...form, greeting: v })}
            placeholder={TEMA_EVENT[form.theme].sambutan}
          />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-dim)]">
            Dikosongkan berarti memakai ucapan bawaan tema.
          </p>

          <Field
            label="Ucapan Pendukung"
            value={form.subgreeting}
            onChange={(v) => setForm({ ...form, subgreeting: v })}
            placeholder={TEMA_EVENT[form.theme].subsambutan}
          />

          <div className="grid grid-cols-2 gap-3 items-center">
            <Field
              label="Prioritas"
              type="number"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
            />
            <Field
              label="Aktif"
              type="checkbox"
              value={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--adm-dim)]">
            Prioritas: angka kecil menang bila dua perayaan bertindih tanggalnya.
          </p>
        </div>
      </Modal>

      {/* ---------------- pratinjau layar penuh ---------------- */}
      <Modal
        open={!!pratinjau}
        onClose={() => setPratinjau(null)}
        title={pratinjau ? `Pratinjau — ${pratinjau.name}` : ''}
        footer={<Btn variant="ghost" onClick={() => setPratinjau(null)}>Tutup</Btn>}
      >
        {pratinjau && (
          <div className="relative h-[420px] rounded-xl overflow-hidden ring-1 ring-[var(--adm-line)]">
            <AdeganTema tema={pratinjau.theme} diam={false} />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.24em]"
                style={{ color: TEMA_EVENT[pratinjau.theme].aksen }}
              >
                {pratinjau.name}
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-[24px] font-bold text-white leading-tight">
                {pratinjau.greeting || TEMA_EVENT[pratinjau.theme].sambutan}
              </p>
              <p className="mt-1 text-[12px] text-white/80">
                {pratinjau.subgreeting || TEMA_EVENT[pratinjau.theme].subsambutan}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!hapus}
        onCancel={() => setHapus(null)}
        onConfirm={jalankanHapus}
        title="Hapus perayaan?"
        message={hapus ? `"${hapus.name}" akan dihapus dan animasinya tidak lagi tayang.` : ''}
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
