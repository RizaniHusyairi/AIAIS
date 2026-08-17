'use client';

/** Tautan Terkait — portal resmi pemerintah di luar aptpairport.id. */

import React from 'react';
import { motion } from 'framer-motion';
import { RELATED_LINK_GROUPS, TAUTAN_PENGANTAR } from '@/lib/relatedLinks';
import { hostOf } from '@/lib/url';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import { Globe, ExternalLink } from 'lucide-react';

export default function TautanScreen() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Tautan Terkait" />
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl p-4 space-y-5"
      >
        <motion.p variants={listItem} className="text-[12.5px] text-slate-600 leading-relaxed">
          {TAUTAN_PENGANTAR}
        </motion.p>

        {RELATED_LINK_GROUPS.map((g) => (
          <div key={g.slug} className="space-y-2.5">
            <div className="px-1">
              <h2 className="text-[13px] font-black text-slate-900">{g.title}</h2>
              <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{g.lead}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {g.links.map((l) => (
                <motion.a
                  key={l.slug}
                  variants={listItem}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                >
                  <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-blue-600" strokeWidth={2.1} />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-bold text-slate-900 leading-snug">
                      {l.name}
                    </span>
                    <span className="block text-[11.5px] text-slate-500 leading-relaxed mt-0.5">
                      {l.description}
                    </span>
                    {/* Tujuan tautan sebaiknya terbaca sebelum diklik —
                        keempatnya melempar pengunjung keluar portal. */}
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                      {hostOf(l.url)} <ExternalLink className="w-3 h-3" />
                    </span>
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
