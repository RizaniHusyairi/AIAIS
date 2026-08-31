'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch, adminUpload } from '@/lib/adminApi';
import { Tenant } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import { Galat } from '@/components/admin/isian';
import {
  Store, Plus, Pencil, Trash2, RefreshCw, UtensilsCrossed, ShoppingBag, CheckCircle2,
  Sofa, Car, Wrench, ImageOff, UploadCloud,
} from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  food_beverage: { label: 'Makanan & Minuman', color: '#fb7185', icon: UtensilsCrossed },
  retail: { label: 'Retail', color: '#a78bfa', icon: ShoppingBag },
  lounge: { label: 'Lounge', color: '#fbbf24', icon: Sofa },
  transportation: { label: 'Transportasi', color: '#38bdf8', icon: Car },
  services: { label: 'Layanan', color: '#34d399', icon: Wrench },
};

const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp'];
const MAKS_BERKAS = 5 * 1024 * 1024;   // 5 MB, sama dengan batas di backend

/* Isian cepat jam operasional. Hanya mengisi medannya — petugas tetap bebas
   menulis sendiri, karena tiap gerai punya kebiasaan penulisan yang berbeda. */
const JAM_CEPAT = ['24 jam', '06.00 - 20.00 WITA', 'Menyesuaikan jadwal penerbangan'];

const EMPTY: Partial<Tenant> = {
  name: '', category: 'food_beverage', location: '', operating_hours: '',
  contact_phone: '', image_path: '', description: '', is_active: true,
};

const adalahUrl = (v: string) => /^https?:\/\//i.test(v);

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--adm-dim)]">{judul}</h3>
      {children}
    </section>
  );
}

export default function AdminTenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<Partial<Tenant>>(EMPTY);
  const [awal, setAwal] = useState<Partial<Tenant>>(EMPTY);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [tanyaBatal, setTanyaBatal] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjauBerkas, setPratinjauBerkas] = useState('');
  const inputBerkas = useRef<HTMLInputElement>(null);

  /* Alamat pratinjau dibuat di `pilihBerkas`; di sini ia hanya dibebaskan saat
     berganti atau saat halaman ditinggalkan, supaya blob tidak menumpuk. */
  useEffect(() => {
    if (!pratinjauBerkas) return;
    return () => URL.revokeObjectURL(pratinjauBerkas);
  }, [pratinjauBerkas]);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<Tenant[]>('/tenants');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  // Pemuatan pertama tidak lewat load(): `setLoading(true)` di dalamnya
  // berjalan serentak dengan badan efek dan memicu render berantai.
  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<Tenant[]>('/tenants');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((t) => !q || [t.name, t.location, t.description].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    fnb: items.filter((t) => t.category === 'food_beverage').length,
    retail: items.filter((t) => t.category === 'retail').length,
    active: items.filter((t) => t.is_active !== false).length,
  }), [items]);

  /* Perubahan belum tersimpan. Modal kit menutup lewat Esc maupun klik latar;
     tanpa penanda ini, isian yang sudah diketik hilang tanpa peringatan. */
  const kotor = useMemo(
    () => !!berkas || JSON.stringify(form) !== JSON.stringify(awal),
    [form, awal, berkas],
  );

  const isi = (k: keyof Tenant, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };

  const bersihkanBerkas = () => {
    setBerkas(null);
    setPratinjauBerkas('');
    if (inputBerkas.current) inputBerkas.current.value = '';
  };

  const bukaForm = (t?: Tenant) => {
    /* `{ ...t }` membawa serta `image_path` — termasuk URL milik server lain —
       sehingga form dapat mengirimkannya kembali apa adanya saat disimpan. */
    const isian: Partial<Tenant> = t ? { ...t } : EMPTY;
    setForm(isian);
    setAwal(isian);
    setEditId(t ? t.id : null);
    setGalat({});
    bersihkanBerkas();
    setOpen(true);
  };

  const tutup = () => (kotor ? setTanyaBatal(true) : setOpen(false));

  const pilihBerkas = (f: File | null | undefined) => {
    if (!f) return;
    if (!TIPE_BERKAS.includes(f.type)) {
      setToast({ text: 'Foto tenant harus berformat JPG, PNG, atau WEBP', kind: 'error' });
      return;
    }
    if (f.size > MAKS_BERKAS) {
      setToast({ text: 'Ukuran foto tenant maksimal 5 MB', kind: 'error' });
      return;
    }
    setBerkas(f);
    setPratinjauBerkas(URL.createObjectURL(f));
  };

  /* Dikosongkan, bukan dihapus dari objek: backend membedakan "" (kosongkan
     fotonya) dari kunci yang memang tidak dikirim (jangan diapa-apakan). */
  const hapusGambar = () => {
    bersihkanBerkas();
    setForm({ ...form, image_path: '', image_url: null });
  };

  const periksa = () => {
    const g: Record<string, string> = {};
    if (!(form.name ?? '').trim()) g.name = 'Nama tenant wajib diisi.';
    if (!form.category) g.category = 'Kategori wajib dipilih.';
    if (!(form.location ?? '').trim()) g.location = 'Lokasi tenant wajib diisi.';
    if (!(form.operating_hours ?? '').trim()) g.operating_hours = 'Jam operasional wajib diisi.';

    /* Hanya alamat yang ditempel yang diperiksa. Lintasan unggahan
       (`tenants/…`) tidak pernah sampai ke kotak itu. */
    const alamat = (form.image_path ?? '').trim();
    if (alamat && !adalahUrl(alamat) && !alamat.includes('/')) {
      g.image_path = 'Alamat gambar harus diawali http:// atau https://';
    }

    setGalat(g);
    return Object.keys(g).length === 0;
  };

  const save = async () => {
    if (!periksa()) {
      setToast({ text: 'Ada isian yang belum lengkap.', kind: 'error' });
      return;
    }

    setSaving(true);

    /* Multipart tidak mengenal null: isian opsional dikirim sebagai string
       kosong, dan backend yang menyetarakannya jadi null. Semua kunci selalu
       dikirim — termasuk `image_path` — supaya mengosongkan sebuah isian benar-
       benar mengosongkannya, dan supaya alamat gambar yang sudah terpasang
       pulang utuh ketika petugas hanya menyunting hal lain. Boolean dikirim
       '1'/'0': aturan `boolean` Laravel tidak mengenali 'true'/'false'. */
    const fd = new FormData();
    fd.append('name', (form.name ?? '').trim());
    fd.append('category', form.category ?? '');
    fd.append('location', (form.location ?? '').trim());
    fd.append('operating_hours', (form.operating_hours ?? '').trim());
    fd.append('contact_phone', (form.contact_phone ?? '').trim());
    fd.append('description', (form.description ?? '').trim());
    fd.append('is_active', form.is_active !== false ? '1' : '0');
    fd.append('image_path', form.image_path ?? '');
    if (berkas) fd.append('image', berkas);

    const res = editId
      ? await adminUpload<Tenant>(`/tenants/${editId}`, fd)
      : await adminUpload<Tenant>('/tenants', fd);
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Tenant diperbarui' : 'Tenant ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/tenants/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Tenant dihapus' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const toggle = async (t: Tenant) => {
    const res = await adminFetch(`/tenants/${t.id}`, { method: 'PUT', body: { is_active: t.is_active === false } });
    setToast({ text: res.ok ? 'Status tenant diperbarui' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  /* Pratinjau berkas baru menang atas foto yang terpasang. `image_url` sudah
     bernilai null bila lintasannya tidak ditemukan di cakram mana pun — itu
     ditampilkan sebagai catatan, bukan sebagai <img src=""> yang membuat
     peramban memuat ulang halaman sebagai gambar. */
  const gambar = pratinjauBerkas || form.image_url || '';
  const lintasanYatim = !pratinjauBerkas && !!form.image_path && !form.image_url;

  return (
    <>
      <PageHeader
        icon={Store}
        title="Manajemen Tenant & Resto"
        subtitle="Direktori tenant komersial yang tampil pada portal dan aplikasi mobile bandara"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={() => bukaForm()}><Plus className="w-4 h-4" /> Tambah Tenant</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Tenant" value={stats.total} icon={Store} accent="#38bdf8" />
        <StatCard label="Makanan & Minuman" value={stats.fnb} icon={UtensilsCrossed} accent="#fb7185" />
        <StatCard label="Retail" value={stats.retail} icon={ShoppingBag} accent="#a78bfa" />
        <StatCard label="Aktif" value={stats.active} icon={CheckCircle2} accent="#34d399" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Direktori Tenant</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari tenant / lokasi..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada tenant" hint="Tambahkan tenant agar tampil di direktori publik." />
        ) : (
          <Table head={['Tenant', 'Kategori', 'Lokasi', 'Jam Operasi', 'Kontak', 'Status', 'Aksi']}>
            {visible.map((t) => {
              const c = CATEGORY[t.category] ?? { label: t.category, color: '#94a3b8', icon: Store };
              return (
                <Row key={t.id}>
                  <Cell className="max-w-[250px]">
                    <div className="flex items-center gap-2.5">
                      {t.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        /* Penanda kuning saat kolomnya terisi tapi berkasnya tak
                           ditemukan — petugas perlu tahu mana yang bermasalah,
                           bukan sekadar mana yang belum berfoto. */
                        <span
                          className="w-9 h-9 rounded-lg bg-[var(--adm-hover)] flex items-center justify-center flex-shrink-0"
                          title={t.image_path ? 'Berkas foto tidak ditemukan di penyimpanan' : 'Belum ada foto'}
                        >
                          <ImageOff className={`w-4 h-4 ${t.image_path ? 'text-amber-300' : 'text-[var(--adm-dim)]'}`} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--adm-fg)] text-[12.5px] truncate">{t.name}</p>
                        {t.description && <p className="text-[var(--adm-muted)] text-[11px] truncate">{t.description}</p>}
                      </div>
                    </div>
                  </Cell>
                  <Cell><Badge text={c.label} color={c.color} /></Cell>
                  <Cell className="max-w-[180px]"><span className="truncate block">{t.location}</span></Cell>
                  <Cell className="whitespace-nowrap">{t.operating_hours}</Cell>
                  <Cell>{t.contact_phone || '-'}</Cell>
                  <Cell>
                    <button onClick={() => toggle(t)} className="cursor-pointer" title="Klik untuk mengubah status">
                      <Badge text={t.is_active === false ? 'Nonaktif' : 'Aktif'} color={t.is_active === false ? '#94a3b8' : '#34d399'} />
                    </button>
                  </Cell>
                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => bukaForm(t)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(t.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Cell>
                </Row>
              );
            })}
          </Table>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={tutup}
        wide
        title={editId ? 'Ubah Tenant' : 'Tambah Tenant Baru'}
        footer={
          <>
            <Btn variant="ghost" onClick={tutup}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-7">
          <Bagian judul="Identitas">
            <div>
              <Field label="Nama Tenant" required value={form.name} onChange={(v) => isi('name', v)} placeholder="Kopi Nusantara" />
              <Galat pesan={galat.name} />
            </div>

            {/* Kategori adalah keputusan terpenting di form ini — ia yang
                menentukan gerai muncul di section transportasi halaman publik
                atau tidak. Karena itu dipilih dari kartu berikon, bukan dari
                daftar gulung yang isinya baru terlihat setelah dibuka. */}
            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)] mb-2">
                Kategori <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {Object.entries(CATEGORY).map(([value, c]) => {
                  const Icon = c.icon;
                  const aktif = form.category === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => isi('category', value)}
                      className={`rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer ring-1 ${
                        aktif ? 'ring-2 bg-[var(--adm-hover)]' : 'ring-[var(--adm-line)] hover:bg-[var(--adm-hover)]'
                      }`}
                      style={aktif ? { borderColor: c.color, boxShadow: `inset 0 0 0 1px ${c.color}`, color: c.color } : undefined}
                    >
                      <Icon className="w-5 h-5" style={{ color: c.color }} />
                      <span className={`text-[11px] font-semibold leading-tight ${aktif ? '' : 'text-[var(--adm-body)]'}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <Galat pesan={galat.category} />
            </div>

            <Field label="Deskripsi" type="textarea" rows={3} value={form.description} onChange={(v) => isi('description', v)} placeholder="Sajian, layanan, atau tujuan yang dilayani gerai ini." />
          </Bagian>

          <Bagian judul="Lokasi & Jam Layanan">
            <div>
              <Field label="Lokasi" required value={form.location} onChange={(v) => isi('location', v)} placeholder="Lantai 2, area keberangkatan" />
              <Galat pesan={galat.location} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field label="Jam Operasional" required value={form.operating_hours} onChange={(v) => isi('operating_hours', v)} placeholder="06.00 - 21.00 WITA" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {JAM_CEPAT.map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => isi('operating_hours', j)}
                      className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-[var(--adm-hover)] text-[var(--adm-body)] hover:text-[var(--adm-accent)] transition-colors cursor-pointer"
                    >
                      {j}
                    </button>
                  ))}
                </div>
                <Galat pesan={galat.operating_hours} />
              </div>

              <Field label="Telepon" value={form.contact_phone} onChange={(v) => isi('contact_phone', v)} placeholder="0541 123456" />
            </div>
          </Bagian>

          <Bagian judul="Foto">
            <div className="rounded-xl bg-[var(--adm-hover)] ring-1 ring-white/8 p-4 space-y-3">
              <label className="block text-[11.5px] font-semibold text-[var(--adm-body)]">
                Foto Tenant <span className="text-[var(--adm-dim)]">(opsional — JPG/PNG/WEBP, maks 5 MB)</span>
              </label>

              {gambar ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gambar}
                    alt="Pratinjau foto tenant"
                    className="w-full aspect-video object-cover rounded-xl border border-[var(--adm-line)]"
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
                  />
                  <button
                    type="button"
                    onClick={hapusGambar}
                    title="Hapus foto"
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/70 text-white hover:bg-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--adm-line)] flex flex-col items-center justify-center gap-1.5 text-center px-4">
                  <UploadCloud className="w-7 h-7 text-[var(--adm-accent)]" />
                  <span className="text-[11.5px] text-[var(--adm-muted)]">Belum ada foto — kartu publik memakai ikon kategori.</span>
                </div>
              )}

              {lintasanYatim && (
                <p className="text-[11px] text-amber-300 leading-relaxed">
                  Berkas foto lama tidak ditemukan di penyimpanan mana pun
                  (<code className="text-[var(--adm-accent)]">{form.image_path}</code>). Unggah penggantinya atau hapus rujukannya.
                </p>
              )}

              <input
                ref={inputBerkas}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => pilihBerkas(e.target.files?.[0])}
                className="block w-full text-[12px] text-[var(--adm-body)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:font-semibold file:bg-cyan-500/20 file:text-[var(--adm-accent)] hover:file:bg-cyan-500/30 cursor-pointer"
              />

              {/* Jalur kedua: sebagian foto gerai sudah tayang di server lain dan
                  cukup dirujuk. Disembunyikan begitu ada berkas baru dipilih —
                  berkas selalu menang atas alamat. */}
              {!berkas && (
                <div className="pt-1">
                  <Field
                    label="atau tempel alamat gambar"
                    value={adalahUrl(form.image_path ?? '') ? form.image_path : ''}
                    onChange={(v) => isi('image_path', v)}
                    placeholder="https://..."
                  />
                  <Galat pesan={galat.image_path} />
                </div>
              )}
            </div>
          </Bagian>

          <Bagian judul="Publikasi">
            <Field label="Tampilkan di direktori publik" type="checkbox" value={form.is_active !== false} onChange={(v) => isi('is_active', v)} />
          </Bagian>
        </div>
      </Modal>

      <ConfirmDialog open={delId !== null} onCancel={() => setDelId(null)} onConfirm={remove} message="Tenant ini akan dihapus permanen dari direktori publik. Lanjutkan?" />

      <ConfirmDialog
        open={tanyaBatal}
        title="Tutup tanpa menyimpan?"
        message="Perubahan pada form ini belum disimpan dan akan hilang. Tutup saja?"
        onCancel={() => setTanyaBatal(false)}
        onConfirm={() => { setTanyaBatal(false); setOpen(false); }}
      />

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
