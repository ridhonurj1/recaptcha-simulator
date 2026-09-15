# reCAPTCHA Simulator — Game Edukasi Tugas Akhir Cyber Security

Simulasi game yang meniru 100% alur dan tampilan reCAPTCHA Google (checkbox →
image grid → audio → fingerprint → v3 scoring) **untuk keperluan edukasi
tugas akhir**. Tidak ada asset, kode, atau endpoint resmi Google yang dipakai —
semua visual dibuat murni CSS/SVG sendiri dan seluruh logika berjalan offline.

## Menjalankan

```bash
cd ~/projects/recaptcha-sim
python3 -m http.server 30100
# buka http://localhost:30100
```

Atau buka `index.html` langsung di browser (semua vanilla JS, tanpa build step).

## Alur Game — 6 Tahap

1. **Checkbox "I'm not a robot"** — risk engine menganalisis entropy mouse &
   jitter sebelum verdict. Skor tinggi = langsung lolos tanpa challenge
   (perilaku "No-CAPTCHA reCAPTCHA" asli).
2. **Image Grid** — pilih semua sel target; jawaban salah/parsial = challenge
   baru (retry), bukan kick — persis mekanisme asli.
3. **reCAPTCHA v3** — scoring pasif, auto-pass bila skor tinggi.
4. **Audio Challenge** — alternatif aksesibilitas memakai Web Speech API lokal
   (offline), meniru proteksi audio-distortion anti-TTS.
5. **Fingerprinting pasif** — UA, screen, timezone, canvas hash (simulasi).
6. **Sertifikat** — ringkasan humanliness score, sinyal, entropy, waktu.

## Fitur Edukasi

* **Panel Risk Engine live**: entropy (Shannon atas interval mouse), coefficient
  of variation jitter, jumlah sinyal, verdict threshold — semua terlihat real-time.
* **Mode Bot Simulator**: memaksa klik instan tanpa gerakan mouse → entropy & CV
  jatuh ke ≈0 → verdict RISKY → challenge muncul. Demo langsung bahwa anti-bot
  menganalisis *cara* berinteraksi, bukan sekadar jawaban challenge.
* **Pelajaran per tahap**: setiap tahap menampilkan penjelasan konsep di panel.

## Etika & Batasan (untuk bab metodologi skripsi)

* Tidak mengirim data ke mana pun (offline penuh).
* Tidak memakai nama/asset/service resmi Google selain tampilan gaya serupa
  untuk keperluan edukasi yang diakui fair-use akademik.
* Tidak menyediakan mekanisme bypass layanan nyata — hanya mensimulasikan
  prinsip risk-based authentication yang dipublikasikan Google secara terbuka
  (blog resmi reCAPTCHA, dokumentasi v2/v3, paparan konferensi).
