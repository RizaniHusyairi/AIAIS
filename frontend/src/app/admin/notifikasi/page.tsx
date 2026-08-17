'use client';

/**
 * Pengaturan notifikasi petugas.
 *
 * Tiga hal yang membuat halaman ini ada, dan bukan sekadar pelengkap:
 *
 *  1. TOMBOL NYALAKAN PUSH HARUS DI SINI. Peramban menolak permintaan izin
 *     notifikasi yang tidak berasal dari klik pemakai — dan menolaknya diam-diam,
 *     tanpa dialog apa pun. Jadi izinnya mustahil diminta otomatis saat panel
 *     dibuka.
 *
 *  2. TOMBOL KIRIM UJI. Tanpa ia, satu-satunya cara mengetahui gateway
 *     WhatsApp dan kunci VAPID sudah benar adalah menunggu warga sungguhan
 *     mengirim sesuatu — dan mendapati notifikasinya tidak pernah datang justru
 *     pada saat paling dibutuhkan.
 *
 *  3. SISA KUOTA WHATSAPP. Gateway ditagih per pesan dan dibatasi harian; tanpa
 *     angka ini, habisnya kuota terlihat persis seperti gateway yang rusak.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PageHeader, Panel, Btn, Badge, StatCard, InfoNote, Toast, ToastMsg, Loading, stagger,
} from '@/components/admin/ui';
import {
  Bell, BellRing, BellOff, Send, MessageSquare, Users, CircleCheck, CircleAlert, Server,
} from 'lucide-react';
import {
  statusNotifikasi, kirimNotifikasiUji, nyalakanPush, matikanPush,
  langgananSaatIni, pushDidukung, type StatusNotifikasi,
} from '@/lib/notifikasi';

export default function AdminNotifikasiPage() {
  const [status, setStatus] = useState<StatusNotifikasi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pushAktif, setPushAktif] = useState(false);
  const [didukung, setDidukung] = useState(true);

  const muat = useCallback(async () => {
    const res = await statusNotifikasi();
    if (res.ok && res.data) setStatus(res.data);
    setPushAktif((await langgananSaatIni()) !== null);
    setMemuat(false);
  }, []);

  useEffect(() => {
    let hidup = true;

    /*
     * Seluruh setState ada DI DALAM callback, bukan di badan efek.
     *
     * Dua sebabnya. Pertama, lint proyek menolak setState serentak di badan
     * efek karena memicu render beruntun. Kedua — dan ini yang menentukan —
     * `pushDidukung()` membaca `navigator`, jadi ia tidak boleh dihitung saat
     * render: server akan mendapat nilai berbeda dari klien, hidrasinya gagal,
     * dan React merender ulang seluruh pohon dari nol.
     */
    statusNotifikasi().then(async (res) => {
      if (!hidup) return;
      setDidukung(pushDidukung());
      if (res.ok && res.data) setStatus(res.data);
      setPushAktif((await langgananSaatIni()) !== null);
      setMemuat(false);
    });

    return () => { hidup = false; };
  }, []);

  const uji = async () => {
    setSibuk(true);
    const res = await kirimNotifikasiUji();
    setSibuk(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
  };

  const togglePush = async () => {
    setSibuk(true);

    const res = pushAktif
      ? await matikanPush()
      : await nyalakanPush(status?.push.public_key ?? '');

    setSibuk(false);
    setToast({ text: res.message, kind: res.ok ? 'success' : 'error' });
    if (res.ok) muat();
  };

  if (memuat) return <Loading text="Memuat pengaturan notifikasi..." />;

  const wa = status?.whatsapp;
  const gw = status?.whatsapp?.gateway;
  const push = status?.push;
  const sisaKuota = Math.max(0, (wa?.kuota_harian ?? 0) - (wa?.terpakai_hari_ini ?? 0));

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notifikasi"
        subtitle="Pemberitahuan saat ada kiriman baru dari warga lewat Pusat Bantuan"
        action={
          <Btn onClick={uji} disabled={sibuk}>
            <Send className="w-4 h-4" /> Kirim Notifikasi Uji
          </Btn>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Lonceng Panel"
          value="Selalu aktif"
          icon={CircleCheck}
          accent="#34d399"
          hint="Tanpa pihak ketiga"
        />
        <StatCard
          label="Push Perangkat Ini"
          value={pushAktif ? 'Menyala' : 'Mati'}
          icon={pushAktif ? BellRing : BellOff}
          accent={pushAktif ? '#38bdf8' : '#94a3b8'}
          hint={`${push?.perangkat_saya ?? 0} perangkat terdaftar`}
        />
        <StatCard
          label="WhatsApp"
          value={wa?.siap ? 'Tersambung' : 'Belum siap'}
          icon={wa?.siap ? MessageSquare : CircleAlert}
          accent={wa?.siap ? '#22c55e' : '#fb7185'}
          hint={wa?.siap ? `${wa.jumlah_tujuan} nomor tujuan` : undefined}
        />
        <StatCard
          label="Sisa Kuota WA Hari Ini"
          value={sisaKuota}
          icon={Users}
          accent={sisaKuota > 20 ? '#a78bfa' : '#fbbf24'}
          hint={`dari ${wa?.kuota_harian ?? 0} pesan`}
        />
      </motion.div>

      {/* ---------------- push ---------------- */}
      <Panel className="mt-4">
        <div className="p-5">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Notifikasi di Perangkat Ini</h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)] leading-relaxed">
            Muncul di layar walau panel sedang tertutup. Disetel per perangkat — menyalakannya
            di laptop tidak menyalakannya di ponsel Anda, dan sebaliknya.
          </p>

          <div className="mt-3.5">
            {!didukung ? (
              <InfoNote>
                Peramban ini tidak mendukung notifikasi push. Di iPhone, portal harus dipasang
                dulu ke layar utama lewat <em>Bagikan → Tambahkan ke Layar Utama</em>.
              </InfoNote>
            ) : !push?.siap ? (
              <InfoNote>
                Kunci VAPID belum dipasang di server, jadi push belum dapat dinyalakan.
                Lihat <code>docs/DEPLOY.md</code>.
              </InfoNote>
            ) : (
              <Btn onClick={togglePush} disabled={sibuk} variant={pushAktif ? 'ghost' : 'primary'}>
                {pushAktif
                  ? <><BellOff className="w-4 h-4" /> Matikan di perangkat ini</>
                  : <><BellRing className="w-4 h-4" /> Nyalakan di perangkat ini</>}
              </Btn>
            )}
          </div>
        </div>
      </Panel>

      {/* ---------------- whatsapp ---------------- */}
      <Panel className="mt-4">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">WhatsApp</h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--adm-dim)]">
                Dikirim ke nomor piket yang disetel di server, bukan ke nomor tiap akun.
              </p>
            </div>
            <Badge
              text={wa?.enabled ? (wa.siap ? 'Aktif' : 'Belum lengkap') : 'Dimatikan'}
              color={wa?.enabled ? (wa.siap ? '#22c55e' : '#fbbf24') : '#94a3b8'}
            />
          </div>

          <div className="mt-3.5 space-y-3">
            {/* Setelan gateway yang benar-benar berlaku.
                Sebelumnya panel ini tidak menyebut sama sekali gateway mana
                yang dituju, sehingga endpoint atau nama medan yang keliru baru
                ketahuan ketika notifikasi sungguhan pertama tidak pernah tiba. */}
            {gw && (
              <div className="rounded-xl ring-1 ring-[var(--adm-line)] overflow-hidden">
                <div className="px-3.5 py-2 bg-[var(--adm-soft)] flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-[var(--adm-dim)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--adm-dim)]">
                    Gateway Terpasang
                  </span>
                </div>

                <dl className="divide-y divide-[var(--adm-line)] text-[12px]">
                  {[
                    ['Host', gw.host ?? '—'],
                    ['Endpoint', gw.endpoint],
                    ['Header kunci', gw.auth_header],
                    ['Badan permintaan', gw.format.toUpperCase()],
                    ['Medan', `${gw.field_target} / ${gw.field_message}`],
                    ['Perangkat', gw.device_id ? String(gw.device_id) : 'bawaan kunci API'],
                    [
                      'Kunci API',
                      gw.kunci_terpasang ? `${gw.kunci_awalan ?? 'wag'}.••••••••` : 'belum diisi',
                    ],
                    ['Nomor tujuan', `${wa?.jumlah_tujuan ?? 0} nomor`],
                  ].map(([label, nilai]) => (
                    <div key={label} className="px-3.5 py-2 flex items-start justify-between gap-4">
                      <dt className="text-[var(--adm-dim)] flex-shrink-0">{label}</dt>
                      <dd className="font-mono text-[11px] text-[var(--adm-body)] text-right break-all">
                        {nilai}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <InfoNote>
              Isi pesannya <strong>hanya jenis kiriman, nomor tiket, dan tautan panel</strong> —
              tanpa nama, nomor ponsel, maupun isi laporan warga. Rinciannya dibaca di panel ini.
              Aturan itu disengaja: pesan WhatsApp melewati server penyedia gateway.
            </InfoNote>

            {wa?.enabled && !wa.siap && (
              <InfoNote>
                {gw?.kunci_terpasang && (wa?.jumlah_tujuan ?? 0) === 0 ? (
                  <>
                    Kunci API sudah terpasang, tetapi <strong>belum ada nomor tujuan</strong>.
                    Isi <code>WA_RECIPIENTS</code> di <code>.env</code> server dengan nomor
                    WhatsApp petugas piket (format <code>62xxxxxxxxxx</code>, dipisah koma),
                    lalu jalankan <code>php artisan config:clear</code>.
                  </>
                ) : (
                  <>
                    Gateway belum dapat dipakai — kunci atau nomor tujuannya belum lengkap.
                    Keduanya disetel lewat <code>.env</code> di server; lihat{' '}
                    <code>docs/DEPLOY.md</code>.
                  </>
                )}
              </InfoNote>
            )}
          </div>
        </div>
      </Panel>

      {/* ---------------- penerima ---------------- */}
      <Panel className="mt-4">
        <div className="p-5">
          <h2 className="text-[13.5px] font-bold text-[var(--adm-fg)]">Penerima</h2>
          <p className="mt-2 text-[12px] text-[var(--adm-body)] leading-relaxed">
            Notifikasi dikirim ke <strong>{status?.penerima ?? 0} akun</strong> berperan admin yang
            sudah disetujui.
          </p>

          {(status?.penerima ?? 0) <= 1 && (
            <div className="mt-3">
              <InfoNote>
                Saat ini hanya <strong>satu akun</strong> yang menerima notifikasi. Bila akun itu
                sedang tidak bertugas, tidak ada yang mengetahui kiriman warga yang masuk —
                pertimbangkan menambah akun admin.
              </InfoNote>
            </div>
          )}
        </div>
      </Panel>

      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
