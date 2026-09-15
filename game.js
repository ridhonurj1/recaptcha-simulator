/* reCAPTCHA Simulator — game engine
 * Tugas Akhir Cyber Security.
 * 100% offline: tidak ada request ke Google, tidak ada asset resmi Google.
 * Setiap tahap mensimulasikan sinyal risk-analysis asli versi edukatif.
 */

'use strict';

/* ============================================================
 * RISK ENGINE — inti simulasi (bagian yang dipelajari di skripsi)
 * ============================================================ */

const Risk = {
  score: 0.0,          // 0 = bot sempurna, 1 = manusia sempurna (dibalik agar intuitif)
  signals: 0,
  entropySamples: [],
  lastMove: 0,
  moveJitter: [],

  trackMove(x, y) {
    const now = performance.now();
    if (this.lastMove) {
      const dt = now - this.lastMove;
      if (dt > 0 && dt < 2000) {
        this.entropySamples.push(dt);
        // jitter = variasi kecepatan gerakan; manusia punya jitter tinggi
        this.moveJitter.push(dt);
        if (this.moveJitter.length > 60) this.moveJitter.pop();
      }
    }
    this.lastMove = now;
  },

  // Shannon entropy sederhana atas interval gerakan mouse (binning 50ms)
  entropy() {
    if (this.entropySamples.length < 8) return 0;
    const bins = {};
    for (const dt of this.entropySamples) {
      const b = Math.min(9, Math.floor(dt / 50));
      bins[b] = (bins[b] || 0) + 1;
    }
    let H = 0;
    const total = this.entropySamples.length;
    for (const k in bins) {
      const p = bins[k] / total;
      H -= p * Math.log2(p);
    }
    return Math.min(1, H / 3.2); // normalisasi kasar
  },

  humanliness() {
    if (this.moveJitter.length < 6) return 0.1;
    // manusia: varians interval tinggi + tidak pernah < 20ms
    const min = Math.min(...this.moveJitter);
    const mean = this.moveJitter.reduce((a, b) => a + b, 0) / this.moveJitter.length;
    const sd = Math.sqrt(this.moveJitter.reduce((a, b) => a + (b - mean) ** 2, 0) / this.moveJitter.length);
    const cv = mean > 0 ? sd / mean : 0;           // coefficient of variation
    const tooFast = min < 16 ? 0 : 1;               // bot kinong < 16ms/frame
    return Math.min(1, (cv * 1.4) * tooFast + (min >= 16 ? 0.15 : 0));
  },

  add(v, label) {
    this.score = Math.min(1, this.score + v);
    this.signals++;
    Telemetry.log(`[signal] ${label} (+${v.toFixed(2)} humanliness)`, 'info');
    Telemetry.refresh();
  },

  verdict(threshold = 0.55) {
    return this.score >= threshold ? 'human' : 'bot';
  },
};

/* ============================================================
 * TELEMETRY PANEL
 * ============================================================ */

const Telemetry = {
  stage: 0,
  total: 6,
  el: {},
  init() {
    this.el = {
      stage: document.getElementById('tl-stage'),
      risk: document.getElementById('tl-risk'),
      bar: document.getElementById('tl-risk-bar'),
      entropy: document.getElementById('tl-entropy'),
      human: document.getElementById('tl-human'),
      signals: document.getElementById('tl-signals'),
      log: document.getElementById('tl-log'),
      lesson: document.getElementById('tl-lesson-text'),
    };
  },
  log(msg, cls = '') {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = msg;
    this.el.log.appendChild(div);
    this.el.log.scrollTop = this.el.log.scrollHeight;
  },
  refresh() {
    this.el.stage.textContent = `${this.stage}/${this.total}`;
    this.el.risk.textContent = Risk.score.toFixed(2);
    this.el.bar.style.width = `${(Risk.score * 100).toFixed(0)}%`;
    this.el.entropy.textContent = Risk.entropy().toFixed(2);
    this.el.human.textContent = Risk.humanliness() >= 0.55 ? 'YA' : (Risk.signals ? 'BELUM' : '—');
    this.el.signals.textContent = Risk.signals;
  },
  lesson(text) { this.el.lesson.textContent = text; },
};

/* ============================================================
 * DATA CHALLENGE (bebas hak cipta — dibuat sendiri, gaya serupa)
 * ============================================================ */

const CHALLENGES = [
  { type: 'grid3', target: 'traffic lights', targetIcon: '🚦', icons: ['🚦','🚗','🌳','🏠','🚲','🛑','🚌','🌸','#######','🚦','📢','灯火','🌲'], distractorNote: 'pilih hanya sel dengan lampu lalu lintas' },
  { type: 'grid3', target: 'crosswalks', targetIcon: '🚸', icons: ['🚸','🚙','🌲','🏠','🚸','🌳','🚕','⛰️','🚸','🔋','🚏','🚧'] },
  { type: 'grid3', target: 'buses', targetIcon: '🚌', icons: ['🚗','🚌','🏠','🚌','🌳','🚲','🚌','🛑','🌸','🚌','🚦','⛰️'] },
  { type: 'grid4', target: 'fire hydrants', targetIcon: '🧯', icons: ['🧯','🚗','🌳','🧯','🏠','🧯','🚲','🌸','🧯','🛑','🚌','🧯','🚦','🧯','⛰️','🚸'] },
  { type: 'grid3', target: 'palm trees', targetIcon: '🌴', icons: ['🌴','🚗','🌲','🌴','🏠','🌴','🚲','🌴','🛑','🌸','🌴','🚌'] },
  { type: 'audio', target: null, digits: null },
  { type: 'grid3', target: 'steep stairs', targetIcon: '🪜', icons: ['🪜','🚗','🌳','🪜','🏠','🪜','🚲','🪜','🛑','🪜','🌸','🚌'] },
];

/* ============================================================
 * GAME STATE
 * ============================================================ */

const G = {
  stageIdx: 0,
  current: null,
  selected: new Set(),
  usedChallenges: [],
  botMode: false,
  startTime: Date.now(),
  totalSignals: 0,
  stagesCleared: 0,
};

const STAGE_LESSONS = [
  'Tahap 1 — Checkbox: sinyal dinilai SEBELUM verdict. Tidak ada centang instan tanpa analisis behavioral.',
  'Tahap 2 — Image Grid: server memakai label crowdsourcing + computer vision. Jawaban parsial = retry, bukan gagal permanen.',
  'Tahap 3 — NO-CAPTCHA reCAPTCHA: skor 0.9+ lolos tanpa challenge; skor rendah memicu grid bertingkat.',
  'Tahap 4 — Audio: alternatif aksesibilitas — dan sayangnya vektor favorit bot lama (Speech-to-Text). Kini dilindungi Audio-Distortion + deteksi TTS.',
  'Tahap 5 — reCAPTCHA v3: tanpa interaksi sama sekali, hanya skor 0.1–1.0 di background. Situs memutuskan sendiri ambang lolos.',
  'Tahap 6 — Fingerprinting: canvas/WebGL/font/entropy mouse — sinyal pasif tanpa user tahu. Inilah mengapa 0-klik bisa lolos.',
];

/* ============================================================
 * DOM
 * ============================================================ */

const $ = (id) => document.getElementById(id);
const widget = $('widget-wrap');
const box = $('recaptcha-box');
const overlay = $('challenge-overlay');
const grid = $('challenge-grid');
const chTitle = $('ch-title');
const resultOverlay = $('result-overlay');

/* ---------- Stage 1: checkbox click ---------- */
function initCheckboxStage() {
  box.addEventListener('click', onCheckboxClick);
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onCheckboxClick(); });
  document.addEventListener('mousemove', (e) => Risk.trackMove(e.clientX, e.clientY));
  Telemetry.lesson(STAGE_LESSONS[0]);
}

function onCheckboxClick() {
  if (box.classList.contains('success')) return;
  const chk = $('rc-checkbox');
  $('rc-check').classList.add('hidden');
  $('rc-spinner').classList.remove('hidden');

  // Risk analysis delay (simulasi ke serverless endpoint)
  const clickHumanliness = Risk.humanliness();
  const entropy = Risk.entropy();
  Risk.add(Math.min(0.5, entropy * 0.5 + clickHumanliness * 0.5), `click + entropy ${entropy.toFixed(2)} + CV jitter`);

  setTimeout(() => {
    $('rc-spinner').classList.add('hidden');
    if (Risk.verdict(0.55) === 'human' && !G.botMode) {
      // skor tinggi: lolos tanpa challenge (perilaku v2 asli pada skor bagus)
      $('rc-check').classList.remove('hidden');
      box.classList.add('success');
      Telemetry.log('[verdict] HUMAN — skor cukup, tanpa challenge', 'info');
      Telemetry.lesson('Skor bagus = tanpa challenge! Ini "No-CAPTCHA reCAPTCHA". Kita lanjut paksa tahap berikut untuk pembelajaran.');
      setTimeout(nextStage, 1600);
    } else {
      Telemetry.log('[verdict] RISKY — tampilkan image challenge', 'warn');
      openChallenge();
    }
  }, 700 + Math.random() * 500);
}

/* ---------- Challenge grid / audio ---------- */
function openChallenge() {
  let ch;
  do { ch = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]; }
  while (G.usedChallenges.includes(ch) && G.usedChallenges.length < CHALLENGES.length);
  G.usedChallenges.push(ch);
  G.current = ch;
  G.selected.clear();

  grid.className = 'challenge-grid' + (ch.type === 'grid4' ? ' g4' : '');
  grid.innerHTML = '';

  if (ch.type === 'audio') {
    buildAudioChallenge(ch);
  } else {
    chTitle.innerHTML = `Select all squares with <b>${ch.target}</b><span class="ch-progress" id="ch-progress"></span>`;
    // pilih sel target: 3-5 sel acak
    const n = ch.type === 'grid4' ? 16 : 12;
    const targetCount = 3 + Math.floor(Math.random() * 3);
    const targetSet = new Set();
    while (targetSet.size < targetCount) targetSet.add(Math.floor(Math.random() * n));

    for (let i = 0; i < n; i++) {
      const tile = document.createElement('button');
      tile.className = 'ch-tile';
      const isTarget = targetSet.has(i);
      tile.dataset.target = isTarget ? '1' : '0';
      const icon = isTarget ? ch.targetIcon : ch.icons[Math.floor(Math.random() * ch.icons.length)];
      tile.innerHTML = `<span class="tile-icon">${icon}</span>`;
      tile.addEventListener('click', () => {
        tile.classList.toggle('selected');
        Risk.add(0.02, 'tile click (mouse-driven interaction)');
        if (G.selected.has(i)) G.selected.delete(i); else G.selected.add(i);
        updateProgress();
      });
      grid.appendChild(tile);
    }
  }
  overlay.classList.remove('hidden');
}

function buildAudioChallenge(ch) {
  chTitle.innerHTML = 'Type what you hear<span class="ch-progress" id="ch-progress"></span>';
  ch.digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const row = document.createElement('div');
  row.className = 'audio-row';
  // visual waveform palsu (distorsi — pelajaran: proteksi anti-TTS)
  const wave = `<div class="audio-visual">${Array.from({ length: 40 }, () => {
    const h = 6 + Math.random() * 26;
    return `<span style="height:${h}px"></span>`;
  }).join('')}</div>`;
  row.innerHTML = `
    <button id="audio-play" title="Putar (Web Speech API lokal — offline)">▶</button>
    ${wave}
    <input id="audio-input" autocomplete="off" placeholder="5 digit">
  `;
  grid.appendChild(row);
  $('audio-play').addEventListener('click', () => {
    // suara via SpeechSynthesis LOKAL browser (bukan service Google)
    try {
      const u = new SpeechSynthesisUtterance(ch.digits.split('').join(' '));
      u.rate = 0.6; u.lang = 'id-ID';
      speechSynthesis.speak(u);
      Telemetry.log('[audio] speech synthesis lokal (offline)', 'info');
    } catch { Telemetry.log('[audio] TTS tidak tersedia di browser ini', 'warn'); }
    Risk.add(0.05, 'audio interaction');
  });
  updateProgress();
}

function updateProgress() {
  const p = $('ch-progress');
  if (G.current?.type === 'audio') return;
  if (p) p.textContent = `— ${G.selected.size} dipilih`;
}

/* ---------- VERIFY ---------- */
$('ch-verify').addEventListener('click', () => {
  const ch = G.current;
  if (!ch) return;
  let ok = false;

  if (ch.type === 'audio') {
    const val = $('audio-input')?.value?.trim();
    ok = val === ch.digits;
    Risk.add(ok ? 0.3 : 0, ok ? 'audio challenge passed' : 'audio wrong');
  } else {
    const tiles = Array.from(grid.querySelectorAll('.ch-tile'));
    const correct = tiles.every((t, i) => (t.dataset.target === '1') === G.selected.has(i));
    const picked = G.selected.size > 0;
    ok = correct && picked;
    Risk.add(ok ? 0.3 : 0.02, ok ? 'grid challenge passed (all targets, no FP)' : 'grid retry (parsial/salah — reCaptcha memberi retry)');
  }

  if (ok) {
    overlay.classList.add('hidden');
    $('rc-check').classList.remove('hidden');
    box.classList.add('success');
    Telemetry.log('[verdict] CHALLENGE PASSED', 'info');
    setTimeout(nextStage, 1200);
  } else {
    Telemetry.log('[verify] GAGAL — challenge baru dibuat (bot behavior: jawab salah)', 'warn');
    Risk.add(0, 'failed verify');
    openChallenge(); // reCaptcha asli: regenerate, bukan kick
  }
});

$('ch-skip').addEventListener('click', () => {
  Telemetry.log('[skip] challenge di-skip — verdict ditunda, skor tak bertambah', 'warn');
  overlay.classList.add('hidden');
  $('rc-check').classList.add('hidden');
  $('rc-spinner').classList.remove('hidden');
  setTimeout(() => { $('rc-spinner').classList.add('hidden'); openChallenge(); }, 900);
});

$('ch-refresh').addEventListener('click', () => openChallenge());

$('ch-audio').addEventListener('click', () => {
  // swap ke audio challenge (bukan tampilan asli, tapi mekanismenya)
  G.current = null;
  const audioCh = CHALLENGES.find((c) => c.type === 'audio');
  G.usedChallenges = []; // reset agar bisa dipakai
  G.current = audioCh;
  G.selected.clear();
  grid.className = 'challenge-grid';
  grid.innerHTML = '';
  buildAudioChallenge(audioCh);
});

$('ch-help').addEventListener('click', () => {
  Telemetry.lesson('Tombol di header asli: refresh (challenge baru), audio (aksesibilitas), help. Simulator meniru struktur ini untuk pembelajaran UX anti-bot.');
});

/* ============================================================
 * STAGE FLOW (6 tahap)
 * ============================================================ */

function nextStage() {
  G.stagesCleared++;
  G.stageIdx++;
  Telemetry.stage = G.stageIdx;
  Telemetry.refresh();
  if (G.stageIdx >= 6) return showResult();

  $('rc-check').classList.add('hidden');
  box.classList.remove('success');
  Telemetry.lesson(STAGE_LESSONS[G.stageIdx]);
  Telemetry.log(`[stage] → Tahap ${G.stageIdx + 1}`, 'info');
  G.usedChallenges = [];

  if (G.stageIdx === 2) {
    // Tahap 3: simulasi skor tinggi auto-pass dengan delay minimal
    Telemetry.log('[v3] no interaction needed — scoring in background…', 'info');
    Risk.add(0.15, 'passive v3 score (assumed high after 2 human stages)');
    setTimeout(() => {
      Telemetry.log('[v3] score 0.9 — auto-pass', 'info');
      nextStage();
    }, 1500);
  } else if (G.stageIdx === 4) {
    // Tahap 5: fingerprinting pasif — otomatis jalan
    Telemetry.log('[fp] mengumpulkan sinyal pasif: UA, screen, timezone, canvas…', 'info');
    const fpSignals = [
      'navigator.userAgent ✓',
      'screen resolution ✓',
      'timezone offset ✓',
      'canvas hash ✓ (simulasi)',
      'mouse entropy ✓',
    ];
    fpSignals.forEach((s, i) => setTimeout(() => {
      Telemetry.log(`[fp] ${s}`, 'info');
      Risk.add(0.06, 'fingerprint ' + s.split(' ')[0]);
    }, 400 * (i + 1)));
    setTimeout(nextStage, 400 * fpSignals.length + 900);
  } else {
    // tahap checkbox/grid → user klik lagi
  }
}

function showResult() {
  const mins = Math.floor((Date.now() - G.startTime) / 60000);
  const secs = Math.floor(((Date.now() - G.startTime) % 60000) / 1000);
  $('res-stats').innerHTML = `
    <div class="res-row"><span>Humanliness Score</span><b>${(Risk.score * 100).toFixed(0)}%</b></div>
    <div class="res-row"><span>Sinyal behavior terkirim</span><b>${Risk.signals}</b></div>
    <div class="res-row"><span>Mouse entropy</span><b>${Risk.entropy().toFixed(2)}</b></div>
    <div class="res-row"><span>Tahap diselesaikan</span><b>${G.stagesCleared}/6</b></div>
    <div class="res-row"><span>Waktu bermain</span><b>${mins}m ${secs}s</b></div>
    <div class="res-row"><span>Status</span><b style="color:var(--lime)">VERIFIED HUMAN (SIMULASI)</b></div>
  `;
  resultOverlay.classList.remove('hidden');
}

/* ---------- BOT MODE: perbandingan ---------- */
$('btn-bot-mode').addEventListener('click', () => {
  G.botMode = !G.botMode;
  const btn = $('btn-bot-mode');
  btn.textContent = G.botMode ? '👤 Mode Manusia' : '🤖 Mode Bot Simulator';
  btn.style.background = G.botMode ? 'rgba(248,113,113,.15)' : '';
  btn.style.borderColor = G.botMode ? 'rgba(248,113,113,.4)' : '';
  if (G.botMode) {
    // bot: klik instan, tanpa mouse move, jitter nol
    Risk.moveJitter = [];
    Risk.entropySamples = [];
    Risk.score = Math.min(Risk.score, 0.2);
    Telemetry.log('[bot] memaksa klik instan + tanpa jitter mouse', 'warn');
    Telemetry.log('[bot] perhatikan: entropy → 0, verdict → RISKY', 'warn');
    Telemetry.lesson('Mode bot: klik checkbox instan tanpa gerakan mouse. Risk engine mendeteksi CV jitter ≈ 0 dan entropy ≈ 0 → verdict RISKY → challenge. Inilah inti anti-bot: bukan menebak jawaban, tapi menganalisis CARA berinteraksi.');
  } else {
    Telemetry.log('[human] mode manusia kembali', 'info');
  }
  Telemetry.refresh();
});

/* ---------- RESET ---------- */
function resetGame() {
  G.stageIdx = 0; G.stagesCleared = 0; G.usedChallenges = []; G.botMode = false;
  Risk.score = 0; Risk.signals = 0; Risk.entropySamples = []; Risk.moveJitter = [];
  Telemetry.stage = 0;
  $('btn-bot-mode').textContent = '🤖 Mode Bot Simulator';
  $('btn-bot-mode').style.background = '';
  $('btn-bot-mode').style.borderColor = '';
  $('tl-log').innerHTML = '';
  $('rc-check').classList.add('hidden');
  $('rc-spinner').classList.add('hidden');
  box.classList.remove('success', 'fail');
  resultOverlay.classList.add('hidden');
  overlay.classList.add('hidden');
  Telemetry.refresh();
  Telemetry.lesson(STAGE_LESSONS[0]);
  Telemetry.log('[reset] permainan diulang dari tahap 1', 'info');
}
$('btn-reset').addEventListener('click', resetGame);
$('btn-again').addEventListener('click', resetGame);
$('tl-toggle').addEventListener('click', () => {
  const b = $('tl-body');
  b.style.display = b.style.display === 'none' ? '' : 'none';
});

/* ---------- BOOT ---------- */
Telemetry.init();
initCheckboxStage();
Telemetry.log('[boot] simulator siap — 6 tahap edukasi anti-bot', 'info');
Telemetry.log('[boot] klik checkbox untuk mulai. Coba gerakkan mouse natural dulu!', 'warn');
Telemetry.refresh();
