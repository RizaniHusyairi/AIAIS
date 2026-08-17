'use client';

/**
 * Transportasi dari dan ke bandara.
 *
 * SEBELUMNYA SELURUH ISINYA DIKARANG: lima moda ditulis tetap di dalam berkas,
 * lengkap dengan keterangan seperti "Bus DAMRI — rute ke berbagai kota" yang
 * tidak bersumber dari mana pun. Tombolnya pun tidak melakukan apa-apa.
 *
 * Kini bersumber `GET /tenants` kategori `transportation` — mitra transportasi
 * yang benar-benar terdaftar dan dikelola petugas dari panel admin. Bila
 * daftarnya kosong, layarnya mengatakannya apa adanya alih-alih mengisi
 * sendiri.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Tenant } from '@/types';
import { CONTACT } from '@/lib/airportProfile';
import {
  StatusBar, AppHeader, Memuat, LayarKosong, listContainer, listItem,
} from '@/components/pwa/ui';
import { Car, MapPin, Clock, Phone, Headphones } from 'lucide-react';

export default function TransportasiScreen() {
  const [tenant, setTenant] = useState<Tenant[] | null>(null);

  useEffect(() => {
    fetchApi<Tenant[]>('/tenants').then((res) => {
      setTenant(res.success && Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const moda = useMemo(
    () => (tenant ?? []).filter((t) => t.category === 'transportation'),
    [tenant],
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <StatusBar />
        <AppHeader title="Transportasi" />
      </div>

      <div className="p-4 space-y-3">
        {tenant === null ? (
          <Memuat label="Memuat pilihan transportasi…" />
        ) : moda.length === 0 ? (
          <LayarKosong
            icon={Car}
            judul="Belum ada mitra transportasi terdaftar"
            pesan="Hubungi pusat informasi bandara untuk menanyakan pilihan yang tersedia hari ini."
          />
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {moda.map((m) => (
              <motion.div
                key={m.id}
                variants={listItem}
                className="flex items-start gap-3.5 bg-white rounded-2xl p-3.5 shadow-sm shadow-slate-200/60"
              >
                <span className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6 text-cyan-600" strokeWidth={2.1} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14.5px] leading-snug">{m.name}</p>
                  {m.description && (
                    <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed">{m.description}</p>
                  )}

                  <div className="mt-1.5 space-y-1">
                    {m.location && (
                      <p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" />
                        {m.location}
                      </p>
                    )}
                    {m.operating_hours && (
                      <p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-px text-slate-400" />
                        {m.operating_hours}
                      </p>
                    )}
                  </div>

                  {m.contact_phone && (
                    <a
                      href={`tel:${m.contact_phone.replace(/\s+/g, '')}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600"
                    >
                      <Phone className="w-3.5 h-3.5" /> {m.contact_phone}
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Kartu bantuan. Tombolnya dulu tidak menelepon siapa pun; kini
            `tel:` ke nomor resmi bandara dari `lib/airportProfile.ts`. */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#123a8f] to-[#2563eb] rounded-3xl p-5 text-white mt-2">
          <div className="relative z-10 max-w-[70%]">
            <p className="font-bold text-[16px]">Butuh Bantuan?</p>
            <p className="text-blue-100 text-[12.5px] mt-1 leading-relaxed">
              Pusat informasi bandara melayani pada jam operasi {CONTACT.operationalHours}.
            </p>
            <a
              href={`tel:${CONTACT.phoneHref}`}
              className="mt-3 inline-flex items-center gap-1.5 bg-white text-blue-700 font-semibold text-[12.5px] px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              <Phone className="w-3.5 h-3.5" /> {CONTACT.phone}
            </a>
          </div>
          <Headphones className="absolute -bottom-3 -right-2 w-28 h-28 text-white/15" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
