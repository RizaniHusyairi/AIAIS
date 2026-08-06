import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Versi produk dibaca dari berkas `VERSION` di akar monorepo — satu-satunya
 * sumber kebenaran, dipakai bersama backend Laravel (lihat config/app.php).
 *
 * Urutan pencarian:
 *   1. Variabel lingkungan  — untuk hosting/CI yang menyuntikkan sendiri.
 *   2. <repo-root>/VERSION  — jalur normal.
 *   3. package.json         — cadangan bila frontend dideploy terpisah tanpa
 *                             akar monorepo (nilainya adalah cermin, bukan sumber).
 */
function resolveVersion(): string {
  if (process.env.NEXT_PUBLIC_APP_VERSION) return process.env.NEXT_PUBLIC_APP_VERSION;

  try {
    return readFileSync(join(process.cwd(), "..", "VERSION"), "utf8").trim();
  } catch {
    /* lanjut ke cadangan berikutnya */
  }

  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    if (typeof pkg.version === "string") return pkg.version;
  } catch {
    /* biarkan jatuh ke nilai aman */
  }

  return "0.0.0";
}

const APP_VERSION = resolveVersion();

// Jalur yang dianjurkan Next 16: NEXT_PUBLIC_* dibaca dari process.env saat build.
// Ditulis di sini supaya juga terlihat oleh kode sisi server.
process.env.NEXT_PUBLIC_APP_VERSION = APP_VERSION;

const nextConfig: NextConfig = {
  // Izinkan dev server diakses dari perangkat lain di LAN
  allowedDevOrigins: ["10.10.20.127", "10.10.20.42", "10.10.20.*", "*.local", "localhost:3000"],

  /**
   * Dokumen Next 16 menandai `env` sebagai `version: legacy`, tetapi kuncinya
   * masih digabungkan oleh `lib/static-env.js` dan disertakan saat inlining
   * oleh `lib/inline-static-env.js`. Dipasang sebagai jaminan agar nilainya
   * pasti ter-inline ke bundel klien.
   *
   * Catatan: JANGAN menaruh waktu build di sini. `next.config.ts` dievaluasi
   * di lebih dari satu proses saat build, sehingga `new Date()` bisa
   * menghasilkan stempel berbeda antar-chunk. Metadata build tinggal di
   * server, lewat endpoint /api/<versi>/version.
   */
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
};

export default nextConfig;
