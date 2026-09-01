'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Pencil, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import { STAT_ICON_MAP, ikonStatistik } from '@/lib/statistikBandara';
import type { AirportStatItem } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast,
  Loading, EmptyState, Table, Row, Cell, InfoNote,
  type ToastMsg,
} from '@/components/admin/ui';

/**
 * Angka ringkas bandara pada beranda.
 *
 * Satu daftar untuk TIGA blok penampil sekaligus — kartu "Tentang", blok
 * "APT Pranoto dalam Angka", dan panel ponsel di hero. Sebelum modul ini,
 * ketiganya adalah konstanta terpisah di dua berkas frontend yang saling
 * menyalin dan pasti menyimpang; ketiga sakelar pada tiap baris di bawah
 * itulah penggantinya.
 */

/** Bentuk isian; semuanya teks supaya sepadan dengan <input>. */
type Draf = {
  slug: string;
  icon: string;
  value: string;
  label_id: string;
  label_en: string;
  show_about: boolean;
  /* Tidak lagi disunting dari sini: blok gelap "APT Pranoto dalam Angka" yang
     dulu dikendalikannya sudah dihapus dari beranda, karena angkanya tercetak
     dua kali bersama bilah di kartu Tentang. Medannya sengaja DIPERTAHANKAN di
     draf supaya nilai tersimpan ikut terkirim kembali apa adanya saat petugas
     menyunting baris lama — melepasnya berarti diam-diam memadamkan bendera
     itu pada setiap penyimpanan, dan blok itu tidak dapat dihidupkan lagi
     tanpa menyemai ulang tabelnya. */
  show_numbers: boolean;
  show_hero: boolean;
  sort_order: number;
  is_active: boolean;
};

const DRAF_KOSONG: Draf = {
  slug: '',
  icon: 'Star',
  value: '',
  label_id: '',
  label_en: '',
  show_about: true,
  show_numbers: false,
  show_hero: false,
  sort_order: 0,
  is_active: true,
};

const PILIHAN_IKON = Object.keys(STAT_ICON_MAP).map((n) => ({ value: n, label: n }));

export default function AdminAngkaBandaraPage() {
  const [daftar, setDaftar] = useState<AirportStatItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const [buka, setBuka] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [draf, setDraf] = useState<Draf>(DRAF_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);

  const [hapusId, setHapusId] = useState<number | null>(null);

  /** Muat ulang daftar sesudah menyimpan atau menghapus. */
  const muat = async () => {
    const res = await adminFetch<AirportStatItem[]>('/airport-stats');
    if (res.ok) setDaftar(Array.isArray(res.data) ? res.data : []);
    else setToast({ text: res.message, kind: 'error' });
  };

  /*
   * Pengambilan pertama.
   *
   * Ditulis sebagai IIFE async yang TIDAK menyetel state apa pun sebelum
   * `await` pertamanya — pola yang sama dengan halaman admin lain. Menyetel
   * state di badan efek secara sinkron memicu render bertingkat, dan `memuat`
   * memang sudah bernilai `true` sejak awal sehingga tidak perlu disetel lagi.
   *
   * `batal` menjaga jawaban yang tiba setelah halaman ditinggalkan agar tidak
   * menyentuh komponen yang sudah dilepas.
   */
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<AirportStatItem[]>('/airport-stats');
      if (batal) return;

      if (res.ok) setDaftar(Array.isArray(res.data) ? res.data : []);
      else setToast({ text: res.message, kind: 'error' });
      setMemuat(false);
    })();

    return () => { batal = true; };
  }, []);

  const bukaBaru = () => {
    setEditId(null);
    /* Urutan ditebak dari baris terakhir, bukan dibiarkan 0. Angka baru yang
       selalu muncul di awal daftar memaksa petugas menyusun ulang seluruhnya
       setiap kali menambah satu. */
    const urutanTerakhir = daftar.length ? Math.max(...daftar.map((d) => d.sort_order)) : 0;
    setDraf({ ...DRAF_KOSONG, sort_order: urutanTerakhir + 10 });
    setBuka(true);
  };

  const bukaSunting = (s: AirportStatItem) => {
    setEditId(s.id);
    setDraf({
      slug: s.slug,
      icon: s.icon ?? 'Star',
      value: s.value,
      label_id: s.label_id,
      label_en: s.label_en,
      show_about: s.show_about,
      show_numbers: s.show_numbers,
      show_hero: s.show_hero,
      sort_order: s.sort_order,
      is_active: s.is_active,
    });
    setBuka(true);
  };

  const simpan = async () => {
    setMenyimpan(true);
    const res = editId
      ? await adminFetch<AirportStatItem>(`/airport-stats/${editId}`, { method: 'PUT', body: draf })
      : await adminFetch<AirportStatItem>('/airport-stats', { method: 'POST', body: draf });
    setMenyimpan(false);

    if (!res.ok) {
      // Pesannya sudah berbahasa Indonesia dari backend; tampilkan apa adanya.
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    setBuka(false);
    setToast({ text: editId ? 'Angka berhasil diperbarui' : 'Angka berhasil ditambahkan', kind: 'success' });
    muat();
  };

  const hapus = async () => {
    if (hapusId === null) return;
    const res = await adminFetch(`/airport-stats/${hapusId}`, { method: 'DELETE' });
    setHapusId(null);
    setToast(res.ok ? { text: 'Angka berhasil dihapus', kind: 'success' } : { text: res.message, kind: 'error' });
    if (res.ok) muat();
  };

  /* Peringatan yang benar-benar berguna: blok yang tidak punya satu pun angka
     aktif akan tampil kosong di beranda, dan itu tidak terlihat dari tabel ini
     tanpa menghitung kolomnya sekaligus. */
  const blokKosong = useMemo(() => {
    const aktif = daftar.filter((d) => d.is_active);
    const kurang: string[] = [];
    if (!aktif.some((d) => d.show_about)) kurang.push('Tentang');
    if (!aktif.some((d) => d.show_hero)) kurang.push('Hero');
    return kurang;
  }, [daftar]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Angka Bandara"
        subtitle="Angka ringkas yang tampil di beranda"
        action={<Btn onClick={bukaBaru}><Plus className="w-4 h-4" /> Tambah Angka</Btn>}
      />

      <InfoNote>
        Satu angka dapat tampil di lebih dari satu blok. <b>Tentang</b> adalah bilah di
        kaki kartu &ldquo;Tentang Bandar Udara APT Pranoto&rdquo; — satu-satunya tempat
        angka ini tayang penuh di beranda — dan <b>Hero</b> adalah kartu ponsel di sisi
        kanan bagian atas beranda (maksimal tiga angka pertama yang tampil). Angka-angka
        ini dimasukkan tangan dan <b>bukan</b> diambil dari catatan lalu lintas udara.
      </InfoNote>

      {blokKosong.length > 0 && (
        <InfoNote>
          Tidak ada angka aktif untuk blok: <b>{blokKosong.join(', ')}</b>. Blok itu akan
          tampil kosong di beranda.
        </InfoNote>
      )}

      <Panel>
        {memuat ? (
          <Loading text="Memuat angka bandara..." />
        ) : daftar.length === 0 ? (
          <EmptyState
            text="Belum ada angka"
            hint="Tambahkan angka pertama, atau jalankan AirportStatSeeder untuk memuat angka yang selama ini tayang."
          />
        ) : (
          <Table head={['Urut', 'Ikon', 'Nilai', 'Label ID', 'Label EN', 'Tampil di', 'Status', '']}>
            {daftar.map((s) => {
              const Ikon = ikonStatistik(s.icon);
              const blok = [
                s.show_about && 'Tentang',
                s.show_hero && 'Hero',
              ].filter(Boolean) as string[];

              return (
                <Row key={s.id}>
                  <Cell className="tabular-nums text-[var(--adm-muted)]">{s.sort_order}</Cell>
                  <Cell><Ikon className="w-4 h-4 text-[var(--adm-accent)]" /></Cell>
                  <Cell className="font-bold">{s.value}</Cell>
                  <Cell>{s.label_id}</Cell>
                  <Cell className="text-[var(--adm-muted)]">{s.label_en}</Cell>
                  <Cell>
                    <span className="flex flex-wrap gap-1">
                      {blok.length === 0
                        ? <Badge text="Tidak tampil" color="#f87171" />
                        : blok.map((b) => <Badge key={b} text={b} />)}
                    </span>
                  </Cell>
                  <Cell>
                    {s.is_active
                      ? <Badge text="Aktif" color="#34d399" />
                      : <Badge text="Nonaktif" color="#94a3b8" />}
                  </Cell>
                  <Cell>
                    <span className="flex gap-2 justify-end">
                      <Btn variant="ghost" onClick={() => bukaSunting(s)}><Pencil className="w-3.5 h-3.5" /> Ubah</Btn>
                      <Btn variant="danger" onClick={() => setHapusId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                    </span>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      <Modal
        open={buka}
        onClose={() => setBuka(false)}
        title={editId ? 'Ubah Angka' : 'Tambah Angka'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setBuka(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Kode"
            value={draf.slug}
            onChange={(v) => setDraf({ ...draf, slug: v })}
            placeholder="mis. penumpang"
            required
          />
          <Field
            label="Urutan"
            type="number"
            value={draf.sort_order}
            onChange={(v) => setDraf({ ...draf, sort_order: v })}
          />

          <Field
            label="Nilai yang ditampilkan"
            value={draf.value}
            onChange={(v) => setDraf({ ...draf, value: v })}
            placeholder="mis. 1.250.000+ atau 2.250 m"
            required
          />
          <div className="flex items-end gap-3">
            <Field
              label="Ikon"
              type="select"
              value={draf.icon}
              onChange={(v) => setDraf({ ...draf, icon: v })}
              options={PILIHAN_IKON}
              className="flex-1"
            />
            {/* Pratinjau di samping pemilihnya: nama ikon lucide tidak selalu
                menggambarkan bentuknya, dan memilih ikon tanpa melihatnya
                berarti menyimpan lalu membuka beranda untuk memeriksanya. */}
            {React.createElement(ikonStatistik(draf.icon), {
              className: 'w-6 h-6 mb-2.5 text-[var(--adm-accent)] flex-shrink-0',
            })}
          </div>

          <Field
            label="Label (Indonesia)"
            value={draf.label_id}
            onChange={(v) => setDraf({ ...draf, label_id: v })}
            placeholder="mis. Penumpang / Tahun"
            required
          />
          <Field
            label="Label (Inggris)"
            value={draf.label_en}
            onChange={(v) => setDraf({ ...draf, label_en: v })}
            placeholder="mis. Passengers / Year"
            required
          />

          <div className="sm:col-span-2 space-y-2.5 pt-1">
            <p className="text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider">
              Tampil di blok
            </p>
            <Field label="Kartu Tentang" type="checkbox" value={draf.show_about} onChange={(v) => setDraf({ ...draf, show_about: v })} />
            <Field label="Kartu hero (maks. 3)" type="checkbox" value={draf.show_hero} onChange={(v) => setDraf({ ...draf, show_hero: v })} />
          </div>

          <div className="sm:col-span-2 border-t border-[var(--adm-line)] pt-4">
            <Field label="Aktif" type="checkbox" value={draf.is_active} onChange={(v) => setDraf({ ...draf, is_active: v })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={hapusId !== null}
        onCancel={() => setHapusId(null)}
        onConfirm={hapus}
        title="Hapus angka"
        message="Angka ini akan hilang dari seluruh blok di beranda. Untuk menyembunyikannya sementara, cukup matikan statusnya."
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </div>
  );
}
