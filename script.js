/**
 * ═══════════════════════════════════════════════════════════════
 * PLAYER NARRATIVO — TP03 · ISPTC 2025
 * script.js
 * ───────────────────────────────────────────────────────────────
 * COMO FUNCIONA (resumo):
 *
 *  1. O vídeo é carregado via tag <video> ou via drag & drop.
 *
 *  2. As LEGENDAS são lidas de um ficheiro .vtt (ou .srt convertido).
 *     O ficheiro é parseado e guardado como um array de "cues":
 *       [{ start: 0, end: 3.5, text: "Existe um lugar..." }, ...]
 *
 *  3. A sincronização acontece no evento "timeupdate" do vídeo:
 *     a cada 250ms o player verifica se o tempo actual do vídeo
 *     está dentro de algum cue e mostra o texto correspondente.
 *
 *  4. O MODO (V1 / V2) controla:
 *     - V1: vídeo mutado, legendas escondidas
 *     - V2: vídeo com som (ou áudio externo), legendas visíveis
 * ═══════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════
   ESTADO GLOBAL DA APLICAÇÃO
═══════════════════════════════════════ */
const state = {
  mode: 'v1',         // 'v1' = visual puro | 'v2' = enriquecido
  isPlaying: false,
  isMuted: false,
  volume: 1,
  duration: 0,
  currentTime: 0,
  subtitles: [],      // array de cues parseados do VTT
  subsLoaded: false,
  audioEl: null,      // elemento Audio externo (opcional)
  audioLoaded: false,
  seeking: false,
};

/* ═══════════════════════════════════════
   REFERÊNCIAS AOS ELEMENTOS DO DOM
═══════════════════════════════════════ */
const video         = document.getElementById('main-video');
const progressFill  = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const progressBar   = document.getElementById('progress-bar');
const timeCurrent   = document.getElementById('time-current');
const timeTotal     = document.getElementById('time-total');
const playIcon      = document.getElementById('play-icon');
const playOverlay   = document.getElementById('play-overlay');
const playOverlayIcon = document.getElementById('play-overlay-icon');
const subtitleOverlay = document.getElementById('subtitle-overlay');
const subtitleText  = document.getElementById('subtitle-text');
const modeIndicator = document.getElementById('mode-indicator');
const modeLabel     = document.getElementById('mode-label');
const toggleV1      = document.getElementById('toggle-v1');
const toggleV2      = document.getElementById('toggle-v2');
const toggleThumb   = document.getElementById('toggle-thumb');
const modePanelV1   = document.getElementById('mode-panel-v1');
const modePanelV2   = document.getElementById('mode-panel-v2');
const scenesRow     = document.getElementById('scenes-row');
const volumeSlider  = document.getElementById('volume-slider');

/* ═══════════════════════════════════════
   INICIALIZAÇÃO
═══════════════════════════════════════ */
(function init() {
  // Começa sempre em V1 (mudo, sem legendas)
  video.muted = true;
  applyMode('v1');

  // Dimensiona o thumb do toggle ao arrancar
  setTimeout(resizeToggleThumb, 50);

  // Detecta redimensionamento da janela
  window.addEventListener('resize', resizeToggleThumb);

  // Drag & drop nas zonas de ficheiros
  setupDragDrop();
})();

/* ═══════════════════════════════════════
   EVENTOS DO VÍDEO
═══════════════════════════════════════ */

/**
 * EVENTO: timeupdate
 * Dispara ~4× por segundo enquanto o vídeo está a correr.
 * É aqui que acontece a SINCRONIZAÇÃO das legendas.
 *
 * Como funciona:
 *  - Obtemos o tempo actual do vídeo (video.currentTime)
 *  - Percorremos o array state.subtitles
 *  - Se o tempo actual estiver entre cue.start e cue.end → mostramos cue.text
 *  - Se não houver cue correspondente → apagamos o texto
 */
video.addEventListener('timeupdate', () => {
  const t = video.currentTime;
  state.currentTime = t;

  // Actualizar barra de progresso
  if (state.duration > 0) {
    const pct = (t / state.duration) * 100;
    progressFill.style.width  = pct + '%';
    progressThumb.style.left  = pct + '%';
  }

  // Actualizar tempo exibido
  timeCurrent.textContent = formatTime(t);

  // ── SINCRONIZAÇÃO DE LEGENDAS ──
  if (state.subsLoaded && state.mode === 'v2') {
    // Procura o cue cujo intervalo [start, end] contém o tempo actual
    const activeCue = state.subtitles.find(
      cue => t >= cue.start && t < cue.end
    );

    if (activeCue) {
      // Há uma legenda activa → mostra o texto
      subtitleText.textContent = activeCue.text;
      subtitleOverlay.classList.add('visible');
    } else {
      // Sem legenda neste momento → apaga
      subtitleText.textContent = '';
      subtitleOverlay.classList.remove('visible');
    }
  }

  // Sincroniza áudio externo se existir (evita drift > 0.4s)
  if (state.audioLoaded && state.mode === 'v2' && state.isPlaying) {
    if (Math.abs(state.audioEl.currentTime - t) > 0.4) {
      state.audioEl.currentTime = t;
    }
  }

  // Actualiza a pill de cena activa
  updateActivePill(t);
});

// Quando os metadados do vídeo estão carregados
video.addEventListener('loadedmetadata', () => {
  state.duration = video.duration;
  timeTotal.textContent = formatTime(video.duration);
  buildScenePills(video.duration);
  // Mostra o overlay de play inicial
  playOverlay.classList.add('visible');
});

// Quando o vídeo termina
video.addEventListener('ended', () => {
  state.isPlaying = false;
  playIcon.textContent = '▶';
  playOverlayIcon.textContent = '▶';
  playOverlay.classList.add('visible');
  if (state.audioEl) state.audioEl.pause();
});

// Clique na stage do vídeo → toggle play
document.getElementById('video-stage').addEventListener('click', (e) => {
  // Ignora se o clique for no overlay de play (para não duplicar)
  if (e.target.closest('.play-overlay')) return;
  togglePlay();
});

/* ═══════════════════════════════════════
   BARRA DE PROGRESSO — CLIQUE E DRAG
═══════════════════════════════════════ */
progressBar.addEventListener('mousedown', (e) => {
  state.seeking = true;
  scrubTo(e);
});
document.addEventListener('mousemove', (e) => {
  if (state.seeking) scrubTo(e);
});
document.addEventListener('mouseup', () => {
  state.seeking = false;
});
progressBar.addEventListener('touchstart', (e) => {
  state.seeking = true;
  scrubTo(e.touches[0]);
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (state.seeking) scrubTo(e.touches[0]);
}, { passive: true });
document.addEventListener('touchend', () => {
  state.seeking = false;
});

/**
 * scrubTo — calcula a posição na barra e salta para esse tempo
 */
function scrubTo(e) {
  const rect = progressBar.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const pct = x / rect.width;
  const newTime = pct * state.duration;
  video.currentTime = newTime;
  if (state.audioEl) state.audioEl.currentTime = newTime;
}

/* ═══════════════════════════════════════
   CONTROLOS DE PLAYBACK
═══════════════════════════════════════ */

/**
 * togglePlay — alterna entre play e pause
 */
function togglePlay() {
  if (video.paused) {
    video.play();
    state.isPlaying = true;
    playIcon.textContent = '⏸';
    playOverlayIcon.textContent = '⏸';
    playOverlay.classList.remove('visible');
    // Se há áudio externo em V2, reproduz em sincronismo
    if (state.audioLoaded && state.mode === 'v2') {
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

/**
 * stopVideo — para o vídeo e volta ao início
 */
function stopVideo() {
  video.pause();
  video.currentTime = 0;
  state.isPlaying = false;
  playIcon.textContent = '▶';
  playOverlay.classList.add('visible');
  if (state.audioEl) {
    state.audioEl.pause();
    state.audioEl.currentTime = 0;
  }
  subtitleText.textContent = '';
  subtitleOverlay.classList.remove('visible');
}

/**
 * seek — avança ou recua N segundos
 * @param {number} seconds - positivo para avançar, negativo para recuar
 */
function seek(seconds) {
  const newTime = Math.max(0, Math.min(video.currentTime + seconds, state.duration));
  video.currentTime = newTime;
  if (state.audioEl) state.audioEl.currentTime = newTime;
}

/**
 * seekTo — salta para um tempo específico (usado pelas pills de cena)
 * @param {number} time - tempo em segundos
 */
function seekTo(time) {
  video.currentTime = time;
  if (state.audioEl) state.audioEl.currentTime = time;
  if (!state.isPlaying) togglePlay();
}

/* ═══════════════════════════════════════
   CONTROLO DE VOLUME
═══════════════════════════════════════ */

/**
 * toggleMute — muda/desmuda o vídeo
 */
function toggleMute() {
  state.isMuted = !state.isMuted;
  video.muted = state.isMuted || (state.mode === 'v1');
  if (state.audioEl) state.audioEl.muted = state.isMuted;
  document.getElementById('volume-icon').textContent = state.isMuted ? '🔇' : '🔊';
}

/**
 * setVolume — define o volume (0 a 1)
 * @param {number} val
 */
function setVolume(val) {
  state.volume = parseFloat(val);
  video.volume = state.volume;
  if (state.audioEl) state.audioEl.volume = state.volume;
  document.getElementById('volume-icon').textContent =
    state.volume === 0 ? '🔇' : state.volume < 0.5 ? '🔉' : '🔊';
}

/* ═══════════════════════════════════════
   MODO V1 / V2
═══════════════════════════════════════ */

/**
 * toggleMode — alterna entre Versão 1 e Versão 2
 */
function toggleMode() {
  const newMode = state.mode === 'v1' ? 'v2' : 'v1';
  applyMode(newMode);
}

/**
 * applyMode — aplica as regras de um modo específico
 *
 * MODO V1 (visual puro):
 *  - Vídeo mutado
 *  - Áudio externo parado
 *  - Legendas escondidas
 *
 * MODO V2 (enriquecido):
 *  - Vídeo com som (ou áudio externo activo)
 *  - Legendas activadas (se VTT carregado)
 *
 * @param {'v1'|'v2'} mode
 */
function applyMode(mode) {
  state.mode = mode;

  if (mode === 'v1') {
    // ── MODO V1 ──
    video.muted = true;
    if (state.audioEl) { state.audioEl.pause(); state.audioEl.muted = true; }
    subtitleOverlay.classList.remove('visible');
    subtitleText.textContent = '';

    // UI
    toggleV1.classList.add('active');
    toggleV2.classList.remove('active');
    modePanelV1.classList.add('active');
    modePanelV2.classList.remove('active');
    modeIndicator.classList.remove('v2');
    modeLabel.textContent = 'Modo Visual';
    moveToggleThumb('v1');

  } else {
    // ── MODO V2 ──
    video.muted = state.audioLoaded; // se há áudio externo, muta o vídeo
    if (state.audioLoaded) {
      state.audioEl.muted = false;
      state.audioEl.volume = state.volume;
      if (state.isPlaying) {
        state.audioEl.currentTime = video.currentTime;
        state.audioEl.play();
      }
    }

    // UI
    toggleV1.classList.remove('active');
    toggleV2.classList.add('active');
    modePanelV1.classList.remove('active');
    modePanelV2.classList.add('active');
    modeIndicator.classList.add('v2');
    modeLabel.textContent = 'Modo Enriquecido';
    moveToggleThumb('v2');
  }
}

/* ═══════════════════════════════════════
   CARREGAMENTO DE FICHEIROS
═══════════════════════════════════════ */

/**
 * loadVideo — carrega um vídeo via input de ficheiro
 * @param {HTMLInputElement} input
 */
function loadVideo(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  video.src = url;
  video.load();
  markLoaded('fd-video', file.name);
  // Reset estado
  stopVideo();
  state.subtitles = [];
  state.subsLoaded = false;
}

/**
 * loadSubtitles — carrega e parseia um ficheiro VTT ou SRT
 *
 * COMO FUNCIONA:
 *  1. Lê o ficheiro como texto
 *  2. Se for .srt, converte para formato VTT internamente
 *  3. Parseia o texto VTT em blocos separados por linha em branco dupla
 *  4. De cada bloco extrai: tempo de início, tempo de fim, e texto
 *  5. Guarda o array de cues em state.subtitles
 *
 * @param {HTMLInputElement} input
 */
function loadSubtitles(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    let text = e.target.result;

    // Se for .srt, converte para VTT
    if (file.name.endsWith('.srt')) {
      text = srtToVtt(text);
    }

    // Parseia o VTT
    state.subtitles = parseVTT(text);
    state.subsLoaded = state.subtitles.length > 0;

    if (state.subsLoaded) {
      markLoaded('fd-subs', `${state.subtitles.length} legendas carregadas`);
      console.log(`[Legendas] ${state.subtitles.length} cues carregados:`, state.subtitles);
    } else {
      console.warn('[Legendas] Nenhum cue encontrado no ficheiro.');
    }
  };
  reader.readAsText(file);
}

/**
 * loadAudio — carrega um ficheiro de áudio externo
 * @param {HTMLInputElement} input
 */
function loadAudio(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);

  // Destrói o elemento anterior se existir
  if (state.audioEl) { state.audioEl.pause(); state.audioEl.src = ''; }

  state.audioEl = new Audio(url);
  state.audioEl.preload = 'auto';
  state.audioEl.volume = state.volume;
  state.audioEl.muted = (state.mode === 'v1');
  state.audioLoaded = true;

  markLoaded('fd-audio', file.name);

  // Se o vídeo já está a correr em V2, inicia o áudio em sincronismo
  if (state.mode === 'v2' && state.isPlaying) {
    state.audioEl.currentTime = video.currentTime;
    state.audioEl.play();
  }
}

/* ═══════════════════════════════════════
   PARSER DE VTT
═══════════════════════════════════════ */

/**
 * parseVTT — converte texto VTT num array de cues
 *
 * Formato VTT:
 *   WEBVTT
 *
 *   1
 *   00:00:01.000 --> 00:00:04.500
 *   Existe um lugar em Luanda
 *
 *   2
 *   00:00:05.000 --> 00:00:09.000
 *   Chama-se Hoji Ya Henda
 *
 * @param {string} text - conteúdo do ficheiro VTT
 * @returns {Array<{start:number, end:number, text:string}>}
 */
function parseVTT(text) {
  const cues = [];

  // Divide em blocos separados por linha vazia dupla
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;

    // Encontra a linha com a seta de tempo (-->)
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const start = vttTimeToSeconds(startStr);
    const end   = vttTimeToSeconds(endStr);

    // O texto é tudo o que está depois da linha de tempo
    const textLines = lines.filter(l =>
      !l.includes('-->') &&
      !/^\d+$/.test(l.trim()) &&  // não é número de sequência
      l.trim() !== 'WEBVTT' &&
      l.trim() !== ''
    );

    if (textLines.length > 0 && !isNaN(start) && !isNaN(end)) {
      cues.push({ start, end, text: textLines.join(' ') });
    }
  }

  return cues;
}

/**
 * vttTimeToSeconds — converte "00:01:23.456" ou "01:23.456" em segundos
 * @param {string} timeStr
 * @returns {number}
 */
function vttTimeToSeconds(timeStr) {
  const clean = timeStr.replace(',', '.').trim();
  const parts  = clean.split(':');
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    return parseFloat(parts[0]) * 3600 +
           parseFloat(parts[1]) * 60   +
           parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(clean);
}

/* ═══════════════════════════════════════
   CONVERSOR SRT → VTT
═══════════════════════════════════════ */

/**
 * srtToVtt — converte texto SRT para VTT
 *
 * SRT usa vírgula nos milissegundos: 00:00:01,500
 * VTT usa ponto:                     00:00:01.500
 *
 * @param {string} srtText
 * @returns {string} texto VTT equivalente
 */
function srtToVtt(srtText) {
  return 'WEBVTT\n\n' +
    srtText
      .replace(/\r\n/g, '\n')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}

/* ═══════════════════════════════════════
   CENAS (PILLS DE NAVEGAÇÃO)
═══════════════════════════════════════ */

/**
 * buildScenePills — cria os botões de navegação por cena
 * Divide a duração total em 6 partes iguais.
 *
 * COMO ADICIONAR CENAS PERSONALIZADAS:
 * Substitui o array "scenes" abaixo com os teus próprios tempos.
 * Exemplo: const scenes = [
 *   { label: 'A Chegada',    time: 0   },
 *   { label: 'Os Problemas', time: 50  },
 *   { label: 'A Resiliência',time: 150 },
 * ];
 *
 * @param {number} duration - duração total do vídeo em segundos
 */
function buildScenePills(duration) {
  scenesRow.innerHTML = '';

  // Cenas automáticas (6 partes iguais)
  const numScenes = 6;
  const step = duration / numScenes;

  const sceneLabels = [
    'Acto 1 · Chegada',
    'Acto 2 · Contexto',
    'Acto 3 · Problema',
    'Acto 4 · Impacto',
    'Acto 5 · Pessoas',
    'Acto 6 · Desfecho',
  ];

  for (let i = 0; i < numScenes; i++) {
    const time = Math.round(i * step);
    const btn  = document.createElement('button');
    btn.className    = 'scene-pill' + (i === 0 ? ' active' : '');
    btn.textContent  = sceneLabels[i] || `Cena ${i + 1}`;
    btn.dataset.time = time;
    btn.onclick      = () => {
      seekTo(time);
      document.querySelectorAll('.scene-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    };
    scenesRow.appendChild(btn);
  }
}

/**
 * updateActivePill — destaca a pill correspondente ao tempo actual
 * @param {number} currentTime
 */
function updateActivePill(currentTime) {
  const pills = document.querySelectorAll('.scene-pill');
  if (!pills.length) return;

  let activePill = pills[0];
  pills.forEach(pill => {
    if (currentTime >= parseFloat(pill.dataset.time)) {
      activePill = pill;
    }
  });

  pills.forEach(p => p.classList.remove('active'));
  activePill.classList.add('active');
}

/* ═══════════════════════════════════════
   ECRÃ COMPLETO
═══════════════════════════════════════ */
function toggleFullscreen() {
  const wrapper = document.getElementById('player-wrapper');
  if (!document.fullscreenElement) {
    wrapper.requestFullscreen && wrapper.requestFullscreen();
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
}

/* ═══════════════════════════════════════
   TOGGLE THUMB — POSICIONAMENTO DINÂMICO
═══════════════════════════════════════ */

/**
 * resizeToggleThumb — calcula a largura correcta do thumb do toggle V1/V2
 */
function resizeToggleThumb() {
  const w1 = toggleV1.getBoundingClientRect().width;
  const w2 = toggleV2.getBoundingClientRect().width;
  toggleThumb.style.width = (state.mode === 'v1' ? w1 : w2) + 'px';
}

/**
 * moveToggleThumb — move o thumb para V1 ou V2
 * @param {'v1'|'v2'} mode
 */
function moveToggleThumb(mode) {
  const w1 = toggleV1.getBoundingClientRect().width;
  const w2 = toggleV2.getBoundingClientRect().width;
  if (mode === 'v1') {
    toggleThumb.style.left  = '0px';
    toggleThumb.style.width = w1 + 'px';
  } else {
    toggleThumb.style.left  = (w1 + 2) + 'px';
    toggleThumb.style.width = w2 + 'px';
  }
}

/* ═══════════════════════════════════════
   DRAG & DROP NAS ZONAS DE FICHEIRO
═══════════════════════════════════════ */
function setupDragDrop() {
  const zones = [
    { id: 'fd-video', handler: fakeInput('video/*', loadVideo) },
    { id: 'fd-subs',  handler: fakeInput('.vtt,.srt', loadSubtitles) },
    { id: 'fd-audio', handler: fakeInput('audio/*', loadAudio) },
  ];

  zones.forEach(({ id }) => {
    const zone = document.getElementById(id);
    if (!zone) return;
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const input = zone.querySelector('input[type="file"]');
      // Simula o carregamento via o handler correcto
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    });
  });
}

function fakeInput(accept, fn) {
  return function(file) { fn({ files: [file] }); };
}

/* ═══════════════════════════════════════
   UTILITÁRIOS
═══════════════════════════════════════ */

/**
 * formatTime — converte segundos em "M:SS"
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * markLoaded — marca uma zona de ficheiro como carregada
 * @param {string} zoneId
 * @param {string} fileName
 */
function markLoaded(zoneId, fileName) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.classList.add('loaded');
  const label = zone.querySelector('.fd-label');
  if (label) label.innerHTML = `<strong>✓ ${fileName.length > 22 ? fileName.substring(0,20)+'…' : fileName}</strong>`;
}

/* ═══════════════════════════════════════
   ATALHOS DE TECLADO
═══════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  // Ignora se o foco estiver num input
  if (e.target.tagName === 'INPUT') return;

  switch(e.key) {
    case ' ':
    case 'k':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      seek(10);
      break;
    case 'ArrowLeft':
      seek(-10);
      break;
    case 'm':
    case 'M':
      toggleMute();
      break;
    case 'v':
    case 'V':
      toggleMode();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
  }
});
