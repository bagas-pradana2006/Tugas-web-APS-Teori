# BMT Mobile Field System: prototype web UI

Prototype UI (HTML, CSS, JS murni) dari Figma "Tugas APS Projek Akhir" Kelompok 2 Nice Gang, KSPPS BMT Sidogiri.

## Cara menjalankan
Buka `index.html` langsung di browser, atau jalankan server lokal:

```
python -m http.server 8000
```

lalu buka http://localhost:8000.

## Halaman per PIC
| Halaman | Modul | PIC | Layar Figma |
|---|---|---|---|
| `petugas.html` | Mobile Collector Real-Time | Muhammad Rafi Fadillah | M-01 s.d. M-05 |
| `rekonsiliasi.html` | Rekonsiliasi kasir | Muhammad Rafi Fadillah | W-01 |
| `pengajuan.html` | Digital Credit Assessment | Ibrahim Bagas Pradana | S-01 s.d. S-04, US04-01 s.d. US04-06 |
| `persetujuan.html` | Digital Approval & Workflow | Izzudin Ahmad Yasin | A-01 |
| `monitoring.html` | Dashboard Monitoring + ekspor | Adli Sejati | D-01, US-06 |
| `integrasi.html` | Integrasi CBS | R. Ahmad Syarif Hidayatullah | I-01 |
| `anggota.html` | BMT Pasra Mobile + notifikasi | R. Ahmad Syarif Hidayatullah | P-01 s.d. P-06, US-03 |

## Pengujian
- Halaman dengan alur alternatif punya **Panel uji prototype** di atas (gagal koneksi, risiko tinggi, ekspor gagal, dll).
- PIN contoh (aplikasi anggota dan otorisasi komite): `123456`.
- Semua data adalah contoh dari laporan kelompok. Tidak ada data yang dikirim ke server; state hilang saat halaman dimuat ulang.

## Struktur
```
css/style.css   gaya bersama (warna & font dari halaman Ringkasan Figma)
js/app.js       utilitas bersama (toast, format rupiah, jalur status, tab)
js/<modul>.js   logika tiap halaman
```
