'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_AUDIO_MB = parseInt(process.env.MAX_AUDIO_MB, 10) || 25;
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

const SUPPORTED_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
]);

const REPORT_STRUCTURE = `
A partir del audio adjunto, genera un informe en Markdown con esta estructura EXACTA:

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
- Si un dato no aparece en el audio, escribe "No indicado".
- No inventes nombres, fechas, acuerdos ni responsables.
- Diferencia entre acuerdos explícitos y acciones meramente sugeridas.
- Usa lenguaje profesional, claro y orientado a gestión.
- El correo debe quedar listo para copiar y enviar.
- Mantén exactamente los títulos numerados indicados arriba.
`.trim();

function buildPrompt(userInstruction) {
  return `Actúa como asistente ejecutivo experto en redacción de minutas profesionales en español.

Instrucción del usuario:
${userInstruction.trim()}

${REPORT_STRUCTURE}`;
}

const app = express();

app.use(cors({ origin: `http://localhost:${PORT}` }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: GEMINI_MODEL,
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    maxAudioMb: MAX_AUDIO_MB,
  });
});

app.post('/api/generate', (req, res) => {
  upload.single('audio')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        if (uploadErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            ok: false,
            error: 'FILE_TOO_LARGE',
            message: `El audio supera el tamaño máximo (${MAX_AUDIO_MB} MB).`,
          });
        }
        return res.status(400).json({
          ok: false,
          error: 'UPLOAD_ERROR',
          message: 'No fue posible procesar el archivo subido.',
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          ok: false,
          error: 'MISSING_API_KEY',
          message: 'Falta configurar la API Key en el servidor (.env → GEMINI_API_KEY).',
        });
      }

      const audioFile = req.file;
      const instruction = (req.body.instruction || '').toString();

      if (!audioFile) {
        return res.status(400).json({
          ok: false,
          error: 'NO_AUDIO',
          message: 'Sube un archivo de audio antes de generar el informe.',
        });
      }

      if (!instruction.trim()) {
        return res.status(400).json({
          ok: false,
          error: 'NO_INSTRUCTION',
          message: 'Escribe una instrucción para la IA.',
        });
      }

      const mimeType = audioFile.mimetype;
      if (!SUPPORTED_MIME.has(mimeType)) {
        return res.status(415).json({
          ok: false,
          error: 'UNSUPPORTED_FORMAT',
          message: `Formato no compatible (${mimeType}). Usa mp3, wav, m4a, ogg o webm.`,
        });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      const prompt = buildPrompt(instruction);
      const base64Audio = audioFile.buffer.toString('base64');

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType, data: base64Audio } },
      ]);

      const markdown = result?.response?.text?.() || '';
      if (!markdown.trim()) {
        return res.status(502).json({
          ok: false,
          error: 'GEMINI_ERROR',
          message: 'Gemini devolvió una respuesta vacía. Inténtalo nuevamente.',
        });
      }

      return res.json({
        ok: true,
        model: GEMINI_MODEL,
        markdown,
      });
    } catch (err) {
      const raw = (err && err.message) ? err.message : String(err);
      const status = err && err.status ? err.status : 0;
      // Log seguro: no imprimimos la API Key.
      console.error('[generate] Error:', raw);

      if (status === 429 || /quota|rate/i.test(raw)) {
        return res.status(429).json({
          ok: false,
          error: 'GEMINI_QUOTA',
          message: 'Cuota de Gemini excedida. Revisa tu plan o intenta más tarde.',
        });
      }
      if (/timeout|timed out|deadline/i.test(raw)) {
        return res.status(504).json({
          ok: false,
          error: 'GEMINI_TIMEOUT',
          message: 'Gemini tardó demasiado. Reintenta con un audio más corto.',
        });
      }
      if (/api key|unauthorized|permission/i.test(raw)) {
        return res.status(401).json({
          ok: false,
          error: 'INVALID_API_KEY',
          message: 'La API Key parece inválida o sin permisos. Revisa tu configuración.',
        });
      }
      return res.status(502).json({
        ok: false,
        error: 'GEMINI_ERROR',
        message: 'Gemini devolvió un error. Inténtalo nuevamente.',
      });
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error('[server] Error:', err && err.message ? err.message : err);
  res.status(500).json({
    ok: false,
    error: 'INTERNAL_ERROR',
    message: 'Error interno del servidor.',
  });
});

app.listen(PORT, () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[MinutIA] GEMINI_API_KEY no está definida. La app cargará pero /api/generate fallará.');
  }
  console.log(`MinutIA listo en http://localhost:${PORT}`);
  console.log(`Modelo: ${GEMINI_MODEL} · Audio máx: ${MAX_AUDIO_MB} MB`);
});
