# MinutIA — Asistente de informes de reunión
## Plan completo bajo Spec-Driven Development

---

## Contexto

**Por qué este cambio:** En el contexto de una clase práctica de desarrollo asistido con IA, se necesita una aplicación demostrable que transforme una necesidad cotidiana de oficina (procesar audios de reuniones) en un producto funcional, profesional y presentable. La app debe servir simultáneamente como (a) herramienta útil real, (b) ejercicio pedagógico de Spec-Driven Development con Claude Code, y (c) caso de demostración de cómo Gemini puede transformar audio crudo en un entregable ejecutivo.

**Problema concreto:** Tras una reunión quedan audios, notas y acuerdos dispersos. Convertirlos manualmente en una minuta ejecutiva, plan de acción y correo de seguimiento toma 30–60 minutos por reunión. MinutIA reduce ese trabajo a < 2 minutos.

**Resultado intencionado:** Una app web local (Node + Express + Frontend estático) que recibe un audio, lo procesa con la API de Google Gemini usando una API Key protegida en el backend, y devuelve un informe ejecutivo estructurado con resumen, temas, acuerdos, responsables, pendientes, riesgos, próximos pasos y correo de seguimiento listo para enviar.

**Ubicación destino:** `g:\Mi unidad\desafIA\Presentaciones\Presentacion_Anagra\Ejercicios\MinutIA — Asistente de informes de reunión\` (carpeta existente, vacía).

---

## FASE 1 — Product Spec

### 1. Problema que resuelve
Después de cada reunión queda un audio (o varios) y una colección dispersa de acuerdos en la cabeza de los participantes. Redactar una minuta ejecutiva exige escuchar el audio completo, tomar notas, estructurar acuerdos, asignar responsables y redactar un correo de seguimiento. Esto consume entre 30 y 60 minutos por reunión, se posterga, y cuando se hace tarde pierde utilidad operativa.

### 2. Usuario objetivo
- **Primario:** Profesionales de oficina y equipos pequeños (jefaturas, líderes de proyecto, asistentes ejecutivos, mandos medios) que sostienen reuniones recurrentes y necesitan dejar un registro accionable.
- **Secundario:** Estudiantes y profesores en una clase de desarrollo asistido con IA que usan la app como ejercicio práctico.

### 3. Caso de uso principal
Un líder de proyecto termina una reunión de 45 minutos, abre MinutIA en su navegador local, sube el audio, hace clic en "Minuta ejecutiva", presiona "Generar informe" y, en menos de 2 minutos, copia el informe estructurado al correo del equipo.

### 4. Flujo principal del usuario
1. Abre `http://localhost:3000` en su navegador.
2. Arrastra o selecciona un archivo de audio (.mp3, .wav, .m4a, .ogg, .webm).
3. Escribe una instrucción libre o elige un botón rápido (Minuta ejecutiva, Plan de acción, Correo de seguimiento, Resumen para gerencia, Acuerdos y responsables).
4. Presiona **Generar informe**.
5. Observa los estados de proceso (Audio cargado → Procesando → Analizando → Generando → Listo).
6. Lee el informe generado, separado por bloques visuales.
7. Copia el informe completo, copia solo el correo, descarga como Markdown, o limpia para procesar otro.

### 5. Funcionalidades principales (in-scope V1)
- Subida de audio mediante drag-and-drop o selector de archivos.
- Campo de instrucción libre con texto predeterminado profesional.
- 5 botones rápidos de instrucción.
- Botón principal "Generar informe".
- Indicador visual del flujo (Audio → Gemini → Informe) con 5 estados.
- Visualización del informe en bloques (Resumen, Temas, Acuerdos, Responsables, Pendientes, Riesgos, Próximos pasos, Correo).
- Acciones: copiar informe, copiar solo correo, descargar Markdown, limpiar.
- Manejo de errores con mensajes claros al usuario.
- API Key protegida en backend mediante `.env`.
- Modelo de Gemini configurable vía `GEMINI_MODEL`.

### 6. Fuera de alcance V1
- Autenticación de usuarios.
- Persistencia/historial de reuniones.
- Edición inline del informe.
- Diarización por hablante.
- Subida de múltiples audios o concatenación.
- Integraciones (Google Calendar, Slack, correo SMTP).
- Soporte multilenguaje (V1 solo español).
- Despliegue en cloud, Docker, CI/CD.
- Modo offline o transcripción local.
- Exportación a PDF o DOCX.

### 7. Requisitos funcionales
- RF-01: El sistema acepta audio en `.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`.
- RF-02: El sistema rechaza archivos > 25 MB con mensaje claro.
- RF-03: El sistema valida que exista archivo de audio antes de enviar.
- RF-04: El sistema valida que exista instrucción no vacía antes de enviar.
- RF-05: El backend valida `GEMINI_API_KEY` al arrancar y al recibir cada solicitud.
- RF-06: El backend envía el audio (inline base64) y el prompt a la API de Gemini.
- RF-07: El backend devuelve el texto en Markdown estructurado al frontend.
- RF-08: El frontend renderiza el Markdown en bloques visuales separados.
- RF-09: El frontend permite copiar el informe completo al portapapeles.
- RF-10: El frontend permite copiar solo el bloque "Correo de seguimiento".
- RF-11: El frontend permite descargar el informe como `.md`.
- RF-12: El frontend tiene un botón "Limpiar" que resetea estado e interfaz.
- RF-13: El sistema muestra mensajes de error específicos por tipo de fallo.

### 8. Requisitos no funcionales
- RNF-01: Tiempo de respuesta < 2 minutos para audios de hasta 30 min.
- RNF-02: API Key jamás expuesta al frontend ni al cliente HTTP.
- RNF-03: Diseño responsive desde 1280px (notebook) hasta 1920px.
- RNF-04: Apariencia SaaS premium, no plantilla genérica.
- RNF-05: Tipografía moderna (Inter / DM Sans / similar).
- RNF-06: Cero dependencias del frontend en tiempo de build (HTML/CSS/JS vanilla).
- RNF-07: La app debe arrancar con `npm install && npm start`.
- RNF-08: Zero-config para el usuario salvo crear `.env` con `GEMINI_API_KEY`.
- RNF-09: Logs del servidor sin filtrar la API Key.
- RNF-10: Código legible, comentado solo donde sea no evidente.

### 9. Criterios de aceptación
Ver sección **FASE 4** para detalle. Resumen: 14 criterios verificables, todos deben cumplirse para considerar la V1 lista.

### 10. Riesgos técnicos
- **R-01:** Límite de tamaño de payload inline en Gemini (~20 MB de audio en base64). *Mitigación:* validar tamaño y mostrar mensaje claro; documentar uso de audios cortos.
- **R-02:** Latencia de Gemini para audios largos podría superar timeouts del navegador. *Mitigación:* configurar timeout en fetch a 5 minutos; mostrar estado "Generando informe" persistente.
- **R-03:** El modelo puede inventar nombres o acuerdos. *Mitigación:* el prompt instruye explícitamente "No inventar" y "No indicado" cuando falte información.
- **R-04:** Cambios en la API de Gemini (modelo o ruta). *Mitigación:* `GEMINI_MODEL` en `.env`, código aislado en un módulo `geminiClient`.
- **R-05:** Usuario sube formato no soportado. *Mitigación:* validación en frontend + backend con allowlist de MIME types.
- **R-06:** Pérdida de la API Key por commit accidental. *Mitigación:* `.env` en `.gitignore` y solo `.env.example` versionado.

### 11. Supuestos
- El usuario tiene Node.js 18+ instalado.
- El usuario tiene una API Key activa de Google AI Studio.
- El audio está en español (el prompt está en español).
- La reunión dura ≤ 30 min para mantenerse bajo el límite de payload.
- El usuario opera localmente (no hay requisitos de multi-tenant).
- El navegador es moderno (Chrome/Edge/Firefox de 2023+).

---

## FASE 2 — UX/UI Spec

### Dirección visual
**Tema elegido: oscuro elegante** (más sobrio, más SaaS premium, mejor contraste para presentaciones en clase con proyector).

- **Fondo base:** `#0B0D12` (casi negro, ligeramente azulado).
- **Superficie/tarjetas:** `#13161D` con borde `#1F232C`.
- **Superficie elevada:** `#1A1E27`.
- **Texto primario:** `#F5F7FA`.
- **Texto secundario:** `#9AA3B2`.
- **Acento primario (CTA):** `#7C5CFF` (violeta corporativo).
- **Acento secundario:** `#22D3A8` (verde esmeralda, para estados "listo").
- **Advertencia:** `#F4B740`.
- **Error:** `#FF5C5C`.
- **Bordes:** `#1F232C` / hover `#2A2F3A`.
- **Sombras:** `0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.25)` en tarjetas elevadas.

### Tipografía
- **Familia:** `Inter` (vía Google Fonts) con fallback a system-ui.
- **Escala:**
  - Display (título app): 32px / weight 600 / tracking -0.02em.
  - Section heading: 18px / weight 600.
  - Body: 14px / weight 400 / line-height 1.6.
  - Small/labels: 12px / weight 500 / uppercase / tracking 0.06em.
  - Monospace (código/markdown bloques opcionales): `JetBrains Mono` 13px.

### Espaciado y forma
- Sistema de spacing base 4px (4, 8, 12, 16, 24, 32, 48, 64).
- Border radius: 8px (pequeño), 12px (tarjetas), 16px (modales/dropzone).
- Sombras suaves, sin glow.
- Sin gradientes decorativos salvo un gradient sutilísimo en la barra superior y en el botón principal.

### Layout — Dashboard de tres zonas
Estructura en una sola página (single-screen dashboard) con grid de 12 columnas, max-width `1280px`, centrado.

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo MinutIA]            MinutIA · Asistente de informes  │  ← Topbar 64px
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Título: De reunión grabada a plan de acción ejecutable    │
│   Bajada: 1 línea                                           │
│                                                             │
│  ┌─── ZONA 1: ENTRADA (col 1-5) ──┐ ┌── ZONA 2: PROCESO ──┐ │
│  │                                │ │  (col 6-12)         │ │
│  │  Dropzone audio                │ │  Pipeline visual:   │ │
│  │  [icono + texto + size]        │ │  ●─●─●─●─●          │ │
│  │                                │ │  Audio·Gemini·Info  │ │
│  │  Instrucción (textarea)        │ │                     │ │
│  │  [chips botones rápidos]       │ │  Estado actual      │ │
│  │                                │ │  (card grande)      │ │
│  │  [Generar informe]  CTA        │ │                     │ │
│  │                                │ │                     │ │
│  └────────────────────────────────┘ └─────────────────────┘ │
│                                                             │
│  ┌─── ZONA 3: SALIDA (col 1-12, aparece al estar lista) ──┐ │
│  │  Tabs/bloques: Resumen · Temas · Acuerdos · ...       │ │
│  │  Cada bloque en una card                               │ │
│  │  [Copiar informe] [Copiar correo] [Descargar .md] [Limpiar] │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Componentes clave

**Topbar (64px)**
- Logo monograma "M" en cuadrado violeta 32px + wordmark "MinutIA".
- Lado derecho: badge sutil "Local · Privado" y indicador de estado del backend (punto verde si `/health` OK).

**Hero (sobrio)**
- H1: "De reunión grabada a plan de acción ejecutable".
- Subtítulo: "Sube el audio, elige el tipo de informe y obtén una minuta lista para enviar."

**Zona 1 — Entrada (Card)**
- **Dropzone:** rectángulo con borde dashed `#2A2F3A`, radius 16px, altura 180px. Estado vacío muestra ícono SVG de onda de audio + texto "Arrastra tu audio aquí o haz clic para seleccionar" + microcopy de formatos. Estado con archivo: muestra nombre, tamaño, duración (si calculable) y un botón X para quitar.
- **Textarea instrucción:** label "Instrucción para la IA", 4 líneas, placeholder con la instrucción predeterminada.
- **Chips rápidos (5):** botones pill con borde sutil que rellenan/reemplazan el textarea.
  - Minuta ejecutiva
  - Plan de acción
  - Correo de seguimiento
  - Resumen para gerencia
  - Acuerdos y responsables
- **CTA principal:** "Generar informe" — botón ancho, fondo `#7C5CFF`, hover con leve elevación y brillo, disabled cuando falta audio o instrucción. Microinteracción: spinner inline durante request.

**Zona 2 — Proceso**
- **Pipeline visual horizontal:** 5 nodos circulares conectados con líneas. Cada nodo tiene un ícono SVG minimal (no emoji) y label corto:
  1. Audio cargado
  2. Procesando reunión
  3. Analizando contenido
  4. Generando informe
  5. Informe listo
- Estado del nodo: pendiente (gris), activo (violeta + pulso suave), completado (verde + check). Línea entre nodos se rellena progresivamente.
- **Card de estado actual:** debajo del pipeline, muestra el estado activo en grande con una breve descripción y, si procesando, una barra de progreso indeterminada (shimmer).

**Zona 3 — Salida** (oculta hasta tener resultado)
- Aparece con animación fade+slide.
- 8 cards apiladas, cada una con título y contenido renderizado del Markdown:
  1. Resumen ejecutivo
  2. Temas tratados
  3. Acuerdos principales
  4. Responsables (renderizado como tabla)
  5. Pendientes
  6. Riesgos o bloqueos
  7. Próximos pasos
  8. Correo de seguimiento (en card destacada con fondo `#1A1E27` y borde `#7C5CFF`)
- **Barra de acciones sticky en la parte inferior de Zona 3:**
  - `Copiar informe` (secundario)
  - `Copiar correo` (secundario)
  - `Descargar como Markdown` (secundario)
  - `Limpiar` (terciario, texto)

### Microinteracciones
- Botones: transición 150ms ease-out en background, transform translateY(-1px) en hover.
- Dropzone: highlight `#7C5CFF` en dragover.
- Chips: estado seleccionado con fondo violeta tenue.
- Pipeline: nodo activo pulsa cada 1.2s.
- Toasts: aparición top-right para "Copiado al portapapeles", "Descargado", "Error: ...".

### Estados de carga claros
- Botón CTA cambia a "Procesando..." con spinner.
- Pipeline avanza simulando fases (`enqueued → uploading → analyzing → generating → done`); en V1, los pasos se animan en orden con timing aproximado mientras se espera la respuesta real.
- Card de salida muestra skeleton durante el render.

### Estados de error
- Toast rojo + card persistente con título, descripción y botón "Reintentar".
- Mensajes específicos: "No subiste un audio", "El archivo supera 25 MB", "Falta la API Key en el servidor", "Gemini no respondió a tiempo", "Formato no compatible".

### Reglas de diseño que evitamos
- ❌ Emojis decorativos en UI.
- ❌ Íconos infantiles (usar Lucide o SVG inline minimal).
- ❌ Múltiples gradientes coloridos.
- ❌ Sombras agresivas.
- ❌ Plantillas tipo Bootstrap genérico.
- ❌ Tipografías sistema sin curaduría.

### Responsive
- ≥ 1280px: layout 12 columnas como descrito.
- 1024–1279px: las dos zonas superiores apiladas, salida full-width.
- < 1024px: declarado fuera de alcance V1 pero el diseño no debe romperse (graceful degradation).

---

## FASE 3 — Technical Spec

### Stack
- **Backend:** Node.js 18+, Express 4.x.
- **Frontend:** HTML5 + CSS3 + JavaScript ES2022 vanilla (sin framework).
- **IA:** Google Gemini vía `@google/generative-ai` (SDK oficial) o REST directo. Optamos por **SDK oficial** para simplicidad y manejo robusto de inline data.
- **Subida de archivos:** `multer` con storage en memoria (no escribe a disco).
- **Variables de entorno:** `dotenv`.
- **Markdown → HTML en frontend:** `marked` cargado por CDN (single file, sin build step).

### Estructura de directorios

```
Ejercicios/MinutIA — Asistente de informes de reunión/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── package-lock.json     (generado)
├── .env.example
├── .gitignore
└── README.md
```

> Nota: el prompt original sugiere `/minutia-gemini` como nombre de carpeta raíz. Como el usuario pidió crearlo *dentro de* `Ejercicios/MinutIA — Asistente de informes de reunión`, usamos esa carpeta como raíz del proyecto y omitimos el subdirectorio `minutia-gemini`.

### Variables de entorno (`.env.example`)

```
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-1.5-pro
PORT=3000
MAX_AUDIO_MB=25
```

> Modelo confirmado: **`gemini-1.5-pro`** (decisión del usuario). Cambiable vía `.env`.

### Endpoints

**`GET /api/health`**
- Responde `{ ok: true, model: <GEMINI_MODEL>, hasKey: <boolean> }`.
- Usado por el topbar para indicador de estado.
- No expone el valor de la API Key.

**`POST /api/generate`**
- `multipart/form-data`: campo `audio` (File) + campo `instruction` (string).
- Validaciones:
  1. `GEMINI_API_KEY` presente (si no → 500 con `{ error: "MISSING_API_KEY" }`).
  2. `audio` presente (si no → 400 `{ error: "NO_AUDIO" }`).
  3. `instruction` no vacía (si no → 400 `{ error: "NO_INSTRUCTION" }`).
  4. `audio.size <= MAX_AUDIO_MB * 1024 * 1024` (si no → 413 `{ error: "FILE_TOO_LARGE" }`).
  5. MIME type en allowlist `['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/ogg','audio/webm']` (si no → 415 `{ error: "UNSUPPORTED_FORMAT" }`).
- Llama a `geminiClient.generateReport({ audioBuffer, mimeType, instruction })`.
- Devuelve `{ ok: true, markdown: <string> }` o `{ ok: false, error, details }`.

**`GET /` (estático)**
- Sirve `public/index.html` y assets vía `express.static`.

### Módulo `geminiClient` (interno a `server.js` o archivo separado si crece)
- Construye el prompt: instrucción del usuario + bloque de **estructura obligatoria del informe** (las 8 secciones) + **reglas para la IA** (no inventar, "No indicado", diferenciar acuerdos vs sugeridos, lenguaje profesional, correo listo).
- Envía a Gemini con `contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Audio } }]}]`.
- Configura `generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }`.
- Maneja errores y los mapea a códigos internos: `GEMINI_TIMEOUT`, `GEMINI_ERROR`, `GEMINI_QUOTA`.

### Prompt interno (server-side)
```
Actúa como asistente ejecutivo experto en redacción de minutas profesionales.

Instrucción del usuario:
<<INSTRUCTION>>

A partir del audio adjunto, genera un informe en Markdown con esta estructura EXACTA:

# Informe ejecutivo de reunión

## 1. Resumen ejecutivo
[Máx 5 líneas]

## 2. Temas tratados
[Lista]

## 3. Acuerdos principales
[Lista]

## 4. Responsables
| Tarea | Responsable | Plazo |
|-------|-------------|-------|

## 5. Pendientes
## 6. Riesgos o bloqueos
## 7. Próximos pasos
## 8. Correo de seguimiento
[Correo formal listo para enviar]

Reglas obligatorias:
- Si un dato no aparece en el audio, escribe "No indicado".
- No inventes nombres, fechas, acuerdos ni responsables.
- Diferencia entre acuerdos explícitos y acciones meramente sugeridas.
- Usa lenguaje profesional, claro y orientado a gestión.
- El correo debe quedar listo para copiar y enviar, con saludo y cierre.
```

### Seguridad
- `.env` listado en `.gitignore`.
- API Key leída solo con `process.env.GEMINI_API_KEY` en el backend.
- CORS restringido a `http://localhost:<PORT>`.
- Body parser con límite explícito (30 MB margen sobre los 25 MB de audio).
- `helmet` opcional para cabeceras HTTP seguras.
- Logs nunca imprimen `process.env.GEMINI_API_KEY`.
- Al frontend solo se devuelve Markdown del informe; nunca metadata sensible.

### Manejo de errores (backend → frontend)

| Código backend       | HTTP | Mensaje frontend                                              |
|----------------------|------|---------------------------------------------------------------|
| MISSING_API_KEY      | 500  | "Falta configurar la API Key en el servidor."                 |
| NO_AUDIO             | 400  | "Sube un archivo de audio antes de generar el informe."       |
| NO_INSTRUCTION       | 400  | "Escribe una instrucción para la IA."                         |
| FILE_TOO_LARGE       | 413  | "El audio supera el tamaño máximo (25 MB)."                   |
| UNSUPPORTED_FORMAT   | 415  | "Formato no compatible. Usa mp3, wav, m4a, ogg o webm."       |
| GEMINI_TIMEOUT       | 504  | "Gemini tardó demasiado. Reintenta con un audio más corto."   |
| GEMINI_QUOTA         | 429  | "Cuota de Gemini excedida. Revisa tu plan."                   |
| GEMINI_ERROR         | 502  | "Gemini devolvió un error. Inténtalo nuevamente."             |
| INTERNAL_ERROR       | 500  | "Error interno del servidor."                                 |

---

## FASE 4 — Acceptance Criteria

| #  | Criterio                                                                                | Cómo se verifica                                                  |
|----|-----------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| 1  | El usuario puede abrir la app localmente en `http://localhost:3000`.                    | Manual: arrancar `npm start`, abrir navegador.                    |
| 2  | El usuario puede subir un audio (drag-and-drop o selector).                             | Manual: probar ambos métodos.                                     |
| 3  | El usuario puede escribir una instrucción personalizada.                                | Manual: textarea editable.                                        |
| 4  | Los 5 botones rápidos rellenan el textarea con su instrucción correspondiente.          | Manual: clic en cada chip.                                        |
| 5  | La app envía el audio y la instrucción al backend mediante `POST /api/generate`.        | DevTools → Network.                                               |
| 6  | El backend procesa la solicitud usando Gemini con la API Key del `.env`.                | Logs del servidor, respuesta no vacía.                            |
| 7  | La app muestra los 5 estados claramente durante el proceso.                             | Manual: observar pipeline visual.                                 |
| 8  | El informe respeta la estructura de 8 secciones definida.                               | Inspección visual del Markdown renderizado.                       |
| 9  | El botón "Copiar informe" copia el Markdown completo al portapapeles.                   | Manual: pegar en editor externo.                                  |
| 10 | El botón "Copiar correo" copia solo la sección 8.                                       | Manual: pegar en editor externo.                                  |
| 11 | El botón "Descargar como Markdown" guarda un `.md` con el informe.                      | Manual: revisar archivo descargado.                               |
| 12 | La API Key NO aparece en el frontend ni en peticiones de red.                           | DevTools → Sources/Network: buscar la key (no debe encontrarse).  |
| 13 | El diseño se ve profesional, moderno y presentable en clase.                            | Revisión visual contra la spec UX/UI.                             |
| 14 | Si ocurre un error, la app muestra un mensaje claro al usuario.                         | Probar errores simulados (sin audio, archivo grande, sin key).    |

---

## FASE 5 — Implementation Plan

### Archivos a crear (y orden)

1. **`package.json`** — define dependencias y scripts.
   - `dependencies`: `express`, `dotenv`, `multer`, `@google/generative-ai`, `cors`.
   - `scripts`: `"start": "node server.js"`, `"dev": "node --watch server.js"`.

2. **`.env.example`** — plantilla de variables.

3. **`.gitignore`** — `node_modules/`, `.env`, `*.log`.

4. **`server.js`** — backend completo en un solo archivo (~150 líneas).
   - Carga `.env`.
   - Configura Express + middleware (CORS, JSON, static).
   - Endpoint `GET /api/health`.
   - Endpoint `POST /api/generate` con `multer.memoryStorage()`.
   - Cliente Gemini interno con prompt builder.
   - Mapeo de errores a códigos.
   - Listen en `process.env.PORT || 3000`.

5. **`public/index.html`** — estructura semántica de la página.
   - `<head>`: meta, título, fonts (Inter), `marked` por CDN, `styles.css`.
   - `<body>`: topbar, hero, sección entrada, sección proceso, sección salida (oculta inicial), toast container, `app.js`.

6. **`public/styles.css`** — estilos completos (~500 líneas).
   - Reset/normalize.
   - Variables CSS para tokens de diseño.
   - Layout grid, topbar, hero.
   - Componentes: dropzone, textarea, chips, botón CTA, pipeline, cards, tabla.
   - Estados (hover, active, disabled, loading).
   - Animaciones (pulse, shimmer, fade-in).
   - Responsive (1280+, 1024+).

7. **`public/app.js`** — lógica del frontend (~300 líneas).
   - Estado central: `{ audioFile, instruction, status, report }`.
   - Manejo dropzone (drag, drop, click, remove).
   - Manejo chips (asignan texto al textarea).
   - Validación cliente antes de enviar.
   - `fetch` a `/api/generate` con `FormData`.
   - Avance visual del pipeline en función de la fase.
   - Renderizado del Markdown en bloques (parsing por encabezados).
   - Acciones: copiar (Clipboard API), descargar (Blob + URL.createObjectURL), limpiar.
   - Toasts.
   - Polling inicial a `/api/health` para indicador de estado.

8. **`README.md`** — guía completa de instalación, uso y modificación.

### Orden de implementación
1. Esqueleto: `package.json`, `.env.example`, `.gitignore`.
2. Backend mínimo: `server.js` con `/api/health`.
3. Frontend mínimo: `index.html` + `styles.css` con layout y dropzone visual.
4. Integración Gemini: completar `/api/generate` y `geminiClient`.
5. Frontend `app.js`: dropzone funcional, fetch, render.
6. Estilos finos: pipeline animado, microinteracciones, responsive.
7. Manejo de errores y toasts.
8. README.md.
9. Pruebas manuales contra criterios de aceptación.

### Cómo se prueba cada parte
- **Backend health:** `curl http://localhost:3000/api/health` → `{ ok:true, ... }`.
- **Backend generate:** `curl -F "audio=@sample.mp3" -F "instruction=Genera minuta" http://localhost:3000/api/generate` → JSON con `markdown`.
- **Validaciones:** misma `curl` sin audio, sin instrucción, con archivo > 25 MB → ver códigos de error.
- **Frontend:** abrir en navegador, ejecutar el flujo completo con un audio corto (~30s).
- **Seguridad:** abrir DevTools → Sources, buscar `GEMINI_API_KEY` → no debe aparecer.

### Comandos de instalación y ejecución
```bash
cd "Ejercicios/MinutIA — Asistente de informes de reunión"
npm install
cp .env.example .env
# editar .env y poner la API Key real
npm start
# abrir http://localhost:3000
```

### Aspectos de diseño con cuidado especial
- **Pipeline visual:** debe verse como un componente real, no como una ilustración. Nodos con SVG, conectores con transición suave, estado activo con animación discreta.
- **Dropzone:** el componente más visible. Estados vacío / con archivo / dragover claros, sin parecer una caja Bootstrap.
- **Tarjeta del correo:** debe destacar visualmente porque es lo más copiado en uso real.
- **Tipografía y espaciado:** respeto estricto a la escala. No usar tamaños arbitrarios.
- **Coherencia entre estados (idle / loading / done / error):** transiciones suaves, sin saltos.

---

## FASE 6 — Implementación

Tras aprobación, se crearán los 8 archivos en el orden de la FASE 5. La implementación incluirá:

- Backend Express con middleware, validaciones, integración Gemini, manejo de errores.
- Configuración `.env` y `.env.example`.
- Frontend HTML estructurado, semántico.
- CSS premium (tokens, layout, componentes, estados, animaciones).
- JavaScript frontend con manejo de estado, dropzone, chips, fetch, render, copy/download/clear, toasts.
- Instrucción predeterminada en el textarea: *"Genera una minuta ejecutiva formal a partir del audio de esta reunión. Identifica temas tratados, acuerdos, responsables, pendientes, riesgos, próximos pasos y redacta un correo de seguimiento listo para enviar. Si algún dato no aparece, escribe 'No indicado'."*
- README.md con las 11 secciones requeridas.

---

## FASE 7 — Testing Guide

### 1. Levantar el servidor
```bash
cd "Ejercicios/MinutIA — Asistente de informes de reunión"
npm install
cp .env.example .env       # en Windows: copy .env.example .env
# Editar .env y agregar GEMINI_API_KEY=tu_key
npm start
```
Esperado en consola: `MinutIA listo en http://localhost:3000`.

### 2. Abrir la app
Navega a `http://localhost:3000`. Verifica:
- Topbar con indicador verde "Backend OK".
- Las tres zonas se ven correctamente.
- El botón "Generar informe" está deshabilitado hasta cargar audio + instrucción.

### 3. Audio de prueba
- Graba un audio corto (30–90 segundos) con el celular o usa una grabación real de reunión < 5 min.
- Formatos válidos: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`.
- Tamaño < 25 MB.

### 4. Instrucción de prueba
- Click en chip "Minuta ejecutiva" → el textarea se rellena.
- O escribe libre, por ejemplo: *"Genera una minuta breve y un correo para el equipo."*

### 5. Resultado esperado
- Pipeline avanza por los 5 estados.
- En 30–90 segundos aparece la zona de salida.
- El informe contiene las 8 secciones.
- El correo está completo y listo para copiar.

### 6. Comprobar que la API Key no está expuesta
- Abrir DevTools → Sources → buscar `GEMINI_API_KEY` → 0 resultados.
- DevTools → Network → ningún request muestra la key.
- Inspeccionar `view-source:` de la página → la key no aparece.

### 7. Probar errores comunes
- **Sin audio:** desactivar el dropzone, click en Generar → toast "Sube un archivo de audio".
- **Sin instrucción:** vaciar el textarea → botón disabled (validación cliente).
- **Sin API Key:** vaciar `.env` y reiniciar → toast "Falta configurar la API Key".
- **Archivo grande:** subir audio > 25 MB → toast "El audio supera el tamaño máximo".
- **Formato inválido:** subir un `.txt` renombrado a `.mp3` → toast "Formato no compatible".
- **Sin internet:** desconectar Wi-Fi → toast "Gemini no respondió" tras timeout.

### 8. Cómo explicar el ejercicio en clase
- Mostrar la spec primero (este archivo).
- Mostrar el código generado y comentar el rol del backend en proteger la API Key.
- Ejecutar el flujo en vivo con un audio breve grabado en la sala.
- Resaltar que la app es **una idea de negocio funcional en menos de 1 hora con Spec-Driven Development**.

---

## FASE 8 — Class Demo Script

**Duración total objetivo:** 12–15 minutos.

### 1. Explicación del problema (1 min)
"Después de cualquier reunión hay un audio o notas dispersas, y redactar la minuta toma una hora. ¿Qué pasaría si pudiéramos pasar de un audio a un plan de acción listo en 2 minutos?"

### 2. Presentación de la solución (1 min)
Mostrar la app abierta. Señalar las tres zonas: Entrada → Proceso → Salida. Subrayar la promesa: *"De reunión grabada a plan de acción ejecutable."*

### 3. Revisión de la especificación (2 min)
Abrir este plan. Mostrar Phase 1 (Product Spec) y Phase 4 (Acceptance Criteria). Mensaje clave: *"Antes de programar, definimos qué construimos y cómo sabemos que está bien."*

### 4. Generación o revisión del código con Claude Code (2 min)
Mostrar 1–2 archivos generados (ej. `server.js` y `app.js`). Resaltar:
- Cómo la API Key vive solo en el backend.
- Cómo el prompt se construye según la spec.
- Cómo el frontend renderiza Markdown sin frameworks.

### 5. Ejecución local (1 min)
`npm start` → abrir `http://localhost:3000`. Comentar que es 100 % local.

### 6. Subida de audio (1 min)
Tomar un audio breve grabado en la sala (o uno preparado). Drag-and-drop al dropzone.

### 7. Generación del informe (2 min)
Click en chip "Minuta ejecutiva" → "Generar informe". Comentar el pipeline mientras avanza.

### 8. Revisión del resultado (2 min)
Recorrer las 8 secciones. Copiar el correo y pegarlo en un editor para mostrar que está listo. Descargar el `.md`.

### 9. Mejora rápida de la app (2 min)
Pedir a Claude Code una mejora en vivo, por ejemplo: *"Agrega un chip rápido 'Acta para directorio'."* Mostrar el flujo: cambio en spec → código → recarga → funciona.

### 10. Desafío práctico para los alumnos (2 min)
Proponer 3 retos:
1. Agregar una sección "Métricas mencionadas" al informe.
2. Permitir cambiar el idioma del informe (es / en).
3. Agregar persistencia local con `localStorage` para recuperar la última minuta.

---

## Criterio final de éxito

La app comunica claramente:
> **"Pasamos de una reunión grabada a un plan de acción claro, profesional y listo para ejecutar."**

---

## Archivos críticos a crear

| Archivo | Propósito |
|---------|-----------|
| `Ejercicios/MinutIA — Asistente de informes de reunión/package.json` | Dependencias + scripts |
| `Ejercicios/MinutIA — Asistente de informes de reunión/.env.example` | Plantilla de variables |
| `Ejercicios/MinutIA — Asistente de informes de reunión/.gitignore` | Exclusiones git |
| `Ejercicios/MinutIA — Asistente de informes de reunión/server.js` | Backend Express + cliente Gemini |
| `Ejercicios/MinutIA — Asistente de informes de reunión/public/index.html` | Estructura página |
| `Ejercicios/MinutIA — Asistente de informes de reunión/public/styles.css` | Diseño premium oscuro |
| `Ejercicios/MinutIA — Asistente de informes de reunión/public/app.js` | Lógica frontend |
| `Ejercicios/MinutIA — Asistente de informes de reunión/README.md` | Guía completa (11 secciones) |

## Verificación end-to-end (resumen ejecutable)

1. `npm install && npm start` levanta el servidor sin errores.
2. `GET /api/health` responde `{ ok:true, hasKey:true }`.
3. `POST /api/generate` con un MP3 de 30 s y la instrucción "minuta" devuelve Markdown con las 8 secciones.
4. La UI muestra el pipeline avanzar y renderiza las 8 secciones en cards.
5. Los 4 botones (Copiar informe, Copiar correo, Descargar, Limpiar) funcionan.
6. La búsqueda de la API Key en DevTools no la encuentra.
7. Probar los 5 errores definidos → cada uno muestra el mensaje correcto.

---

## Decisiones a confirmar antes de implementar

Antes de pasar a Fase 6 (implementación), necesito confirmar 2–3 decisiones contigo. Las preguntaré con AskUserQuestion al cerrar este plan, y luego llamaré a ExitPlanMode con tu aprobación.
