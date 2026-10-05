/** "3 menit lalu", "2 hari lalu" — umur antrean lebih bermakna daripada jam. */
export function relatif(iso: string, kini: number): string {
  const detik = Math.max(0, Math.round((kini - new Date(iso).getTime()) / 1000));
  if (detik < 60) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  return hari < 30 ? `${hari} hari lalu` : new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
