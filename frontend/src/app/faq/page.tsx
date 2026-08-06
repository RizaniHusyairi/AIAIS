'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import SkyParticles from '@/components/effects/SkyParticles';
import {
  Search, HelpCircle, ChevronDown, ExternalLink, Plane, Clock,
  MessageSquare, PackageSearch, Accessibility, Ticket, Car,
  Box, CreditCard, ArrowRight, Sparkles, MessageCircle, Phone, X
} from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: React.ReactNode;
  category: string;
  icon: any;
  keywords: string[];
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    question: 'Apa saja rute penerbangan yang tersedia di Bandara A.P.T. Pranoto Samarinda?',
    category: 'Penerbangan & Tiket',
    icon: Plane,
    keywords: ['rute', 'penerbangan', 'tujuan', 'pesawat', 'jakarta', 'surabaya', 'yogyakarta', 'banjarmasin', 'berau', 'melak', 'perintis'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Bandara A.P.T. Pranoto Samarinda melayani penerbangan komersial menuju berbagai destinasi utama di Indonesia:
        </p>
        <div className="flex flex-wrap gap-2 py-1">
          {['Jakarta', 'Surabaya', 'Yogyakarta', 'Banjarmasin', 'Berau', 'Melak'].map((city) => (
            <span key={city} className="px-3 py-1 bg-blue-50 text-blue-700 font-medium rounded-full text-xs border border-blue-200/60">
              {city}
            </span>
          ))}
        </div>
        <p>
          Selain itu, tersedia pula rute penerbangan perintis menuju lokasi-lokasi strategis:
        </p>
        <div className="flex flex-wrap gap-2 py-1">
          {['Long Apung', 'Maratua', 'Datah Dawai', 'Muara Wahau'].map((perintis) => (
            <span key={perintis} className="px-3 py-1 bg-amber-50 text-amber-700 font-medium rounded-full text-xs border border-amber-200/60">
              {perintis}
            </span>
          ))}
        </div>
        <p className="text-sm text-slate-500 italic">
          *Termasuk koneksi antarwilayah: Datah Dawai – Melak & Maratua – Berau.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    question: 'Berapa jam operasional Bandara A.P.T. Pranoto?',
    category: 'Fasilitas & Operasional',
    icon: Clock,
    keywords: ['jam', 'operasional', 'buka', 'tutup', 'wita', 'waktu'],
    answer: (
      <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Jam operasional Bandara A.P.T. Pranoto Samarinda mengikuti jadwal yang telah ditetapkan oleh pihak otoritas bandara:
        </p>
        <div className="inline-flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-slate-900 dark:text-white text-base">
            07.00 WITA – 20.00 WITA
          </span>
          <span className="text-xs text-slate-500 font-medium">(Setiap Hari)</span>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    question: 'Bagaimana cara mengajukan pengaduan atau saran?',
    category: 'Kargo & Layanan',
    icon: MessageSquare,
    keywords: ['pengaduan', 'saran', 'keluhan', 'lapor', 'whatsapp', 'sp4n'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>Pengaduan dan saran dari pengguna jasa bandara dapat disampaikan melalui kanal-kanal berikut:</p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          <li className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Media Sosial Resmi Bandara</span>
          </li>
          <li className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Nomor WhatsApp Pengaduan</span>
          </li>
          <li className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
            <Link href="/complaints" className="text-blue-600 hover:underline font-medium">Website Resmi (Form Layanan Pengaduan)</Link>
          </li>
          <li className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Kotak Saran di Terminal Bandara</span>
          </li>
          <li className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-sm md:col-span-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>SP4N LAPOR! (Layanan Aspirasi & Pengaduan Online Rakyat)</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 4,
    question: 'Bagaimana jika saya kehilangan barang di bandara?',
    category: 'Fasilitas & Operasional',
    icon: PackageSearch,
    keywords: ['kehilangan', 'barang', 'lost', 'found', 'tertinggal', 'informasi'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Jika Anda mengalami kehilangan barang di area terminal maupun lingkungan bandara:
        </p>
        <div className="p-4 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-amber-900 text-sm space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-amber-700" />
            Langkah Penanganan Lost & Found:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-800">
            <li>Segera kunjungi unit <strong>Lost and Found</strong> atau <strong>Pusat Informasi</strong> di terminal.</li>
            <li>Hubungi kontak/layanan resmi Bandara A.P.T. Pranoto.</li>
            <li>Sampaikan rincian <strong>ciri-ciri barang</strong>, <strong>lokasi terakhir</strong>, dan <strong>perkiraan waktu kehilangan</strong>.</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    question: 'Apakah bandara menyediakan fasilitas bagi penyandang disabilitas?',
    category: 'Fasilitas & Operasional',
    icon: Accessibility,
    keywords: ['disabilitas', 'difabel', 'kursi roda', 'bantuan', 'ramah', 'aksesibel', 'khusus'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          <strong className="text-emerald-600">Ya.</strong> Bandara A.P.T. Pranoto berkomitmen memberikan pelayanan inklusif dan ramah disabilitas dengan menyediakan:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">✓ Jalur Khusus Guiding Block</li>
          <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">✓ Toilet Difabel Khusus</li>
          <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">✓ Area Parkir Prioritas Disabilitas</li>
          <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">✓ Layanan Bantuan Kursi Roda & Pendampingan</li>
        </ul>
        <p className="text-sm text-slate-600 pt-1">
          Penumpang dapat menghubungi petugas Customer Service setibanya di bandara maupun sebelum keberangkatan agar petugas siap memberikan pendampingan penuh.
        </p>
      </div>
    ),
  },
  {
    id: 6,
    question: 'Bagaimana cara memesan tiket pesawat untuk rute penerbangan perintis?',
    category: 'Penerbangan & Tiket',
    icon: Ticket,
    keywords: ['tiket', 'perintis', 'pesan', 'booking', 'long apung', 'maratua', 'datah dawai'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Pemesanan tiket penerbangan perintis dapat dilakukan dengan menghubungi kontak resmi pengelola layanan perintis.
        </p>
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-3">
          <p className="text-sm text-blue-900">
            Dapatkan nomor kontak agen/petugas perintis, informasi jadwal, dan ketersediaan kursi melalui publikasi resmi:
          </p>
          <a
            href="https://www.instagram.com/p/DTQC0UUEZ6D/?img_index=1&igsh=MXZ5cTR6bWYwaGpieQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <span>Buka Informasi Tiket Perintis di Instagram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    question: 'Berapa tarif parkir inap kendaraan di Bandara A.P.T. Pranoto?',
    category: 'Transportasi & Parkir',
    icon: Car,
    keywords: ['parkir', 'inap', 'menginap', 'tarif', 'kendaraan', 'mobil', 'shuttle', 'rp75.000'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Bandara A.P.T. Pranoto menyediakan area parkir inap resmi 24 jam dengan fasilitas shuttle:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-semibold">Tarif Parkir Inap</span>
            <p className="text-xl font-extrabold text-blue-600 mt-0.5">Rp 75.000 <span className="text-xs font-normal text-slate-600">/ 24 Jam</span></p>
          </div>
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 uppercase font-semibold">Fasilitas Shuttle</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">Gratis Shuttle Car</p>
            <p className="text-xs text-slate-500">Menuju Drop Zone & Pick Up Zone</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Kendaraan wajib diparkir di area khusus inap yang telah disediakan demi keamanan bersama.
        </p>
        <a
          href="https://www.instagram.com/reels/DIcjgt2B4nL/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-colors"
        >
          <span>Lihat Video Panduan Parkir Inap (Reels)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    ),
  },
  {
    id: 8,
    question: 'Berapa tarif taksi resmi di Bandara A.P.T. Pranoto?',
    category: 'Transportasi & Parkir',
    icon: Car,
    keywords: ['taksi', 'tarif', 'zona', 'ongkos', 'sangatta', 'bontang', 'samarinda', 'transportasi'],
    answer: (
      <div className="space-y-4 text-slate-700 dark:text-slate-300 text-[15px]">
        <p className="font-medium text-slate-900 dark:text-white">
          Daftar Tarif Resmi Taksi Bandara A.P.T. Pranoto Samarinda:
        </p>
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200">
              Tarif Dalam Kota Samarinda
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Zona 1 (Depan Bandara)</span>
                <span className="font-semibold text-slate-900">Rp 50.000 – Rp 60.000</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Zona 2 (Sungai Siring – Tanah Merah)</span>
                <span className="font-semibold text-slate-900">Rp 100.000</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Zona 3 (Lempake, Juanda, Pasar Pagi, Sg. Dama)</span>
                <span className="font-semibold text-slate-900">Rp 185.000</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Zona 4 (Antasari, Pelita, Suryanata, Loa Bakung)</span>
                <span className="font-semibold text-slate-900">Rp 225.000</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Zona 5 (Samarinda Seberang, Palaran, Loa Buah)</span>
                <span className="font-semibold text-slate-900">Rp 275.000</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200">
              Tarif Luar Kota (Layanan Shuttle)
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Sangatta</span>
                <span className="font-semibold text-blue-600">Rp 275.000</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-600">Simpang 3 Bontang</span>
                <span className="font-semibold text-blue-600">Rp 250.000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 9,
    question: 'Apakah Bandara A.P.T. Pranoto Samarinda menyediakan layanan kargo?',
    category: 'Kargo & Layanan',
    icon: Box,
    keywords: ['kargo', 'cargo', 'empu', 'pengiriman', 'logistik', 'barang', 'ekspedisi', 'lini 2'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          <strong className="text-emerald-600">Ya.</strong> Bandara A.P.T. Pranoto Samarinda memiliki <strong>Gedung Kargo Lini 2</strong> yang melayani kegiatan Ekspedisi Muatan Pesawat Udara (EMPU).
        </p>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Jam Operasional Kargo: 08.00 – 17.00 WITA (Setiap Hari)</span>
          </div>
          <p className="text-slate-600">
            Layanan didukung oleh berbagai perusahaan kargo terpercaya untuk melayani kebutuhan pengiriman barang melalui transportasi udara, termasuk informasi tarif dan jenis komoditas.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 10,
    question: 'Identitas apa yang dapat digunakan untuk pemeriksaan tiket pesawat di bandara?',
    category: 'Penerbangan & Tiket',
    icon: CreditCard,
    keywords: ['identitas', 'ktp', 'sim', 'paspor', 'kia', 'akta', 'pemeriksaan', 'boarding', 'syarat'],
    answer: (
      <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
        <p>
          Dokumen identitas resmi yang masih berlaku dan sesuai dengan nama pada tiket pesawat yang dapat digunakan meliputi:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="font-bold text-blue-900 block mb-1">Penumpang Dewasa:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700">
              <li>Kartu Tanda Penduduk (KTP)</li>
              <li>Surat Ijin Mengemudi (SIM)</li>
              <li>Paspor resmi</li>
              <li>Identitas resmi lain yang berlaku</li>
            </ul>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-900 block mb-1">Bayi & Anak-anak:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700">
              <li>Kartu Identitas Anak (KIA)</li>
              <li>Akta Kelahiran</li>
              <li>Kartu Keluarga (KK)</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
];

const CATEGORIES = ['Semua', 'Penerbangan & Tiket', 'Fasilitas & Operasional', 'Transportasi & Parkir', 'Kargo & Layanan'];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [openItems, setOpenItems] = useState<number[]>([1]); // default open item 1

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCat = activeCategory === 'Semua' || item.category === activeCategory;
      const qLower = searchQuery.toLowerCase().trim();
      if (!qLower) return matchCat;

      const matchQ = item.question.toLowerCase().includes(qLower);
      const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(qLower));
      return matchCat && (matchQ || matchKeyword);
    });
  }, [searchQuery, activeCategory]);

  const toggleItem = (id: number) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenItems(filteredFAQs.map((f) => f.id));
  };

  const collapseAll = () => {
    setOpenItems([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-20">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white pt-24 pb-20 px-4 sm:px-6">
        <SkyParticles />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Pusat Bantuan & Informasi FAQ</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
          >
            Pertanyaan yang Sering Diajukan
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto"
          >
            Temukan jawaban lengkap seputar rute penerbangan, jam operasional, tarif parkir, taksi, kargo, serta layanan di Bandara A.P.T. Pranoto Samarinda.
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto pt-2"
          >
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci (misal: rute, parkir inap, taksi, disabilitas, perintis)..."
                className="w-full bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/80 text-white placeholder-slate-400 text-sm sm:text-base rounded-2xl pl-12 pr-10 py-4 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 space-y-6">

        {/* Category Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Actions bar (Count & Expand/Collapse) */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredFAQs.length}</strong> pertanyaan</span>
          <div className="flex items-center gap-3 font-semibold">
            <button onClick={expandAll} className="hover:text-blue-600 transition-colors">Buka Semua</button>
            <span>•</span>
            <button onClick={collapseAll} className="hover:text-blue-600 transition-colors">Tutup Semua</button>
          </div>
        </div>

        {/* FAQ Accordion List */}
        {filteredFAQs.length > 0 ? (
          <div className="space-y-4">
            {filteredFAQs.map((item, idx) => {
              const isOpen = openItems.includes(item.id);
              const ItemIcon = item.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100 dark:border-blue-900/50">
                      <ItemIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug">
                        {item.question}
                      </h3>
                    </div>

                    <div className={`p-1.5 rounded-full text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 bg-blue-50 dark:bg-blue-950' : ''}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 ml-13 sm:ml-14">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Tidak ada pertanyaan yang cocok</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Coba kata kunci lain atau pilih kategori &quot;Semua&quot; untuk menemukan informasi yang Anda cari.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('Semua'); }}
              className="mt-2 text-sm text-blue-600 font-semibold hover:underline"
            >
              Reset Pencarian
            </button>
          </div>
        )}

        {/* Support & Contact Card */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left z-10 max-w-lg">
            <h3 className="text-xl sm:text-2xl font-bold">Masih Punya Pertanyaan Lain?</h3>
            <p className="text-slate-300 text-sm">
              Tim Customer Service & Layanan Informasi Bandara A.P.T. Pranoto siap membantu memberikan informasi lebih lengkap.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <Link
              href="/complaints"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-blue-600/30"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Pengaduan / Saran</span>
            </Link>
            <Link
              href="/ppid"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-colors backdrop-blur-md border border-white/20"
            >
              <span>Layanan PPID</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
