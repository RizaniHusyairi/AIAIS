# Kecilkan foto di public/img: lebar maks. 900 px, disimpan sebagai JPEG q85.
# Foto unggahan petugas bisa 7–13 MB dan kerap berformat PNG; tanpa ini render
# merayap dan repositori membengkak. PNG yang dikonversi berganti ekstensi .jpg —
# fetch-data.mjs menyesuaikan lintasannya di snapshot.
param([string]$Dir = (Join-Path $PSScriptRoot '..\public\img'))
Add-Type -AssemblyName System.Drawing
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 85L
# Logo maskapai (airline-*) dibiarkan: kecil dan butuh transparansi.
Get-ChildItem $Dir -File | Where-Object { $_.Length -gt 300KB -and $_.Extension -in '.jpg', '.jpeg', '.png' -and $_.Name -notlike 'airline-*' } | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $w = [Math]::Min(900, $img.Width); $h = [int]($img.Height * $w / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($img, 0, 0, $w, $h)
  $img.Dispose(); $g.Dispose()
  $target = [System.IO.Path]::ChangeExtension($_.FullName, '.jpg')
  $tmp = $target + '.tmp'
  $bmp.Save($tmp, $enc, $p); $bmp.Dispose()
  if ($_.Extension -ne '.jpg') { [System.IO.File]::Delete($_.FullName) }
  Move-Item -Force $tmp $target
}
