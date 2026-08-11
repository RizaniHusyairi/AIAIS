/**
 * Tetapan gerak halaman Portal Aplikasi — "APT Pranoto Digital Command Center".
 *
 * Dipisahkan dari view supaya irama animasi dapat disetel tanpa menyentuh
 * markup, dan supaya angka yang sama tidak ditulis ulang di banyak tempat.
 * Seluruh nilai dalam DETIK (satuan yang dipakai Framer Motion).
 *
 * Proyek ini memakai Framer Motion di seluruh halaman publik; animasi di sini
 * mengikuti pustaka yang sama alih-alih menambah GSAP hanya untuk satu rute.
 */

/* ------------------------------------------------------------------ */
/*  1. Boot — urutan inisialisasi saat halaman pertama dibuka          */
/* ------------------------------------------------------------------ */
export const BOOT = {
  logo: 0.2,
  eyebrow: 0.35,
  headline: 0.5,
  /** Jeda antar kata pada headline. */
  headlineWord: 0.11,
  desc: 0.7,
  panel: 0.9,
  /** Baris statistik pada panel, dihitung dari `panel`. */
  panelRow: 0.12,
  core: 1.1,
  /** Tiga cincin orbit, satu per satu. */
  rings: [1.2, 1.35, 1.5] as const,
  lines: 1.6,
  nodes: 1.8,
  /** Jeda antar simpul; 5 simpul selesai pada ±2,4 s. */
  nodeStep: 0.15,
  /** Halaman dianggap masuk idle setelah titik ini. */
  idle: 2.5,
  /** Bilah bawah muncul terakhir, setelah sistem "menyala". */
  footer: 2.4,
} as const;

/** Kurva masuk yang tenang — tanpa pantulan, sesuai nada portal kedinasan. */
export const EASE_ENTER = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  2. Idle — gerak menerus yang membuat sistem terasa hidup           */
/* ------------------------------------------------------------------ */

/**
 * Napas inti: sangat pelan, tidak boleh terbaca sebagai denyut.
 *
 * `scale` sengaja tidak `as const` — Framer Motion menuntut larik keyframe
 * yang dapat diubah, bukan `readonly`.
 */
export const CORE_BREATH: { scale: number[]; duration: number } = {
  scale: [1, 1.025, 1],
  duration: 4.6,
};

/**
 * Putaran tiga cincin orbit. Lambat dengan sengaja: tujuannya bukan agar
 * pengunjung sadar cincinnya berputar, melainkan agar sistem tidak terlihat
 * membeku. Arah berselang-seling supaya tidak menyerupai pemuat (spinner).
 */
export const RING_SPIN = [
  { deg: 360, duration: 52 },
  { deg: -360, duration: 80 },
  { deg: 360, duration: 112 },
] as const;

/** Pesawat menyusuri cincin terluar. */
export const AIRCRAFT_ORBIT = 26;

/**
 * Jeda denyut tiap simpul. Berbeda-beda dengan sengaja — bila serentak,
 * hasilnya berkedip seperti papan alarm, bukan sistem yang bekerja.
 * Urutan mengikuti urutan `EMPLOYEE_APPS`.
 */
export const NODE_PULSE_DELAY = [0, 1.2, 2.4, 0.7, 1.8] as const;
export const NODE_PULSE_DURATION = 3.6;
export const NODE_FLOAT_DURATION = 5.4;

/**
 * Paket data pada garis penghubung.
 *
 * Arah dibuat dua arah supaya terbaca sebagai komunikasi, bukan siaran satu
 * arah: simpul bernomor genap menerima dari inti, ganjil mengirim ke inti.
 */
export const DATA_TRIP = { idle: 4.6, active: 2.3, step: 0.95 } as const;
export const dataFlowsInward = (index: number) => index % 2 === 1;

/** Latar: kisi dan gumpalan cahaya yang hanyut sangat pelan. */
export const GRID_DRIFT = 46;
export const GLOW_DRIFT = [26, 32] as const;

/** Indikator status pada bilah bawah. */
export const STATUS_CYCLE = { duration: 3.4, step: 1.1 } as const;

/* ------------------------------------------------------------------ */
/*  3. Interaksi                                                       */
/* ------------------------------------------------------------------ */

/** Peredupan simpul yang tidak disorot — diredupkan, bukan disembunyikan. */
export const DIMMED_OPACITY = 0.55;
/** Durasi seluruh peralihan sorot (detik). */
export const HOVER_DURATION = 0.38;

/** Lama animasi angka menghitung naik saat boot (milidetik). */
export const COUNT_UP_MS = 900;
