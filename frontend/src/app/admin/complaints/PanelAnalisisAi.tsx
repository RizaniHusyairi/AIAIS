'use client';

/**
 * Panel saran AI di dalam dialog tanggapan pengaduan.
 *
 * Hanya menyarankan: draf disalin ke kolom tanggapan lewat `onPakaiDraf`, dan
 * petugas tetap yang menyunting serta menyimpannya. Analisis tidak berjalan
 * otomatis saat dialog dibuka — tiap panggilan berbiaya dan mengirim isi
 * pengaduan (tanpa identitas pelapor) ke penyedia luar.
 */

import React, { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import type { Complaint, ComplaintAiInsight } from '@/types';
import { Btn, Badge } from '@/components/admin/ui';
import { Sparkles, AlertTriangle, RefreshCw, ClipboardPaste } from 'lucide-react';

const URGENSI: Record<string, { label: string; color: string }> = {
  rendah: { label: 'Urgensi rendah', color: '#34d399' },
  sedang: { label: 'Urgensi sedang', color: '#fbbf24' },
  tinggi: { label: 'Urgensi tinggi', color: '#fb7185' },
};

export default function PanelAnalisisAi({
  complaint,
  onPakaiDraf,
}: {
  complaint: Complaint;
  onPakaiDraf: (draf: string) => void;
}) {
  const [insight, setInsight] = useState<ComplaintAiInsight | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menganalisis, setMenganalisis] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    // Pemanggil memberi `key={complaint.id}`, jadi ganti pengaduan berarti
    // komponen baru dengan state awal — tidak perlu di-reset di sini.
    let batal = false;

    adminFetch<{ insight: ComplaintAiInsight | null }>(`/complaints/${complaint.id}/ai-insight`).then((res) => {
      if (batal) return;
      if (res.ok) setInsight(res.data?.insight ?? null);
      setMemuat(false);
    });

    return () => { batal = true; };
  }, [complaint.id]);

  const analisis = async () => {
    setMenganalisis(true);
    setGalat(null);
    const res = await adminFetch<ComplaintAiInsight>(`/complaints/${complaint.id}/ai-insight`, { method: 'POST' });
    setMenganalisis(false);

    if (res.ok && res.data) setInsight(res.data);
    else setGalat(res.message);
  };

  const h = insight?.result;
  const urgensi = h ? URGENSI[h.urgensi] : null;

  return (
    <div className="rounded-xl border border-[var(--adm-accent-line)] bg-[var(--adm-accent-soft)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--adm-fg)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--adm-accent)]" /> Saran AI
        </p>
        {!memuat && (
          <Btn variant="ghost" onClick={analisis} disabled={menganalisis}>
            {menganalisis ? (
              <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menganalisis...</span>
            ) : h ? (
              <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Analisis ulang</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Analisis AI</span>
            )}
          </Btn>
        )}
      </div>

      {galat && <p className="text-[11.5px] text-rose-400">{galat}</p>}

      {memuat ? (
        <p className="text-[11.5px] text-[var(--adm-muted)]">Memuat...</p>
      ) : !h ? (
        <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
          Ringkasan, tingkat urgensi, dan draf balasan dapat disiapkan AI. Identitas pelapor dan foto
          tidak ikut dikirim.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {urgensi && <Badge text={urgensi.label} color={urgensi.color} />}
            {h.kategori_saran && h.kategori_saran !== complaint.category && (
              <Badge text={`Kategori saran: ${h.kategori_saran}`} color="#a78bfa" />
            )}
          </div>

          {h.perlu_eskalasi && (
            <p className="flex gap-1.5 text-[11.5px] font-semibold text-rose-400 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Perlu eskalasi{h.alasan_eskalasi ? `: ${h.alasan_eskalasi}` : ''}
            </p>
          )}

          <p className="text-[12px] text-[var(--adm-body)] leading-relaxed">{h.ringkasan}</p>

          {h.tindak_lanjut.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5 text-[11.5px] text-[var(--adm-body)]">
              {h.tindak_lanjut.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}

          <div className="rounded-lg bg-[var(--adm-inset)] border border-[var(--adm-line)] p-3 space-y-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">Draf balasan</p>
            <p className="text-[12px] text-[var(--adm-body)] leading-relaxed whitespace-pre-wrap">{h.draf_balasan}</p>
            <Btn variant="ghost" onClick={() => onPakaiDraf(h.draf_balasan)}>
              <span className="inline-flex items-center gap-1.5"><ClipboardPaste className="w-3.5 h-3.5" /> Pakai draf</span>
            </Btn>
          </div>

          <p className="text-[10.5px] text-[var(--adm-dim)]">
            Saran AI dapat keliru — periksa sebelum dikirim. Dianalisis{' '}
            {new Date(insight!.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.
          </p>
        </div>
      )}
    </div>
  );
}
