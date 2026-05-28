/**
 * ═══════════════════════════════════════════════════════════════
 * XAVIER PLAYER — TP03 · ISPTEC 2025
 * script.js
 * ───────────────────────────────────────────────────────────────
 * REGRAS DE COMPORTAMENTO:
 *
 *  V1 (Narrativa Visual):
 *    - Vídeo SEMPRE mudo
 *    - Sem legendas
 *    - Botões de áudio e legendas escondidos
 *
 *  V2 (Narrativa Enriquecida):
 *    - Vídeo continua mudo por defeito
 *    - Botão "Ativar Áudio" → liga/desliga o áudio (externo ou do vídeo)
 *    - Botão "Adicionar Legendas" → liga/desliga legendas sincronizadas
 *    - Cada botão é independente do outro
 *
 *  SINCRONIZAÇÃO DE LEGENDAS:
 *    - O evento "timeupdate" do vídeo dispara ~4× por segundo
 *    - Quando subsOn = true, procura o cue cujo [start, end]
 *      contém o video.currentTime e mostra o texto
 *    - Quando o utilizador liga as legendas a meio do vídeo,
 *      a legenda correcta aparece imediatamente (sem esperar timeupdate)
 * ═══════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════ */
const state = {
  mode:        'v1',   // 'v1' | 'v2'
  isPlaying:   false,
  isMuted:     false,  // mute manual do utilizador (botão 🔇)
  volume:      1,
  duration:    0,
  currentTime: 0,

  // Legendas
  subtitles:   [],     // [{start, end, text}, ...]
  subsLoaded:  false,
  subsOn:      false,  // estado do botão "Adicionar Legendas"

  // Áudio externo
  audioEl:     null,
  audioLoaded: false,
  audioOn:     false,  // estado do botão "Ativar Áudio"

  seeking:     false,
};

/* ═══════════════════════════════════════
   REFERÊNCIAS DOM
═══════════════════════════════════════ */
const video           = document.getElementById('main-video');
const progressFill    = document.getElementById('progress-fill');
const progressThumb   = document.getElementById('progress-thumb');
const progressBar     = document.getElementById('progress-bar');
const timeCurrent     = document.getElementById('time-current');
const timeTotal       = document.getElementById('time-total');
const playIcon        = document.getElementById('play-icon');
const playOverlay     = document.getElementById('play-overlay');
const playOverlayIcon = document.getElementById('play-overlay-icon');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const subtitleText    = document.getElementById('subtitle-text');
const modeIndicator   = document.getElementById('mode-indicator');
const modeLabel       = document.getElementById('mode-label');
const toggleV1        = document.getElementById('toggle-v1');
const toggleV2        = document.getElementById('toggle-v2');
const toggleThumb     = document.getElementById('toggle-thumb');
const modePanelV1     = document.getElementById('mode-panel-v1');
const modePanelV2     = document.getElementById('mode-panel-v2');
const scenesRow       = document.getElementById('scenes-row');
const v2Controls      = document.getElementById('v2-controls');
const btnAudio        = document.getElementById('btn-audio');
const btnSubs         = document.getElementById('btn-subs');
const badgeAudio      = document.getElementById('badge-audio');
const badgeSubs       = document.getElementById('badge-subs');
const audioIcon       = document.getElementById('audio-icon');
const subsIcon        = document.getElementById('subs-icon');

/* ═══════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════ */
(function init() {
  // Vídeo sempre mudo ao arrancar (V1 e V2)
  video.muted  = true;
  video.volume = state.volume;

  // Aplica modo V1 por defeito
  applyMode('v1');

  // Posiciona o thumb do toggle
  setTimeout(resizeToggleThumb, 60);
  window.addEventListener('resize', resizeToggleThumb);

  // Drag & drop
  setupDragDrop();
})();

/* ═══════════════════════════════════════
   EVENTOS DO VÍDEO
═══════════════════════════════════════ */
video.addEventListener('timeupdate', () => {
  const t = video.currentTime;
  state.currentTime = t;

  // Progresso
  if (state.duration > 0) {
    const pct = (t / state.duration) * 100;
    progressFill.style.width = pct + '%';
    progressThumb.style.left = pct + '%';
  }
  timeCurrent.textContent = formatTime(t);

  // ── SINCRONIZAÇÃO DE LEGENDAS ──
  // Só actualiza se: modo V2 + legendas carregadas + botão ON
  if (state.mode === 'v2' && state.subsLoaded && state.subsOn) {
    const cue = state.subtitles.find(c => t >= c.start && t < c.end);
    if (cue) {
      subtitleText.textContent = cue.text;
      subtitleOverlay.classList.add('visible');
    } else {
      subtitleText.textContent = '';
      subtitleOverlay.classList.remove('visible');
    }
  }

  // Evita drift do áudio externo (> 0.4s)
  if (state.mode === 'v2' && state.audioLoaded && state.audioOn && state.isPlaying) {
    if (Math.abs(state.audioEl.currentTime - t) > 0.4) {
      state.audioEl.currentTime = t;
    }
  }

  updateActivePill(t);
});

video.addEventListener('loadedmetadata', () => {
  state.duration = video.duration;
  timeTotal.textContent = formatTime(video.duration);
  buildScenePills(video.duration);
  playOverlay.classList.add('visible');
});

video.addEventListener('ended', () => {
  state.isPlaying = false;
  playIcon.textContent = '▶';
  playOverlayIcon.textContent = '▶';
  playOverlay.classList.add('visible');
  if (state.audioEl) state.audioEl.pause();
});

document.getElementById('video-stage').addEventListener('click', (e) => {
  if (e.target.closest('.play-overlay')) return;
  togglePlay();
});

/* ═══════════════════════════════════════
   BARRA DE PROGRESSO
═══════════════════════════════════════ */
progressBar.addEventListener('mousedown',  (e) => { state.seeking = true; scrubTo(e); });
document.addEventListener('mousemove',     (e) => { if (state.seeking) scrubTo(e); });
document.addEventListener('mouseup',       ()  => { state.seeking = false; });
progressBar.addEventListener('touchstart', (e) => { state.seeking = true; scrubTo(e.touches[0]); }, { passive: true });
document.addEventListener('touchmove',     (e) => { if (state.seeking) scrubTo(e.touches[0]); }, { passive: true });
document.addEventListener('touchend',      ()  => { state.seeking = false; });

function scrubTo(e) {
  const rect    = progressBar.getBoundingClientRect();
  const x       = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const newTime = (x / rect.width) * state.duration;
  video.currentTime = newTime;
  if (state.audioEl) state.audioEl.currentTime = newTime;
}

/* ═══════════════════════════════════════
   PLAYBACK
═══════════════════════════════════════ */
function togglePlay() {
  if (video.paused) {
    video.play();
    state.isPlaying = true;
    playIcon.textContent = '⏸';
    playOverlayIcon.textContent = '⏸';
    playOverlay.classList.remove('visible');

    // Inicia áudio externo se estiver activo em V2
    if (state.mode === 'v2' && state.audioLoaded && state.audioOn) {
      state.audioEl.currentTime = video.currentTime;
      state.audioEl.play();
    }
  } else {
    video.pause();
    state.isPlaying = false;
    playIcon.textContent = '▶';
    playOverlayIcon.textContent = '▶';
    playOverlay.classList.add('visible');
    if (state.audioEl) state.audioEl.pause();
  }
}

function stopVideo() {
  video.pause();
  video.currentTime = 0;
  state.isPlaying = false;
  playIcon.textContent = '▶';
  playOverlay.classList.add('visible');
  if (state.audioEl) { state.audioEl.pause(); state.audioEl.currentTime = 0; }
  subtitleText.textContent = '';
  subtitleOverlay.classList.remove('visible');
}

function seek(seconds) {
  const newTime = Math.max(0, Math.min(video.currentTime + seconds, state.duration));
  video.currentTime = newTime;
  if (state.audioEl) state.audioEl.currentTime = newTime;
}

function seekTo(time) {
  video.currentTime = time;
  if (state.audioEl) state.audioEl.currentTime = time;
  if (!state.isPlaying) togglePlay();
}

/* ═══════════════════════════════════════
   VOLUME
═══════════════════════════════════════ */
function toggleMute() {
  state.isMuted = !state.isMuted;
  // Em V1 o vídeo fica sempre mudo independentemente
  video.muted = state.isMuted || state.mode === 'v1' || !state.audioOn;
  if (state.audioEl) state.audioEl.muted = state.isMuted;
  document.getElementById('volume-icon').textContent = state.isMuted ? '🔇' : '🔊';
}

function setVolume(val) {
  state.volume   = parseFloat(val);
  video.volume   = state.volume;
  if (state.audioEl) state.audioEl.volume = state.volume;
  document.getElementById('volume-icon').textContent =
    state.volume === 0 ? '🔇' : state.volume < 0.5 ? '🔉' : '🔊';
}

/* ═══════════════════════════════════════
   MODO V1 / V2
═══════════════════════════════════════ */
function toggleMode() {
  applyMode(state.mode === 'v1' ? 'v2' : 'v1');
}

/**
 * applyMode
 *
 * V1: vídeo mudo, painel V2 escondido, legendas e áudio desligados
 * V2: vídeo continua mudo, mostra painel com botões independentes
 *
 * Os botões "Ativar Áudio" e "Adicionar Legendas" gerem
 * o seu próprio estado — não são activados automaticamente
 * ao entrar em V2.
 */
function applyMode(mode) {
  state.mode = mode;

  if (mode === 'v1') {
    // Garante que vídeo fica mudo
    video.muted = true;

    // Para e muta o áudio externo
    if (state.audioEl) { state.audioEl.pause(); state.audioEl.muted = true; }

    // Esconde legendas e reset dos botões V2
    _resetV2Buttons();

    // UI toggle
    toggleV1.classList.add('active');
    toggleV2.classList.remove('active');
    modePanelV1.classList.add('active');
    modePanelV2.classList.remove('active');
    modeIndicator.classList.remove('v2');
    modeLabel.textContent = 'Modo Visual';
    v2Controls.classList.remove('visible');
    moveToggleThumb('v1');

  } else {
    // V2: vídeo permanece mudo — o utilizador decide ativar
    video.muted = true;

    // UI toggle
    toggleV1.classList.remove('active');
    toggleV2.classList.add('active');
    modePanelV1.classList.remove('active');
    modePanelV2.classList.add('active');
    modeIndicator.classList.add('v2');
    modeLabel.textContent = 'Modo Enriquecido';
    v2Controls.classList.add('visible');
    moveToggleThumb('v2');
  }
}

/**
 * _resetV2Buttons — desliga áudio e legendas e reseta a UI dos botões
 */
function _resetV2Buttons() {
  // Áudio
  state.audioOn = false;
  btnAudio.classList.remove('on');
  badgeAudio.textContent = 'OFF';
  audioIcon.textContent  = '🔇';

  // Legendas
  state.subsOn = false;
  btnSubs.classList.remove('on');
  badgeSubs.textContent  = 'OFF';
  subsIcon.textContent   = '💬';
  subtitleText.textContent = '';
  subtitleOverlay.classList.remove('visible');
}

/* ═══════════════════════════════════════
   BOTÃO: ATIVAR ÁUDIO (V2)
═══════════════════════════════════════ */
/**
 * toggleAudio
 *
 * Liga ou desliga o áudio de forma independente das legendas.
 *
 * Se houver áudio externo (MP3 carregado):
 *   - Liga/desliga o audioEl e sincroniza com video.currentTime
 * Se não houver áudio externo:
 *   - Desmuta/muta o próprio vídeo
 */
function toggleAudio() {
  // Só funciona em V2
  if (state.mode !== 'v2') return;

  state.audioOn = !state.audioOn;

  if (state.audioOn) {
    // ── LIGAR ÁUDIO ──
    if (state.audioLoaded) {
      // Áudio externo: sincroniza e reproduz
      state.audioEl.muted   = false;
      state.audioEl.volume  = state.volume;
      state.audioEl.currentTime = video.currentTime;
      if (state.isPlaying) state.audioEl.play();
    } else {
      // Sem áudio externo: desmuta o próprio vídeo
      video.muted = false;
    }

    btnAudio.classList.add('on');
    badgeAudio.textContent = 'ON';
    audioIcon.textContent  = '🔊';

  } else {
    // ── DESLIGAR ÁUDIO ──
    if (state.audioLoaded) {
      state.audioEl.pause();
      state.audioEl.muted = true;
    } else {
      video.muted = true;
    }

    btnAudio.classList.remove('on');
    badgeAudio.textContent = 'OFF';
    audioIcon.textContent  = '🔇';
  }
}

/* ═══════════════════════════════════════
   BOTÃO: ADICIONAR LEGENDAS (V2)
═══════════════════════════════════════ */
/**
 * toggleSubtitles
 *
 * Liga ou desliga as legendas de forma independente do áudio.
 *
 * Quando ligadas a meio do vídeo (ex: minuto 1:30), a legenda
 * correcta aparece IMEDIATAMENTE sem esperar pelo próximo timeupdate,
 * porque pesquisamos state.subtitles com video.currentTime na hora.
 */
function toggleSubtitles() {
  // Só funciona em V2
  if (state.mode !== 'v2') return;

  // ── SEM FICHEIRO VTT: mostra aviso no painel e no botão ──
  if (!state.subsLoaded) {
    _showSubsWarning();
    return;
  }

  state.subsOn = !state.subsOn;

  if (state.subsOn) {
    // ── LIGAR LEGENDAS ──
    // Remove aviso se existia
    _hideSubsWarning();

    // Mostra a legenda do momento actual IMEDIATAMENTE
    const t   = video.currentTime;
    const cue = state.subtitles.find(c => t >= c.start && t < c.end);
    subtitleText.textContent = cue ? cue.text : '';
    subtitleOverlay.classList.add('visible');

    btnSubs.classList.add('on');
    badgeSubs.textContent = 'ON';
    subsIcon.textContent  = '✅';

  } else {
    // ── DESLIGAR LEGENDAS ──
    subtitleText.textContent = '';
    subtitleOverlay.classList.remove('visible');

    btnSubs.classList.remove('on');
    badgeSubs.textContent = 'OFF';
    subsIcon.textContent  = '💬';
  }
}

/**
 * _flashBtn — feedback visual rápido num botão (shake + mensagem)
 */
function _flashBtn(btn, msg) {
  // legado — já não usado
}

/**
 * _showSubsWarning — aviso visível quando não há VTT carregado
 */
function _showSubsWarning() {
  btnSubs.classList.add('shake');
  setTimeout(() => btnSubs.classList.remove('shake'), 500);

  let warn = document.getElementById('subs-warning');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = 'subs-warning';
    warn.className = 'subs-warning';
    warn.innerHTML =
      '⚠&nbsp; Carrega primeiro um ficheiro de legendas ' +
      '<strong>.vtt ou .srt</strong> na secção ' +
      '"Ficheiros da narrativa" abaixo.';
    const btnRow = document.querySelector('.v2-btn-row');
    if (btnRow) btnRow.parentNode.insertBefore(warn, btnRow.nextSibling);
  }
  warn.classList.add('visible');
  clearTimeout(_showSubsWarning._t);
  _showSubsWarning._t = setTimeout(_hideSubsWarning, 4500);
}

function _hideSubsWarning() {
  const warn = document.getElementById('subs-warning');
  if (warn) warn.classList.remove('visible');
}

/* ═══════════════════════════════════════
   CARREGAMENTO DE FICHEIROS
═══════════════════════════════════════ */
function loadVideo(input) {
  const file = input.files[0];
  if (!file) return;
  video.src = URL.createObjectURL(file);
  video.load();
  markLoaded('fd-video', file.name);
  stopVideo();
  // Reset legendas ao mudar vídeo
  state.subtitles  = [];
  state.subsLoaded = false;
  state.subsOn     = false;
  if (state.mode === 'v2') _resetV2Buttons();
}

function loadAudio(input) {
  const file = input.files[0];
  if (!file) return;
  if (state.audioEl) { state.audioEl.pause(); state.audioEl.src = ''; }

  state.audioEl          = new Audio(URL.createObjectURL(file));
  state.audioEl.preload  = 'auto';
  state.audioEl.volume   = state.volume;
  state.audioEl.muted    = true; // começa muto — utilizador ativa com botão
  state.audioLoaded      = true;

  markLoaded('fd-audio', file.name);
}

/**
 * loadSubtitles
 *
 * Lê o ficheiro VTT ou SRT, parseia os cues e guarda em state.subtitles.
 * Não liga as legendas automaticamente — o utilizador usa o botão.
 */
function loadSubtitles(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    let text = e.target.result;
    if (file.name.toLowerCase().endsWith('.srt')) text = srtToVtt(text);

    state.subtitles  = parseVTT(text);
    state.subsLoaded = state.subtitles.length > 0;

    if (state.subsLoaded) {
      markLoaded('fd-subs', `${state.subtitles.length} legendas`);
      // Activa o botão de legendas (remove aparência disabled)
      btnSubs.removeAttribute('data-disabled');
    }
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════
   PARSER VTT
═══════════════════════════════════════ */
function parseVTT(text) {
  const cues   = [];
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines    = block.trim().split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const start = vttTimeToSec(startStr);
    const end   = vttTimeToSec(endStr);

    const textLines = lines.filter(l =>
      !l.includes('-->') &&
      !/^\d+$/.test(l.trim()) &&
      l.trim() !== 'WEBVTT' &&
      !l.trim().startsWith('NOTE') &&
      l.trim() !== ''
    );

    if (textLines.length && !isNaN(start) && !isNaN(end)) {
      cues.push({ start, end, text: textLines.join(' ') });
    }
  }
  return cues;
}

function vttTimeToSec(t) {
  const clean = t.replace(',', '.').trim();
  const parts = clean.split(':');
  if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return +parts[0] * 60 + parseFloat(parts[1]);
  return parseFloat(clean);
}

function srtToVtt(srt) {
  return 'WEBVTT\n\n' + srt
    .replace(/\r\n/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}

/* ═══════════════════════════════════════
   CENAS
═══════════════════════════════════════ */
function buildScenePills(duration) {
  scenesRow.innerHTML = '';
  const labels = [
    'Acto 1 · Chegada', 'Acto 2 · Contexto', 'Acto 3 · Problema',
    'Acto 4 · Impacto',  'Acto 5 · Pessoas',  'Acto 6 · Desfecho',
  ];
  const step = duration / labels.length;
  labels.forEach((label, i) => {
    const time = Math.round(i * step);
    const btn  = document.createElement('button');
    btn.className    = 'scene-pill' + (i === 0 ? ' active' : '');
    btn.textContent  = label;
    btn.dataset.time = time;
    btn.onclick = () => {
      seekTo(time);
      document.querySelectorAll('.scene-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    };
    scenesRow.appendChild(btn);
  });
}

function updateActivePill(t) {
  const pills = document.querySelectorAll('.scene-pill');
  if (!pills.length) return;
  let active = pills[0];
  pills.forEach(p => { if (t >= parseFloat(p.dataset.time)) active = p; });
  pills.forEach(p => p.classList.remove('active'));
  active.classList.add('active');
}

/* ═══════════════════════════════════════
   ECRÃ COMPLETO
═══════════════════════════════════════ */
function toggleFullscreen() {
  const el = document.getElementById('player-wrapper');
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
}

/* ═══════════════════════════════════════
   TOGGLE THUMB
═══════════════════════════════════════ */
function resizeToggleThumb() {
  const w = state.mode === 'v1'
    ? toggleV1.getBoundingClientRect().width
    : toggleV2.getBoundingClientRect().width;
  toggleThumb.style.width = w + 'px';
}

function moveToggleThumb(mode) {
  const w1 = toggleV1.getBoundingClientRect().width;
  const w2 = toggleV2.getBoundingClientRect().width;
  toggleThumb.style.left  = mode === 'v1' ? '0px' : (w1 + 2) + 'px';
  toggleThumb.style.width = (mode === 'v1' ? w1 : w2) + 'px';
}

/* ═══════════════════════════════════════
   DRAG & DROP
═══════════════════════════════════════ */
function setupDragDrop() {
  ['fd-video', 'fd-audio', 'fd-subs'].forEach(id => {
    const zone = document.getElementById(id);
    if (!zone) return;
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const input = zone.querySelector('input[type="file"]');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    });
  });
}

/* ═══════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════ */
function formatTime(s) {
  if (isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function markLoaded(id, name) {
  const zone = document.getElementById(id);
  if (!zone) return;
  zone.classList.add('loaded');
  const lbl = zone.querySelector('.fd-label');
  if (lbl) lbl.innerHTML = `<strong>✓ ${name.length > 22 ? name.substring(0, 20) + '…' : name}</strong>`;
}

/* ═══════════════════════════════════════
   ATALHOS DE TECLADO
═══════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ': case 'k': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':  seek(10);  break;
    case 'ArrowLeft':   seek(-10); break;
    case 'm': case 'M': toggleMute(); break;
    case 'v': case 'V': toggleMode(); break;
    case 'a': case 'A': if (state.mode === 'v2') toggleAudio(); break;
    case 'l': case 'L': if (state.mode === 'v2') toggleSubtitles(); break;
    case 'f': case 'F': toggleFullscreen(); break;
  }
});
