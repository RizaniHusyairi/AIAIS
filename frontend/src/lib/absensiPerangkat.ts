/**
 * Identitas peserta yang diingat oleh PERANGKATNYA SENDIRI.
 *
 * Orang yang sama menghadiri banyak rapat, dan mengetik ulang nama, unit
 * kerja, dan nomor teleponnya di layar ponsel setiap kali adalah bagian
 * paling melelahkan dari daftar hadir digital. Sesudah sekali mengisi,
 * ketiganya disimpan di ponsel yang bersangkutan dan dituangkan kembali ke
 * formulir rapat berikutnya.
 *
 * ────────────────────────────────────────────────────────────────────────
 * TIGA BATAS YANG TIDAK BOLEH DILANGGAR
 *
 *  1. **Tanda tangan TIDAK PERNAH ikut disimpan.** Godaannya jelas — itu
 *     bagian yang paling merepotkan — tetapi tanda tangan yang dibubuhkan
 *     sendiri oleh program, tanpa orangnya menggoreskan apa pun saat itu,
 *     bukan lagi tanda tangan. Daftar hadir yang ditandatangani begitu tidak
 *     membuktikan kehadiran siapa pun. Kanvasnya selalu dimulai kosong.
 *
 *  2. **Tidak pernah meninggalkan perangkat.** Nilainya hanya dibaca untuk
 *     mengisi formulir di layar; yang berangkat ke server tetap apa yang
 *     ditekan pengguna pada tombol kirim. Tidak ada cookie, tidak ada
 *     pengiriman diam-diam. Ini data pribadi milik pemilik ponselnya sendiri
 *     (UU 27/2022), dan satu-satunya tempat yang pantas menyimpannya adalah
 *     ponsel itu.
 *
 *  3. **Selalu dapat disunting dan dilupakan.** Isian yang terisi otomatis
 *     tetap medan biasa yang bisa ditimpa, dan layarnya menyediakan jalan
 *     "bukan saya" yang membersihkan formulir sekaligus menghapus simpanan
 *     ini. Satu ponsel di pintu ruang rapat kerap dipakai bergantian.
 * ────────────────────────────────────────────────────────────────────────
 */

const KUNCI = 'aiais_absensi_peserta';

export type PesertaTersimpan = {
  name: string;
  department: string;
  phone: string;
};

/** Benar bila ketiga medannya benar-benar berisi. */
function utuh(nilai: unknown): nilai is PesertaTersimpan {
  if (typeof nilai !== 'object' || nilai === null) return false;

  const p = nilai as Record<string, unknown>;

  return typeof p.name === 'string' && p.name.trim() !== ''
    && typeof p.department === 'string' && p.department.trim() !== ''
    && typeof p.phone === 'string' && p.phone.trim() !== '';
}

/**
 * Identitas terakhir yang dipakai di perangkat ini, bila ada.
 *
 * JANGAN memanggilnya saat render pertama. `localStorage` tidak ada di
 * server, jadi nilainya akan berbeda antara markah kiriman server dan hasil
 * hidrasi — React membuang seluruh pohonnya dan menggambar ulang. Panggil
 * dari dalam `useEffect`, sesudah komponen terpasang.
 */
export function bacaPeserta(): PesertaTersimpan | null {
  if (typeof window === 'undefined') return null;

  try {
    const mentah = window.localStorage.getItem(KUNCI);
    if (!mentah) return null;

    const nilai = JSON.parse(mentah);

    // Bentuk yang tidak utuh dibuang, bukan dipakai sebagian: formulir yang
    // terisi separuh lebih membingungkan daripada formulir kosong.
    return utuh(nilai) ? nilai : null;
  } catch {
    return null;
  }
}

/** Simpan untuk rapat berikutnya. Dipanggil setelah kehadiran benar-benar tercatat. */
export function simpanPeserta(peserta: PesertaTersimpan): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(KUNCI, JSON.stringify({
      name: peserta.name.trim(),
      department: peserta.department.trim(),
      phone: peserta.phone.trim(),
    }));
  } catch {
    // Mode penyamaran dan kuota penuh sama-sama melempar di sini. Gagal
    // menyimpan bukan kegagalan absensinya — kehadirannya sudah tercatat di
    // server, dan itu yang penting.
  }
}

/** Lupakan identitas di perangkat ini. */
export function lupakanPeserta(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(KUNCI);
  } catch {
    /* lihat catatan pada simpanPeserta */
  }
}
