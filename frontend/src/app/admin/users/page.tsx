'use client';

/**
 * Manajemen akun pengguna. Hanya tampil bagi admin.
 *
 * Modul ini menggantikan `Admin\CustomerController` portal v1, dengan tiga
 * perbedaan yang disengaja:
 *
 *   - Reset kata sandi MENGIRIM TAUTAN. v1 menetapkan sandi tetap `Apt123`
 *     untuk siapa pun dan menampilkannya di layar.
 *   - Mengubah peran hanya menyentuh akses panel; jabatan fungsional
 *     (`role_user`) tidak ikut terhapus seperti di v1.
 *   - Admin tidak dapat menurunkan peran, mencabut persetujuan, atau menghapus
 *     akunnya sendiri — penjaganya ada di backend, dan tombolnya pun
 *     dinonaktifkan di sini supaya tidak menyesatkan.
 *
 * Akun yang menunggu persetujuan ditandai, bukan disembunyikan: hanya di sini
 * petugas dapat melihat siapa yang menanti.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch, getUser } from '@/lib/adminApi';
import type { ManagedUser, UserRole } from '@/types';
import {
  PageHeader, Panel, Btn, Badge, Field, Modal, ConfirmDialog, Toast, ToastMsg,
  Loading, EmptyState, Table, Row, Cell, SearchBox, StatCard, stagger,
} from '@/components/admin/ui';
import {
  Users, Plus, Pencil, Trash2, RefreshCw, ShieldCheck, UserCog, Clock, KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ROLE_META: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#fb7185' },
  staff: { label: 'Staff', color: '#38bdf8' },
  user: { label: 'Pengguna', color: '#94a3b8' },
};

type FormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: UserRole;
};

const EMPTY: FormState = { name: '', email: '', password: '', phone: '', address: '', role: 'staff' };

export default function AdminUsersPage() {
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  /** Id akun sendiri; dipakai menonaktifkan aksi yang mengunci diri sendiri. */
  const diriSendiri = getUser()?.id ?? null;

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<ManagedUser[]>('/users');
    setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let batal = false;

    (async () => {
      const res = await adminFetch<ManagedUser[]>('/users');
      if (batal) return;
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();

    return () => { batal = true; };
  }, []);

  const visible = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((u) => !q || [u.name, u.email, u.phone].some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [items, q]);

  const stats = useMemo(() => ({
    total: items.length,
    admin: items.filter((u) => u.role === 'admin').length,
    staff: items.filter((u) => u.role === 'staff').length,
    menunggu: items.filter((u) => !u.is_accepted).length,
  }), [items]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (u: ManagedUser) => {
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone ?? '',
      address: u.address ?? '',
      role: u.role,
    });
    setEditId(u.id);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);

    // Pada pengubahan, peran TIDAK ikut dikirim: backend memang menolaknya di
    // jalur ini, dan perubahannya punya endpoint sendiri.
    const body = editId
      ? { name: form.name, email: form.email, phone: form.phone || null, address: form.address || null }
      : { ...form, phone: form.phone || null, address: form.address || null };

    const res = editId
      ? await adminFetch(`/users/${editId}`, { method: 'PUT', body })
      : await adminFetch('/users', { method: 'POST', body });
    setSaving(false);

    if (res.ok) {
      setOpen(false);
      setToast({ text: editId ? 'Pengguna diperbarui' : 'Pengguna ditambahkan', kind: 'success' });
      load();
    } else setToast({ text: res.message, kind: 'error' });
  };

  const ubahPeran = async (u: ManagedUser, role: UserRole) => {
    const res = await adminFetch(`/users/${u.id}/role`, { method: 'PUT', body: { role } });
    setToast({ text: res.ok ? `Peran ${u.name} kini ${ROLE_META[role].label}` : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  const ubahPersetujuan = async (u: ManagedUser) => {
    const jalur = u.is_accepted ? 'reject' : 'approve';
    const res = await adminFetch(`/users/${u.id}/${jalur}`, { method: 'PUT' });
    setToast({
      text: res.ok ? (u.is_accepted ? 'Persetujuan dicabut' : 'Akun disetujui') : res.message,
      kind: res.ok ? 'success' : 'error',
    });
    if (res.ok) load();
  };

  const kirimReset = async () => {
    if (resetId == null) return;
    const res = await adminFetch(`/users/${resetId}/reset-password`, { method: 'POST' });
    setResetId(null);
    setToast({ text: res.ok ? res.message : res.message, kind: res.ok ? 'success' : 'error' });
  };

  const remove = async () => {
    if (delId == null) return;
    const res = await adminFetch(`/users/${delId}`, { method: 'DELETE' });
    setDelId(null);
    setToast({ text: res.ok ? 'Pengguna dinonaktifkan' : res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) load();
  };

  return (
    <>
      <PageHeader
        icon={Users}
        title="Manajemen Pengguna"
        subtitle="Akun yang dapat masuk ke panel pengelolaan portal"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /> Muat Ulang</Btn>
            <Btn onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Pengguna</Btn>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Akun" value={stats.total} icon={Users} accent="#38bdf8" />
        <StatCard label="Admin" value={stats.admin} icon={ShieldCheck} accent="#fb7185" />
        <StatCard label="Staff" value={stats.staff} icon={UserCog} accent="#34d399" />
        <StatCard label="Menunggu Persetujuan" value={stats.menunggu} icon={Clock} accent="#fbbf24" />
      </motion.div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--adm-line)]">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Daftar Pengguna</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Cari nama atau surel..." />
        </div>

        {loading ? (
          <Loading />
        ) : visible.length === 0 ? (
          <EmptyState text="Belum ada pengguna" hint="Tambahkan akun untuk petugas yang perlu mengelola portal." />
        ) : (
          <Table head={['Nama & Surel', 'Peran', 'Status', 'Telepon', 'Aksi']}>
            {visible.map((u) => {
              const sendiri = u.id === diriSendiri;
              const meta = ROLE_META[u.role] ?? ROLE_META.user;

              return (
                <Row key={u.id}>
                  <Cell className="max-w-[320px]">
                    <p className="font-bold text-[var(--adm-fg)] text-[12.5px]">
                      {u.name}
                      {sendiri && <span className="ml-2 text-[10.5px] font-semibold text-[var(--adm-accent)]">(Anda)</span>}
                    </p>
                    <p className="text-[var(--adm-muted)] text-[11.5px] mt-0.5">{u.email}</p>
                  </Cell>

                  <Cell>
                    <select
                      value={u.role}
                      disabled={sendiri}
                      onChange={(e) => ubahPeran(u, e.target.value as UserRole)}
                      title={sendiri ? 'Anda tidak dapat mengubah peran sendiri' : 'Ubah peran'}
                      className="bg-[var(--adm-hover)] border border-[var(--adm-line)] rounded-lg px-2 py-1 text-[11.5px] text-[var(--adm-fg)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{ color: meta.color }}
                    >
                      {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
                        <option key={r} value={r} className="bg-[var(--adm-inset)] text-[var(--adm-fg)]">{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  </Cell>

                  <Cell>
                    <button
                      onClick={() => ubahPersetujuan(u)}
                      disabled={sendiri}
                      title={sendiri ? 'Anda tidak dapat mencabut persetujuan sendiri' : 'Klik untuk mengubah'}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Badge
                        text={u.is_accepted ? 'Disetujui' : 'Menunggu'}
                        color={u.is_accepted ? '#34d399' : '#fbbf24'}
                      />
                    </button>
                  </Cell>

                  <Cell>{u.phone || <span className="text-[var(--adm-dim)]">—</span>}</Cell>

                  <Cell>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-cyan-500/20 text-[var(--adm-body)] hover:text-[var(--adm-accent)] flex items-center justify-center transition-colors cursor-pointer" title="Ubah">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setResetId(u.id)} className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-amber-500/20 text-[var(--adm-body)] hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer" title="Kirim tautan ganti kata sandi">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDelId(u.id)}
                        disabled={sendiri}
                        className="w-8 h-8 rounded-lg bg-[var(--adm-hover)] hover:bg-rose-500/20 text-[var(--adm-body)] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={sendiri ? 'Anda tidak dapat menghapus akun sendiri' : 'Nonaktifkan'}
                      >
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
        onClose={() => setOpen(false)}
        title={editId ? 'Ubah Pengguna' : 'Tambah Pengguna'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Lengkap" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Alamat Surel" required type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />

          {!editId && (
            <>
              <Field
                label="Kata Sandi Awal" required type="password"
                value={form.password} onChange={(v) => setForm({ ...form, password: v })}
                placeholder="Minimal 8 karakter"
              />
              <Field
                label="Peran" required type="select"
                value={form.role} onChange={(v) => setForm({ ...form, role: v as UserRole })}
                options={(Object.keys(ROLE_META) as UserRole[]).map((r) => ({ value: r, label: ROLE_META[r].label }))}
              />
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Telepon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="08xxxxxxxxxx" />
            <Field label="Alamat" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </div>

          {editId && (
            <p className="text-[11.5px] text-[var(--adm-muted)] leading-relaxed">
              Peran diubah lewat kolom Peran pada tabel. Kata sandi tidak dapat disetel dari sini —
              gunakan tombol kunci untuk mengirimkan tautan penggantian ke surel pengguna.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={resetId !== null}
        onCancel={() => setResetId(null)}
        onConfirm={kirimReset}
        message="Kirim tautan penggantian kata sandi ke surel pengguna ini? Kata sandi lamanya tetap berlaku sampai ia menggantinya sendiri."
      />
      <ConfirmDialog
        open={delId !== null}
        onCancel={() => setDelId(null)}
        onConfirm={remove}
        message="Akun ini akan dinonaktifkan dan seluruh sesinya diakhiri. Datanya tetap tersimpan karena masih ditunjuk berkas pengajuan dan persuratan. Lanjutkan?"
      />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
