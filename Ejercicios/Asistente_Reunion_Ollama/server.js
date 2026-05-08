/**
 * MinutIA — Asistente de informes de reunión desde transcripción
 * Backend Express que conecta con Ollama local (http://localhost:11434).
 *
 * Endpoints:
 *   GET  /api/health           -> estado del backend y de Ollama
 *   POST /api/generate-report  -> genera informe ejecutivo a partir de transcripción
 *
 * Construido siguiendo Spec-Driven Development (ver SPEC.md).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ─── Configuración ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '180000', 10);
const MAX_TRANSCRIPT_CHARS = parseInt(process.env.MAX_TRANSCRIPT_CHARS || '50000', 10);
const MIN_TRANSCRIPT_CHARS = 300;

// ─── Prompt sistema (estructura del informe — Fase 3 de SPEC.md) ────────────
function buildPrompt(instruction, transcript) {
  return `Actúa como asistente ejecutivo experto en redacción de minutas profesionales en español.

Instrucción del usuario:
${instruction}

A partir de la TRANSCRIPCIÓN DE TEXTO de una reunión que se incluye al final, genera un informe en Markdown con esta estructura EXACTA:

# Informe ejecutivo de reunión

## 1. Resumen ejecutivo
Síntesis breve en máximo 5 líneas.

## 2. Temas tratados
Lista ordenada de los principales temas abordados.

## 3. Acuerdos principales
Lista clara de acuerdos tomados.

## 4. Responsables
Tabla con columnas: Tarea | Responsable | Plazo

## 5. Pendientes
Lista de puntos que quedaron sin resolver.

## 6. Riesgos o bloqueos
Lista de riesgos identificados.

## 7. Próximos pasos
Acciones concretas posteriores a la reunión.

## 8. Correo de seguimiento
Correo formal, claro y listo para copiar y enviar al equipo, con saludo y cierre.

Reglas obligatorias:
- Trabajas exclusivamente sobre la transcripción de texto provista. NO existe audio.
- Si un dato no aparece, escribe "No indicado".
- No inventes nombres, fechas, acuerdos ni responsables.
- Diferencia entre acuerdos explícitos y acciones meramente sugeridas.
- Usa lenguaje profesional, claro y orientado a gestión.
- El correo debe quedar listo para copiar y enviar.
- Mantén exactamente los títulos numerados indicados arriba.
- Devuelve SOLO Markdown válido. No agregues prefacios ni bloques de código que envuelvan el informe.

=== TRANSCRIPCIÓN ===
${transcript}
=== FIN TRANSCRIPCIÓN ===`;
}

// ─── App ────────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: ['http://localhost:' + PORT, 'http://127.0.0.1:' + PORT] }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper: fetch con timeout (Node 18+ trae fetch global) ─────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ─── GET /api/health ────────────────────────────────────────────────────────
// Pinga Ollama y reporta si el modelo configurado está descargado.
app.get('/api/health', async (req, res) => {
  const result = {
    ok: true,
    model: OLLAMA_MODEL,
    baseUrl: OLLAMA_BASE_URL,
    ollamaReachable: false,
    modelAvailable: false,
    maxTranscriptChars: MAX_TRANSCRIPT_CHARS,
  };

  try {
    const r = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 3000);
    if (r.ok) {
      result.ollamaReachable = true;
      const data = await r.json();
      const tags = Array.isArray(data?.models) ? data.models : [];
      result.modelAvailable = tags.some((m) => m?.name === OLLAMA_MODEL || m?.model === OLLAMA_MODEL);
    }
  } catch (_) {
    // Ollama caído o no instalado: ollamaReachable queda false.
  }

  res.json(result);
});

// ─── POST /api/generate-report ──────────────────────────────────────────────
// Recibe { transcript, instruction }, valida, llama a Ollama y devuelve markdown.
app.post('/api/generate-report', async (req, res) => {
  const { transcript, instruction } = req.body || {};

  // Validaciones (Fase 4 de SPEC.md — criterios de aceptación 6, 7)
  if (typeof transcript !== 'string' || transcript.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      code: 'NO_TRANSCRIPT',
      message: 'No se recibió ninguna transcripción. Pega el texto o carga un archivo .txt.',
    });
  }
  if (transcript.length < MIN_TRANSCRIPT_CHARS) {
    return res.status(400).json({
      ok: false,
      code: 'TRANSCRIPT_TOO_SHORT',
      message: `La transcripción es demasiado corta (${transcript.length} caracteres). Mínimo ${MIN_TRANSCRIPT_CHARS}.`,
    });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return res.status(413).json({
      ok: false,
      code: 'TRANSCRIPT_TOO_LONG',
      message: `La transcripción supera el máximo permitido (${MAX_TRANSCRIPT_CHARS} caracteres).`,
    });
  }
  if (typeof instruction !== 'string' || instruction.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      code: 'NO_INSTRUCTION',
      message: 'Debes escribir una instrucción para la IA.',
    });
  }

  const prompt = buildPrompt(instruction.trim(), transcript.trim());

  // Llamada a Ollama
  let ollamaResponse;
  try {
    ollamaResponse = await fetchWithTimeout(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_ctx: 8192,
            num_predict: 2048,
          },
        }),
      },
      OLLAMA_TIMEOUT_MS,
    );
  } catch (err) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({
        ok: false,
        code: 'OLLAMA_TIMEOUT',
        message: `Ollama no respondió en ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s. Prueba con un modelo más pequeño o una transcripción más corta.`,
      });
    }
    return res.status(503).json({
      ok: false,
      code: 'OLLAMA_UNREACHABLE',
      message: `No se pudo conectar a Ollama en ${OLLAMA_BASE_URL}. Verifica que esté corriendo (ejecuta "ollama serve").`,
    });
  }

  if (!ollamaResponse.ok) {
    let body = '';
    try { body = await ollamaResponse.text(); } catch (_) {}
    if (ollamaResponse.status === 404 || /model.+not found/i.test(body)) {
      return res.status(404).json({
        ok: false,
        code: 'MODEL_NOT_PULLED',
        message: `El modelo "${OLLAMA_MODEL}" no está descargado. Ejecuta: ollama pull ${OLLAMA_MODEL}`,
      });
    }
    return res.status(502).json({
      ok: false,
      code: 'OLLAMA_ERROR',
      message: `Ollama respondió con error (${ollamaResponse.status}). Detalle: ${body.slice(0, 240)}`,
    });
  }

  let data;
  try {
    data = await ollamaResponse.json();
  } catch (_) {
    return res.status(502).json({
      ok: false,
      code: 'OLLAMA_BAD_JSON',
      message: 'Ollama devolvió una respuesta no interpretable.',
    });
  }

  const markdown = (data?.response || '').trim();
  if (!markdown) {
    return res.status(502).json({
      ok: false,
      code: 'EMPTY_RESPONSE',
      message: 'Ollama devolvió una respuesta vacía. Reintenta o cambia de modelo.',
    });
  }

  return res.json({
    ok: true,
    model: OLLAMA_MODEL,
    markdown,
    stats: {
      transcriptChars: transcript.length,
      evalCount: data?.eval_count ?? null,
      totalDurationMs: data?.total_duration ? Math.round(data.total_duration / 1e6) : null,
    },
  });
});

// ─── Fallback ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Ruta no encontrada.' });
});

app.listen(PORT, () => {
  console.log(`\nMinutIA Ollama corriendo en http://localhost:${PORT}`);
  console.log(`  Ollama:  ${OLLAMA_BASE_URL}`);
  console.log(`  Modelo:  ${OLLAMA_MODEL}`);
  console.log(`  Timeout: ${OLLAMA_TIMEOUT_MS} ms`);
  console.log(`  Max chars transcripción: ${MAX_TRANSCRIPT_CHARS}\n`);
});
