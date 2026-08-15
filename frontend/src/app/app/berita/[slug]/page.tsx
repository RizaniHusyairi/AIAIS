'use client';

import SafeHtml from '@/components/SafeHtml';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { NewsItem } from '@/types';
import { StatusBar, listContainer, listItem } from '@/components/pwa/ui';
import {
  ChevronLeft, Share2, Plane, Calendar, Clock, Eye, User, Check, Link2, MessageCircle, ArrowRight,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Berita: '#2563eb',
  Pengumuman: '#ea580c',
  Event: '#7c3aed',
};

const REACTIONS = [
  { key: 'helpful', emoji: '👍', label: 'Membantu', active: 'bg-blue-600 border-blue-600' },
  { key: 'informative', emoji: '💡', label: 'Informatif', active: 'bg-amber-500 border-amber-500' },
  { key: 'appreciate', emoji: '❤️', label: 'Apresiasi', active: 'bg-rose-500 border-rose-500' },
  { key: 'important', emoji: '🚀', label: 'Penting', active: 'bg-emerald-600 border-emerald-600' },
] as const;

export default function BeritaDetailScreen() {
  const params = useParams();
  const slug = String(params?.slug ?? '');

  const [article, setArticle] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState({ helpful: 142, informative: 98, appreciate: 76, important: 54 });
  const [reacted, setReacted] = useState<string | null>(null);

  /* --- reading progress bound to the PWA scroll container --- */
  const rootRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const planeLeft = useTransform(progress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // The app shell scrolls in a div, not the window — find that ancestor.
    let node: HTMLElement | null = el.parentElement;
    while (node) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === 'auto' || oy === 'scroll') break;
      node = node.parentElement;
    }

    const onScroll = () => {
      if (node) {
        const max = node.scrollHeight - node.clientHeight;
        progress.set(max > 0 ? node.scrollTop / max : 0);
      } else {
        const max = document.body.scrollHeight - window.innerHeight;
        progress.set(max > 0 ? window.scrollY / max : 0);
      }
    };

    const target: HTMLElement | Window = node ?? window;
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [progress, article]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [detail, list] = await Promise.all([
        fetchApi<NewsItem>(`/news/${slug}`),
        fetchApi<NewsItem[]>('/news'),
      ]);
      if (detail.success && detail.data) setArticle(detail.data);
      if (list.success && Array.isArray(list.data)) {
        setRelated(list.data.filter((n) => n.slug !== slug).slice(0, 4));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const react = (key: string) => {
    if (reacted === key) return;
    setCounts((p) => ({ ...p, [key]: (p as any)[key] + 1 }));
    setReacted(key);
  };

  if (loading || !article) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center gap-4 py-32">
        <motion.div
          animate={{ x: [-14, 14, -14], y: [3, -3, 3] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30"
        >
          <Plane className="w-7 h-7 text-white rotate-45" />
        </motion.div>
        <p className="text-slate-500 text-[13px] font-medium">Memuat artikel...</p>
      </div>
    );
  }

  const dateStr = new Date(article.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const words = article.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  const readMin = Math.max(1, Math.round(words / 200));
  const catColor = CATEGORY_COLORS[article.category] || '#2563eb';

  return (
    <div ref={rootRef} className="min-h-full bg-slate-50 pb-8">
      {/* Reading progress — flight path */}
      <div className="sticky top-0 z-40 h-1 bg-slate-200/70">
        <motion.div style={{ scaleX: progress }} className="h-full origin-left bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-400" />
        <motion.div style={{ left: planeLeft }} className="absolute -top-[6px] -ml-2">
          <Plane className="w-3.5 h-3.5 text-blue-600 fill-blue-600 rotate-45" />
        </motion.div>
      </div>

      {/* ===== HERO ===== */}
      <div className="relative h-[300px] overflow-hidden -mt-1">
        <motion.img
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          src={article.thumbnail}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091124] via-[#091124]/70 to-[#091124]/25" />

        {/* drifting cloud */}
        <div className="absolute top-14 left-[10%] w-32 h-12 bg-white/10 blur-2xl rounded-full" style={{ animation: 'cloudDrift 10s ease-in-out infinite alternate' }} />

        {/* flight arc */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
          <motion.path
            d="M-10 200 Q 160 110 410 175"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            strokeDasharray="5 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </svg>
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-8 top-[38%]"
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}>
            <Plane className="w-7 h-7 text-cyan-300 rotate-[18deg] drop-shadow" />
          </motion.div>
        </motion.div>

        {/* top bar */}
        <div className="relative z-10">
          <StatusBar />
          <div className="flex items-center justify-between px-4 pt-1">
            <Link href="/app/berita">
              <motion.span
                whileTap={{ scale: 0.88 }}
                className="w-10 h-10 rounded-full bg-black/35 backdrop-blur border border-white/20 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.span>
            </Link>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={copyLink}
              className="w-10 h-10 rounded-full bg-black/35 backdrop-blur border border-white/20 flex items-center justify-center text-white"
              aria-label="Bagikan"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Share2 className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow"
            style={{ backgroundColor: catColor }}
          >
            <Plane className="w-3 h-3" /> {article.category}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
            className="mt-2 text-[21px] font-black text-white leading-snug"
          >
            {article.title}
          </motion.h1>
        </div>
      </div>

      {/* ===== META STRIP (boarding-pass style) ===== */}
      <div className="px-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 280, damping: 24 }}
          className="-mt-5 bg-white rounded-2xl shadow-lg shadow-slate-300/30 border border-slate-100 grid grid-cols-3 divide-x divide-dashed divide-slate-200"
        >
          <MetaCell icon={Calendar} label="Terbit" value={dateStr.replace(/ \d{4}$/, '')} />
          <MetaCell icon={Clock} label="Baca" value={`${readMin} menit`} />
          <MetaCell icon={Eye} label="Pembaca" value={article.views_count.toLocaleString('id-ID')} />
        </motion.div>
      </div>

      {/* ===== BODY ===== */}
      <motion.div variants={listContainer} initial="hidden" animate="show" className="px-4 pt-5 space-y-5">
        {/* author */}
        <motion.div variants={listItem} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400">Dipublikasikan oleh</p>
            <p className="text-[13px] font-bold text-slate-900 truncate">{article.author}</p>
          </div>
        </motion.div>

        {/* excerpt */}
        <motion.div variants={listItem} className="bg-blue-50/70 border-l-4 border-blue-600 rounded-r-2xl p-4">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Ringkasan</p>
          <p className="text-slate-700 text-[13px] leading-relaxed font-medium">{article.excerpt}</p>
        </motion.div>

        {/* content */}
        {/* Isi artikel disaring lebih dulu — lihat components/SafeHtml.tsx. */}
        <motion.div variants={listItem}>
          <SafeHtml
            className="article-content text-[14px] bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 border border-slate-100"
            html={article.content}
          />
        </motion.div>

        {/* reactions */}
        <motion.div variants={listItem} className="bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60 border border-slate-100 space-y-3">
          <p className="text-[12px] font-bold text-slate-900">Bagaimana menurut Anda?</p>
          <div className="grid grid-cols-2 gap-2">
            {REACTIONS.map((r) => {
              const on = reacted === r.key;
              return (
                <motion.button
                  key={r.key}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => react(r.key)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-[12px] font-bold transition-colors ${
                    on ? `${r.active} text-white` : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{r.emoji} {r.label}</span>
                  <span className={`text-[11px] ${on ? 'text-white/80' : 'text-slate-400'}`}>{(counts as any)[r.key]}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* share */}
        <motion.div variants={listItem} className="flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(article.title)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white text-[13px] font-semibold py-3 rounded-2xl active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <button
            onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-2 text-[13px] font-semibold py-3 rounded-2xl border transition-colors active:scale-95 ${
              copied ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {copied ? 'Tersalin' : 'Salin Link'}
          </button>
        </motion.div>
      </motion.div>

      {/* ===== RELATED (horizontal cards) ===== */}
      {related.length > 0 && (
        <div className="pt-7">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-[15px] font-bold text-slate-900">Berita Lainnya</h2>
            <Link href="/app/berita" className="text-[12px] font-semibold text-blue-600 flex items-center gap-0.5">
              Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
            {related.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
                className="flex-shrink-0 w-[210px]"
              >
                <Link href={`/app/berita/${r.slug}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-200/60 border border-slate-100 active:scale-[0.97] transition-transform">
                  <div className="relative h-24">
                    <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span
                      className="absolute top-2 left-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: CATEGORY_COLORS[r.category] || '#2563eb' }}
                    >
                      {r.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-slate-400 mb-0.5">
                      {new Date(r.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <h3 className="font-bold text-slate-900 text-[12.5px] leading-snug line-clamp-2">{r.title}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="px-2 py-3 flex flex-col items-center gap-1 text-center">
      <Icon className="w-4 h-4 text-blue-600" />
      <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[11.5px] font-bold text-slate-900 leading-tight">{value}</p>
    </div>
  );
}
