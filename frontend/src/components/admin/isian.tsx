'use client';

/**
 * Isian tambahan untuk formulir panel admin.
 *
 * Kit `components/admin/ui.tsx` menanggung medan-medan lazim lewat `Field`.
 * Berkas ini melengkapinya untuk tiga hal yang tidak dapat dirakit dari `Field`
 * saja: pesan galat per-medan, pemilih kategori, dan medan tautan yang
 * memberi tahu petugas apa yang sedang ia tempel. Gaya visualnya sengaja
 * menyalin kelas `Field` supaya tidak ada medan yang terlihat asing di antara
 * medan lain di modal yang sama.
 */

import React, { useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, FileText, HardDrive, Images, Link as LinkIcon, Pencil } from 'lucide-react';

/* Disalin dari konstanta `base` pada `ui.tsx`. Bila gaya isian kit berubah,
   keduanya harus berubah bersama — itulah harga merakit medan sendiri. */
const KOTAK =
  'w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none focus:border-[var(--adm-accent-line)] focus:ring-2 focus:ring-[var(--adm-accent-ring)] transition-all duration-200';

const KOTAK_BUNGKUS =
  'w-full bg-[var(--adm-inset)] border border-[var(--adm-line)] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 focus-within:border-[var(--adm-accent-line)] focus-within:ring-2 focus-within:ring-[var(--adm-accent-ring)] transition-all duration-200';

const LABEL = 'block text-[11px] font-semibold text-[var(--adm-muted)] uppercase tracking-wider mb-1.5';

function Label({ teks, wajib }: { teks: string; wajib?: boolean }) {
  return (
    <label className={LABEL}>
      {teks} {wajib && <span className="text-[var(--adm-danger)]">*</span>}
    </label>
  );
}

/* ================================================================
   Galat per-medan
   ================================================================ */

/**
 * Pesan galat di bawah sebuah medan.
 *
 * `Field` tidak punya slot galat, dan `adminApi` meratakan objek `errors`
 * Laravel menjadi satu kalimat toast — sehingga tidak ada cara menunjukkan
 * MEDAN MANA yang ditolak kecuali memeriksanya di klien lebih dulu.
 */
export function Galat({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {pesan}
    </p>
  );
}

/* ================================================================
   Pemilih kategori
   ================================================================ */

/**
 * Kategori dipilih, bukan diketik.
 *
 * Sebelumnya kategori adalah isian teks bebas dengan daftar kategori terpakai
 * dicetak sebagai kalimat di bawahnya — untuk dibaca lalu diketik ulang.
 * Halaman publik mengelompokkan dokumen persis dari string itu, jadi satu salah
 * ketik memunculkan dua akordeon terpisah bagi pengunjung.
 *
 * Chip terakhir tetap membuka jalan mengetik kategori baru: daftarnya menyeragamkan
 * ejaan, bukan mengunci kelompok ke tangan pengembang.
 */
export function PilihKategori({
  label = 'Kategori',
  nilai,
  pilihan,
  onChange,
  galat,
  wajib = true,
}: {
  label?: string;
  nilai: string;
  pilihan: string[];
  onChange: (v: string) => void;
  galat?: string;
  wajib?: boolean;
}) {
  const [ketikManual, setKetikManual] = useState(false);

  /* Dokumen warisan v1 bisa berkategori yang tidak ada di daftar mana pun.
     Mode ketik menyala sendiri untuk itu — menyunting judulnya tidak boleh
     diam-diam memindahkan dokumennya ke kategori lain. */
  const takDikenal = !!nilai && !pilihan.includes(nilai);
  const ketik = ketikManual || takDikenal;

  return (
    <div>
      <Label teks={label} wajib={wajib} />

      <div className="flex flex-wrap gap-1.5">
        {pilihan.map((p) => {
          const aktif = !ketik && nilai === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => { setKetikManual(false); onChange(p); }}
              className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer ring-1 ${
                aktif
                  ? 'bg-cyan-500/20 text-[var(--adm-accent)] ring-[var(--adm-accent-line)]'
                  : 'bg-[var(--adm-hover)] text-[var(--adm-body)] ring-transparent hover:text-[var(--adm-accent)]'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => { setKetikManual(true); onChange(''); }}
          className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ring-1 ${
            ketik
              ? 'bg-cyan-500/20 text-[var(--adm-accent)] ring-[var(--adm-accent-line)]'
              : 'bg-[var(--adm-hover)] text-[var(--adm-body)] ring-transparent hover:text-[var(--adm-accent)]'
          }`}
        >
          <Pencil className="w-3 h-3" /> Kategori lain…
        </button>
      </div>

      {ketik && (
        <input
          autoFocus={ketikManual}
          value={nilai}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nama kategori baru"
          className={`${KOTAK} mt-2`}
        />
      )}

      <Galat pesan={galat} />
    </div>
  );
}

/* ================================================================
   Medan tautan
   ================================================================ */

type JenisTautan = { label: string; icon: React.ElementType };

/** Kenali layanan pemilik tautan dari hostnya, untuk ikon dan labelnya. */
function kenali(url: string): JenisTautan {
  let host = '';
  let path = '';

  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return { label: 'Tautan', icon: LinkIcon };
  }

  if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
    return { label: 'Google Drive', icon: HardDrive };
  }
  if (host.includes('instagram.com')) return { label: 'Instagram', icon: Images };
  if (path.endsWith('.pdf')) return { label: 'Berkas PDF', icon: FileText };

  return { label: 'Tautan', icon: LinkIcon };
}

/**
 * Benar bila nilainya URL http(s) yang dapat diurai.
 *
 * Diekspor supaya `periksa()` di halaman-halaman admin memakai ukuran yang
 * persis sama dengan yang ditunjukkan medan ini kepada petugas — dua definisi
 * yang sedikit berbeda berarti pesan galat yang saling bertentangan.
 */
export function tautanSah(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return !!new URL(url).hostname;
  } catch {
    return false;
  }
}

/**
 * Medan tautan dokumen.
 *
 * Dokumen PPID tinggal di Google Drive dan maklumat serta-merta di Instagram,
 * jadi yang disimpan memang alamatnya. Yang dulu tidak ada adalah umpan balik:
 * petugas menempel URL ke kotak polos dan baru tahu keliru setelah Simpan
 * ditolak backend. Kini jenis tautannya dikenali, kesalahan bentuknya terbaca
 * sebelum disimpan, dan tautannya dapat diuji buka langsung dari form.
 */
export function IsianTautan({
  label,
  nilai,
  onChange,
  wajib,
  placeholder,
  galat,
  hint,
}: {
  label: string;
  nilai: string;
  onChange: (v: string) => void;
  wajib?: boolean;
  placeholder?: string;
  galat?: string;
  hint?: string;
}) {
  const isi = (nilai ?? '').trim();
  const sah = useMemo(() => tautanSah(isi), [isi]);
  const jenis = useMemo(() => kenali(isi), [isi]);
  const Ikon = jenis.icon;

  const host = useMemo(() => {
    if (!sah) return '';
    try {
      return new URL(isi).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [isi, sah]);

  return (
    <div>
      <Label teks={label} wajib={wajib} />

      <div className={KOTAK_BUNGKUS}>
        <Ikon className={`w-4 h-4 flex-shrink-0 ${sah ? 'text-[var(--adm-accent)]' : 'text-[var(--adm-dim)]'}`} />

        <input
          value={nilai ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-[12.5px] text-[var(--adm-fg)] placeholder:text-[var(--adm-dim)] focus:outline-none"
        />

        {sah ? (
          <a
            href={isi}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--adm-accent)] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Uji buka
          </a>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--adm-dim)]">
            <ExternalLink className="w-3.5 h-3.5" /> Uji buka
          </span>
        )}
      </div>

      {isi && sah && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--adm-muted)]">
          <span className="font-semibold text-[var(--adm-accent)]">{jenis.label}</span>
          <span className="text-[var(--adm-dim)]">·</span>
          {host}
        </p>
      )}

      {isi && !sah && !galat && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Tautan harus diawali http:// atau https://
        </p>
      )}

      {!isi && hint && <p className="mt-1.5 text-[11px] text-[var(--adm-dim)]">{hint}</p>}

      <Galat pesan={galat} />
    </div>
  );
}
