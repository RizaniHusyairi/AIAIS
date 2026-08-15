'use client';

/**
 * Surat dinas dan rantai verifikasinya.
 *
 * TIGA KEPUTUSAN BENTUK, semuanya berasal dari sifat alurnya:
 *
 *  1. **Tindakan yang tersedia dihitung dari giliran, bukan dari peran.**
 *     Tombol setujui/tolak/minta-revisi hanya muncul bila surat itu memang
 *     sedang pada giliran pengguna ini. Menampilkan tombol yang pasti ditolak
 *     backend membuat orang mengira aplikasinya rusak — padahal ia sedang
 *     dijaga.
 *
 *  2. **Rantai verifikasi digambar sebagai urutan bernomor**, dengan tahap
 *     yang sedang berjalan ditandai. Status surat sendiri ("Verifikasi
 *     Tambahan") tidak memberi tahu siapa yang sedang ditunggu; urutannya yang
 *     menjawab.
 *
 *  3. **Jejak audit ditampilkan apa adanya dan tidak dapat disunting.** Inilah
 *     satu-satunya catatan yang menjawab siapa menyetujui apa dan kapan.
 *
 * Penyaring `scope` dikirim ke backend, bukan disaring di klien: seorang
 * pegawai hanya perlu melihat kotak masuknya, dan mengunduh seluruh surat
 * kantor untuk menyaring tiga di antaranya adalah pemborosan yang juga
 * membocorkan isi surat yang tak perlu ia lihat.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch, getUser } from '@/lib/adminApi';
import type { Persuratan, StatusSurat, AdminUser } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, InfoNote, stagger,
} from '@/components/admin/ui';
import {
  Mail, Plus, Trash2, RefreshCw, Inbox, CircleCheck, CircleX, RotateCcw,
  ExternalLink, History, Gavel, Signature,
} from 'lucide-react';
import { motion } from 'framer-motion';

const WARNA_STATUS: Record<StatusSurat, string> = {
  'Verifikasi Tambahan': '#38bdf8',
  'Menunggu Persetujuan Atasan': '#a78bfa',
  'Disetujui': '#34d399',
  'Ditolak': '#fb7185',
  'Revisi Diperlukan': '#fbbf24',
};

const SCOPE = [
  { value: '', label: 'Semua Surat' },
  { value: 'inbox', label: 'Giliran Saya' },
  { value: 'mine', label: 'Saya Buat' },
  { value: 'verifier', label: 'Saya Verifikator' },
  { value: 'approver', label: 'Saya Penandatangan' },
];

/** Kalimat manusiawi untuk tiap jenis peristiwa pada jejak audit. */
const KALIMAT_EVENT: Record<string, string> = {
  created: 'membuat surat',
  assigned: 'meneruskan giliran',
  verification_requested: 'meminta verifikasi',
  verified: 'menyetujui tahap verifikasi',
  rejected: 'menolak surat',
  revision_requested: 'meminta revisi',
  revision_submitted: 'mengirim hasil revisi',
  final_approved: 'menandatangani surat',
};

const tgl = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const KOSONG = {
  letter_type: '', letter_date: '', recipient_address: '', subject: '',
  final_approver_id: '', verifiers: '', attachments: '',
};

export default function AdminPersuratanPage() {
  const [saya, setSaya] = useState<AdminUser | null>(null);
  const [items, setItems] = useState<Persuratan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('');
  const [toast, setToast] = useState<ToastMsg>(null);
  const [delItem, setDelItem] = useState<Persuratan | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [saving, setSaving] = useState(false);

  const [rinci, setRinci] = useState<Persuratan | null>(null);
  const [komentar, setKomentar] = useState('');
  const [tautan, setTautan] = useState('');

  const muat = useCallback(async () => {
    const res = await adminFetch<Persuratan[]>(`/persuratan${scope ? `?scope=${scope}` : ''}`);
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    let batal = false;

    (async () => {
      // Identitas dibaca di dalam callback asinkron, bukan langsung di badan
      // efek: `getUser()` menyentuh localStorage — tak tersedia saat render
      // server — sementara menyetel state serentak di badan efek memicu
      // render berantai.
      const res = await adminFetch<Persuratan[]>(`/persuratan${scope ? `?scope=${scope}` : ''}`);
      if (batal) return;
      setSaya(getUser());
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, [scope]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((it) =>
      it.subject.toLowerCase().includes(s)
      || it.letter_type.toLowerCase().includes(s)
      || (it.user?.name ?? '').toLowerCase().includes(s));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    giliran: items.filter((it) => it.assigned_to_user_id === saya?.id).length,
    disetujui: items.filter((it) => it.status === 'Disetujui').length,
    revisi: items.filter((it) => it.status === 'Revisi Diperlukan').length,
  }), [items, saya]);

  const bukaRincian = async (it: Persuratan) => {
    const res = await adminFetch<Persuratan>(`/persuratan/${it.id}`);
    if (res.ok && res.data) {
      setRinci(res.data);
      setKomentar('');
      setTautan('');
    } else setToast({ text: res.message, kind: 'error' });
  };

  /** Tindakan yang benar-benar tersedia bagi pengguna ini atas surat ini. */
  const bisa = (s: Persuratan | null) => {
    if (!s || !saya) return { verifikasi: false, revisi: false, kirimRevisi: false, tandaTangan: false };

    const giliran = s.assigned_to_user_id === saya.id;
    const selesai = s.status === 'Disetujui' || s.status === 'Ditolak';

    return {
      verifikasi: giliran && !selesai && s.status === 'Verifikasi Tambahan',
      revisi: giliran && !selesai && s.status !== 'Revisi Diperlukan',
      kirimRevisi: !selesai && s.status === 'Revisi Diperlukan' && s.user_id === saya.id,
      tandaTangan: giliran && !selesai && s.status === 'Menunggu Persetujuan Atasan' && s.final_approver_id === saya.id,
    };
  };

  const kirim = async (aksi: string, body: Record<string, unknown>) => {
    if (!rinci) return;

    const res = await adminFetch<Persuratan>(`/persuratan/${rinci.id}/${aksi}`, { method: 'POST', body });
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });

    if (res.ok) {
      if (res.data) setRinci(res.data);
      setKomentar('');
      setTautan('');
      muat();
    }
  };

  const simpan = async () => {
    setSaving(true);

    const pecah = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

    const res = await adminFetch('/persuratan', {
      method: 'POST',
      body: {
        letter_type: form.letter_type,
        letter_date: form.letter_date,
        recipient_address: form.recipient_address,
        subject: form.subject,
        final_approver_id: Number(form.final_approver_id),
        verifiers: pecah(form.verifiers).map(Number).filter((n) => !Number.isNaN(n)),
        attachments: pecah(form.attachments),
      },
    });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setForm(KOSONG);
      setToast({ text: res.message, kind: 'success' });
      muat();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (!delItem) return;
    const res = await adminFetch(`/persuratan/${delItem.id}`, { method: 'DELETE' });
    setDelItem(null);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  const izin = bisa(rinci);

  return (
    <>
      <PageHeader
        icon={Mail}
        title="Persuratan"
        subtitle="Surat dinas, rantai verifikasi, dan jejak persetujuannya"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={muat}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={() => { setForm({ ...KOSONG, letter_date: new Date().toISOString().slice(0, 10) }); setOpen(true); }}>
              <Plus className="w-4 h-4" /> Buat Surat
            </Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Surat Tertampil" value={stats.total} icon={Mail} accent="#38bdf8" />
        <StatCard label="Menunggu Giliran Saya" value={stats.giliran} icon={Inbox} accent="#fbbf24" hint="Perlu tindakan Anda" />
        <StatCard label="Disetujui" value={stats.disetujui} icon={CircleCheck} accent="#34d399" />
        <StatCard label="Perlu Revisi" value={stats.revisi} icon={RotateCcw} accent="#a78bfa" />
      </motion.div>

      <div className="mt-4">
        <InfoNote>
          Tindakan atas sebuah surat hanya terbuka bagi <strong>pemegang gilirannya</strong>. Surat
          yang sudah disetujui atau ditolak tidak dapat digerakkan lagi oleh siapa pun, dan jejak
          persetujuannya tidak dapat disunting.
        </InfoNote>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <div className="flex flex-wrap gap-1.5">
            {SCOPE.map((s) => (
              <button
                key={s.value}
                onClick={() => { setLoading(true); setScope(s.value); }}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors cursor-pointer ${
                  scope === s.value ? 'bg-cyan-500/20 text-[var(--adm-accent)] ring-1 ring-cyan-400/40' : 'bg-[var(--adm-hover)] text-[var(--adm-muted)] hover:text-[var(--adm-body)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Cari perihal, jenis, pembuat..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Tidak ada surat" hint="Buat surat baru atau ubah penyaring di atas." />
        ) : (
          <Table head={['Perihal', 'Jenis & Tanggal', 'Pembuat', 'Giliran', 'Status', 'Aksi']}>
            {visible.map((it) => (
              <Row key={it.id}>
                <Cell>
                  <span className="font-bold text-[var(--adm-fg)] text-[12.5px]">{it.subject}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">
                    {it.verifications_count ?? 0} verifikator
                  </span>
                </Cell>
                <Cell>
                  <span className="text-[var(--adm-body)]">{it.letter_type}</span>
                  <span className="block text-[11px] text-[var(--adm-dim)]">{String(it.letter_date).slice(0, 10)}</span>
                </Cell>
                <Cell>{it.user?.name ?? '—'}</Cell>
                <Cell>
                  {it.assignee ? (
                    <span className={it.assigned_to_user_id === saya?.id ? 'text-amber-300 font-bold' : 'text-[var(--adm-body)]'}>
                      {it.assigned_to_user_id === saya?.id ? 'Anda' : it.assignee.name}
                    </span>
                  ) : <span className="text-[var(--adm-dim)]">selesai</span>}
                </Cell>
                <Cell><Badge text={it.status} color={WARNA_STATUS[it.status] ?? '#94a3b8'} /></Cell>
                <Cell>
                  <span className="flex gap-1">
                    <button
                      onClick={() => bukaRincian(it)}
                      className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Rincian & tindakan"
                    >
                      <History className="w-3 h-3" />
                    </button>
                    {it.user_id === saya?.id && (
                      <button
                        onClick={() => setDelItem(it)}
                        className="w-7 h-7 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Panel>

      {/* ---- Rincian, rantai, tindakan, jejak ---- */}
      <Modal
        open={rinci !== null}
        onClose={() => setRinci(null)}
        title="Rincian Surat"
        footer={<Btn variant="ghost" onClick={() => setRinci(null)}>Tutup</Btn>}
      >
        {rinci && (
          <div className="space-y-5">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4">
              <p className="text-[13px] font-bold text-[var(--adm-fg)]">{rinci.subject}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                {rinci.letter_type} · {String(rinci.letter_date).slice(0, 10)}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">Kepada: {rinci.recipient_address}</p>
              <p className="mt-1 text-[11.5px] text-[var(--adm-muted)]">
                Penandatangan: {rinci.final_approver?.name ?? '—'}
              </p>

              {(rinci.attachments?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {rinci.attachments!.map((a, i) => (
                    <a
                      key={a} href={a} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--adm-accent)] hover:text-[var(--adm-accent)]"
                    >
                      <ExternalLink className="w-3 h-3" /> Lampiran {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {rinci.signed_document_link && (
                <a
                  href={rinci.signed_document_link} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-300 hover:text-emerald-200"
                >
                  <Signature className="w-3.5 h-3.5" /> Dokumen bertanda tangan
                </a>
              )}
            </div>

            {/* Rantai verifikasi sebagai urutan bernomor. */}
            <div>
              <p className="text-[12px] font-bold text-[var(--adm-body)]">Rantai Verifikasi</p>
              {(rinci.verifications?.length ?? 0) === 0 ? (
                <p className="mt-2 text-[11.5px] text-[var(--adm-dim)]">
                  Tanpa verifikator — surat langsung ke penandatangan akhir.
                </p>
              ) : (
                <ol className="mt-2 space-y-1.5">
                  {rinci.verifications!.map((v) => {
                    const aktif = v.status === 'Menunggu' && rinci.assigned_to_user_id === v.user_id;

                    return (
                      <li
                        key={v.id}
                        className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ring-1 ${
                          aktif ? 'bg-amber-500/10 ring-amber-400/30' : 'bg-[var(--adm-hover)] ring-white/8'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-[var(--adm-hover)] text-[11px] font-bold text-[var(--adm-body)] flex items-center justify-center flex-shrink-0">
                          {v.order}
                        </span>
                        <span className="flex-1 min-w-0 text-[12px] text-[var(--adm-body)] truncate">
                          {v.user?.name ?? `Pengguna #${v.user_id}`}
                          {v.comments && <span className="block text-[11px] text-[var(--adm-dim)]">{v.comments}</span>}
                        </span>
                        <span className={`text-[11px] font-bold ${
                          v.status === 'Disetujui' ? 'text-emerald-300'
                            : v.status === 'Ditolak' ? 'text-rose-300'
                              : aktif ? 'text-amber-300' : 'text-[var(--adm-dim)]'
                        }`}>
                          {aktif ? 'Menunggu ⟵' : v.status}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Tindakan — hanya yang benar-benar terbuka. */}
            {(izin.verifikasi || izin.revisi || izin.kirimRevisi || izin.tandaTangan) ? (
              <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
                <p className="text-[12px] font-bold text-[var(--adm-body)]">Tindakan Anda</p>

                {(izin.verifikasi || izin.revisi) && (
                  <Field
                    label="Catatan" type="textarea" rows={3}
                    value={komentar}
                    placeholder="Wajib diisi bila menolak atau meminta revisi."
                    onChange={(v) => setKomentar(String(v))}
                  />
                )}

                {izin.tandaTangan && (
                  <Field
                    label="Tautan Dokumen Bertanda Tangan" required
                    value={tautan}
                    placeholder="https://drive.google.com/..."
                    onChange={(v) => setTautan(String(v))}
                  />
                )}

                {izin.kirimRevisi && (
                  <Field
                    label="Tautan Lampiran Hasil Revisi" required type="textarea" rows={3}
                    value={tautan}
                    placeholder="Satu tautan per baris (Google Drive/Docs)."
                    onChange={(v) => setTautan(String(v))}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  {izin.verifikasi && (
                    <Btn onClick={() => kirim('approve', { comments: komentar.trim() || null })}>
                      <CircleCheck className="w-4 h-4" /> Setujui Verifikasi
                    </Btn>
                  )}
                  {izin.tandaTangan && (
                    <Btn onClick={() => kirim('final-approve', { signed_document_link: tautan.trim() })}>
                      <Signature className="w-4 h-4" /> Tandatangani
                    </Btn>
                  )}
                  {izin.kirimRevisi && (
                    <Btn onClick={() => kirim('submit-revision', {
                      attachments: tautan.split('\n').map((x) => x.trim()).filter(Boolean),
                    })}>
                      <RotateCcw className="w-4 h-4" /> Kirim Revisi
                    </Btn>
                  )}
                  {izin.revisi && (
                    <Btn variant="ghost" onClick={() => kirim('request-revision', { comments: komentar.trim() })}>
                      <RotateCcw className="w-4 h-4" /> Minta Revisi
                    </Btn>
                  )}
                  {(izin.verifikasi || izin.tandaTangan) && (
                    <Btn variant="ghost" onClick={() => kirim('reject', { comments: komentar.trim() })}>
                      <CircleX className="w-4 h-4" /> Tolak
                    </Btn>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11.5px] text-[var(--adm-muted)]">
                {rinci.status === 'Disetujui' || rinci.status === 'Ditolak'
                  ? 'Surat ini sudah selesai dan tidak dapat digerakkan lagi.'
                  : 'Surat ini sedang bukan pada giliran Anda.'}
              </p>
            )}

            {(rinci.revisions?.length ?? 0) > 0 && (
              <div>
                <p className="text-[12px] font-bold text-[var(--adm-body)]">Permintaan Revisi</p>
                <ul className="mt-2 space-y-2">
                  {rinci.revisions!.map((r) => (
                    <li key={r.id} className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 px-4 py-3">
                      <p className="text-[11.5px] text-[var(--adm-body)] leading-relaxed">{r.comments}</p>
                      <p className="mt-1 text-[11px] text-[var(--adm-dim)]">
                        {r.user?.name ?? 'Petugas'} · dari tahap {r.previous_status} · {tgl(r.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[12px] font-bold text-[var(--adm-body)] flex items-center gap-2">
                <Gavel className="w-3.5 h-3.5 text-[var(--adm-muted)]" /> Jejak Persetujuan
              </p>
              <ol className="mt-2 space-y-1">
                {(rinci.events ?? []).map((e) => (
                  <li key={e.id} className="text-[11.5px] text-[var(--adm-muted)]">
                    <span className="text-[var(--adm-body)] font-semibold">{e.actor?.name ?? 'Sistem'}</span>
                    {' '}{KALIMAT_EVENT[e.event_type] ?? e.event_type}
                    <span className="text-[var(--adm-dim)]"> · {tgl(e.created_at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Buat surat ---- */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Surat Dinas"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={simpan} disabled={saving}>{saving ? 'Menyimpan...' : 'Buat & Kirim'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Jenis Surat" required value={form.letter_type} placeholder="Nota Dinas" onChange={(v) => setForm({ ...form, letter_type: String(v) })} />
          <Field label="Tanggal Surat" required type="date" value={form.letter_date} onChange={(v) => setForm({ ...form, letter_date: String(v) })} />
          <Field label="Perihal" required value={form.subject} onChange={(v) => setForm({ ...form, subject: String(v) })} />
          <Field label="Alamat Tujuan" required type="textarea" rows={2} value={form.recipient_address} onChange={(v) => setForm({ ...form, recipient_address: String(v) })} />
          <Field label="ID Penandatangan Akhir" required type="number" value={form.final_approver_id} onChange={(v) => setForm({ ...form, final_approver_id: String(v) })} />
          <Field
            label="ID Verifikator (berurutan)" type="textarea" rows={3}
            value={form.verifiers}
            placeholder="Satu ID per baris. Urutannya menentukan urutan verifikasi."
            onChange={(v) => setForm({ ...form, verifiers: String(v) })}
          />
          <Field
            label="Tautan Lampiran" type="textarea" rows={3}
            value={form.attachments}
            placeholder="Satu tautan per baris (Google Drive/Docs saja)."
            onChange={(v) => setForm({ ...form, attachments: String(v) })}
          />
          <p className="text-[11.5px] text-[var(--adm-muted)]">
            Anda tidak dapat menjadi penandatangan maupun verifikator atas surat yang Anda buat
            sendiri. Bila daftar verifikator dikosongkan, surat langsung menuju penandatangan akhir.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={delItem !== null}
        onCancel={() => setDelItem(null)}
        onConfirm={remove}
        message={
          delItem
            ? `Surat "${delItem.subject}" akan dihapus permanen. Penghapusan hanya berhasil bila belum ada verifikator yang menjawab. Lanjutkan?`
            : ''
        }
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
