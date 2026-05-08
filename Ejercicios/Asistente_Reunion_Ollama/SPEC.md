# Desarrollo Guiado por Especificaciones — SDD

> **MinutIA — Asistente de informes de reunión desde transcripción** se construye con **Spec-Driven Development (SDD)**: definimos qué queremos antes de cómo lo hacemos. Este documento es el contrato del producto. La implementación (`server.js`, `public/`) debe poder rastrearse contra cada sección de aquí.

---

## Fase 0 · Detección del problema y alcance

**Problema real de oficina.** Después de cualquier reunión queda un texto largo (transcripción, notas pegadas, exportación de Meet/Zoom) sin estructura. Convertirlo a mano en una minuta con acuerdos, responsables y correo de seguimiento toma 30–60 minutos por cada persona del equipo. Se pierde tiempo y se diluye la trazabilidad de los compromisos.

**Por qué partir de la especificación.** Sin spec, el primer impulso es abrir el editor y escribir HTML. A los 20 minutos hay un formulario, pero falta claridad sobre qué valida el backend, qué errores se muestran, qué estructura tiene el informe y qué pasa si Ollama no está corriendo. El refactor ya cuesta más que la spec inicial.

**Riesgo de empezar a programar directamente.** Inconsistencia entre frontend y backend, prompt mal calibrado, errores genéricos ("Error 500"), UI bonita pero rota en casos límite, y una app que no se puede explicar en clase porque nadie sabe qué requisito cumple cada línea de código.

**Qué significa SDD aquí.** Trabajamos en fases rotuladas: definimos producto, UX, técnica, criterios de aceptación, plan de implementación. **Solo después** escribimos código. Cada commit responde a una sección de esta spec.

**Decisiones tomadas antes de implementar.** Stack técnico, endpoints, prompt sistema, estructura del informe (8 secciones), códigos de error, paleta visual, estados del proceso, validaciones de entrada, comportamiento offline.

---

## Fase 1 · Product Spec

**1. Problema que resuelve.** Transformar una transcripción de reunión en un informe ejecutivo con acuerdos, responsables, pendientes, riesgos y un correo de seguimiento listo para enviar — usando IA local (Ollama) para garantizar privacidad.

**2. Usuario objetivo.** Profesionales de oficina que coordinan reuniones: jefes de proyecto, gerentes, secretarías ejecutivas, consultores, equipos de operaciones. Personas que ya tienen transcripciones (de Meet/Zoom/Teams) y necesitan minutas en minutos, no en horas.

**3. Caso de uso principal.** Camila tiene la transcripción de la reunión semanal de proyecto. Pega el texto en MinutIA, elige la plantilla "Minuta ejecutiva", presiona Generar. En menos de 2 minutos tiene un documento estructurado con tabla de responsables y un correo de seguimiento. Copia el correo y lo envía al equipo.

**4. Flujo principal del usuario.**
1. Abre `http://localhost:3000`.
2. Pega la transcripción **o** carga un `.txt`.
3. Escribe una instrucción **o** pulsa un botón rápido.
4. Click en "Generar informe".
5. Ve el pipeline de proceso (Validación → Análisis → Generación).
6. Recibe el informe en 8 cards.
7. Copia / descarga / limpia.

**5. Funcionalidades principales (in scope).**
- Pegado manual de transcripción.
- Carga de archivo `.txt` (lectura cliente, sin upload).
- Campo de instrucción libre.
- 5 botones rápidos (chips) que rellenan la instrucción.
- Validación cliente y servidor.
- Generación con Ollama local (modelo configurable).
- Visualización segmentada del informe (8 secciones).
- Copiar informe completo.
- Copiar solo el correo (sección 8).
- Descargar como `.md` con timestamp.
- Limpiar formulario.
- Indicador de salud de Ollama en topbar.

**6. Fuera de alcance (V1).**
- Procesamiento de audio.
- Transcripción automática (Whisper, etc.).
- Login / autenticación / multi-usuario.
- Base de datos / historial.
- Integración real con correo (SMTP, Gmail API).
- Almacenamiento en la nube.
- Edición colaborativa.
- Exportación a PDF / DOCX.
- Soporte multi-idioma (V1: español).

**7. Requisitos funcionales.**
- RF-01 El usuario puede pegar transcripción en un textarea.
- RF-02 El usuario puede cargar un archivo `.txt`.
- RF-03 El usuario puede escribir instrucción personalizada.
- RF-04 El usuario puede usar botones rápidos.
- RF-05 La app valida que exista transcripción.
- RF-06 La app valida un largo mínimo (300 chars) y máximo (configurable, default 50.000).
- RF-07 La app valida que exista instrucción.
- RF-08 La app muestra estados de proceso (5 estados visibles en pipeline).
- RF-09 La app genera un informe con la estructura de 8 secciones.
- RF-10 La app permite copiar el informe completo.
- RF-11 La app permite copiar solo el correo de seguimiento.
- RF-12 La app permite descargar el informe como `.md`.
- RF-13 La app permite limpiar el formulario.
- RF-14 La app reporta el estado de Ollama (verde/ámbar/rojo) en el topbar.

**8. Requisitos no funcionales.**
- RNF-01 100% local. Ningún dato sale a internet.
- RNF-02 Sin API Keys (Ollama corre en `localhost`).
- RNF-03 Latencia máxima configurable (`OLLAMA_TIMEOUT_MS`, default 3 minutos).
- RNF-04 Diseño profesional, sin emojis decorativos, sin íconos infantiles.
- RNF-05 Responsive desde 1024px (notebook).
- RNF-06 Sin build step. HTML/CSS/JS vanilla.
- RNF-07 Stack mínimo: Node 18+, Express, Ollama. Cero dependencias frontend (Marked.js por CDN).
- RNF-08 Mensajes de error claros y específicos para cada caso.

**9. Criterios de aceptación.** Ver §5 (Fase 4).

**10. Riesgos técnicos.**
- Ollama no instalado o no corriendo → la app debe avisarlo en topbar y dar el comando exacto para resolver.
- Modelo no descargado → mensaje específico con `ollama pull <modelo>`.
- Latencia alta en CPU → estados visibles + cronómetro mm:ss para que el usuario sepa que no está colgado.
- Modelo no respeta la estructura → fallback que muestra el markdown crudo con un banner de aviso.
- Transcripción demasiado larga → rechazo explícito con código 413, no truncado silencioso.

**11. Supuestos.**
- El usuario tiene Node 18+ y Ollama instalados localmente.
- El usuario ya cuenta con la transcripción en texto (no la generamos).
- Transcripciones típicas: 1.000–10.000 caracteres; máximo 50.000.
- Hardware mínimo: 8 GB RAM (CPU) para `llama3.2:3b`.

---

## Fase 2 · UX/UI Spec

**Dirección visual.** Dashboard ejecutivo SaaS premium. Tema **oscuro** (`#0B0D12` base, `#7C5CFF` violeta corporativo como acento). Tipografía **Inter** (Google Fonts), monoespaciada **JetBrains Mono** para datos técnicos. Sin emojis decorativos, sin gradientes saturados, sombras suaves, bordes redondeados 12–16 px, espaciado generoso.

**Layout de tres zonas.**

1. **Entrada** (col izquierda en desktop).
   - Card: textarea grande de transcripción + contador de caracteres con cambio de color (verde / ámbar / rojo).
   - Botón "Cargar `.txt`" + hint del archivo cargado.
   - Card: textarea de instrucción + 5 chips rápidos + botón principal "Generar informe" (deshabilitado hasta validación OK).

2. **Proceso** (col derecha en desktop).
   - Pipeline visual de 5 nodos: Transcripción → Validación → Análisis IA → Informe → Listo.
   - Banner de estado bajo el pipeline con título, detalle y cronómetro mm:ss durante la espera.
   - Meta-card con modelo en uso, URL de Ollama, mensaje de privacidad.

3. **Salida** (full-width, oculta hasta tener informe).
   - 8 cards segmentadas (1 por sección del informe).
   - Card del correo (sección 8) con tratamiento visual destacado.
   - Botones de acción: Copiar informe · Copiar correo · Descargar `.md` · Limpiar.

**Estados de proceso.**

| Estado | Trigger | UI |
|---|---|---|
| `idle` | Inicial / tras Limpiar | "Esperando transcripción" |
| `loaded` | Textarea con texto | "Transcripción cargada" + botón habilitado |
| `validating` | Click en Generar | "Validando contenido" |
| `analyzing` | Fetch enviado | "Analizando reunión con Ollama" + cronómetro |
| `generating` | Tras 3s en analyzing | "Generando informe ejecutivo" |
| `done` | 200 OK | "Informe listo" + zona de salida visible |
| `error` | Cualquier fallo | Banner rojo + toast con detalle |

**Topbar de salud.** Badge con tres estados:
- 🟢 verde: Ollama responde + modelo descargado.
- 🟡 ámbar: Ollama responde, modelo no descargado (tooltip con comando `ollama pull`).
- 🔴 rojo: Ollama no responde (tooltip con `ollama serve`).

**Microinteracciones.**
- Hover en chips: leve elevación + cambio de borde a violeta.
- Botón principal: spinner integrado durante carga, desactivado por estado.
- Pipeline: nodo activo pulsa, nodos completados pasan a verde.
- Toasts: aparecen top-right, autodismiss a los 4.5 s.

---

## Fase 3 · Technical Spec

**Stack.** Node 18+, Express 4.19, dotenv 16.4, cors 2.8. Frontend HTML/CSS/JS vanilla. Marked.js por CDN. `fetch` global de Node 18+ para hablar con Ollama (sin SDK). Sin build step.

**Estructura del proyecto.**
```
Asistente_Reunion_Ollama/
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── SPEC.md
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

**Variables de entorno (`.env`).**
- `PORT` — puerto Express (default 3000).
- `OLLAMA_BASE_URL` — URL de Ollama (default `http://localhost:11434`).
- `OLLAMA_MODEL` — modelo a usar (default `llama3.2:3b`).
- `OLLAMA_TIMEOUT_MS` — timeout de generación (default 180.000).
- `MAX_TRANSCRIPT_CHARS` — máximo de caracteres aceptados (default 50.000).

**Endpoints.**

`GET /api/health` — pinga `GET {OLLAMA_BASE_URL}/api/tags` con timeout 3 s y devuelve:
```json
{
  "ok": true,
  "model": "llama3.2:3b",
  "baseUrl": "http://localhost:11434",
  "ollamaReachable": true,
  "modelAvailable": true,
  "maxTranscriptChars": 50000
}
```

`POST /api/generate-report` — body JSON `{ transcript, instruction }`. Validaciones (en orden): transcript presente, ≥ 300 chars, ≤ MAX, instrucción presente. Si todo OK, llama a Ollama:

```http
POST {OLLAMA_BASE_URL}/api/generate
{
  "model": "<OLLAMA_MODEL>",
  "prompt": "<system + instrucción + transcripción>",
  "stream": false,
  "options": { "temperature": 0.3, "num_ctx": 8192, "num_predict": 2048 }
}
```

Respuesta exitosa: `{ ok: true, model, markdown, stats }`.

**Códigos de error tipados.**

| HTTP | code | Cuándo |
|---|---|---|
| 400 | `NO_TRANSCRIPT` | Transcripción ausente o vacía |
| 400 | `TRANSCRIPT_TOO_SHORT` | < 300 caracteres |
| 413 | `TRANSCRIPT_TOO_LONG` | > MAX_TRANSCRIPT_CHARS |
| 400 | `NO_INSTRUCTION` | Instrucción ausente o vacía |
| 503 | `OLLAMA_UNREACHABLE` | Ollama caído o URL incorrecta |
| 404 | `MODEL_NOT_PULLED` | Modelo no descargado |
| 504 | `OLLAMA_TIMEOUT` | Excedió `OLLAMA_TIMEOUT_MS` |
| 502 | `EMPTY_RESPONSE` | Ollama devolvió string vacío |
| 502 | `OLLAMA_BAD_JSON` | Respuesta no parseable |
| 502 | `OLLAMA_ERROR` | Otros errores de Ollama |

**Decisión: sin streaming.** Una sola llamada `await`, `stream: false`. Razones: (a) simplicidad pedagógica, (b) la segmentación por secciones ocurre de una vez en lugar de progresivamente, (c) los estados visibles del pipeline ya cubren la espera, (d) paralelo conceptual con la versión Gemini de la otra carpeta.

**Seguridad.**
- Sin API Keys (todo es local).
- CORS limitado a `localhost:PORT` y `127.0.0.1:PORT`.
- `express.json({ limit: '2mb' })` (cubre 50.000 chars con holgura).
- `.env` está en `.gitignore`. Solo `.env.example` se versiona.
- Validaciones servidor antes de invocar al modelo — no se gasta inferencia en input inválido.

**Prompt sistema.** Ver `server.js → buildPrompt()`. Es la pieza modificable: el alumno puede editarlo para experimentar (estilo, idioma, secciones extra).

---

## Fase 4 · Acceptance Criteria

| # | Criterio |
|---|---|
| 1 | El usuario abre la app localmente en `http://localhost:3000`. |
| 2 | El usuario puede pegar una transcripción en un textarea. |
| 3 | El usuario puede cargar un archivo `.txt`. |
| 4 | El usuario puede escribir una instrucción personalizada. |
| 5 | El usuario puede usar los 5 botones rápidos. |
| 6 | La app valida la presencia de transcripción antes de generar. |
| 7 | La app valida largo mínimo y máximo. |
| 8 | La app muestra los 5 estados del pipeline. |
| 9 | La app genera un informe con las 8 secciones exactas. |
| 10 | La app segmenta visualmente cada sección en una card. |
| 11 | La app destaca visualmente el correo de seguimiento. |
| 12 | El botón "Copiar informe" copia el markdown completo. |
| 13 | El botón "Copiar correo" copia solo la sección 8. |
| 14 | El botón "Descargar .md" genera un archivo con timestamp. |
| 15 | El botón "Limpiar" resetea formulario, salida y estado. |
| 16 | El diseño se ve profesional y presentable en una clase o empresa. |
| 17 | Si Ollama no responde, el badge se pone rojo con mensaje claro. |
| 18 | Si el modelo no está descargado, el badge se pone ámbar con `ollama pull`. |
| 19 | Si la transcripción excede el máximo, el contador se pone rojo y el botón se deshabilita. |
| 20 | El archivo `SPEC.md` documenta cada fase SDD y permite al alumno trazar requisito → código. |

---

## Fase 5 · Implementation Plan

| # | Archivo | Contenido | Cómo se prueba |
|---|---|---|---|
| 1 | `package.json`, `.gitignore`, `.env.example` | Deps mínimas, scripts start/dev | `npm install` exitoso |
| 2 | `server.js` (parte 1) | Express + `/api/health` con ping a Ollama | `curl localhost:3000/api/health` con Ollama on/off |
| 3 | `server.js` (parte 2) | `POST /api/generate-report` + prompt + errores | `curl` con cuerpo válido y los 6 paths de error |
| 4 | `public/index.html` | Estructura semántica 3 zonas + topbar + Marked CDN | Abrir en navegador, ver estructura |
| 5 | `public/styles.css` | Tokens dark, layout grid, pipeline, toasts | Inspección visual responsive |
| 6 | `public/app.js` | Máquina de estados, fetch, render, copy/download | Recorrer flujo completo |
| 7 | `SPEC.md`, `README.md` | Documentación SDD | Lectura por el alumno |

**Comandos para el usuario.**
```bash
ollama pull llama3.2:3b      # solo la primera vez
npm install                  # solo la primera vez
cp .env.example .env         # solo la primera vez (Linux/macOS)
copy .env.example .env       # solo la primera vez (Windows CMD)
npm start                    # cada vez que se quiera ejecutar
```

**Cuidado especial en diseño.** El detalle visual diferencia un demo "como tarea" de un demo "como producto". Cuidamos: contraste, jerarquía, consistencia tipográfica, espaciado, transiciones suaves, ausencia de decoración infantil.

**Reflejo de SDD en el proyecto.** Cada decisión queda rastreable: `RF-XX → SPEC.md → server.js / app.js`. El alumno puede abrir cualquier archivo y preguntarse "¿qué requisito cumple esto?" — y encontrar la respuesta.

**Evidencia para el alumno.**
- `SPEC.md` con las 8 fases rotuladas.
- `README.md` con sección "¿Qué es SDD y cómo se usa aquí?".
- Comentarios mínimos en `server.js` que marcan la frontera de cada responsabilidad.
- Checklist al final de este documento.

---

## Fase 6 · Implementación

Ver código fuente:
- `server.js` — backend Express + cliente Ollama.
- `public/index.html` — estructura semántica.
- `public/styles.css` — sistema de diseño.
- `public/app.js` — frontend (máquina de estados + render).

---

## Fase 7 · Testing Guide

**Pre-requisitos.**
1. Node 18+ instalado.
2. Ollama instalado (`ollama --version`).
3. Modelo descargado: `ollama pull llama3.2:3b`.
4. Ollama corriendo: `ollama serve` (en una terminal aparte).

**Levantar la app.**
```bash
cd Asistente_Reunion_Ollama
npm install
cp .env.example .env   # o copia manual en Windows
npm start
```
Abre `http://localhost:3000`. El badge del topbar debe ponerse verde a los pocos segundos.

**Transcripción de prueba sugerida.**
```
Hola equipo, en la reunión de hoy revisamos el avance del proyecto de automatización interna.
Acordamos que Camila revisará la base de datos de clientes antes del viernes. Javier quedó
encargado de preparar una propuesta de dashboard para gerencia. Manuel revisará los costos
del proyecto y enviará un resumen ejecutivo el lunes. Quedó pendiente definir si usaremos
Make o n8n para la automatización. También se identificó como riesgo que los datos están
incompletos y podrían afectar el reporte final. El próximo paso será reunirnos nuevamente
el martes para validar el primer prototipo.
```
*(Esta transcripción tiene ~530 caracteres — supera el mínimo de 300.)*

**Casos de prueba.**

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1 | Caso feliz - pegado | Pegar transcripción → click "Minuta ejecutiva" → "Generar" | Informe con 8 secciones, tabla de Responsables (Camila, Javier, Manuel) |
| 2 | Carga `.txt` | Crear archivo con la transcripción → "Cargar archivo .txt" → generar | Mismo resultado que caso 1 |
| 3 | Copiar informe | Click "Copiar informe" → pegar en VS Code | Markdown completo con 8 encabezados `## N.` |
| 4 | Copiar correo | Click "Copiar correo" → pegar | Solo el cuerpo de la sección 8, sin encabezado |
| 5 | Descargar | Click "Descargar .md" | Archivo `minutia-YYYYMMDD-HHmm.md` baja correctamente |
| 6 | Limpiar | Click "Limpiar" | Todo vuelve a `idle` |
| 7 | Sin transcripción | Generar con textarea vacío | Toast "Sin transcripción", botón sigue deshabilitado |
| 8 | Transcripción corta | < 300 chars → generar | Toast con "mínimo 300", contador en ámbar |
| 9 | Transcripción larga | > 50.000 chars | Contador en rojo, botón deshabilitado |
| 10 | Sin instrucción | Pegar texto pero no instrucción | Botón deshabilitado |
| 11 | Archivo no .txt | Cargar un `.pdf` o `.docx` | Toast "Formato no válido" |
| 12 | Archivo vacío | Cargar `.txt` de 0 bytes | Toast "Archivo inválido" |
| 13 | Ollama caído | Detener `ollama serve` → recargar → generar | Badge rojo, error 503 con mensaje claro |
| 14 | Modelo cambiado | Editar `.env` con modelo inexistente → reiniciar → generar | Badge ámbar, error 404 con `ollama pull` |

**Verificación de estructura.** El informe generado debe contener exactamente:
```
# Informe ejecutivo de reunión
## 1. Resumen ejecutivo
## 2. Temas tratados
## 3. Acuerdos principales
## 4. Responsables
## 5. Pendientes
## 6. Riesgos o bloqueos
## 7. Próximos pasos
## 8. Correo de seguimiento
```
Si el modelo no respeta la estructura, la UI lo muestra con un banner de aviso (caso de fallback documentado).

**Cómo explicar SDD en clase.** Recorrer `SPEC.md` de arriba a abajo. En cada fase, mostrar el archivo correspondiente. Cuando un alumno pregunta "¿por qué hicieron X?", responder con "porque RF-NN dice Y" o "porque criterio de aceptación NN exige Z". La trazabilidad es la prueba de que SDD se aplicó.

---

## Fase 8 · Class Demo Script

**Estructura del guion (15–25 minutos).**

1. **Problema.** "¿Cuánto tiempo te toma redactar la minuta después de una reunión?"
2. **Solución.** Mostrar la app ya corriendo con un informe de ejemplo.
3. **SDD.** Explicar que vamos a ver cómo se construyó *antes* de escribir código.
4. **Revisión de spec.** Abrir `SPEC.md`, recorrer Fases 0–4.
5. **Trazabilidad.** Tomar el RF-09 y mostrar dónde vive (prompt en `server.js → buildPrompt`).
6. **Generación con Claude Code.** Mostrar el prompt que generó este proyecto (dejar al alumno ver cómo se especificó).
7. **Ejecución.** `npm start`, abrir navegador.
8. **Pegado.** Pegar la transcripción de prueba.
9. **Generación.** Click → mostrar pipeline en acción.
10. **Resultado.** Comentar las 8 cards y la tabla de Responsables.
11. **Verificación.** Recorrer 3–4 criterios de aceptación y marcarlos con la app delante.
12. **Mejora rápida.** Cambiar el `OLLAMA_MODEL` en `.env`, reiniciar, regenerar — el alumno ve cómo la spec sigue siendo válida con un cambio técnico.
13. **Desafío para alumnos.** Repartir la siguiente lista.

**Desafío práctico para alumnos.**

Cada estudiante o equipo elige una mejora. **Antes de tocar código**, escribe una mini-spec con cuatro elementos: (1) Mini Product Spec, (2) Requisito funcional, (3) Criterio de aceptación, (4) Plan breve.

Opciones sugeridas:
- Agregar clasificación por prioridad (alta / media / baja) a las tareas de la sección 4.
- Agregar fecha límite explícita a cada responsable (parsear menciones a "viernes", "lunes", etc.).
- Agregar exportación en `.txt` (además de `.md`).
- Agregar botón "Copiar solo acuerdos" (sección 3).
- Agregar contador de responsables únicos detectados.
- Agregar una sección 9 "Acciones sugeridas" en el prompt.
- Agregar modo "Resumen para gerencia" como otro chip que cambie el prompt al estilo C-level.
- Agregar modo "Correo breve" (correo de máximo 5 líneas).

**Criterio final de éxito.** La app comunica claramente esta promesa: *"Pasamos de una transcripción desordenada a un plan de acción claro, profesional y listo para ejecutar."*

---

## Checklist para estudiantes

Marca cada punto con tu equipo. Si alguno está en blanco, abre el archivo correspondiente y revisa.

- [ ] ¿Se definió el problema antes de programar? *(SPEC §0, §1)*
- [ ] ¿Se definió el usuario objetivo? *(SPEC §1.2)*
- [ ] ¿Se definió el flujo principal del usuario? *(SPEC §1.4)*
- [ ] ¿Se separaron requisitos funcionales y no funcionales? *(SPEC §1.7, §1.8)*
- [ ] ¿Se definieron criterios de aceptación verificables? *(SPEC §4)*
- [ ] ¿Se propuso diseño visual antes de implementar? *(SPEC §2)*
- [ ] ¿Se propuso arquitectura antes de implementar? *(SPEC §3)*
- [ ] ¿La implementación respeta la especificación? *(comparar `server.js` y `public/` con §3)*
- [ ] ¿La app permite probar todos los criterios de aceptación? *(SPEC §4 + §7)*
- [ ] ¿La documentación permite a un compañero entender el proceso SDD sin pedir ayuda?

> Si los 10 están marcados, has aplicado **Spec-Driven Development** correctamente.
