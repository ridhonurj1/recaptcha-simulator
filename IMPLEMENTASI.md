# Catatan Implementasi — untuk Lampiran Skripsi

## Arsitektur Risk Engine (simulasi)

```
mousemove events ──► Risk.trackMove()
                        │
                        ├─ entropySamples[] : interval antar gerakan (ms)
                        └─ moveJitter[]     : 60 sampai terakhir
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
      Risk.entropy()       Risk.humanliness()
      Shannon entropy      CV (sd/mean) + min-interval guard
      binning 50ms         (bot < 16ms = dropped frame)
              │                   │
              └────────┬──────────┘
                       ▼
              Risk.score (0..1) ──► verdict(threshold=0.55)
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
      skor >= threshold     skor < threshold
      = HUMAN (no captcha)  = RISKY (image/audio challenge)
```

## Sinyal yang Disimulasikan (dan padanan riset publiknya)

| Sinyal simulator | Padanan riset/publikasi |
|---|---|
| Entropy interval mouse | von Ahn et al. (CAPTCHA, CMU); Google reCAPTCHA blog 2014 "Are you a robot? Introducing No CAPTCHA reCAPTCHA" |
| CV jitter + guard 16ms | analisis frame-rate browser ~60fps; bot automation (Selenium/Puppeteer) menghasilkan interval seragam |
| Grid answer correctness | von Ahn "ESP-Game" label crowdsourcing → kini Google CV + crowdsourced labels |
| Retry, bukan kick | perilaku resmi reCAPTCHA v2 (regenerate challenge) |
| Audio + distortion | publikasi aksesibilitas reCAPTCHA; riset uni-bw (2016) menunjukkan STT bisa pecahkan audio lama → kini distortion + deteksi TTS |
| Passive fingerprint | reCAPTCHA v3 (score 0.1–1.0); cookie `googtrans`, canvas hash, TLS fingerprint (riset akademik publik) |

## Alasan Desain

1. **Verdict threshold 0.55** — cukup rendah agar manusia nyata lolos tahap 1,
   cukup tinggi agar mode bot (tanpa mouse move) gagal. Asimetri ini memperlihatkan
   konsep false-positive vs false-negative pada sistem anti-bot.
2. **Retry bukan terminasi** — sesuai perilaku asli; pelajaran: anti-bot bukan
   gerbang pass/fail, melainkan peningkatan friksi bertingkat.
3. **Semua offline** — data tidak keluar dari browser; aman untuk demo sidang
   tanpa koneksi internet dan tanpa isu privasi.

## Keterbatasan

* Entropy dihitung dari synthetic events — akurasi nyata butuh dataset
  interaksi manusia vs bot (bisa jadi pengembangan lanjutan bab 5 skripsi).
* Fingerprint canvas disimulasikan (hash statis), bukan implementasi WebGL nyata.
* Tidak ada server-side scoring — asli reCAPTCHA menilai di server Google.
