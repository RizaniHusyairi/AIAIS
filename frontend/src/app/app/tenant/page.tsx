'use client';

/** Direktori tenant terminal — kuliner, retail, lounge, dan layanan. */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Tenant } from '@/types';
import {
  StatusBar, AppHeader, Segmented, KotakCari, Memuat, LayarKosong,
  listContainer, listItem,
} from '@/components/pwa/ui';
import {
  Store, Utensils, ShoppingBag, Sofa, Wrench, Car, MapPin, Clock, Phone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Rupa tiap kategori. Nilainya cermin `CAT_META` pada halaman tenant desktop
 *  supaya satu tenant berwarna sama di kedua tampilan. */
const RUPA: Record<string, { label: string; warna: string; latar: string; icon: LucideIcon }> = {
  food_beverage: { label: 'Kuliner', warna: '#e11d48', latar: '#fff1f2', icon: Utensils },
  retail: { label: 'Retail', warna: '#7c3aed', latar: '#f5f3ff', icon: ShoppingBag },
  lounge: { label: 'Lounge', warna: '#d97706', latar: '#fffbeb', icon: Sofa },
  transportation: { label: 'Transportasi', warna: '#0891b2', latar: '#ecfeff', icon: Car },
  services: { label: 'Layanan', warna: '#059669', latar: '#ecfdf5', icon: Wrench },
};

const RUPA_LAIN = { label: 'Lainnya', warna: '#64748b', latar: '#f1f5f9', icon: Store };

const SEMUA = 'semua';

export default function TenantScreen() {
  const [tenant, setTenant] = useState<Tenant[] | null>(null);
  const [kategori, setKategori] = useState<string>(SEMUA);
  const [cari, setCari] = useState('');

  useEffect(() => {
    fetchApi<Tenant[]>('/tenants').then((res) => {
      setTenant(res.success && Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  /* Lewat useMemo, bukan `tenant ?? []` telanjang: array literal baru tiap
     render membuat kedua useMemo di bawahnya menghitung ulang tanpa henti. */
  const semua = useMemo(() => tenant ?? [], [tenant]);

  /* Pilihan kategori dibangkitkan dari datanya: kategori yang kosong tidak
     perlu ditawarkan, dan tab yang selalu menghasilkan daftar kosong lebih
     membingungkan daripada tidak ada tabnya sama sekali. */
  const pilihan = useMemo(() => {
    const ada = [...new Set(semua.map((t) => t.category))];
    return [
      { value: SEMUA, label: 'Semua' },
      ...ada.map((c) => ({ value: c, label: (RUPA[c] ?? RUPA_LAIN).label })),
    ];
  }, [semua]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return semua.filter((t) => {
      const cocokKategori = kategori === SEMUA || t.category === kategori;
      const cocokCari =
        !q || t.name.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q);
      return cocokKategori && cocokCari;
    });
  }, [semua, kategori, cari]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Tenant" />
        <div className="px-4 pb-3 space-y-3">
          <KotakCari value={cari} onChange={setCari} placeholder="Cari tenant…" />
          {pilihan.length > 2 && (
            <Segmented options={pilihan} value={kategori} onChange={setKategori} layoutId="seg-tenant" />
          )}
        </div>
      </div>

      {tenant === null ? (
        <Memuat label="Memuat tenant…" />
      ) : tampil.length === 0 ? (
        <LayarKosong
          icon={Store}
          judul={semua.length === 0 ? 'Belum ada tenant terdaftar' : 'Tidak ada yang cocok'}
          pesan={
            semua.length === 0
              ? 'Daftar mitra usaha terminal belum diisi petugas.'
              : 'Coba kata kunci lain atau pilih kategori Semua.'
          }
        />
      ) : (
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-3xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {tampil.map((t) => {
            const rupa = RUPA[t.category] ?? RUPA_LAIN;
            const Icon = rupa.icon;
            return (
              <motion.div
                key={t.id}
                variants={listItem}
                className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60"
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: rupa.latar }}
                >
                  <Icon className="w-5 h-5" style={{ color: rupa.warna }} strokeWidth={2.1} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14px] leading-snug">{t.name}</p>
                  {t.description && (
                    <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  <div className="mt-1.5 space-y-1">
                    {t.location && (
                      <p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" /> {t.location}
                      </p>
                    )}
                    {t.operating_hours && (
                      <p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" /> {t.operating_hours}
                      </p>
                    )}
                  </div>

                  {t.contact_phone && (
                    <a
                      href={`tel:${t.contact_phone.replace(/\s+/g, '')}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600"
                    >
                      <Phone className="w-3.5 h-3.5" /> {t.contact_phone}
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
