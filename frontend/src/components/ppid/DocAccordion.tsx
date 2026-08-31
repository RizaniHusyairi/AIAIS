'use client';

/**
 * Akordeon kelompok dokumen, dipakai bersama oleh Informasi Berkala dan
 * Informasi Setiap Saat — keduanya berbentuk sama di v1 (kategori berisi
 * daftar dokumen), jadi tampilannya pun satu.
 *
 * Aksesibilitas: tombol `aria-expanded` + `aria-controls`, panel
 * `role="region"` yang dilabeli judul kelompoknya.
 *
 * Nuansa penerbangan: nomor kelompok memakai bilah bergaris tengah seperti
 * bilah papan jadwal, dan tiap baris dokumen punya takik perforasi tiket.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FileText, ExternalLink, CalendarDays, UserRound } from 'lucide-react';
import { useBahasa } from '@/lib/bahasa';
import { formatTanggal } from '@/lib/kamus';
import type { InfoDoc, InfoGroup } from '@/lib/publicInfoData';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

function DocRow({ doc }: { doc: InfoDoc }) {
  const bahasa = useBahasa();

  return (
    <motion.li
      variants={rise}
      className="relative bg-white rounded-2xl ring-1 ring-slate-200/70 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-blue-900/5"
    >
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-5 pr-4 py-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-[13.5px] font-black text-slate-900 leading-snug">{doc.title}</h4>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
            {doc.published && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                {formatTanggal(doc.published, bahasa)}
              </span>
            )}
            {doc.pejabat && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="w-3 h-3 flex-shrink-0" />
                {doc.pejabat}
              </span>
            )}
          </div>
        </div>

        {/* takik perforasi bergaya tiket */}
        <span className="hidden sm:block self-stretch border-l-2 border-dashed border-slate-200 relative">
          <span className="absolute -top-[18px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
          <span className="absolute -bottom-[18px] -left-[7px] w-3 h-3 rounded-full bg-slate-50" />
        </span>

        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12.5px] px-4 py-2.5 rounded-full shadow-lg shadow-blue-600/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Lihat Dokumen
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.li>
  );
}

function GroupPanel({
  group, index, open, onToggle,
}: {
  group: InfoGroup; index: number; open: boolean; onToggle: () => void;
}) {
  const headingId = `grup-${group.slug}`;
  const panelId = `panel-${group.slug}`;

  return (
    <motion.div
      variants={rise}
      className={`bg-white rounded-3xl ring-1 transition-shadow ${
        open ? 'ring-blue-300 shadow-lg shadow-blue-900/5' : 'ring-slate-200/70'
      }`}
    >
      <h3 id={headingId}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center gap-4 text-left px-5 sm:px-6 py-5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-3xl"
        >
          <span className="w-11 h-11 rounded-xl bg-[#0b1e5b] text-white font-black text-[15px] flex items-center justify-center flex-shrink-0 relative overflow-hidden tabular-nums">
            <span className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
            {String(index + 1).padStart(2, '0')}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-black text-slate-900 leading-snug">
              {group.title}
            </span>
          </span>

          <span className="hidden sm:inline-flex flex-shrink-0 items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 tabular-nums">
            {group.docs.length} dokumen
          </span>

          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            key="isi"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30, opacity: { duration: 0.18 } }}
            className="overflow-hidden"
          >
            <motion.ul
              variants={container}
              initial="hidden"
              animate="show"
              className="px-5 sm:px-6 pb-6 pt-1 space-y-3 border-t border-dashed border-slate-200 mt-1"
            >
              {group.docs.map((d) => <DocRow key={d.slug} doc={d} />)}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DocAccordion({ groups }: { groups: InfoGroup[] }) {
  // Kelompok pertama terbuka sejak awal supaya halaman tidak tampak kosong.
  const [terbuka, setTerbuka] = useState<string[]>(
    groups[0] ? [groups[0].slug] : [],
  );

  const toggle = (slug: string) =>
    setTerbuka((now) => (now.includes(slug) ? now.filter((s) => s !== slug) : [...now, slug]));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="space-y-4"
    >
      {groups.map((g, i) => (
        <GroupPanel
          key={g.slug}
          group={g}
          index={i}
          open={terbuka.includes(g.slug)}
          onToggle={() => toggle(g.slug)}
        />
      ))}
    </motion.div>
  );
}
