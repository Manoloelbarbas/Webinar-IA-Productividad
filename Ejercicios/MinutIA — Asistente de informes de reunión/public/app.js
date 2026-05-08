'use strict';

/* ================================================================
   MinutIA — Frontend
================================================================ */

const DEFAULT_INSTRUCTION = "Genera una minuta ejecutiva formal a partir del audio de esta reunión. Identifica temas tratados, acuerdos, responsables, pendientes, riesgos, próximos pasos y redacta un correo de seguimiento listo para enviar. Si algún dato no aparece, escribe 'No indicado'.";

const PRESETS = {
  minuta: DEFAULT_INSTRUCTION,
  plan: "Genera un plan de acción detallado a partir del audio de esta reunión. Para cada acción indica: tarea, responsable, plazo y prioridad. Incluye también riesgos y próximos pasos. Si algún dato no aparece, escribe 'No indicado'.",
  correo: "Redacta un correo de seguimiento formal y profesional dirigido al equipo, basándote en el audio de la reunión. Incluye saludo, resumen breve de lo conversado, acuerdos, próximos pasos y cierre. Mantén la estructura completa del informe ejecutivo.",
  gerencia: "Genera un resumen ejecutivo orientado a gerencia a partir del audio: foco en decisiones, impacto, riesgos clave, métricas mencionadas y próximos hitos. Mantén la estructura completa del informe ejecutivo.",
  acuerdos: "Extrae únicamente los acuerdos y responsables del audio. Diferencia claramente entre acuerdos explícitos y acciones meramente sugeridas. Mantén la estructura completa del informe ejecutivo y, si un dato no aparece, escribe 'No indicado'.",
};

const SECTION_TITLES = [
  'Resumen ejecutivo',
  'Temas tratados',
  'Acuerdos principales',
  'Responsables',
  'Pendientes',
  'Riesgos o bloqueos',
  'Próximos pasos',
  'Correo de seguimiento',
];

const PHASES = [
  { key: 'idle',       title: 'A la espera del audio',        desc: 'Sube un archivo y elige una instrucción para comenzar.' },
  { key: 'loaded',     title: 'Audio cargado',                desc: 'Listo para enviar. Pulsa "Generar informe".' },
  { key: 'processing', title: 'Procesando reunión',           desc: 'Preparando el audio para enviarlo a Gemini.' },
  { key: 'analyzing',  title: 'Analizando contenido',         desc: 'Gemini está escuchando y comprendiendo el audio.' },
  { key: 'generating', title: 'Generando informe',            desc: 'Estructurando minuta, acuerdos y correo de seguimiento.' },
  { key: 'done',       title: 'Informe listo',                desc: 'Tu minuta ejecutiva está disponible más abajo.' },
  { key: 'error',      title: 'Ocurrió un error',             desc: 'Revisa el mensaje y vuelve a intentarlo.' },
];

/* ============ Estado ============ */
const state = {
  audioFile: null,
  instruction: '',
  phase: 'idle',
  markdown: '',
};

/* ============ Helpers DOM ============ */
const $ = (id) => document.getElementById(id);

const dropzone     = $('dropzone');
const audioInput   = $('audio-input');
const dropEmpty    = $('dropzone-empty');
const dropFile     = $('dropzone-file');
const fileNameEl   = $('file-name');
const fileSizeEl   = $('file-size');
const removeFileBtn= $('remove-file');
const instructionEl= $('instruction');
const generateBtn  = $('generate-btn');
const pipeline     = $('pipeline');
const statusTitle  = $('status-title');
const statusDesc   = $('status-desc');
const progressEl   = $('progress');
const outputEl     = $('output');
const outputBlocks = $('output-blocks');
const copyReportBtn= $('copy-report-btn');
const copyEmailBtn = $('copy-email-btn');
const downloadBtn  = $('download-btn');
const clearBtn     = $('clear-btn');
const healthEl     = $('health-indicator');
const healthLabel  = healthEl.querySelector('.status__label');
const toastsEl     = $('toasts');

/* ============ Init ============ */
instructionEl.value = DEFAULT_INSTRUCTION;
state.instruction = DEFAULT_INSTRUCTION;
setActiveChip('minuta');
setPhase('idle');
checkHealth();

/* ============ Health check ============ */
async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    if (data.ok && data.hasKey) {
      healthEl.dataset.state = 'ok';
      healthLabel.textContent = `Backend · ${data.model}`;
    } else if (data.ok && !data.hasKey) {
      healthEl.dataset.state = 'warn';
      healthLabel.textContent = 'Falta API Key';
    } else {
      healthEl.dataset.state = 'error';
      healthLabel.textContent = 'Error backend';
    }
  } catch {
    healthEl.dataset.state = 'error';
    healthLabel.textContent = 'Sin conexión';
  }
}

/* ============ Dropzone ============ */
dropzone.addEventListener('click', () => audioInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); audioInput.click(); }
});
audioInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleFile(file);
});

['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('is-dragover');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('is-dragover');
  })
);
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.audioFile = null;
  audioInput.value = '';
  dropEmpty.hidden = false;
  dropFile.hidden = true;
  setPhase('idle');
  refreshGenerateBtn();
});

function handleFile(file) {
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name);
  if (!isAudio) {
    showToast('Formato no compatible. Usa mp3, wav, m4a, ogg o webm.', 'error');
    return;
  }
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    showToast('El audio supera el tamaño máximo (25 MB).', 'error');
    return;
  }
  state.audioFile = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);
  dropEmpty.hidden = true;
  dropFile.hidden = false;
  setPhase('loaded');
  refreshGenerateBtn();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ============ Instrucción y chips ============ */
instructionEl.addEventListener('input', () => {
  state.instruction = instructionEl.value;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
  refreshGenerateBtn();
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const preset = chip.dataset.preset;
    const value = PRESETS[preset] || DEFAULT_INSTRUCTION;
    instructionEl.value = value;
    state.instruction = value;
    setActiveChip(preset);
    refreshGenerateBtn();
  });
});

function setActiveChip(preset) {
  document.querySelectorAll('.chip').forEach((c) =>
    c.classList.toggle('is-active', c.dataset.preset === preset)
  );
}

function refreshGenerateBtn() {
  const ready = Boolean(state.audioFile) && state.instruction.trim().length > 0;
  generateBtn.disabled = !ready || ['processing', 'analyzing', 'generating'].includes(state.phase);
}

/* ============ Generar ============ */
generateBtn.addEventListener('click', async () => {
  if (!state.audioFile) {
    showToast('Sube un archivo de audio antes de generar el informe.', 'error');
    return;
  }
  if (!state.instruction.trim()) {
    showToast('Escribe una instrucción para la IA.', 'error');
    return;
  }

  generateBtn.classList.add('is-loading');
  generateBtn.disabled = true;
  outputEl.hidden = true;

  const formData = new FormData();
  formData.append('audio', state.audioFile);
  formData.append('instruction', state.instruction);

  setPhase('processing');
  const phaseTimers = [
    setTimeout(() => setPhase('analyzing'), 1200),
    setTimeout(() => setPhase('generating'), 4500),
  ];

  try {
    const res = await fetch('/api/generate', { method: 'POST', body: formData });
    phaseTimers.forEach(clearTimeout);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      const msg = (data && data.message) || 'Ocurrió un error al generar el informe.';
      setPhase('error');
      showToast(msg, 'error');
      return;
    }

    state.markdown = data.markdown;
    setPhase('done');
    renderReport(state.markdown);
    showToast('Informe generado correctamente.', 'success');
  } catch (err) {
    phaseTimers.forEach(clearTimeout);
    setPhase('error');
    showToast('No fue posible contactar al servidor. Revisa tu conexión.', 'error');
  } finally {
    generateBtn.classList.remove('is-loading');
    refreshGenerateBtn();
  }
});

/* ============ Pipeline & estado ============ */
function setPhase(key) {
  state.phase = key;
  const phase = PHASES.find((p) => p.key === key) || PHASES[0];
  statusTitle.textContent = phase.title;
  statusDesc.textContent  = phase.desc;
  progressEl.hidden = !['processing', 'analyzing', 'generating'].includes(key);

  const stepIndex = ({
    idle: 0,
    loaded: 1,
    processing: 2,
    analyzing: 3,
    generating: 4,
    done: 5,
    error: 0,
  })[key];

  document.querySelectorAll('.pipeline__step').forEach((el) => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.remove('is-active', 'is-done');
    if (key === 'done') {
      el.classList.add('is-done');
    } else if (n < stepIndex) {
      el.classList.add('is-done');
    } else if (n === stepIndex) {
      el.classList.add('is-active');
    }
  });
}

/* ============ Render del informe ============ */
function renderReport(markdown) {
  outputBlocks.innerHTML = '';
  const sections = splitSections(markdown);

  SECTION_TITLES.forEach((title, idx) => {
    const md = sections[idx] || '';
    const block = document.createElement('section');
    block.className = 'block';
    if (idx === 7) block.classList.add('block--email', 'block--full');
    if ([1, 2, 4, 5, 6].includes(idx)) {
      // listas: full width óptimo si son cortas, igual mantenemos por columna
    }

    const titleEl = document.createElement('h3');
    titleEl.className = 'block__title';
    titleEl.textContent = `${idx + 1}. ${title}`;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'block__body';
    bodyEl.innerHTML = renderMarkdown(md);

    block.appendChild(titleEl);
    block.appendChild(bodyEl);
    outputBlocks.appendChild(block);
  });

  outputEl.hidden = false;
  outputEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function splitSections(markdown) {
  const lines = markdown.split('\n');
  const buckets = Array.from({ length: 8 }, () => []);
  let current = -1;
  const headerRe = /^##\s*(\d+)\./;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 1 && num <= 8) {
        current = num - 1;
        continue;
      }
    }
    if (/^#\s+/.test(line) && current === -1) continue;
    if (current >= 0) buckets[current].push(line);
  }
  return buckets.map((arr) => arr.join('\n').trim());
}

function renderMarkdown(md) {
  if (!md) return '<p class="block__body__empty" style="color:var(--text-muted)">No indicado</p>';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(md, { gfm: true, breaks: false });
  }
  return `<pre>${escapeHtml(md)}</pre>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============ Acciones de salida ============ */
copyReportBtn.addEventListener('click', async () => {
  if (!state.markdown) return;
  await copyToClipboard(state.markdown);
  showToast('Informe copiado al portapapeles.', 'success');
});

copyEmailBtn.addEventListener('click', async () => {
  if (!state.markdown) return;
  const sections = splitSections(state.markdown);
  const email = sections[7] || '';
  if (!email.trim()) {
    showToast('No se encontró la sección de correo.', 'warning');
    return;
  }
  await copyToClipboard(email);
  showToast('Correo copiado al portapapeles.', 'success');
});

downloadBtn.addEventListener('click', () => {
  if (!state.markdown) return;
  const blob = new Blob([state.markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `minuta-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Archivo Markdown descargado.', 'success');
});

clearBtn.addEventListener('click', () => {
  state.audioFile = null;
  state.markdown = '';
  audioInput.value = '';
  dropEmpty.hidden = false;
  dropFile.hidden = true;
  instructionEl.value = DEFAULT_INSTRUCTION;
  state.instruction = DEFAULT_INSTRUCTION;
  setActiveChip('minuta');
  outputEl.hidden = true;
  outputBlocks.innerHTML = '';
  setPhase('idle');
  refreshGenerateBtn();
  showToast('Listo para una nueva reunión.', 'success');
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
}

/* ============ Toasts ============ */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastsEl.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}
