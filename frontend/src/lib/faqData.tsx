/**
 * Pertanyaan yang sering diajukan (FAQ).
 *
 * Dipindahkan ke sini dari `app/faq/page.tsx` agar Pusat Bantuan dapat
 * memakai data yang sama sebagai lapis penyaringan — pengunjung menemukan
 * jawabannya sendiri sebelum membuka tiket. SATU sumber untuk dua halaman;
 * jangan menyalin isinya ke tempat lain.
 *
 * Catatan: `answer` berupa JSX, sehingga pencarian hanya dapat bertumpu pada
 * `question` dan `keywords`. Sediakan kata kunci yang memadai saat menambah
 * entri baru — tanpa itu entrinya tidak akan pernah ditemukan pengunjung.
 *
 * Isi jawaban dipindahkan APA ADANYA, termasuk kelas `dark:` warisan lama
 * yang sudah ditinggalkan halaman v2 lain. Merapikannya pekerjaan tersendiri,
 * bukan bagian dari pemindahan ini.
 */

import React from 'react';
import Link from 'next/link';
import {
  Plane, Clock, MessageSquare, PackageSearch, Accessibility, Ticket, Car,
  Box, CreditCard, ExternalLink,
} from 'lucide-react';

export interface FAQItem {
  id: number;
  question: string;
  answer: React.ReactNode;
  category: string;
  icon: React.ElementType;
  keywords: string[];
}

export const FAQ_DATA: FAQItem[] = [
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

export const FAQ_CATEGORIES = ['Semua', 'Penerbangan & Tiket', 'Fasilitas & Operasional', 'Transportasi & Parkir', 'Kargo & Layanan'];
