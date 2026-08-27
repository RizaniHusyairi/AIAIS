'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { OFFICIALS, type Official } from '@/lib/airportProfile';
import type { OfficialItem } from '@/types';

/**
 * Pejabat bandara dari basis data, dengan teks otoritatif sebagai cadangan.
 *
 * Sejak modul admin "Pejabat Bandara" ada, daftar ini dikelola petugas lewat
 * `/admin/pejabat`. Halaman publik tetap membuka dengan konstanta `OFFICIALS`
 * dan baru berpindah ke data API setelah API benar-benar menjawab dengan
 * daftar berisi.
 *
 * Cadangan itu BUKAN data karangan — sumbernya konstanta yang sama dengan
 * yang disemai `OfficialSeeder`, lengkap dengan provenansnya. Alasannya
 * hukum, bukan kenyamanan: nama dan nomenklatur jabatan pejabat WAJIB
 * diumumkan menurut UU 14/2008, sehingga bagian ini tidak boleh mendadak
 * kosong hanya karena basis datanya belum dimigrasi, belum disemai, atau
 * sedang tidak dapat dihubungi.
 *
 * Karena itu daftar kosong dari API sengaja diperlakukan sebagai "belum ada
 * jawaban", bukan sebagai "memang tidak ada pejabat". Kalau suatu saat
 * seluruh pejabat memang harus disembunyikan, sembunyikan barisnya lewat
 * `is_published` — jangan mengosongkan tabelnya.
 */
export function usePejabat(): Official[] {
  const [pejabat, setPejabat] = useState<Official[]>(OFFICIALS);

  useEffect(() => {
    let batal = false;

    fetchApi<OfficialItem[]>('/officials').then((res) => {
      if (batal) return;

      const daftar = Array.isArray(res.data) ? res.data : [];
      if (daftar.length === 0) return;

      setPejabat(daftar.map(dariApi));
    });

    return () => { batal = true; };
  }, []);

  return pejabat;
}

/**
 * Bentuk API → bentuk yang dipakai halaman.
 *
 * Halaman publik sudah lama memakai antarmuka `Official` (camelCase, `photo`
 * berupa lintasan siap pakai). Pemetaan ditaruh di sini supaya kedua halaman
 * itu tidak perlu tahu bahwa sumbernya berpindah dari konstanta ke API.
 */
function dariApi(p: OfficialItem): Official {
  return {
    slug: p.slug,
    name: p.name,
    title: p.title,
    shortTitle: p.short_title,
    // `photo_url` sudah menyelesaikan ketiga bentuk nilai kolomnya; `photo`
    // mentah hanya dipakai bila berkasnya tidak dapat ditemukan, supaya
    // gambarnya rusak secara kasatmata alih-alih hilang diam-diam.
    photo: p.photo_url ?? p.photo ?? '',
    riwayatJabatan: p.position_history ?? [],
    penghargaan: p.awards ?? [],
  };
}
