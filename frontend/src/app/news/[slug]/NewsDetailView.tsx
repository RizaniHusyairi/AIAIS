'use client';

import SafeHtml from '@/components/SafeHtml';
import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { NewsItem } from '@/types';
import {
  Calendar, Eye, User, ArrowLeft, ArrowRight, Plane, Clock, Share2, Link2, Check, MessageCircle,
  ThumbsUp, Send, Download, CloudSun, ChevronRight, FileText, Bookmark, Sparkles
} from 'lucide-react';

/* Rich fallback so the page always looks complete, even without a backend */
function fallbackArticle(slug: string): NewsItem {
  return {
    id: 1,
    title: 'APT Pranoto Tingkatkan Fasilitas Terminal untuk Kenyamanan Penumpang',
    slug,
    category: 'Berita',
    excerpt:
      'Bandar Udara APT Pranoto Samarinda melakukan sejumlah peningkatan fasilitas terminal guna memberikan pengalaman perjalanan udara yang lebih nyaman, aman, dan modern bagi seluruh pengguna jasa.',
    content: `
      <p>Bandar Udara Aji Pangeran Tumenggung (APT) Pranoto Samarinda terus berkomitmen menghadirkan pelayanan berstandar internasional. Sebagai gerbang udara utama Kalimantan Timur sekaligus penyangga Ibu Kota Nusantara (IKN), bandara ini melakukan revitalisasi fasilitas terminal secara menyeluruh.</p>
      
      <h2>Ruang Tunggu yang Lebih Luas dan Nyaman</h2>
      <p>Peningkatan mencakup perluasan area ruang tunggu keberangkatan, penambahan kursi ergonomis, serta penyediaan area <strong>charging station</strong> di setiap sudut terminal. Penumpang kini dapat menunggu penerbangan dengan lebih rileks dan produktif.</p>

      <blockquote>"Kami ingin setiap penumpang merasakan kenyamanan sejak melangkah masuk terminal hingga menaiki pesawat. Keamanan, keselamatan, dan pelayanan adalah prioritas utama kami," ujar Kepala Kantor UPBU Kelas I APT Pranoto Samarinda.</blockquote>

      <h2>Fasilitas Baru untuk Semua Kalangan</h2>
      <p>Beberapa fasilitas unggulan yang ditingkatkan antara lain:</p>
      <ul>
        <li>Musholla Utama yang lebih luas, harum, dan dilengkapi sarana wudhu yang bersih</li>
        <li>Area bermain anak (Kids Play Area) yang aman dan edukatif</li>
        <li>Layanan kursi roda gratis dan jalur pemandu khusus disabilitas (guiding block)</li>
        <li>Koneksi Wi-Fi gratis berkecepatan tinggi di seluruh area sirkulasi terminal</li>
        <li>Ruang Laktasi / Nursery Room ber-AC dengan fasilitas higienis lengkap</li>
      </ul>

      <h2>Digitalisasi Informasi & Layanan Mandiri</h2>
      <p>Selain perbaikan fisik terminal, sistem Flight Information Display System (FIDS) juga diperbarui dengan layar digital resolusi tinggi di berbagai titik strategis. Hal ini mempermudah penumpang memantau status penerbangan real-time, gate keberangkatan, serta informasi pengoperasian bagasi.</p>

      <p>Dengan berbagai pembaruan ini, Kantor UPBU Kelas I APT Pranoto menargetkan peningkatan signifikan pada indeks kepuasan pengguna jasa (Passenger Satisfaction Score) serta memperkuat perannya sebagai penghubung konektivitas udara di Kalimantan Timur.</p>
    `,
    thumbnail:
      'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1400&q=80',
    author: 'Humas UPBU APT Pranoto',
    views_count: 1482,
    is_featured: true,
    published_at: '2024-05-20',
  };
}

const RELATED = [
  { slug: 'penyesuaian-jadwal-juni-2024', tag: 'Pengumuman', color: '#ea580c', date: '18 Mei 2024', title: 'Penyesuaian Jadwal Penerbangan Periode Juni 2024', img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80' },
  { slug: 'pertunjukan-budaya-kalimantan', tag: 'Event', color: '#7c3aed', date: '15 Mei 2024', title: 'Saksikan Pertunjukan Budaya Kalimantan di Terminal Bandara', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80' },
  { slug: 'rute-baru-samarinda-denpasar', tag: 'Berita', color: '#2563eb', date: '12 Mei 2024', title: 'Rute Baru Samarinda–Denpasar Resmi Dibuka Batik Air', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80' },
];

const REACTIONS = [
  { key: 'helpful', emoji: '👍', label: 'Membantu', color: '#2563eb', soft: '#eff6ff' },
  { key: 'informative', emoji: '💡', label: 'Informatif', color: '#d97706', soft: '#fffbeb' },
  { key: 'appreciate', emoji: '❤️', label: 'Apresiasi', color: '#e11d48', soft: '#fff1f2' },
  { key: 'important', emoji: '🚀', label: 'Penting', color: '#059669', soft: '#ecfdf5' },
] as const;

const POPULAR_NEWS = [
  { title: 'Pengoperasian Shuttle Bus DAMRI Rute Bandara APT Pranoto ke IKN', date: '10 Mei 2024', views: '2.4K' },
  { title: 'Prosedur Keamanan Penerbangan & Aturan Bagasi Kabin Terbaru', date: '05 Mei 2024', views: '1.9K' },
  { title: 'Alur Pelayanan Pas Bandara Online Resmi Diluncurkan', date: '01 Mei 2024', views: '1.5K' },
];

export default function NewsDetailView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reaction counters state
  const [reactions, setReactions] = useState({ helpful: 142, informative: 98, appreciate: 76, important: 54 });
  const [reacted, setReacted] = useState<string | null>(null);

  // Public Feedback Form State
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRole, setCommentRole] = useState('Penumpang');
  const [commentsList, setCommentsList] = useState([
    { id: 1, name: 'Rendra Pratama', role: 'Penumpang', time: '20 Mei 2024', text: 'Perubahan ruang tunggu dan WiFi gratisnya terasa sekali saat kemarin terbang ke Jakarta. Mantap APT Pranoto!' },
    { id: 2, name: 'Siti Aminah', role: 'Masyarakat Samarinda', time: '21 Mei 2024', text: 'Fasilitas musholla dan area anak sangat bersih dan nyaman. Semoga terus dipertahankan kinerjanya.' },
  ]);
  const [commentSubmitted, setCommentSubmitted] = useState(false);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  const { scrollYProgress } = useScroll();
  const planeLeft = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchApi<NewsItem>(`/news/${slug}`);
      setNews(res.success && res.data && (res.data as any).title ? res.data : fallbackArticle(slug));
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

  const handleReaction = (type: 'helpful' | 'informative' | 'appreciate' | 'important') => {
    if (reacted === type) return;
    setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }));
    setReacted(type);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      name: commentName.trim(),
      role: commentRole,
      time: 'Baru saja',
      text: commentText.trim(),
    };

    setCommentsList([newComment, ...commentsList]);
    setCommentName('');
    setCommentText('');
    setCommentSubmitted(true);
    setTimeout(() => setCommentSubmitted(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-50">
        <motion.div
          animate={{ x: [-16, 16, -16], y: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-[#2563eb] flex items-center justify-center shadow-lg shadow-blue-600/30"
        >
          <Plane className="w-7 h-7 text-white rotate-45" />
        </motion.div>
        <p className="text-slate-500 text-sm font-medium">Memuat artikel berita...</p>
      </div>
    );
  }

  const article = news!;
  const dateStr = new Date(article.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const words = article.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  const readMin = Math.max(1, Math.round(words / 200));

  return (
    <div className="relative bg-slate-50 overflow-hidden min-h-screen pb-20">
      {/* Flight Progress Bar Top */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200/80 z-[60]">
        <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-gradient-to-r from-[#2563eb] via-cyan-400 to-teal-400" />
        <motion.div style={{ left: planeLeft }} className="absolute -top-[6px] -ml-2">
          <Plane className="w-4 h-4 text-blue-600 fill-blue-600 rotate-45" />
        </motion.div>
      </div>

      {/* ===== HERO BANNER ===== */}
      <div className="relative h-[440px] md:h-[520px] w-full overflow-hidden bg-[#091124]">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          src={article.thumbnail}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091124] via-[#091124]/75 to-[#091124]/30" />

        {/* Floating Clouds Animation */}
        <div className="absolute top-16 left-[8%] w-48 h-16 bg-white/10 blur-2xl rounded-full pointer-events-none" style={{ animation: 'cloudDrift 9s ease-in-out infinite alternate' }} />
        <div className="absolute top-28 right-[12%] w-60 h-20 bg-white/10 blur-2xl rounded-full pointer-events-none" style={{ animation: 'cloudDrift 12s ease-in-out infinite alternate-reverse' }} />

        {/* Flight Arc & Flying Plane */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <motion.path
            d="M-20 340 Q 400 180 1020 300"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
            strokeDasharray="6 8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </svg>

        <motion.div
          initial={{ x: -80, y: 40, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-[12%] top-[30%] hidden md:block"
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}>
            <Plane className="w-10 h-10 text-cyan-300 rotate-[18deg] drop-shadow-lg" />
          </motion.div>
        </motion.div>

        {/* Top Header Breadcrumb & Back Link */}
        <div className="absolute top-6 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white text-xs font-bold px-4 py-2 rounded-xl backdrop-blur border border-white/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" /> Kembali ke Media Center
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link href="/news" className="hover:text-white transition-colors">Media Center</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-cyan-300 font-bold truncate max-w-[180px]">{article.category}</span>
            </div>
          </div>
        </div>

        {/* Hero Title & Category Tag */}
        <div className="absolute bottom-0 left-0 right-0 pb-20 md:pb-24 z-10">
          <div className="max-w-4xl mx-auto px-4 space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 bg-[#2563eb] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-md">
                <Plane className="w-3.5 h-3.5" /> {article.category}
              </span>
              <span className="text-xs text-cyan-300 font-mono flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-md backdrop-blur">
                <Bookmark className="w-3 h-3" /> Dipublikasikan Resmi
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight max-w-3xl"
            >
              {article.title}
            </motion.h1>
          </div>
        </div>
      </div>

      {/* ===== BOARDING PASS METADATA CARD ===== */}
      <div className="max-w-4xl mx-auto px-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
          className="-mt-14 bg-white rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
            <MetaCell icon={Calendar} label="Tanggal Terbit" value={dateStr} />
            <MetaCell icon={User} label="Penulis / Rilis" value={article.author} />
            <MetaCell icon={Clock} label="Waktu Baca" value={`${readMin} Menit`} />
            <MetaCell icon={Eye} label="Total Pembaca" value={`${article.views_count.toLocaleString('id-ID')} Pembaca`} />
          </div>
        </motion.div>
      </div>

      {/* ===== MAIN CONTENT & SIDEBAR ===== */}
      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Article Body */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 md:p-9 shadow-sm space-y-8"
        >
          {/* Excerpt Lead Paragraph */}
          <div className="bg-blue-50/70 border-l-4 border-blue-600 p-4 sm:p-5 rounded-r-2xl space-y-1">
            <p className="text-slate-800 font-bold text-xs uppercase tracking-wider text-blue-700 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5" /> RINGKASAN BERITA
            </p>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
              {article.excerpt}
            </p>
          </div>

          {/* Isi artikel berupa HTML dari editor panel admin; disaring lebih
              dulu — lihat alasannya di components/SafeHtml.tsx. */}
          <SafeHtml className="article-content" html={article.content} />

          {/* Article Keywords / Tags Ribbon */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 mr-1 font-mono">Kata Kunci:</span>
            <span className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors">#APTPranoto</span>
            <span className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors">#Samarinda</span>
            <span className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors">#FasilitasBandara</span>
            <span className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors">#IKN</span>
            <span className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors">#PerhubunganUdara</span>
          </div>

          {/* Reader Reaction Section */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <ThumbsUp className="w-3.5 h-3.5 text-white" />
                  </span>
                  Tanggapan Pembaca
                </h4>
                <p className="text-[11.5px] text-slate-500">
                  {reacted ? 'Terima kasih atas penilaian Anda!' : 'Bagaimana pendapat Anda tentang berita ini?'}
                </p>
              </div>
              <span className="flex-shrink-0 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                {totalReactions.toLocaleString('id-ID')} suara
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {REACTIONS.map((r) => {
                const count = reactions[r.key];
                const pct = totalReactions ? Math.round((count / totalReactions) * 100) : 0;
                const on = reacted === r.key;
                return (
                  <motion.button
                    key={r.key}
                    onClick={() => handleReaction(r.key)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    className="relative rounded-2xl border-2 bg-white p-3.5 text-center cursor-pointer shadow-sm"
                    style={{ borderColor: on ? r.color : '#e2e8f0' }}
                  >
                    {on && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: r.color, width: 18, height: 18 }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                      </motion.span>
                    )}

                    <motion.span
                      animate={on ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : {}}
                      transition={{ duration: 0.45 }}
                      className="w-11 h-11 mx-auto rounded-full flex items-center justify-center text-[20px] leading-none"
                      style={{ backgroundColor: r.soft }}
                    >
                      {r.emoji}
                    </motion.span>

                    <p className="mt-2 text-[12.5px] font-bold text-slate-800 leading-tight">{r.label}</p>

                    <p className="text-[17px] font-black leading-tight mt-0.5" style={{ color: on ? r.color : '#0f172a' }}>
                      {count.toLocaleString('id-ID')}
                    </p>

                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: r.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">{pct}%</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Social Share Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Share2 className="w-4 h-4 text-blue-600" /> Bagikan Artikel:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + ' - ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                Facebook
              </a>

              <button
                onClick={copyLink}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border cursor-pointer ${
                  copied
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copied ? 'Taut Tersalin!' : 'Salin Link'}
              </button>
            </div>
          </div>

          {/* Previous & Next Article Navigator */}
          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/news/rute-baru-samarinda-denpasar"
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all space-y-1 group"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Berita Sebelumnya
              </span>
              <p className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-blue-600 transition-colors">
                Rute Baru Samarinda–Denpasar Resmi Dibuka Batik Air
              </p>
            </Link>

            <Link
              href="/news/penyesuaian-jadwal-juni-2024"
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all space-y-1 text-right group"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                Berita Selanjutnya <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
              <p className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-blue-600 transition-colors">
                Penyesuaian Jadwal Penerbangan Periode Juni 2024
              </p>
            </Link>
          </div>

          {/* Reader Public Comment / Feedback Section */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" /> Tanggapan & Komentar Publik
              </h3>
              <span className="text-xs text-slate-500 font-mono">{commentsList.length} Komentar</span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <p className="text-xs font-semibold text-slate-700">Tuliskan pandangan atau tanggapan Anda mengenai berita ini:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Anda"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />

                <select
                  value={commentRole}
                  onChange={(e) => setCommentRole(e.target.value)}
                  className="bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                >
                  <option value="Penumpang">Kategori: Penumpang</option>
                  <option value="Masyarakat Samarinda">Kategori: Masyarakat Samarinda</option>
                  <option value="Mitra Kerja">Kategori: Mitra Kerja Bandara</option>
                  <option value="Umum">Kategori: Pengunjung Umum</option>
                </select>
              </div>

              <textarea
                required
                rows={3}
                placeholder="Tulis tanggapan atau saran Anda di sini..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full bg-white text-slate-900 text-xs p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">Tanggapan akan dipublikasikan secara santun & bijak.</p>
                <button
                  type="submit"
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim Tanggapan
                </button>
              </div>

              {commentSubmitted && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-600" /> Tanggapan Anda berhasil terkirim dan ditampilkan!
                </div>
              )}
            </form>

            {/* Render Comments List */}
            <div className="space-y-3">
              {commentsList.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">{c.name}</h5>
                        <span className="text-[10px] text-blue-600 font-semibold">{c.role}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{c.time}</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed pl-10">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.article>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* 1. Quick FIDS Flight Banner */}
          <div className="bg-gradient-to-br from-[#091124] to-[#0f172a] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-white/10 space-y-4">
            <Plane className="absolute -bottom-4 -right-3 w-28 h-28 text-white/10 rotate-[25deg]" />
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                INFO PENERBANGAN
              </span>
              <h3 className="font-bold text-base pt-1 leading-snug">Jadwal Flight Real-Time</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Pantau ketepatan waktu kedatangan dan keberangkatan seluruh maskapai di APT Pranoto.
              </p>
            </div>
            <Link
              href="/flights"
              className="w-full bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors relative z-10"
            >
              Cek Jadwal Penerbangan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2. Samarinda Live Weather Widget */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">Cuaca Samarinda</h4>
              <span className="text-slate-400 text-xs font-mono">BMKG Sync</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <CloudSun className="w-10 h-10 text-cyan-500" />
                <div>
                  <p className="text-3xl font-black text-slate-900">27°C</p>
                  <p className="text-[11px] text-slate-500">Berawan Cerah</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono space-y-0.5">
                <p>Kelembaban: <span className="font-bold text-slate-800">78%</span></p>
                <p>Angin: <span className="font-bold text-slate-800">12 km/h</span></p>
              </div>
            </div>
          </div>

          {/* 3. Official Press Download Attachment Card */}
          <div className="bg-slate-900 rounded-3xl p-5 text-white space-y-3 border border-white/10 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold flex-shrink-0 border border-rose-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Siaran Pers Resmi (PDF)</h4>
                <p className="text-[10px] text-slate-400">Dokumen Publik UPBU APT Pranoto</p>
              </div>
            </div>
            <Link
              href="/downloads"
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 border border-white/15 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> Unduh Dokumen Rilis
            </Link>
          </div>

          {/* 4. Popular & Trending News */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Berita Terpopuler
            </h4>
            <div className="space-y-3">
              {POPULAR_NEWS.map((p, idx) => (
                <Link key={idx} href="/news" className="block group space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{p.date}</span>
                    <span className="flex items-center gap-1 text-blue-600 font-bold"><Eye className="w-3 h-3" /> {p.views}</span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </h5>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ===== RELATED ARTICLES SECTION ===== */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="section-title">Berita & Informasi Lainnya</h2>
          <Link href="/news" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
            Lihat Semua Berita <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {RELATED.map((r, i) => (
            <motion.div
              key={r.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 26 }}
              whileHover={{ y: -6 }}
            >
              <Link href={`/news/${r.slug}`} className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 group">
                <div className="relative h-36">
                  <img src={r.img} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute top-2.5 left-2.5 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow" style={{ backgroundColor: r.color }}>
                    {r.tag}
                  </span>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-mono">{r.date}</p>
                  <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {r.title}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">{label}</p>
        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
