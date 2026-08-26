'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Eraser, Code2, Undo2, Redo2,
} from 'lucide-react';
import { bersihkanHtml } from '@/lib/htmlAman';

/**
 * Editor teks kaya untuk isi berita.
 *
 * KENAPA BUATAN SENDIRI. Petugas humas menulis berita, bukan HTML — tetapi
 * satu-satunya format yang boleh tersimpan adalah daftar putih di
 * `lib/htmlAman.ts`. Pustaka editor umum menghasilkan jauh lebih banyak tag
 * daripada itu dan tetap harus disaring ulang, jadi lebih jujur menyediakan
 * tepat tombol-tombol yang formatnya memang akan tampil di halaman publik.
 *
 * KENAPA `document.execCommand`. API-nya memang sudah ditandai usang, namun
 * belum ada penggantinya yang tersedia luas dan seluruh peramban sasaran masih
 * mendukungnya. Menulis mesin penyuntingan seleksi sendiri jauh lebih berisiko
 * daripada memakainya.
 *
 * KENAPA TIDAK TERKENDALI (uncontrolled). `innerHTML` hanya ditulis ulang saat
 * dokumen yang disunting berganti — bukan pada tiap ketikan. Menyetel ulang
 * `innerHTML` setiap render akan membuang posisi kursor ke awal tulisan.
 */

/**
 * Satu tombol toolbar sebagai DATA, bukan penutup (closure).
 *
 * Daftarnya berada di luar komponen supaya tidak ada fungsi yang dibangun
 * ulang tiap render — perintahnya dijalankan lewat satu penyalur di dalam
 * komponen, yang memang boleh menyentuh `ref`.
 */
type Perintah = {
  ikon: React.ElementType;
  judul: string;
  /** Perintah `execCommand` yang dijalankan. */
  cmd: string;
  /** Argumen tetap perintahnya, mis. nama blok untuk `formatBlock`. */
  arg?: string;
  /** Nama status `queryCommandState` untuk menyalakan tombol saat aktif. */
  status?: string;
  /** Nama blok (`h2`, `blockquote`, ...) untuk menyalakan tombol saat aktif. */
  blok?: string;
};

const ALAT_UTAMA: Perintah[] = [
  { ikon: Bold, judul: 'Tebal (Ctrl+B)', cmd: 'bold', status: 'bold' },
  { ikon: Italic, judul: 'Miring (Ctrl+I)', cmd: 'italic', status: 'italic' },
  { ikon: Underline, judul: 'Garis bawah (Ctrl+U)', cmd: 'underline', status: 'underline' },
];

const ALAT_BLOK: Perintah[] = [
  { ikon: Heading2, judul: 'Judul Bagian', cmd: 'formatBlock', arg: 'h2', blok: 'h2' },
  { ikon: Heading3, judul: 'Sub Judul', cmd: 'formatBlock', arg: 'h3', blok: 'h3' },
  { ikon: List, judul: 'Daftar Berpoin', cmd: 'insertUnorderedList', status: 'insertUnorderedList' },
  { ikon: ListOrdered, judul: 'Daftar Bernomor', cmd: 'insertOrderedList', status: 'insertOrderedList' },
  { ikon: Quote, judul: 'Kutipan', cmd: 'formatBlock', arg: 'blockquote', blok: 'blockquote' },
];

const ALAT_AKHIR: Perintah[] = [
  { ikon: Link2, judul: 'Sisipkan tautan', cmd: 'createLink' },
  { ikon: Eraser, judul: 'Hapus format', cmd: 'removeFormat' },
  { ikon: Undo2, judul: 'Batalkan (Ctrl+Z)', cmd: 'undo' },
  { ikon: Redo2, judul: 'Ulangi (Ctrl+Y)', cmd: 'redo' },
];

function Tombol({ p, aktif, onJalan }: { p: Perintah; aktif: boolean; onJalan: (p: Perintah) => void }) {
  return (
    <button
      type="button"
      title={p.judul}
      aria-label={p.judul}
      aria-pressed={aktif}
      // `onMouseDown` dicegah supaya seleksi teks di dalam editor tidak hilang
      // begitu tombol ditekan — tanpa ini perintahnya tidak mengenai apa pun.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onJalan(p)}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        aktif
          ? 'bg-[var(--adm-accent-ring)] text-[var(--adm-accent)]'
          : 'text-[var(--adm-body)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-fg)]'
      }`}
    >
      <p.ikon className="w-4 h-4" />
    </button>
  );
}

function Pemisah() {
  return <span className="w-px h-5 bg-[var(--adm-line)] mx-0.5" />;
}

/** Gaya isi editor dibuat menyerupai halaman berita publik, supaya apa yang
 *  dilihat petugas sedekat mungkin dengan hasil terbitnya. */
const GAYA_ISI = [
  '[&>*+*]:mt-3',
  '[&_h2]:text-[1.2rem] [&_h2]:font-extrabold [&_h2]:leading-snug',
  '[&_h3]:text-[1.05rem] [&_h3]:font-bold [&_h3]:leading-snug',
  '[&_h4]:text-[0.98rem] [&_h4]:font-bold',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1',
  '[&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--adm-accent-line)] [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-[var(--adm-body)]',
  '[&_a]:text-[var(--adm-accent)] [&_a]:underline',
  '[&_u]:underline [&_strong]:font-bold [&_b]:font-bold [&_em]:italic',
].join(' ');

export default function EditorTeks({
  value,
  onChange,
  docId,
  placeholder = 'Mulai menulis beritanya di sini...',
}: {
  value: string;
  onChange: (html: string) => void;
  /**
   * Penanda dokumen yang sedang disunting. Berubah hanya ketika berita lain
   * dimuat ke editor — itulah satu-satunya saat isi editor boleh ditimpa.
   */
  docId?: string | number;
  placeholder?: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [modeSumber, setModeSumber] = useState(false);
  const [blokAktif, setBlokAktif] = useState('');
  const [gaya, setGaya] = useState<Record<string, boolean>>({});
  const [kosong, setKosong] = useState(true);

  // Isi editor ditimpa hanya saat dokumennya berganti atau saat kembali dari
  // mode HTML — lihat catatan "tidak terkendali" di atas.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || modeSumber) return;
    el.innerHTML = bersihkanHtml(value || '');
    setKosong(!el.textContent?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, modeSumber]);

  const lapor = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    setKosong(!el.textContent?.trim());
    onChange(el.innerHTML);
  }, [onChange]);

  /** Perbarui kilau tombol sesuai posisi kursor. */
  const segarkanStatus = useCallback(() => {
    try {
      setGaya({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
      setBlokAktif(String(document.queryCommandValue('formatBlock') || '').toLowerCase());
    } catch {
      /* peramban boleh menolak; tombol sekadar tidak menyala */
    }
  }, []);

  /** Penyalur satu-satunya untuk seluruh tombol toolbar. */
  const jalankan = useCallback(
    (p: Perintah) => {
      areaRef.current?.focus();

      let arg = p.arg;

      if (p.cmd === 'createLink') {
        const alamat = window.prompt('Alamat tautan (contoh: https://aptpranoto.id)');
        if (!alamat) return;

        // Skema di luar daftar ini akan dibuang penyaring saat berita dirender,
        // jadi lebih baik petugas tahu sekarang daripada tautannya diam-diam hilang.
        if (!/^(https?:|mailto:|tel:|\/|#)/i.test(alamat)) {
          window.alert('Tautan harus diawali https://, mailto:, tel:, atau /');
          return;
        }
        arg = alamat;
      }

      // Menekan tombol blok yang sedang aktif mengembalikannya ke paragraf —
      // tanpa ini petugas tidak punya cara membatalkan judul yang terlanjur dibuat.
      if (p.cmd === 'formatBlock' && p.blok && blokAktif === p.blok) arg = 'p';

      document.execCommand(p.cmd, false, arg);
      segarkanStatus();
      lapor();
    },
    [blokAktif, lapor, segarkanStatus],
  );

  /** Tombol menyala saat format di posisi kursor memang sedang berlaku. */
  const menyala = (p: Perintah) => !!((p.status && gaya[p.status]) || (p.blok && blokAktif === p.blok));

  /**
   * Tempelan dari Word atau halaman web membawa markah yang tidak pernah
   * dipakai portal ini. Disaring lebih dulu supaya yang masuk hanya format
   * yang memang akan tampil di halaman publik.
   */
  const tempel = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const teks = e.clipboardData.getData('text/plain');

    if (html) {
      document.execCommand('insertHTML', false, bersihkanHtml(html));
    } else {
      document.execCommand('insertText', false, teks);
    }
    lapor();
  };

  const jumlahKata = useMemo(() => {
    if (typeof document === 'undefined') return 0;
    const kotak = document.createElement('div');
    kotak.innerHTML = bersihkanHtml(value || '');
    const teks = (kotak.textContent || '').trim();
    return teks ? teks.split(/\s+/).length : 0;
  }, [value]);

  const menitBaca = Math.max(1, Math.round(jumlahKata / 200));

  return (
    <div className="rounded-xl border border-[var(--adm-line)] bg-[var(--adm-inset)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--adm-line)]">
        {!modeSumber && (
          <>
            {ALAT_UTAMA.map((p) => <Tombol key={p.judul} p={p} aktif={menyala(p)} onJalan={jalankan} />)}
            <Pemisah />
            {ALAT_BLOK.map((p) => <Tombol key={p.judul} p={p} aktif={menyala(p)} onJalan={jalankan} />)}
            <Pemisah />
            {ALAT_AKHIR.map((p) => <Tombol key={p.judul} p={p} aktif={menyala(p)} onJalan={jalankan} />)}
          </>
        )}

        <button
          type="button"
          title={modeSumber ? 'Kembali ke penyuntingan biasa' : 'Sunting kode HTML'}
          onClick={() => setModeSumber((v) => !v)}
          className={`ml-auto h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
            modeSumber
              ? 'bg-[var(--adm-accent-ring)] text-[var(--adm-accent)]'
              : 'text-[var(--adm-muted)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-fg)]'
          }`}
        >
          <Code2 className="w-4 h-4" /> HTML
        </button>
      </div>

      {modeSumber ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full bg-transparent px-4 py-3.5 text-[12px] font-mono leading-relaxed text-[var(--adm-fg)] focus:outline-none resize-y"
        />
      ) : (
        <div className="relative">
          {kosong && (
            <span className="absolute left-4 top-3.5 text-[13px] text-[var(--adm-dim)] pointer-events-none select-none">
              {placeholder}
            </span>
          )}
          <div
            ref={areaRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Isi berita"
            onInput={lapor}
            onBlur={lapor}
            onPaste={tempel}
            onKeyUp={segarkanStatus}
            onMouseUp={segarkanStatus}
            className={`min-h-[340px] max-h-[70vh] overflow-y-auto px-4 py-3.5 text-[13px] leading-[1.75] text-[var(--adm-fg)] focus:outline-none ${GAYA_ISI}`}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[var(--adm-line)] text-[10.5px] text-[var(--adm-muted)]">
        <span>{jumlahKata.toLocaleString('id-ID')} kata</span>
        <span>± {menitBaca} menit baca</span>
      </div>
    </div>
  );
}
