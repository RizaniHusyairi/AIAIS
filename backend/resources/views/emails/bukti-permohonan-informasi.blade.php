{{--
    Bukti permohonan informasi publik — lihat App\Notifications\BuktiPermohonanInformasi.

    Gaya ditulis inline dan tata letaknya tabel: banyak aplikasi surel (Gmail,
    Outlook) membuang <style> dan tidak mengenal flexbox. Warna mengikuti
    portal (#0b1e5b), motifnya boarding pass seperti layar tiket.
--}}
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bukti Permohonan Informasi Publik</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
    <tr>
      <td style="background:#0b1e5b;padding:26px 28px;color:#ffffff;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7dd3fc;font-weight:bold;">Permohonan Tercatat</div>
        <div style="margin-top:6px;font-size:20px;font-weight:bold;line-height:1.3;">Bukti Permohonan Informasi Publik</div>
        <div style="margin-top:4px;font-size:13px;color:#bfdbfe;">PPID Bandar Udara APT Pranoto Samarinda</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px;"><div style="border-top:2px dashed #e2e8f0;"></div></td>
    </tr>
    <tr>
      <td style="padding:24px 28px 8px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Nomor Tiket</div>
        <div style="margin-top:6px;font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:bold;letter-spacing:2px;color:#0f172a;">{{ $tiket }}</div>
        <div style="margin-top:6px;font-size:13px;color:#64748b;line-height:1.5;">Simpan surel ini. Nomor tiket adalah tanda bukti permohonan Anda dan diperlukan untuk melacak statusnya.</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px dashed #e2e8f0;">
          <tr>
            <td valign="top" style="padding-top:16px;width:50%;">
              <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Diterima</div>
              <div style="margin-top:4px;font-size:14px;font-weight:bold;">{{ $diterima }}</div>
            </td>
            <td valign="top" style="padding-top:16px;width:50%;">
              <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:bold;">Batas Jawaban PPID</div>
              <div style="margin-top:4px;font-size:14px;font-weight:bold;">{{ $batas }}</div>
              <div style="margin-top:2px;font-size:11px;color:#64748b;">10 hari kerja, dapat diperpanjang 7 hari kerja</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 28px 8px;">
        <a href="{{ $tautan }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:13px 26px;border-radius:999px;">Lacak Permohonan</a>
        <div style="margin-top:10px;font-size:11px;color:#94a3b8;line-height:1.5;">Bila tombol tidak dapat ditekan, buka alamat ini:<br><a href="{{ $tautan }}" style="color:#2563eb;word-break:break-all;">{{ $tautan }}</a></div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 28px 26px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;font-size:12px;color:#475569;line-height:1.6;">
          Bila jawaban belum sesuai atau tidak diberikan hingga batas waktu, Anda berhak mengajukan keberatan kepada PPID. Tata caranya tersedia pada halaman SOP PPID.
        </div>
      </td>
    </tr>
  </table>
  <div style="max-width:560px;margin-top:14px;font-size:11px;color:#94a3b8;line-height:1.5;text-align:center;">
    Surel ini dikirim otomatis karena alamat ini dicantumkan pada permohonan informasi publik.<br>Mohon tidak membalas surel ini.
  </div>
</td></tr>
</table>
</body>
</html>
