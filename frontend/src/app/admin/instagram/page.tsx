'use client';

/**
 * Sambungan Instagram dan kendali redaksinya.
 *
 * DUA HAL YANG DITONJOLKAN DI LAYAR INI, keduanya berasal dari cara integrasi
 * ini bisa gagal:
 *
 *  1. **Hitung mundur umur token.** Token Instagram berumur ±60 hari. Bila
 *     lewat, sambungannya putus TANPA gejala mencolok — beranda tetap
 *     menampilkan unggahan lama, dan tidak ada yang menyadarinya sampai
 *     seseorang bertanya kenapa isinya tidak pernah berubah. Karena itu sisa
 *     harinya ditaruh sebagai angka besar, bukan disembunyikan di catatan kaki.
 *
 *  2. **Sakelar tampil/sembunyi tiap unggahan.** Portal pemerintah bukan
 *     cermin buta Instagram. Menyembunyikan di sini tidak menghapus apa pun di
 *     Instagram, dan sinkronisasi berikutnya tidak menyalakannya kembali.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import type { InstagramMode, InstagramPost, InstagramStatus } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  RefreshCw, Eye, EyeOff, Trash2, KeyRound, ExternalLink,
  CircleCheck, CircleAlert, Clock, Images, Plus, Pencil, Cloud, PenLine,
} from 'lucide-react';
import { motion } from 'framer-motion';
import InstagramGlyph from '@/components/icons/InstagramGlyph';

const tanggal = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';

export default function AdminInstagramPage() {
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [menyinkron, setMenyinkron] = useState(false);
  const [delItem, setDelItem] = useState<InstagramPost | null>(null);

  const [tokenBuka, setTokenBuka] = useState(false);
  const [token, setToken] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  /* ---------- unggahan manual ---------- */
  const [manualBuka, setManualBuka] = useState(false);
  const [manualUbah, setManualUbah] = useState<InstagramPost | null>(null);
  const [formManual, setFormManual] = useState({ caption: '', permalink: '' });
  const [media, setMedia] = useState<File | null>(null);

  const muat = useCallback(async () => {
    const [s, p] = await Promise.all([
      adminFetch<InstagramStatus>('/instagram/status'),
      adminFetch<InstagramPost[]>('/instagram/posts'),
    ]);
    setStatus(s.data ?? null);
    setPosts(Array.isArray(p.data) ? p.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let batal = false;

    (async () => {
      const [s, p] = await Promise.all([
        adminFetch<InstagramStatus>('/instagram/status'),
        adminFetch<InstagramPost[]>('/instagram/posts'),
      ]);
      if (batal) return;
      setStatus(s.data ?? null);
      setPosts(Array.isArray(p.data) ? p.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const sinkron = async () => {
    setMenyinkron(true);
    const res = await adminFetch('/instagram/sync', { method: 'POST' });
    setMenyinkron(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const simpanToken = async () => {
    setMenyimpan(true);
    const res = await adminFetch('/instagram/credentials', {
      method: 'POST',
      body: { access_token: token.trim() },
    });
    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      setTokenBuka(false);
      setToken('');
      muat();
    }
  };

  const toggle = async (p: InstagramPost) => {
    const res = await adminFetch(`/instagram/posts/${p.id}/visibility`, { method: 'PUT' });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const hapus = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/instagram/posts/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  /**
   * Ganti sumber konten beranda.
   *
   * Tidak menghapus apa pun — unggahan dari kedua sumber tetap tersimpan dan
   * muncul lagi begitu modenya dikembalikan.
   */
  const gantiMode = async (mode: InstagramMode) => {
    if (status?.mode === mode) return;
    const res = await adminFetch('/instagram/mode', { method: 'PUT', body: { mode } });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const bukaManualBaru = () => {
    setManualUbah(null);
    setFormManual({ caption: '', permalink: '' });
    setMedia(null);
    setManualBuka(true);
  };

  const bukaManualUbah = (p: InstagramPost) => {
    setManualUbah(p);
    setFormManual({ caption: p.caption ?? '', permalink: p.permalink ?? '' });
    setMedia(null);
    setManualBuka(true);
  };

  const simpanManual = async () => {
    setMenyimpan(true);

    // Selalu multipart — satu jalur kirim lebih mudah dijaga daripada
    // bercabang menurut ada tidaknya gambar, dan rute `POST /{id}` memang
    // didaftarkan backend justru karena PUT tidak dapat membawa berkas.
    const form = new FormData();
    if (formManual.caption) form.append('caption', formManual.caption);
    if (formManual.permalink) form.append('permalink', formManual.permalink);
    if (media) form.append('media', media);

    const path = manualUbah ? `/instagram/posts/${manualUbah.id}` : '/instagram/posts';
    const res = await adminUpload<InstagramPost>(path, form);

    setMenyimpan(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) { setManualBuka(false); muat(); }
  };

  if (loading) return <Loading text="Memuat sambungan Instagram..." />;

  const sisa = status?.days_left ?? null;
  const warnaSisa = sisa === null ? '#94a3b8' : sisa < 0 ? '#fb7185' : sisa < 10 ? '#fbbf24' : '#34d399';

  /* Pada mode manual, seluruh urusan token tidak relevan — panel sambungan,
     hitung mundur, dan tombol tariknya sama sekali tidak dipakai. */
  const manual = (status?.mode ?? 'manual') === 'manual';

  return (
    <>
      <PageHeader
        icon={InstagramGlyph}
        title="Instagram"
        subtitle="Unggahan terbaru yang tampil di beranda portal"
        action={
          <div className="flex flex-wrap gap-2">
            {manual ? (
              <Btn onClick={bukaManualBaru}>
                <Plus className="w-4 h-4" /> Tambah Unggahan
              </Btn>
            ) : (
              <>
                <Btn variant="ghost" onClick={() => setTokenBuka(true)}>
                  <KeyRound className="w-4 h-4" /> Pasang Token
                </Btn>
                <Btn onClick={sinkron} disabled={menyinkron || !status?.connected}>
                  <RefreshCw className="w-4 h-4" /> {menyinkron ? 'Menarik...' : 'Tarik Sekarang'}
                </Btn>
              </>
            )}
          </div>
        }
      />

      {/* ---------------- sakelar sumber ---------------- */}
      <Panel className="mt-4">
        <div className="p-5">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Sumber Konten Beranda</h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)]">
            Konten Instagram mengisi kolom kanan hero beranda, menggantikan papan penerbangan.
          </p>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              {
                id: 'auto' as InstagramMode,
                nama: 'Otomatis',
                icon: Cloud,
                jelas: 'Portal menarik sendiri unggahan dari Instagram tiap 3 jam. Menuntut token yang sudah lolos App Review Meta.',
              },
              {
                id: 'manual' as InstagramMode,
                nama: 'Manual',
                icon: PenLine,
                jelas: 'Petugas memasukkan unggahan sendiri lewat panel ini. Sinkronisasi terjadwal dihentikan.',
              },
            ]).map((m) => {
              const on = (status?.mode ?? 'manual') === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => gantiMode(m.id)}
                  aria-pressed={on}
                  className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    on
                      ? 'border-[var(--adm-accent-line)] bg-[var(--adm-accent-soft)]'
                      : 'border-[var(--adm-line)] bg-[var(--adm-inset)] hover:border-[var(--adm-accent-line)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${on ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-muted)]'}`} />
                    <span className={`text-[12.5px] font-bold ${on ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-fg)]'}`}>
                      {m.nama}
                    </span>
                    {on && <Badge text="Aktif" color="#22c55e" />}
                  </span>
                  <span className="mt-1.5 block text-[11.5px] text-[var(--adm-body)] leading-relaxed">
                    {m.jelas}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-[var(--adm-dim)] leading-relaxed">
            Berpindah mode <strong>tidak menghapus apa pun</strong>. Saat ini tersimpan{' '}
            {status?.api_posts ?? 0} unggahan hasil sinkronisasi dan {status?.manual_posts ?? 0}{' '}
            unggahan manual; semuanya tetap ada apa pun modenya.
          </p>
        </div>
      </Panel>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Dua kartu pertama hanya berarti pada mode otomatis; pada mode manual
            keduanya diganti angka yang memang sedang dipakai petugas. */}
        {manual ? (
          <>
            <StatCard label="Unggahan Manual" value={status?.manual_posts ?? 0} icon={PenLine} accent="#f472b6" />
            <StatCard label="Sisa dari Sinkronisasi" value={status?.api_posts ?? 0} icon={Cloud} accent="#94a3b8" hint="Tersimpan, tidak diperbarui" />
          </>
        ) : (
          <>
            <StatCard
              label="Sambungan"
              value={status?.connected ? `@${status.account_username ?? '—'}` : 'Belum tersambung'}
              icon={status?.connected ? CircleCheck : CircleAlert}
              accent={status?.connected ? '#34d399' : '#fb7185'}
            />
            {/* Angka terpenting pada mode otomatis — lihat catatan kelas. */}
            <StatCard
              label="Sisa Umur Token"
              value={sisa === null ? '—' : sisa < 0 ? 'Kedaluwarsa' : `${sisa} hari`}
              icon={Clock}
              accent={warnaSisa}
              hint={status?.expires_at ? `Habis ${status.expires_at}` : undefined}
            />
          </>
        )}
        <StatCard label="Tampil di Beranda" value={status?.visible_posts ?? 0} icon={Eye} accent="#38bdf8" hint={`Maksimal ${status?.display_limit ?? 6} kartu`} />
        <StatCard label="Total Tersimpan" value={status?.total_posts ?? 0} icon={Images} accent="#a78bfa" />
      </motion.div>

      <div className="mt-4 space-y-3">
        {manual ? (
          <InfoNote>
            Mode <strong>Manual</strong>: sinkronisasi terjadwal <strong>dihentikan</strong>, dan
            portal tidak menghubungi Instagram sama sekali. Unggahan yang tampil di beranda adalah
            yang Anda masukkan lewat tombol <em>Tambah Unggahan</em>. Bila belum ada satu pun,
            kolom Instagram di beranda tidak dirender — bukan tampil kosong.
          </InfoNote>
        ) : (
          <>
            {!status?.connected && (
              <InfoNote>
                Portal <strong>belum tersambung</strong> ke Instagram. Pasang token hasil App Review
                Meta lewat tombol <em>Pasang Token</em>, atau pindah ke mode Manual di atas dan
                masukkan unggahannya sendiri. Selama belum tersambung dan belum ada unggahan,
                kolom Instagram di beranda tidak ditampilkan sama sekali — bukan tampil kosong.
              </InfoNote>
            )}

            {status?.connected && status.needs_refresh && (
              <InfoNote>
                Token akan habis dalam <strong>{sisa} hari</strong>. Penyegaran otomatis berjalan
                harian dan seharusnya menanganinya sendiri. Bila angka ini terus mengecil, berarti
                penjadwal di server tidak berjalan — periksa baris cron <code>schedule:run</code>.
              </InfoNote>
            )}

            <InfoNote>
              Sinkronisasi otomatis berjalan tiap 3 jam. Terakhir ditarik:{' '}
              <strong>{tanggal(status?.last_synced_at ?? null)}</strong>. Bila Instagram sedang
              bermasalah, unggahan lama tetap tampil — beranda tidak pernah dikosongkan.
            </InfoNote>
          </>
        )}
      </div>

      <Panel>
        <div className="px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Unggahan Tersimpan</h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)]">
            Menyembunyikan unggahan di sini tidak menghapusnya di Instagram, dan penarikan
            berikutnya tidak menampilkannya kembali.
          </p>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            text="Belum ada unggahan"
            hint={
              manual
                ? 'Tekan Tambah Unggahan untuk memasukkan gambar dan takarirnya.'
                : status?.connected
                  ? 'Tekan Tarik Sekarang untuk mengambil unggahan terbaru.'
                  : 'Pasang token lebih dahulu, atau pindah ke mode Manual.'
            }
          />
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl overflow-hidden ring-1 transition-opacity ${
                  p.is_visible ? 'ring-[var(--adm-line)]' : 'ring-[var(--adm-line)] opacity-55'
                }`}
              >
                <div className="relative aspect-square bg-[var(--adm-inset)]">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[var(--adm-dim)]">
                      <CircleAlert className="w-6 h-6" />
                      <span className="text-[11px]">Gambar gagal diunduh</span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <Badge
                      text={p.is_visible ? 'Tampil' : 'Disembunyikan'}
                      color={p.is_visible ? '#34d399' : '#94a3b8'}
                    />
                    {/* Sumber ditandai supaya petugas tahu mana yang dapat
                        disuntingnya — yang dari sinkronisasi tidak. */}
                    <Badge
                      text={p.source === 'manual' ? 'Manual' : 'Otomatis'}
                      color={p.source === 'manual' ? '#f472b6' : '#38bdf8'}
                    />
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-[12px] text-[var(--adm-body)] leading-relaxed line-clamp-3">
                    {p.caption_excerpt ?? <span className="text-[var(--adm-dim)]">Tanpa takarir</span>}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--adm-dim)]">{tanggal(p.posted_at)}</p>

                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      onClick={() => toggle(p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-cyan-300 text-[11.5px] font-semibold transition-colors cursor-pointer"
                    >
                      {p.is_visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {p.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                    </button>

                    {/* Unggahan manual boleh tanpa tautan; tombolnya hanya
                        muncul bila ada yang bisa dibuka. */}
                    {p.permalink && (
                      <a
                        href={p.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--adm-hover)] hover:bg-violet-500/20 text-[var(--adm-body)] hover:text-violet-300 text-[11.5px] font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka
                      </a>
                    )}

                    {/* Hanya unggahan manual yang dapat disunting. Yang berasal
                        dari sinkronisasi akan ditimpa penarikan berikutnya —
                        backend pun menolaknya dengan 422. */}
                    {p.source === 'manual' && (
                      <button
                        onClick={() => bukaManualUbah(p)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 text-[11.5px] font-semibold transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Ubah
                      </button>
                    )}

                    <button
                      onClick={() => setDelItem(p)}
                      className="ml-auto w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus dari portal"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={tokenBuka}
        onClose={() => setTokenBuka(false)}
        title="Pasang Token Instagram"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setTokenBuka(false)}>Batal</Btn>
            <Btn onClick={simpanToken} disabled={menyimpan || token.trim().length < 20}>
              {menyimpan ? 'Memeriksa...' : 'Simpan Token'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <InfoNote>
            Token berumur panjang diperoleh dari aplikasi Meta Developer yang izin{' '}
            <code>instagram_business_basic</code>-nya sudah lolos App Review. Akun{' '}
            <strong>@aptpranotoairport</strong> harus bertipe Business atau Creator.
          </InfoNote>

          <Field
            label="Access Token" required type="textarea" rows={4}
            value={token}
            placeholder="IGQVJ..."
            onChange={(v) => setToken(String(v))}
          />

          <p className="text-[11.5px] text-[var(--adm-dim)]">
            Token diperiksa langsung ke Instagram sebelum disimpan — token yang salah ketik atau
            sudah mati ditolak sekarang, bukan diketahui tiga jam kemudian saat penarikan terjadwal
            gagal. Sesudah tersimpan, token tidak pernah ditampilkan kembali di layar mana pun.
          </p>
        </div>
      </Modal>

      {/* ---------------- unggahan manual ---------------- */}
      <Modal
        open={manualBuka}
        onClose={() => setManualBuka(false)}
        title={manualUbah ? 'Ubah Unggahan Manual' : 'Tambah Unggahan Manual'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setManualBuka(false)}>Batal</Btn>
            <Btn
              onClick={simpanManual}
              // Gambar wajib pada unggahan baru; saat menyunting, gambar lama
              // dipertahankan bila tidak diganti.
              disabled={menyimpan || (!manualUbah && !media)}
            >
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <InfoNote>
            Unggahan ini tampil di kolom Instagram pada beranda. Berkasnya disimpan di portal,
            jadi ia tetap tampil meski Instagram sedang bermasalah.
          </InfoNote>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5">
              Gambar atau Video {!manualUbah && <span className="text-[var(--adm-danger)]">*</span>}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
              className="w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-bold file:bg-[var(--adm-hover)] file:text-[var(--adm-fg)]"
            />
            <p className="mt-1 text-[11px] text-[var(--adm-dim)]">
              JPG, PNG, WEBP, MP4, atau WEBM; maksimal 60 MB. Bentuk persegi paling pas — kartu
              beranda memotongnya menjadi persegi.
              {manualUbah && ' Biarkan kosong bila berkasnya tidak diganti.'}
            </p>

            {/* Pratinjau berkas yang baru dipilih, SEBELUM diunggah. Tanpa
                ini, video yang salah pilih baru ketahuan setelah tayang di
                beranda. */}
            {media && <PratinjauMedia berkas={media} />}
          </div>

          <Field
            label="Takarir" type="textarea" rows={4}
            value={formManual.caption}
            placeholder="Tulis keterangan singkat yang akan terbaca di beranda."
            onChange={(v) => setFormManual({ ...formManual, caption: String(v) })}
          />

          <Field
            label="Tautan Instagram"
            value={formManual.permalink}
            placeholder="https://www.instagram.com/p/..."
            onChange={(v) => setFormManual({ ...formManual, permalink: String(v) })}
          />
          <p className="-mt-2 text-[11.5px] text-[var(--adm-dim)]">
            Opsional. Bila diisi, kartu di beranda menjadi tautan menuju unggahan aslinya. Harus
            menuju instagram.com.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={hapus}
        message={
          delItem?.source === 'manual'
            ? 'Unggahan manual ini akan dihapus beserta gambarnya, dan tidak dapat dikembalikan. Lanjutkan?'
            : 'Unggahan ini akan dihapus dari portal beserta salinan gambarnya. Unggahannya tetap ada di Instagram, dan penarikan berikutnya akan mengambilnya lagi — gunakan Sembunyikan bila maksud Anda menahannya secara tetap. Lanjutkan?'
        }
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}

/**
 * Pratinjau berkas yang baru dipilih petugas, sebelum diunggah.
 *
 * URL objeknya DICABUT saat komponen dilepas. `URL.createObjectURL` menahan
 * seluruh isi berkas di memori sampai dicabut; tanpa `revokeObjectURL`, tiap
 * kali petugas berganti pilihan video 60 MB, memori tab bertambah 60 MB dan
 * tidak pernah kembali sampai tabnya ditutup.
 */
function PratinjauMedia({ berkas }: { berkas: File }) {
  const video = berkas.type.startsWith('video/');

  /* `useMemo`, bukan `useState` yang diisi di dalam efek: lint proyek menolak
     setState serentak di badan efek karena memicu render beruntun. Pencabutan
     tetap dikerjakan efek — yang perlu dibersihkan adalah URL-nya, bukan
     keadaannya. */
  const url = React.useMemo(() => URL.createObjectURL(berkas), [berkas]);

  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="mt-3 relative aspect-square max-w-[220px] rounded-xl overflow-hidden ring-1 ring-[var(--adm-line)] bg-[var(--adm-inset)]">
      {video ? (
        <video src={url} controls muted playsInline className="w-full h-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Pratinjau unggahan" className="w-full h-full object-cover" />
      )}
    </div>
  );
}
