'use client';

/**
 * State dan perilaku formulir permohonan informasi publik.
 *
 * Dipakai dua kerangka: halaman desktop (`PengajuanInformasiView`) dan layar
 * PWA (`app/app/ppid/permohonan`). Keduanya berbeda tata letak — pas samping
 * vs. tab dan bilah aksi lengket — tetapi validasi, pengiriman, dan
 * penanganan galatnya harus identik, jadi semuanya hidup di sini sekali saja.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { API_BASE_URL } from '@/lib/api';
import {
  ATURAN, HARI_KERJA_JAWABAN, KOLOM_LANGKAH, KOSONG,
  rapikanTelepon, salinTeks, tambahHariKerja, validasiLangkah,
  type Form, type Kolom,
} from './aturan';

export type Tiket = {
  ticket_number: string;
  due_date: string;
  submitted_at?: string;
  response_working_days?: number;
};

export type Galat = Partial<Record<Kolom, string>>;

/**
 * Getar singkat di ponsel; diam saja di perangkat yang tidak mendukung.
 * Chrome menolak (dan mencatat galat konsol) getaran sebelum pengguna
 * pernah mengetuk halaman, jadi periksa `userActivation` lebih dulu.
 */
const getar = (pola: number | number[]) => {
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(pola);
  } catch { /* tidak didukung */ }
};

/**
 * `formTop` dibuat pemanggil, bukan hook ini: ref yang ikut dikembalikan
 * di dalam objek hasil membuat seluruh objek dianggap ref oleh React
 * Compiler, dan setiap `p.step` saat render ditolak lint.
 */
export function usePermohonan(formTop: RefObject<HTMLDivElement | null>) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(KOSONG);
  const [errors, setErrors] = useState<Galat>({});
  const [disentuh, setDisentuh] = useState<Partial<Record<Kolom, boolean>>>({});
  const [kirim, setKirim] = useState(false);
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [tiket, setTiket] = useState<Tiket | null>(null);
  const [disalin, setDisalin] = useState<'ya' | 'gagal' | null>(null);

  // Fokus ke galat pertama. Kolomnya baru ada di DOM setelah animasi
  // pergantian langkah selesai, jadi fokus dipasang lewat efek + jeda,
  // dipicu penghitung `fokusTik` (efek ini sendiri tidak mengubah state).
  const fokusKe = useRef<Kolom | null>(null);
  const [fokusTik, setFokusTik] = useState(0);
  useEffect(() => {
    if (!fokusTik || !fokusKe.current) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-kolom="${fokusKe.current}"]`);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 380);
    return () => clearTimeout(t);
  }, [fokusTik]);

  const fokusGalatPertama = (e: Galat) => {
    fokusKe.current = KOLOM_LANGKAH.flat().find((k) => e[k]) ?? null;
    setFokusTik((n) => n + 1);
    getar([20, 40, 20]);
  };

  // Formulir panjang yang hilang karena salah ketuk tautan itu menyakitkan;
  // peramban diminta mengonfirmasi dulu selama ada isian yang belum dikirim.
  const adaIsian = !tiket && (Object.keys(KOSONG) as Kolom[]).some((k) => {
    const v = form[k];
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== null;
  });
  useEffect(() => {
    if (!adaIsian) return;
    const cegah = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', cegah);
    return () => window.removeEventListener('beforeunload', cegah);
  }, [adaIsian]);

  const set = <K extends Kolom>(k: K, v: Form[K]) => {
    const baru = { ...form, [k]: v };
    setForm(baru);
    // Galat yang sudah tampil dinilai ulang tiap ketikan, supaya hilang begitu
    // isiannya benar — bukan menunggu tombol Lanjut ditekan lagi.
    if (errors[k] || disentuh[k]) setErrors((e) => ({ ...e, [k]: ATURAN[k](baru) }));
  };

  /** Kolom ditinggalkan: nilai sekarang, tapi jangan memarahi kolom kosong yang belum pernah diisi. */
  const sentuh = (k: Kolom) => {
    const v = form[k];
    const kosong = Array.isArray(v) ? v.length === 0 : typeof v === 'string' ? !v.trim() : !v;
    if (kosong && !errors[k]) return;
    setDisentuh((d) => ({ ...d, [k]: true }));
    setErrors((e) => ({ ...e, [k]: ATURAN[k](form) }));
  };

  const lolos = (k: Kolom) => !!disentuh[k] && !ATURAN[k](form);

  const toggle = (k: 'obtain_method' | 'copy_method', v: string) => {
    set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);
    setDisentuh((d) => ({ ...d, [k]: true }));
  };

  const pilihKtp = (f: File | null) => {
    const baru = { ...form, ktp: f };
    setForm(baru);
    setErrors((e) => ({ ...e, ktp: f ? ATURAN.ktp(baru) : e.ktp }));
  };

  const isiIndividu = () => {
    set('request_from', 'Individu');
    setDisentuh((d) => ({ ...d, request_from: true }));
  };

  const keAtas = () => formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const maju = () => {
    const e = validasiLangkah(form, step);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      fokusGalatPertama(e);
      return;
    }
    setStep((s) => s + 1);
    keAtas();
  };

  const keLangkah = (i: number) => {
    setStep(i);
    keAtas();
  };

  const submit = async () => {
    const e = { ...validasiLangkah(form, 0), ...validasiLangkah(form, 1) };
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setStep(Object.keys(validasiLangkah(form, 0)).length > 0 ? 0 : 1);
      fokusGalatPertama(e);
      return;
    }

    setKirim(true);
    setGalatUmum(null);

    try {
      const fd = new FormData();
      fd.append('ktp', form.ktp!);
      (['request_from', 'name', 'address', 'occupation', 'npwp', 'phone', 'email',
        'information_details', 'information_purpose'] as const)
        .forEach((k) => fd.append(k, k === 'phone' ? rapikanTelepon(form[k]) : form[k].trim()));
      form.obtain_method.forEach((v) => fd.append('obtain_method[]', v));
      form.copy_method.forEach((v) => fd.append('copy_method[]', v));

      const res = await fetch(`${API_BASE_URL}/information-requests`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.data?.ticket_number) {
        setTiket(json.data);
        setForm(KOSONG);
        setDisentuh({});
        setDisalin(null);
        getar(40);
        // Bukan window.scrollTo: di PWA yang menggulir adalah wadah isi,
        // bukan jendela. scrollIntoView menemukan wadahnya sendiri.
        keAtas();
        return;
      }

      if (res.status === 422 && json?.errors) {
        // Galat dari server dipetakan kembali ke kolomnya; kunci larik
        // seperti "copy_method.0" dikembalikan ke "copy_method".
        const map: Galat = {};
        Object.entries(json.errors as Record<string, string[]>).forEach(([k, v]) => {
          map[k.split('.')[0] as Kolom] = v[0];
        });
        setErrors(map);
        setStep(map.ktp || map.request_from ? 0 : 1);
        setGalatUmum('Periksa kembali isian yang ditandai.');
        fokusGalatPertama(map);
        return;
      }

      if (res.status === 429) {
        setGalatUmum('Terlalu banyak pengajuan dalam waktu singkat. Tunggu sekitar satu menit lalu kirim lagi — isian Anda tidak hilang.');
        return;
      }

      setGalatUmum(json?.message || 'Permohonan tidak dapat dikirim. Silakan coba lagi.');
    } catch {
      setGalatUmum('Server tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi — isian Anda tidak hilang.');
    } finally {
      setKirim(false);
    }
  };

  const salinTiket = async () => {
    if (!tiket) return;
    setDisalin((await salinTeks(tiket.ticket_number)) ? 'ya' : 'gagal');
    setTimeout(() => setDisalin(null), 2500);
  };

  const ajukanLagi = () => {
    setTiket(null);
    setStep(0);
    setErrors({});
    setGalatUmum(null);
  };

  /** Ke mana salinan akan dikirim, menurut pilihan pemohon. */
  const tujuanSalinan = form.copy_method.map((m) => {
    if (m === 'Email') return `Email → ${form.email.trim() || 'alamat email Anda'}`;
    if (m === 'Whatsapp') return `WhatsApp → ${rapikanTelepon(form.phone) || 'nomor HP/WA Anda'}`;
    if (m === 'Pos' || m === 'Kurir') return `${m} → ${form.address.trim() ? 'alamat yang Anda isi' : 'alamat Anda'}`;
    if (m === 'Langsung') return 'Langsung → diterima langsung dari petugas PPID';
    return null;
  }).filter(Boolean) as string[];

  const perkiraan = tambahHariKerja(new Date(), HARI_KERJA_JAWABAN);

  return {
    step, form, errors, kirim, galatUmum, tiket, disalin, perkiraan, tujuanSalinan,
    set, sentuh, lolos, toggle, pilihKtp, isiIndividu, maju, keLangkah, submit, salinTiket, ajukanLagi,
  };
}

export type Permohonan = ReturnType<typeof usePermohonan>;
