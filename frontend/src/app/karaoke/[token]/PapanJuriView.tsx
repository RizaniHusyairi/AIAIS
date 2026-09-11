'use client';

/**
 * Papan nilai seorang juri.
 *
 * Perbedaan penting dari papan karaoke lepas yang biasa beredar, dan alasan
 * masing-masing:
 *
 *  - TIDAK ADA TAB "Juri 1/2/3". Tiap juri memegang tautannya sendiri, dan
 *    tokennya yang menentukan ia siapa. Satu layar berisi ketiga juri berarti
 *    juri mana pun dapat menyunting nilai rekannya — pada sebuah lomba itu
 *    bukan kemudahan, itu cacat.
 *  - Daftar peserta BACA SAJA. Peserta didaftarkan panitia dari panel admin;
 *    juri yang dapat menambah atau menghapus peserta di tengah acara membuat
 *    daftar ketiga juri menyimpang satu sama lain.
 *  - Nilai TERSIMPAN OTOMATIS ke backend, ter-debounce. Papan yang menyimpan
 *    di memori peramban kehilangan seluruh penilaian begitu ponsel juri
 *    mengunci layar dan tabnya dibuang sistem — yang terjadi persis di tengah
 *    acara panjang.
 *  - LAYAR PENUH TANPA CHROME PORTAL. `/karaoke` terdaftar di
 *    `lib/layoutChrome.ts`, jadi navbar, footer, dan peluncur chat tidak ikut
 *    tampil — alasan yang sama dengan `/absensi`: tidak ada pintu keluar yang
 *    mengundang juri meninggalkan papannya di tengah penampilan.
 *
 * Bobot kriteria datang dari `data.criteria`, yaitu dari basis data. Jangan
 * menuliskannya di berkas ini; lihat catatan di `lib/karaokeKriteria.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Trophy, Star, Lock, Check, Loader2, TriangleAlert } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { PALET, WARNA, labelKriteria, nilaiTampil, NILAI_MIN, NILAI_MAKS } from '@/lib/karaokeKriteria';
import type { KaraokePapanJuri, KaraokeTotal } from '@/types';

/** Jeda sebelum satu geseran slider dikirim. Cukup untuk menyatukan puluhan
 *  langkah geseran menjadi satu permintaan, cukup singkat untuk terasa langsung. */
const JEDA_SIMPAN = 600;

type Isian = Record<string, number | ''>;
type Status = { keadaan: 'menyimpan' | 'tersimpan' | 'galat'; pesan?: string } | null;

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function PapanJuriView({
  token,
  awal,
}: {
  token: string;
  awal: KaraokePapanJuri | null;
}) {
  if (!awal) return <Tertolak />;
  return <Papan token={token} awal={awal} />;
}

/**
 * Token tidak dikenali, ATAU backend tidak dapat dihubungi.
 *
 * Kedua sebab disebut karena layar ini memang tidak dapat membedakannya —
 * lihat catatan pada `page.tsx`. Menyebut salah satu saja berarti setengah
 * pembacanya diberi keterangan yang keliru.
 */
function Tertolak() {
  return (
    <div className={`flex min-h-screen items-center justify-center ${PALET.latar} ${PALET.teks} px-6`}>
      <div className={`max-w-md rounded-2xl border ${PALET.garis} ${PALET.panel} p-6 text-center`}>
        <TriangleAlert size={26} color={WARNA.pink} className="mx-auto" />
        <h1 className="mt-3 text-lg font-black">Papan nilai tidak dapat dibuka</h1>
        <p className={`mt-2 text-sm ${PALET.redup}`}>
          Tautan penilaian tidak dikenali, sudah diganti, atau server sedang tidak dapat dihubungi.
        </p>
        <p className={`mt-3 text-[12px] ${PALET.redup}`}>
          Mintakan tautan yang baru kepada panitia — tautan juri dapat diganti sewaktu-waktu, dan
          tautan lamanya langsung berhenti berlaku.
        </p>
      </div>
    </div>
  );
}

function Papan({ token, awal }: { token: string; awal: KaraokePapanJuri }) {
  const [data] = useState<KaraokePapanJuri>(awal);
  const [totals, setTotals] = useState<KaraokeTotal[]>(awal.totals);
  const [aktifId, setAktifId] = useState<number | null>(awal.contestants[0]?.id ?? null);
  const [tab, setTab] = useState<'nilai' | 'hasil'>('nilai');
  const [status, setStatus] = useState<Status>(null);

  const terkunci = data.event.status === 'locked';
  const kunciKriteria = useMemo(() => data.criteria.map((c) => c.key), [data.criteria]);

  /** Nilai yang sedang tampil, dikunci pada id peserta. */
  const [isian, setIsian] = useState<Record<number, Isian>>(() => {
    const awalIsian: Record<number, Isian> = {};

    for (const p of awal.contestants) {
      const tersimpan = awal.my_scores?.[String(p.id)];
      const baris: Isian = {};

      for (const c of awal.criteria) {
        const v = tersimpan ? (tersimpan as unknown as Record<string, number | null>)[c.key] : null;
        baris[c.key] = v ?? '';
      }

      awalIsian[p.id] = baris;
    }

    return awalIsian;
  });

  /*
   * Satu penunda per peserta, bukan satu untuk seluruh papan: juri kerap
   * berpindah ke penampil berikutnya sebelum geseran terakhirnya sempat
   * terkirim, dan penunda bersama akan membuang nilai peserta sebelumnya.
   */
  const penunda = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const simpan = useCallback(
    async (pesertaId: number, baris: Isian) => {
      setStatus({ keadaan: 'menyimpan' });

      const body: Record<string, unknown> = { contestant_id: pesertaId };
      for (const key of kunciKriteria) body[key] = baris[key] === '' ? null : baris[key];

      const res = await fetchApi<{ totals: KaraokeTotal[] }>(`/karaoke/${token}/scores`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success && res.data) {
        setTotals(res.data.totals);
        setStatus({ keadaan: 'tersimpan' });
      } else {
        // Pesan backend ditampilkan apa adanya — ia sudah berbahasa Indonesia,
        // dan "Penilaian sudah ditutup panitia" jauh lebih berguna daripada
        // kalimat galat umum yang kita karang sendiri di sini.
        setStatus({ keadaan: 'galat', pesan: res.message ?? 'Nilai gagal disimpan.' });
      }
    },
    [kunciKriteria, token],
  );

  /*
   * Cermin `isian` yang dipegang di luar render.
   *
   * Baris yang akan dikirim TIDAK boleh disusun di dalam pembaru `setIsian`:
   * React memanggil pembaru itu dua kali pada mode ketat, dan efek samping di
   * dalamnya berarti dua permintaan simpan untuk satu geseran. Karena `ubah`
   * satu-satunya yang menulis isian, cermin ini cukup diperbarui di sana —
   * tidak ada yang perlu disinkronkan saat render.
   */
  const isianRef = useRef(isian);

  const ubah = useCallback(
    (pesertaId: number, key: string, mentah: string, segera = false) => {
      const angka =
        mentah === ''
          ? ''
          : Math.min(NILAI_MAKS, Math.max(NILAI_MIN, parseInt(mentah, 10) || NILAI_MIN));

      const baris: Isian = { ...(isianRef.current[pesertaId] ?? {}), [key]: angka };
      isianRef.current = { ...isianRef.current, [pesertaId]: baris };
      setIsian(isianRef.current);

      clearTimeout(penunda.current[pesertaId]);
      if (segera) {
        void simpan(pesertaId, baris);
      } else {
        penunda.current[pesertaId] = setTimeout(() => simpan(pesertaId, baris), JEDA_SIMPAN);
      }
    },
    [simpan],
  );

  // Penunda yang masih menggantung dibuang saat layar ditutup. Yang belum
  // terkirim tidak hilang diam-diam: setiap isian juga menyimpan seketika
  // saat kehilangan fokus atau saat jari diangkat dari slider.
  useEffect(() => {
    const daftar = penunda.current;
    return () => Object.values(daftar).forEach(clearTimeout);
  }, []);

  const lengkap = useCallback(
    (pesertaId: number) => kunciKriteria.every((k) => isian[pesertaId]?.[k] !== '' && isian[pesertaId]?.[k] !== undefined),
    [isian, kunciKriteria],
  );

  /** Subtotal berbobot peserta yang sedang dinilai, memakai bobot dari backend. */
  const subtotal = useMemo(() => {
    if (aktifId === null) return 0;
    return data.criteria.reduce(
      (jml, c) => jml + (Number(isian[aktifId]?.[c.key] || 0) * c.weight) / 100,
      0,
    );
  }, [aktifId, data.criteria, isian]);

  const peserta = useMemo(() => new Map(data.contestants.map((c) => [c.id, c])), [data.contestants]);
  const peringkat = useMemo(() => [...totals].sort((a, b) => b.final_score - a.final_score), [totals]);
  const aktif = aktifId === null ? null : peserta.get(aktifId) ?? null;

  return (
    <div className={`min-h-screen ${PALET.latar} ${PALET.teks} px-4 py-6 sm:px-6 sm:py-8`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row">
        {/* Sisi kiri: identitas juri + daftar peserta */}
        <motion.aside
          variants={rise}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col gap-4 md:w-72 md:shrink-0"
        >
          <div>
            <div className="flex items-center gap-2">
              <Mic size={20} className={PALET.emas} />
              <h1 className="text-xl font-black tracking-tight">{data.judge.name}</h1>
            </div>
            <p className={`mt-1 text-sm ${PALET.redup}`}>
              {data.event.title}
              {data.event.location ? ` — ${data.event.location}` : ''}
            </p>
          </div>

          {terkunci && (
            <p className={`flex items-start gap-2 rounded-lg border ${PALET.garis} ${PALET.panelAlt} px-3 py-2 text-[12px] ${PALET.emas}`}>
              <Lock size={13} className="mt-0.5 shrink-0" />
              Penilaian sudah dikunci panitia. Nilai masih dapat dibaca, tetapi tidak dapat diubah.
            </p>
          )}

          <div className="flex flex-col gap-1">
            {data.contestants.length === 0 && (
              <p className={`py-4 text-sm ${PALET.redup}`}>
                Peserta belum didaftarkan panitia.
              </p>
            )}

            {data.contestants.map((c) => (
              <button
                key={c.id}
                onClick={() => { setAktifId(c.id); setTab('nilai'); }}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  aktifId === c.id
                    ? `${PALET.panelAlt} ${PALET.pinkGaris}`
                    : 'border-transparent hover:bg-[#1E1830]'
                }`}
              >
                <span className="min-w-0 truncate">
                  {c.number ? `${c.number}. ` : ''}
                  {c.name}
                </span>
                <span
                  className="size-1.5 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: lengkap(c.id) ? WARNA.emas : 'transparent',
                    borderColor: lengkap(c.id) ? WARNA.emas : WARNA.redup,
                  }}
                  aria-label={lengkap(c.id) ? 'Sudah dinilai lengkap' : 'Belum lengkap'}
                />
              </button>
            ))}
          </div>
        </motion.aside>

        {/* Sisi kanan: papan nilai / hasil akhir */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap gap-1">
            <Tab aktif={tab === 'nilai'} onClick={() => setTab('nilai')} warna={WARNA.pink}>
              Papan Nilai
            </Tab>
            <Tab aktif={tab === 'hasil'} onClick={() => setTab('hasil')} warna={WARNA.emas}>
              <Trophy size={13} /> Hasil Akhir
            </Tab>
          </div>

          {tab === 'nilai' &&
            (!aktif ? (
              <p className={`py-12 text-center text-sm ${PALET.redup}`}>
                Tidak ada peserta untuk dinilai.
              </p>
            ) : (
              <div className={`flex flex-col gap-5 rounded-2xl border ${PALET.garis} ${PALET.panel} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black">
                      {aktif.number ? `${aktif.number}. ` : ''}
                      {aktif.name}
                    </h2>
                    {aktif.song_title && (
                      <p className={`text-[12px] ${PALET.redup}`}>{aktif.song_title}</p>
                    )}
                  </div>
                  <PenandaStatus status={status} />
                </div>

                <div className="flex flex-col gap-4">
                  {data.criteria.map((c) => {
                    const nilai = isian[aktif.id]?.[c.key] ?? '';
                    return (
                      <div key={c.key} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                          <label htmlFor={`k-${c.key}`} className="text-sm font-medium">
                            {labelKriteria(c.key)}
                          </label>
                          <span className={`text-[11px] ${PALET.redup}`}>bobot {c.weight}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            id={`k-${c.key}`}
                            type="range"
                            min={NILAI_MIN}
                            max={NILAI_MAKS}
                            disabled={terkunci}
                            value={nilai === '' ? NILAI_MIN : nilai}
                            onChange={(e) => ubah(aktif.id, c.key, e.target.value)}
                            // Jari diangkat dari slider = juri sudah memutuskan.
                            // Simpan seketika, jangan tunggu penundanya.
                            onPointerUp={(e) => ubah(aktif.id, c.key, (e.target as HTMLInputElement).value, true)}
                            className="min-w-0 flex-1 accent-[#E1487C] disabled:opacity-50"
                          />
                          <input
                            type="number"
                            min={NILAI_MIN}
                            max={NILAI_MAKS}
                            disabled={terkunci}
                            value={nilai}
                            onChange={(e) => ubah(aktif.id, c.key, e.target.value)}
                            onBlur={(e) => ubah(aktif.id, c.key, e.target.value, true)}
                            placeholder="–"
                            aria-label={`Nilai ${labelKriteria(c.key)}`}
                            className={`w-16 rounded-lg border ${PALET.garis} ${PALET.panelAlt} px-2 py-1 text-right text-sm outline-none focus-visible:border-[#E1487C] disabled:opacity-50`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`flex items-center justify-between border-t ${PALET.garis} pt-4`}>
                  <span className={`text-sm ${PALET.redup}`}>Subtotal berbobot — {data.judge.name}</span>
                  <span className={`text-2xl font-black ${PALET.emas}`}>{nilaiTampil(subtotal)}</span>
                </div>
              </div>
            ))}

          {tab === 'hasil' && (
            <div className={`rounded-2xl border ${PALET.garis} ${PALET.panel} p-4 sm:p-5`}>
              {peringkat.length === 0 ? (
                <p className={`py-6 text-center text-sm ${PALET.redup}`}>
                  Belum ada peserta untuk ditampilkan.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-sm">
                    <thead>
                      <tr className={`border-b ${PALET.garis}`}>
                        <th className={`py-2 pr-3 text-left font-medium ${PALET.redup}`}>Peringkat</th>
                        <th className={`py-2 pr-3 text-left font-medium ${PALET.redup}`}>Peserta</th>
                        {data.judges.map((j) => (
                          <th key={j.id} className={`py-2 pr-3 text-right font-medium ${PALET.redup}`}>
                            {j.name}
                          </th>
                        ))}
                        <th className={`py-2 text-right font-medium ${PALET.redup}`}>Nilai Akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peringkat.map((t, i) => (
                        <tr key={t.contestant_id} className={`border-b ${PALET.garis}`}>
                          <td className="py-3 pr-3">
                            <span className="flex items-center gap-2">
                              {i === 0 && <Star size={14} color={WARNA.emas} fill={WARNA.emas} />}
                              <span className={i === 0 ? PALET.emas : undefined}>{i + 1}</span>
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span>{peserta.get(t.contestant_id)?.name ?? '—'}</span>
                              {!t.is_complete && (
                                <span className={`text-[11px] ${PALET.pink}`}>belum lengkap</span>
                              )}
                            </span>
                          </td>
                          {t.by_judge.map((b) => (
                            <td key={b.judge_id} className={`py-3 pr-3 text-right ${PALET.redup}`}>
                              {nilaiTampil(b.total)}
                            </td>
                          ))}
                          <td className="py-3 text-right font-black">{nilaiTampil(t.final_score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Navbar dan footer portal tidak tampil di rute ini (lihat
              `lib/layoutChrome.ts`) — tidak ada pintu keluar yang mengundang
              juri tersesat di tengah penampilan. Baris ini yang menyebut
              papan ini milik portal siapa. */}
          <p className={`mt-2 text-[11px] ${PALET.redup}`}>
            Bandara APT Pranoto Samarinda — papan nilai acara internal
          </p>
        </div>
      </div>
    </div>
  );
}

function Tab({
  aktif,
  onClick,
  warna,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  warna: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium ${
        aktif ? `${PALET.panelAlt} ${PALET.teks}` : `${PALET.redup} ${PALET.garis}`
      }`}
      style={aktif ? { borderColor: warna } : undefined}
    >
      {children}
    </button>
  );
}

/** Penanda kecil di sudut papan: menyimpan / tersimpan / gagal. */
function PenandaStatus({ status }: { status: Status }) {
  if (!status) return null;

  if (status.keadaan === 'menyimpan') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] ${PALET.redup}`}>
        <Loader2 size={13} className="animate-spin" /> menyimpan…
      </span>
    );
  }

  if (status.keadaan === 'tersimpan') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] ${PALET.emas}`}>
        <Check size={13} /> tersimpan
      </span>
    );
  }

  return (
    <span className={`inline-flex items-start gap-1.5 text-[12px] ${PALET.pink}`}>
      <TriangleAlert size={13} className="mt-0.5 shrink-0" /> {status.pesan}
    </span>
  );
}
