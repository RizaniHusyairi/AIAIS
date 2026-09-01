'use client';

/**
 * Kotak masuk kiriman warga, dan setelan kanal yang mengantarkannya.
 *
 * Urutannya disengaja. Sebelumnya halaman ini hanya memuat setelan dan tidak
 * menampilkan satu pun notifikasi — sementara lonceng di kepala panel, satu-
 * satunya tempat notifikasi dapat dibaca, hanya sanggup memuat tiga puluh yang
 * terbaru di dalam kotak selebar 330px. Riwayat di luar itu tidak dapat dicapai
 * dari mana pun, dan tidak ada cara membersihkannya.
 *
 * Dua hal yang tetap harus dikerjakan di halaman ini, dan tidak dapat dipindah:
 *
 *  1. TOMBOL NYALAKAN PUSH. Peramban menolak permintaan izin notifikasi yang
 *     tidak berasal dari klik pemakai — dan menolaknya diam-diam, tanpa dialog
 *     apa pun. Jadi izinnya mustahil diminta otomatis saat panel dibuka.
 *
 *  2. TOMBOL KIRIM UJI. Ia menempuh SELURUH rantai sekaligus — lonceng, push,
 *     dan WhatsApp. Uji kirim di halaman WhatsApp hanya menembak satu nomor dan
 *     tidak membuktikan apa pun tentang dua kanal lainnya.
 *
 * Setelan gateway WhatsApp sendiri TIDAK diulang di sini; tempatnya
 * `/admin/whatsapp`, yang dapat menyuntingnya. Yang tinggal hanyalah satu baris
 * status dan tautan ke sana.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PageHeader, Panel, Btn, Badge, StatCard, InfoNote, Toast, ToastMsg, Loading,
  EmptyState, Table, Row, Cell, SearchBox, ConfirmDialog, stagger,
} from '@/components/admin/ui';
import {
  Bell, BellRing, BellOff, Send, MessageSquare, Users, CheckCheck, Check,
  Inbox, Trash2, ExternalLink, CalendarClock,
} from 'lucide-react';
import {
  statusNotifikasi, ambilNotifikasi, tandaiDibaca, tandaiSemuaDibaca, hapusNotifikasi,
  kirimNotifikasiUji, nyalakanPush, matikanPush, langgananSaatIni, pushDidukung,
  rupaJenis, waktuRelatif,
  type StatusNotifikasi, type HasilNotifikasi, type ItemNotifikasi,
  type JenisNotifikasi, type SaringNotifikasi,
} from '@/lib/notifikasi';

const PER_HALAMAN = 30;

type SaringStatus = '' | 'belum' | 'sudah';

export default function AdminNotifikasiPage() {
  const [status, setStatus] = useState<StatusNotifikasi | null>(null);
  const [hasil, setHasil] = useState<HasilNotifikasi | null>(null);
  const [items, setItems] = useState<ItemNotifikasi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyaring, setMenyaring] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pushAktif, setPushAktif] = useState(false);
  const [didukung, setDidukung] = useState(true);

  /* saringan */
  const [jenis, setJenis] = useState<JenisNotifikasi | ''>('');
  const [saringStatus, setSaringStatus] = useState<SaringStatus>('');
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [hapusId, setHapusId] = useState<string | null>(null);

  /**
   * Ambil satu halaman kotak masuk.
   *
   * `sambung` menentukan hasilnya menimpa daftar atau menyambungnya — tombol
   * "muat lebih banyak" menyambung, setiap perubahan saringan menimpa.
   */
  const muatKotak = useCallback(async (saring: SaringNotifikasi, sambung = false) => {
    const res = await ambilNotifikasi({ ...saring, per_page: PER_HALAMAN });

    if (!res.ok || !res.data) {
      setToast({ text: res.message, kind: 'error' });
      return;
    }

    const data = res.data;
    setHasil(data);
    setItems((lama) => (sambung ? [...lama, ...data.items] : data.items));
  }, []);

  useEffect(() => {
    let hidup = true;

    /*
     * Seluruh setState ada DI DALAM callback, bukan di badan efek.
     *
     * Dua sebabnya. Pertama, lint proyek menolak setState serentak di badan
     * efek karena memicu render beruntun. Kedua — dan ini yang menentukan —
     * `pushDidukung()` membaca `navigator`, jadi ia tidak boleh dihitung saat
     * render: server akan mendapat nilai berbeda dari klien, hidrasinya gagal,
     * dan React merender ulang seluruh pohon dari nol.
     */
    Promise.all([statusNotifikasi(), ambilNotifikasi({ per_page: PER_HALAMAN })])
      .then(async ([st, kotak]) => {
        if (!hidup) return;

        setDidukung(pushDidukung());
        if (st.ok && st.data) setStatus(st.data);
        if (kotak.ok && kotak.data) {
          setHasil(kotak.data);
          setItems(kotak.data.items);
        }
        setPushAktif((await langgananSaatIni()) !== null);
        setMemuat(false);
      });

    return () => { hidup = false; };
  }, []);

  /**
   * Saringan berubah → halaman kembali ke satu dan kotak dimuat ulang.
   *
   * Penyaringan dikerjakan server, bukan klien. Ini menyimpang dari kebiasaan
   * "saring di klien" pada halaman publik, dan sengaja: riwayat notifikasi
   * tumbuh seumur portal, dan mengangkut seluruhnya ke peramban hanya untuk
   * disaring adalah beban yang bertambah tiap hari tanpa pernah surut.
   */
  useEffect(() => {
    if (memuat) return;

    let hidup = true;

    /*
     * Jeda ketik: pencarian nomor tiket tidak perlu menembak server tiap huruf.
     *
     * `setMenyaring(true)` ikut masuk ke dalam callback, bukan di badan efek —
     * setState yang berjalan serentak di badan efek memicu render beruntun, dan
     * lint proyek menolaknya.
     */
    const tunda = setTimeout(() => {
      if (!hidup) return;
      setMenyaring(true);
      muatKotak({ jenis, status: saringStatus, q: cari, page: 1 }).finally(() => {
        if (hidup) { setMenyaring(false); setHalaman(1); }
      });
    }, cari ? 350 : 0);

    return () => { hidup = false; clearTimeout(tunda); };
  }, [jenis, saringStatus, cari, memuat, muatKotak]);

  const segarkan = useCallback(async () => {
    await muatKotak({ jenis, status: saringStatus, q: cari, page: 1 });
    setHalaman(1);
  }, [jenis, saringStatus, cari, muatKotak]);

  /* ---------------- aksi ---------------- */

  const uji = async () => {
    setSibuk(true);
    const res = await kirimNotifikasiUji();
    setSibuk(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) segarkan();
  };

  const semuaDibaca = async () => {
    // Ditandai di layar lebih dulu supaya angkanya turun seketika; pemuatan
    // ulang berikutnya yang menyelaraskannya dengan server.
    setItems((p) => p.map((x) => ({ ...x, dibaca: true })));
    const res = await tandaiSemuaDibaca();
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    segarkan();
  };

  const satuDibaca = async (n: ItemNotifikasi) => {
    if (n.dibaca) return;
    setItems((p) => p.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)));
    await tandaiDibaca(n.id);
    setHasil((h) => (h ? { ...h, belum_dibaca: Math.max(0, h.belum_dibaca - 1) } : h));
  };

  const hapus = async () => {
    if (!hapusId) return;
    const res = await hapusNotifikasi(hapusId);
    setHapusId(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setItems((p) => p.filter((x) => x.id !== hapusId));
      segarkan();
    }
  };

  const muatLagi = async () => {
    const berikut = halaman + 1;
    setSibuk(true);
    await muatKotak({ jenis, status: saringStatus, q: cari, page: berikut }, true);
    setSibuk(false);
    setHalaman(berikut);
  };

  const togglePush = async () => {
    setSibuk(true);

    const res = pushAktif
      ? await matikanPush()
      : await nyalakanPush(status?.push.public_key ?? '');

    setSibuk(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setPushAktif((await langgananSaatIni()) !== null);
      const st = await statusNotifikasi();
      if (st.ok && st.data) setStatus(st.data);
    }
  };

  if (memuat) return <Loading text="Memuat notifikasi..." />;

  const wa = status?.whatsapp;
  const push = status?.push;
  const rekap = hasil?.rekap;
  const adaLagi = (hasil?.halaman.saat_ini ?? 1) < (hasil?.halaman.terakhir ?? 1);
  const adaSaringan = jenis !== '' || saringStatus !== '' || cari.trim() !== '';

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notifikasi"
        subtitle="Kiriman warga yang masuk lewat Pusat Bantuan, beserta kanal yang mengabarkannya"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" onClick={uji} disabled={sibuk}>
              <Send className="w-4 h-4" /> Kirim Uji
            </Btn>
            <Btn onClick={semuaDibaca} disabled={sibuk || (hasil?.belum_dibaca ?? 0) === 0}>
              <CheckCheck className="w-4 h-4" /> Tandai Semua Dibaca
            </Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Belum Dibaca"
          value={rekap?.belum_dibaca ?? 0}
          icon={Inbox}
          accent={(rekap?.belum_dibaca ?? 0) > 0 ? '#fb7185' : '#34d399'}
          hint={`dari ${rekap?.total ?? 0} notifikasi`}
        />
        <StatCard
          label="Masuk Hari Ini"
          value={rekap?.hari_ini ?? 0}
          icon={CalendarClock}
          accent="#38bdf8"
          hint="sejak tengah malam"
        />
        <StatCard
          label="Push Perangkat Ini"
          value={pushAktif ? 'Menyala' : 'Mati'}
          icon={pushAktif ? BellRing : BellOff}
          accent={pushAktif ? '#38bdf8' : '#94a3b8'}
          hint={`${push?.perangkat_saya ?? 0} perangkat terdaftar`}
        />
        <StatCard
          label="Penerima Aktif"
          value={status?.penerima ?? 0}
          icon={Users}
          accent={(status?.penerima ?? 0) > 1 ? '#a78bfa' : '#fbbf24'}
          hint="akun admin yang dikabari"
        />
      </motion.div>

      {/* ---------------- kotak masuk ---------------- */}
      <Panel className="mt-4">
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Kotak Masuk</h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)]">
                Isinya hanya jenis, nomor tiket, dan tautan — rinciannya dibaca di modulnya.
              </p>
            </div>
            <SearchBox value={cari} onChange={setCari} placeholder="Cari nomor tiket..." />
          </div>

          {/* Chip jenis; daftarnya datang dari backend supaya jenis baru tidak
              perlu ditulis ulang di sini. */}
          <div className="flex flex-wrap gap-1.5">
            <Chip aktif={jenis === ''} onClick={() => setJenis('')} label="Semua jenis" jumlah={rekap?.total} />
            {(hasil?.jenis_tersedia ?? []).map((j) => {
              const rupa = rupaJenis(j.kunci);

              return (
                <Chip
                  key={j.kunci}
                  aktif={jenis === j.kunci}
                  onClick={() => setJenis(jenis === j.kunci ? '' : j.kunci)}
                  label={j.judul}
                  jumlah={rekap?.per_jenis?.[j.kunci]}
                  icon={rupa.icon}
                  warna={rupa.warna}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip aktif={saringStatus === ''} onClick={() => setSaringStatus('')} label="Semua status" />
            <Chip
              aktif={saringStatus === 'belum'}
              onClick={() => setSaringStatus('belum')}
              label="Belum dibaca"
              jumlah={rekap?.belum_dibaca}
              warna="#fb7185"
            />
            <Chip aktif={saringStatus === 'sudah'} onClick={() => setSaringStatus('sudah')} label="Sudah dibaca" />
          </div>
        </div>

        {menyaring ? (
          <Loading text="Menyaring..." />
        ) : items.length === 0 ? (
          <EmptyState
            text={adaSaringan ? 'Tidak ada yang cocok' : 'Belum ada notifikasi'}
            hint={
              adaSaringan
                ? 'Longgarkan saringan atau kosongkan kotak pencarian.'
                : 'Notifikasi muncul di sini begitu warga mengirim pengaduan, pertanyaan, laporan kehilangan, permohonan informasi, penilaian, atau pengajuan layanan.'
            }
          />
        ) : (
          <>
            <Table head={['Jenis', 'Kiriman', 'Tiket', 'Waktu', '']}>
              {items.map((n) => {
                const rupa = rupaJenis(n.jenis);
                const Icon = rupa.icon;

                return (
                  <Row key={n.id}>
                    <Cell>
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${rupa.warna}22` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: rupa.warna }} />
                      </span>
                    </Cell>

                    <Cell className={n.dibaca ? 'opacity-60' : ''}>
                      <span className="flex items-center gap-2">
                        {!n.dibaca && (
                          <span className="w-2 h-2 rounded-full bg-[var(--adm-accent)] flex-shrink-0" />
                        )}
                        <span className={n.dibaca ? 'font-medium' : 'font-bold text-[var(--adm-fg)]'}>
                          {n.judul}
                        </span>
                      </span>
                    </Cell>

                    <Cell className={`font-mono text-[11px] ${n.dibaca ? 'opacity-60' : ''}`}>
                      {n.ticket ?? '—'}
                    </Cell>

                    <Cell className={`whitespace-nowrap ${n.dibaca ? 'opacity-60' : ''}`}>
                      {waktuRelatif(n.created_at)}
                    </Cell>

                    <Cell>
                      <span className="flex gap-2 justify-end">
                        <Link
                          href={n.path}
                          onClick={() => satuDibaca(n)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-bold bg-[var(--adm-hover)] text-[var(--adm-body)] hover:text-[var(--adm-fg)] border border-[var(--adm-line)] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka
                        </Link>
                        {!n.dibaca && (
                          <Btn variant="ghost" onClick={() => satuDibaca(n)}>
                            <Check className="w-3.5 h-3.5" /> Tandai
                          </Btn>
                        )}
                        <Btn variant="danger" onClick={() => setHapusId(n.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </span>
                    </Cell>
                  </Row>
                );
              })}
            </Table>

            <div className="px-5 py-3.5 border-t border-[var(--adm-line)] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11.5px] text-[var(--adm-dim)]">
                Menampilkan {items.length} dari {hasil?.halaman.total ?? 0} notifikasi
              </span>
              {adaLagi && (
                <Btn variant="ghost" onClick={muatLagi} disabled={sibuk}>
                  {sibuk ? 'Memuat...' : 'Muat lebih banyak'}
                </Btn>
              )}
            </div>
          </>
        )}
      </Panel>

      {/* ---------------- setelan kanal ---------------- */}
      <Panel className="mt-4">
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Pengaturan Kanal</h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)]">
            Ke mana saja kabar di atas dikirimkan, selain ke lonceng panel.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* push */}
          <div>
            <h3 className="text-[12.5px] font-bold text-[var(--adm-fg)]">Notifikasi di Perangkat Ini</h3>
            <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)] leading-relaxed">
              Muncul di layar walau panel sedang tertutup. Disetel per perangkat — menyalakannya
              di laptop tidak menyalakannya di ponsel Anda, dan sebaliknya.
            </p>

            <div className="mt-3">
              {!didukung ? (
                <InfoNote>
                  Peramban ini tidak mendukung notifikasi push. Di iPhone, portal harus dipasang
                  dulu ke layar utama lewat <em>Bagikan → Tambahkan ke Layar Utama</em>.
                </InfoNote>
              ) : !push?.siap ? (
                <InfoNote>
                  Kunci VAPID belum dipasang di server, jadi push belum dapat dinyalakan.
                  Lihat <code>docs/DEPLOY.md</code>.
                </InfoNote>
              ) : (
                <Btn onClick={togglePush} disabled={sibuk} variant={pushAktif ? 'ghost' : 'primary'}>
                  {pushAktif
                    ? <><BellOff className="w-4 h-4" /> Matikan di perangkat ini</>
                    : <><BellRing className="w-4 h-4" /> Nyalakan di perangkat ini</>}
                </Btn>
              )}
            </div>
          </div>

          {/* WhatsApp — ringkasan saja. Penyetelannya di `/admin/whatsapp`, yang
              dapat menyuntingnya; mengulangnya di sini hanya melahirkan dua
              tempat yang harus dipercaya untuk satu keadaan yang sama. */}
          <div className="pt-4 border-t border-[var(--adm-line)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[var(--adm-dim)]" />
                <h3 className="text-[12.5px] font-bold text-[var(--adm-fg)]">WhatsApp</h3>
                <Badge
                  text={wa?.enabled ? (wa.siap ? 'Aktif' : 'Belum lengkap') : 'Dimatikan'}
                  color={wa?.enabled ? (wa.siap ? '#22c55e' : '#fbbf24') : '#94a3b8'}
                />
                <span className="text-[11.5px] text-[var(--adm-dim)]">
                  {wa?.jumlah_tujuan ?? 0} nomor piket
                </span>
              </div>

              <Link
                href="/admin/whatsapp"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-bold bg-[var(--adm-hover)] text-[var(--adm-body)] hover:text-[var(--adm-fg)] border border-[var(--adm-line)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Atur gateway &amp; nomor piket
              </Link>
            </div>

            <div className="mt-3">
              <InfoNote>
                Isi pesannya <strong>hanya jenis kiriman, nomor tiket, dan tautan panel</strong> —
                tanpa nama, nomor ponsel, maupun isi laporan warga. Rinciannya dibaca di panel ini.
                Aturan itu disengaja: pesan WhatsApp melewati server penyedia gateway.
              </InfoNote>
            </div>
          </div>

          {/* penerima */}
          {(status?.penerima ?? 0) <= 1 && (
            <div className="pt-4 border-t border-[var(--adm-line)]">
              <InfoNote>
                Saat ini hanya <strong>satu akun</strong> yang menerima notifikasi. Bila akun itu
                sedang tidak bertugas, tidak ada yang mengetahui kiriman warga yang masuk —
                pertimbangkan menambah akun admin.
              </InfoNote>
            </div>
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={hapusId !== null}
        onCancel={() => setHapusId(null)}
        onConfirm={hapus}
        title="Hapus notifikasi"
        message="Kabarnya hilang dari kotak masuk Anda. Kiriman warganya sendiri tidak ikut terhapus — ia tetap ada di modulnya."
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Tombol saringan. Bukan `Badge`, karena `Badge` tidak dapat diklik. */
function Chip({
  aktif, onClick, label, jumlah, icon: Icon, warna = '#22d3ee',
}: {
  aktif: boolean;
  onClick: () => void;
  label: string;
  jumlah?: number;
  icon?: typeof Bell;
  warna?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors cursor-pointer ${
        aktif
          ? 'text-[var(--adm-fg)]'
          : 'bg-[var(--adm-inset)] border-[var(--adm-line)] text-[var(--adm-muted)] hover:text-[var(--adm-fg)]'
      }`}
      style={aktif ? { backgroundColor: `${warna}22`, borderColor: `${warna}66` } : undefined}
    >
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: warna }} />}
      {label}
      {typeof jumlah === 'number' && (
        <span className="tabular-nums text-[10.5px] text-[var(--adm-dim)]">{jumlah}</span>
      )}
    </button>
  );
}
