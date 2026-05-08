/**
 * MinutIA — Asistente de informes de reunión desde transcripción.
 * Frontend vanilla: máquina de estados + fetch + render markdown.
 *
 * Construido siguiendo Spec-Driven Development (ver SPEC.md).
 */

(() => {
  'use strict';

  // ─── Estado global ─────────────────────────────────────────────────────────
  const state = {
    status: 'idle',           // idle | loaded | validating | analyzing | generating | done | error
    health: { ok: false, model: '—', baseUrl: '—', ollamaReachable: false, modelAvailable: false, maxTranscriptChars: 50000 },
    timerInterval: null,
    timerStart: null,
    lastMarkdown: '',
  };

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const el = {
    transcript: document.getElementById('transcript'),
    instruction: document.getElementById('instruction'),
    fileInput: document.getElementById('file-input'),
    btnLoadFile: document.getElementById('btn-load-file'),
    fileHint: document.getElementById('file-hint'),
    counter: document.getElementById('char-counter'),
    chips: document.querySelectorAll('.chip'),
    btnGenerate: document.getElementById('btn-generate'),
    pipeline: document.getElementById('pipeline'),
    statusBanner: document.getElementById('status-banner'),
    statusTitle: document.getElementById('status-title'),
    statusDetail: document.getElementById('status-detail'),
    statusTimer: document.getElementById('status-timer'),
    healthBadge: document.getElementById('health-badge'),
    healthLabel: document.getElementById('health-label'),
    metaModel: document.getElementById('meta-model'),
    metaBaseUrl: document.getElementById('meta-baseurl'),
    zoneOutput: document.getElementById('zone-output'),
    reportContainer: document.getElementById('report-container'),
    btnCopyReport: document.getElementById('btn-copy-report'),
    btnCopyEmail: document.getElementById('btn-copy-email'),
    btnDownload: document.getElementById('btn-download'),
    btnClear: document.getElementById('btn-clear'),
    toasts: document.getElementById('toasts'),
  };

  // ─── Toasts ────────────────────────────────────────────────────────────────
  function toast(message, kind = 'info', title = '') {
    const t = document.createElement('div');
    t.className = `toast toast--${kind}`;
    if (title) {
      const s = document.createElement('strong'); s.textContent = title; t.appendChild(s);
    }
    const span = document.createElement('span');
    span.textContent = message;
    t.appendChild(span);
    el.toasts.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .25s';
      setTimeout(() => t.remove(), 260);
    }, 4500);
  }

  // ─── Status / pipeline ─────────────────────────────────────────────────────
  const STEP_ORDER = ['loaded', 'validating', 'analyzing', 'generating', 'done'];

  const STATUS_TEXT = {
    idle:       { title: 'Esperando transcripción',      detail: 'Pega o carga el texto de la reunión para comenzar.' },
    loaded:     { title: 'Transcripción cargada',         detail: 'Lista para analizar. Haz click en "Generar informe".' },
    validating: { title: 'Validando contenido',           detail: 'Comprobando longitud y formato.' },
    analyzing:  { title: 'Analizando reunión con Ollama', detail: 'El modelo está leyendo y comprendiendo la transcripción.' },
    generating: { title: 'Generando informe ejecutivo',   detail: 'Estructurando resumen, acuerdos, responsables y correo.' },
    done:       { title: 'Informe listo',                 detail: 'Revisa el resultado abajo. Puedes copiar o descargar.' },
    error:      { title: 'Ocurrió un error',              detail: 'Revisa el detalle en la notificación.' },
  };

  function setStatus(next, detailOverride) {
    state.status = next;
    el.statusBanner.dataset.state = next;
    const cfg = STATUS_TEXT[next] || STATUS_TEXT.idle;
    el.statusTitle.textContent = cfg.title;
    el.statusDetail.textContent = detailOverride || cfg.detail;

    // Pipeline nodes
    const nodes = el.pipeline.querySelectorAll('.pipeline__node');
    const lines = el.pipeline.querySelectorAll('.pipeline__line');
    const targetIdx = next === 'idle' ? -1
                    : next === 'error' ? STEP_ORDER.indexOf(detailOverride || 'loaded')
                    : STEP_ORDER.indexOf(next);

    nodes.forEach((n, i) => {
      n.removeAttribute('data-active');
      if (next === 'error' && i === Math.max(0, targetIdx)) n.dataset.active = 'error';
      else if (i < targetIdx) n.dataset.active = 'done';
      else if (i === targetIdx) n.dataset.active = next === 'done' ? 'done' : 'active';
    });
    lines.forEach((line, i) => {
      line.removeAttribute('data-active');
      if (i < targetIdx) line.dataset.active = 'done';
      else if (i === targetIdx - 1) line.dataset.active = 'active';
    });

    // Timer
    if (['analyzing', 'generating'].includes(next)) {
      if (!state.timerStart) startTimer();
    } else {
      stopTimer();
    }

    // Botón generar
    const transcriptOk = el.transcript.value.length >= 300 && el.transcript.value.length <= state.health.maxTranscriptChars;
    const instructionOk = el.instruction.value.trim().length > 0;
    const isBusy = ['validating', 'analyzing', 'generating'].includes(next);
    el.btnGenerate.disabled = isBusy || !transcriptOk || !instructionOk;
    el.btnGenerate.classList.toggle('btn--loading', isBusy);
  }

  function startTimer() {
    state.timerStart = Date.now();
    el.statusTimer.hidden = false;
    el.statusTimer.textContent = '00:00';
    state.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      el.statusTimer.textContent = `${mm}:${ss}`;
      if (state.status === 'analyzing' && elapsed > 3) {
        // Heurística: tras 3s en analyzing, pasamos visualmente a generating.
        setStatus('generating');
      }
    }, 1000);
  }
  function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.timerStart = null;
    el.statusTimer.hidden = true;
  }

  // ─── Contador de caracteres ────────────────────────────────────────────────
  function updateCounter() {
    const len = el.transcript.value.length;
    const max = state.health.maxTranscriptChars || 50000;
    el.counter.textContent = `${len.toLocaleString()} / ${max.toLocaleString()}`;
    let st = 'idle';
    if (len === 0) st = 'idle';
    else if (len < 300) st = 'warn';
    else if (len > max) st = 'error';
    else if (len > max * 0.85) st = 'warn';
    else st = 'ok';
    el.counter.dataset.state = st;
    if (state.status === 'idle' && len > 0) setStatus('loaded');
    if (state.status === 'loaded' && len === 0) setStatus('idle');
    if (state.status === 'idle' || state.status === 'loaded' || state.status === 'error') {
      // Habilitar botón solo si todo válido
      const transcriptOk = len >= 300 && len <= max;
      const instructionOk = el.instruction.value.trim().length > 0;
      el.btnGenerate.disabled = !transcriptOk || !instructionOk;
    }
  }

  // ─── Health polling ────────────────────────────────────────────────────────
  async function checkHealth() {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      const data = await r.json();
      state.health = data;
      el.metaModel.textContent = data.model || '—';
      el.metaBaseUrl.textContent = data.baseUrl || '—';

      if (!data.ollamaReachable) {
        el.healthBadge.dataset.state = 'error';
        el.healthLabel.textContent = 'Ollama no responde';
        el.healthBadge.title = `Ollama no responde en ${data.baseUrl}. Ejecuta "ollama serve".`;
      } else if (!data.modelAvailable) {
        el.healthBadge.dataset.state = 'warn';
        el.healthLabel.textContent = `Falta modelo: ${data.model}`;
        el.healthBadge.title = `Modelo "${data.model}" no descargado. Ejecuta: ollama pull ${data.model}`;
      } else {
        el.healthBadge.dataset.state = 'ok';
        el.healthLabel.textContent = `Ollama · ${data.model}`;
        el.healthBadge.title = `Conectado a ${data.baseUrl} · modelo ${data.model}`;
      }
      updateCounter();
    } catch (err) {
      el.healthBadge.dataset.state = 'error';
      el.healthLabel.textContent = 'Backend no responde';
      el.healthBadge.title = 'No se pudo conectar al backend de MinutIA.';
    }
  }

  // ─── Carga de archivo .txt ─────────────────────────────────────────────────
  el.btnLoadFile.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTxt = file.type === 'text/plain' || /\.txt$/i.test(file.name);
    if (!isTxt) {
      toast('Solo se aceptan archivos .txt', 'error', 'Formato no válido');
      el.fileInput.value = '';
      return;
    }
    if (file.size === 0) {
      toast('El archivo está vacío.', 'error', 'Archivo inválido');
      el.fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      el.transcript.value = String(reader.result || '');
      el.fileHint.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
      updateCounter();
      toast(`Archivo cargado: ${file.name}`, 'success', 'Transcripción lista');
    };
    reader.onerror = () => toast('No se pudo leer el archivo.', 'error', 'Error de lectura');
    reader.readAsText(file, 'utf-8');
  });

  // ─── Chips ─────────────────────────────────────────────────────────────────
  el.chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      el.chips.forEach((c) => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      el.instruction.value = chip.dataset.prompt || '';
      updateCounter();
    });
  });

  // ─── Inputs ────────────────────────────────────────────────────────────────
  el.transcript.addEventListener('input', updateCounter);
  el.instruction.addEventListener('input', updateCounter);

  // ─── Generar informe ───────────────────────────────────────────────────────
  el.btnGenerate.addEventListener('click', async () => {
    const transcript = el.transcript.value;
    const instruction = el.instruction.value.trim();
    const max = state.health.maxTranscriptChars || 50000;

    setStatus('validating');

    if (!transcript.trim()) {
      setStatus('error', 'loaded');
      toast('Pega o carga una transcripción antes de continuar.', 'error', 'Sin transcripción');
      return;
    }
    if (transcript.length < 300) {
      setStatus('error', 'loaded');
      toast(`La transcripción tiene ${transcript.length} caracteres (mínimo 300).`, 'warning', 'Transcripción muy corta');
      return;
    }
    if (transcript.length > max) {
      setStatus('error', 'loaded');
      toast(`Supera el máximo de ${max.toLocaleString()} caracteres.`, 'error', 'Transcripción muy larga');
      return;
    }
    if (!instruction) {
      setStatus('error', 'loaded');
      toast('Escribe una instrucción o elige un botón rápido.', 'warning', 'Sin instrucción');
      return;
    }

    setStatus('analyzing');
    el.zoneOutput.hidden = true;

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, instruction }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const msg = data?.message || 'Error desconocido al generar el informe.';
        setStatus('error', 'analyzing');
        toast(msg, 'error', data?.code || 'Error');
        return;
      }

      state.lastMarkdown = data.markdown || '';
      renderReport(state.lastMarkdown);
      setStatus('done');
      el.zoneOutput.hidden = false;
      el.zoneOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Informe generado correctamente.', 'success', 'Listo');
    } catch (err) {
      setStatus('error', 'analyzing');
      toast('No se pudo conectar con el backend.', 'error', 'Error de red');
    }
  });

  // ─── Render del informe (segmentación por secciones) ───────────────────────
  const SECTION_TITLES = {
    1: 'Resumen ejecutivo',
    2: 'Temas tratados',
    3: 'Acuerdos principales',
    4: 'Responsables',
    5: 'Pendientes',
    6: 'Riesgos o bloqueos',
    7: 'Próximos pasos',
    8: 'Correo de seguimiento',
  };

  function renderReport(markdown) {
    el.reportContainer.innerHTML = '';
    if (!markdown) return;

    const sections = splitSections(markdown);

    if (sections.length === 0) {
      // Fallback: el modelo no respetó la estructura.
      const card = document.createElement('article');
      card.className = 'report-card report-card--fallback';
      card.innerHTML = `
        <header class="report-card__header">
          <span class="report-card__index">!</span>
          <h3 class="report-card__title">Salida sin segmentar</h3>
        </header>
        <div class="report-card__body">
          <p>El modelo no respetó la estructura de 8 secciones. Mostramos el resultado completo:</p>
          <div>${window.marked ? window.marked.parse(markdown) : escapeHtml(markdown).replace(/\n/g,'<br>')}</div>
        </div>`;
      el.reportContainer.appendChild(card);
      return;
    }

    sections.forEach(({ index, title, body }) => {
      const card = document.createElement('article');
      const isEmail = index === 8;
      card.className = 'report-card' + (isEmail ? ' report-card--email' : '');
      const html = window.marked ? window.marked.parse(body) : escapeHtml(body).replace(/\n/g,'<br>');
      card.innerHTML = `
        <header class="report-card__header">
          <span class="report-card__index">${String(index).padStart(2, '0')}</span>
          <h3 class="report-card__title">${SECTION_TITLES[index] || title}</h3>
        </header>
        <div class="report-card__body">${html}</div>`;
      el.reportContainer.appendChild(card);
    });
  }

  function splitSections(markdown) {
    const lines = markdown.split(/\r?\n/);
    const result = [];
    let current = null;
    const headingRe = /^##\s+(\d+)\.\s+(.+)\s*$/;

    for (const line of lines) {
      const m = line.match(headingRe);
      if (m) {
        if (current) result.push(current);
        current = { index: parseInt(m[1], 10), title: m[2].trim(), body: '' };
      } else if (current) {
        current.body += line + '\n';
      }
    }
    if (current) result.push(current);
    return result.map((s) => ({ ...s, body: s.body.trim() }));
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  // ─── Acciones de salida ────────────────────────────────────────────────────
  el.btnCopyReport.addEventListener('click', async () => {
    if (!state.lastMarkdown) return;
    try {
      await navigator.clipboard.writeText(state.lastMarkdown);
      toast('Informe copiado al portapapeles.', 'success', 'Copiado');
    } catch {
      toast('No se pudo copiar al portapapeles.', 'error', 'Error');
    }
  });

  el.btnCopyEmail.addEventListener('click', async () => {
    if (!state.lastMarkdown) return;
    const m = state.lastMarkdown.match(/##\s+8\.\s+[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/);
    if (!m) {
      toast('No se encontró la sección de correo en el informe.', 'warning', 'Sección no detectada');
      return;
    }
    try {
      await navigator.clipboard.writeText(m[1].trim());
      toast('Correo de seguimiento copiado.', 'success', 'Copiado');
    } catch {
      toast('No se pudo copiar al portapapeles.', 'error', 'Error');
    }
  });

  el.btnDownload.addEventListener('click', () => {
    if (!state.lastMarkdown) return;
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `minutia-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.md`;
    const blob = new Blob([state.lastMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Descargado: ${fname}`, 'success', 'Listo');
  });

  el.btnClear.addEventListener('click', () => {
    el.transcript.value = '';
    el.instruction.value = '';
    el.fileInput.value = '';
    el.fileHint.textContent = 'Solo archivos .txt';
    el.chips.forEach((c) => c.classList.remove('chip--active'));
    state.lastMarkdown = '';
    el.reportContainer.innerHTML = '';
    el.zoneOutput.hidden = true;
    setStatus('idle');
    updateCounter();
    toast('Formulario limpio.', 'info', 'Listo para una nueva minuta');
  });

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  setStatus('idle');
  updateCounter();
  checkHealth();
  setInterval(checkHealth, 30000);
})();
