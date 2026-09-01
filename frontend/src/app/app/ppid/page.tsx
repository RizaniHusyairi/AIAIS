'use client';

/**
 * Beranda PPID.
 *
 * Pintu masuk kewajiban UU 14/2008 tentang Keterbukaan Informasi Publik.
 * Sebelumnya seluruh cabang PPID sengaja TIDAK dialihkan ke PWA karena tidak
 * punya layar di sini; pengunjung ponsel menerima halaman desktopnya apa
 * adanya. Kini tiap cabang punya layarnya, dan halaman ini yang menautkannya.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PPID_ORG, PPID_VISI, PPID_MISI, PPID_DASAR_HUKUM } from '@/lib/ppidData';
import { fetchApi } from '@/lib/api';
import { useSetting } from '@/lib/settings';
import VideoProfil from '@/components/home/VideoProfil';
import { formatTanggal } from '@/lib/kamus';
import { useBahasa } from '@/lib/bahasa';
import type { PpidProfileDocument } from '@/types';
import { StatusBar, AppHeader, listContainer, listItem } from '@/components/pwa/ui';
import {
  ShieldCheck, FileText, ClipboardList, Scale, FolderOpen, Send,
  ChevronRight, ExternalLink, Megaphone, BookOpen, Archive,
  PlayCircle, CalendarRange,
} from 'lucide-react';

const CABANG = [
  { href: '/app/ppid/sop', nama: 'SOP PPID', desc: 'Prosedur permohonan, keberatan, dan sengketa', icon: ClipboardList, warna: '#2563eb', latar: '#eff6ff' },
  { href: '/app/ppid/permohonan', nama: 'Permohonan Informasi', desc: 'Ajukan permohonan informasi publik', icon: Send, warna: '#059669', latar: '#ecfdf5' },
  { href: '/app/ppid/standar-pelayanan', nama: 'Standar Pelayanan', desc: 'Standar, maklumat, dan survei kepuasan', icon: FileText, warna: '#7c3aed', latar: '#f5f3ff' },
  { href: '/app/ppid/regulasi', nama: 'Regulasi PPID', desc: 'Dasar hukum penyelenggaraan PPID', icon: Scale, warna: '#0891b2', latar: '#ecfeff' },
  { href: '/app/ppid/berkala', nama: 'Informasi Berkala', desc: 'Diumumkan secara rutin', icon: BookOpen, warna: '#ea580c', latar: '#fff7ed' },
  { href: '/app/ppid/serta-merta', nama: 'Informasi Serta-Merta', desc: 'Diumumkan tanpa diminta', icon: Megaphone, warna: '#dc2626', latar: '#fef2f2' },
  { href: '/app/ppid/setiap-saat', nama: 'Informasi Setiap Saat', desc: 'Tersedia kapan pun diminta', icon: Archive, warna: '#0d9488', latar: '#f0fdfa' },
  { href: '/app/ppid/laporan', nama: 'Laporan Layanan', desc: 'Laporan tahunan penyelenggaraan PPID', icon: FolderOpen, warna: '#475569', latar: '#f1f5f9' },
];

export default function PpidScreen() {
  /* SK Tim PPID kini dikelola dari panel admin, bukan konstanta di kode.
     Kartunya tidak dirender bila belum ada SK yang berlaku dan berberkas —
     kartu yang menuju ke mana-mana lebih buruk daripada tidak ada kartu. */
  const [sk, setSk] = useState<PpidProfileDocument | null>(null);
  const [laporan, setLaporan] = useState<PpidProfileDocument[]>([]);

  const bahasa = useBahasa();
  const videoUrl = useSetting('ppid_video_url');
  const videoGambar = useSetting('ppid_video_gambar');

  useEffect(() => {
    let batal = false;

    fetchApi<PpidProfileDocument[]>('/ppid-profile-documents').then((res) => {
      if (batal) return;
      const daftar = res.success && Array.isArray(res.data) ? res.data : [];
      const skPpid = daftar.filter((d) => d.type === 'SK PPID');
      setSk(skPpid.find((d) => d.is_current) ?? skPpid[0] ?? null);

      /* Hanya laporan yang berkasnya benar-benar ada. Daftar versi desktop
         sengaja ikut menampilkan dokumen yang keberadaannya sudah dicatat tapi
         berkasnya belum terbit; di layar selebar ponsel baris yang tak dapat
         dibuka itu jadi gangguan, dan tidak ada yang diklaim dengan
         menghilangkannya. */
      setLaporan(daftar.filter((d) => d.type === 'Laporan Bulanan' && d.has_document));
    });

    return () => { batal = true; };
  }, []);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1e5b] to-[#2563eb] text-white rounded-b-[2rem]">
        <StatusBar />
        <AppHeader title="PPID" tone="light" />

        <div className="px-5 pb-7">
          <p className="text-blue-200 text-[12px]">Pejabat Pengelola Informasi dan Dokumentasi</p>
          <h2 className="text-[19px] font-black leading-tight mt-1">{PPID_ORG}</h2>
          <p className="text-blue-100/80 text-[11.5px] mt-2 leading-relaxed">{PPID_DASAR_HUKUM}</p>
        </div>

        <ShieldCheck className="absolute -bottom-5 -right-4 w-32 h-32 text-white/10" aria-hidden="true" />
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl p-4 space-y-3"
      >
        <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Visi PPID</p>
          <p className="mt-1.5 text-[12.5px] text-slate-600 leading-relaxed">{PPID_VISI}</p>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Misi</p>
          <ul className="mt-1.5 space-y-1.5">
            {PPID_MISI.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-slate-600 leading-relaxed">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-[7px]" />
                {m}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Video Profil PPID. Tidak dirender bila belum ada tautannya —
            pemutar kosong hanya menjanjikan sesuatu yang tidak ada. Pemutar
            YouTube sendiri baru lahir setelah tombol putar ditekan; lihat
            catatan privasi di VideoProfil.tsx. */}
        {videoUrl.trim() && (
          <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 overflow-hidden">
            <div className="px-4 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 inline-flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-blue-600" /> Video Profil
              </p>
              <p className="mt-1 text-[13.5px] font-bold text-slate-900 leading-snug">Mengenal PPID Bandara</p>
            </div>

            <div className="mt-3">
              <VideoProfil
                gambar={videoGambar.trim() || '/ppid/struktur-ppid.jpg'}
                videoUrl={videoUrl}
                caption="Profil Bandara"
                tinggiKelas="aspect-video h-auto"
                captionHref="/app/profil"
              />
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {CABANG.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.href} variants={listItem}>
                <Link
                  href={c.href}
                  className="flex items-center gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60 active:scale-[0.99] transition-transform"
                >
                  <span
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.latar }}
                  >
                    <Icon className="w-5 h-5" style={{ color: c.warna }} strokeWidth={2.1} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 text-[14px]">{c.nama}</span>
                    <span className="block text-[11.5px] text-slate-500 leading-snug">{c.desc}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Laporan Bulanan PPID. Hanya yang berkasnya sudah terbit. */}
        {laporan.length > 0 && (
          <motion.div variants={listItem} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 inline-flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-blue-600" /> Laporan Bulanan
            </p>

            <ul className="mt-2.5 space-y-2">
              {laporan.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.document_url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 active:bg-slate-100 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FileText className="w-4 h-4 text-blue-600" strokeWidth={2.1} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-bold text-slate-900 leading-snug">
                        {l.title}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Terbit {formatTanggal(l.published_date, bahasa)}
                      </span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {sk?.has_document && sk.document_url && (
          <motion.a
            variants={listItem}
            href={sk.document_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3.5 bg-white rounded-2xl p-4 shadow-sm shadow-slate-200/60"
          >
            <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-amber-600" strokeWidth={2.1} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-bold text-slate-900 leading-snug">
                {sk.title}
              </span>
              {sk.description && (
                <span className="block text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
                  {sk.description}
                </span>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600">
                Buka dokumen <ExternalLink className="w-3 h-3" />
              </span>
            </span>
          </motion.a>
        )}
      </motion.div>
    </div>
  );
}
