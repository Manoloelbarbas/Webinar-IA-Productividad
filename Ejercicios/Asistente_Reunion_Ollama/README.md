# MinutIA — Asistente de informes de reunión desde transcripción

Aplicación web local que convierte la **transcripción en texto** de una reunión en un **informe ejecutivo estructurado** (resumen, temas, acuerdos, responsables, pendientes, riesgos, próximos pasos y correo de seguimiento), usando **Ollama** corriendo en tu propia máquina.

> 100% local · Sin API Keys · Sin enviar datos a la nube · Construido con **Spec-Driven Development**.

---

## ¿Qué hace la app?

1. Pegas o cargas una transcripción de reunión (texto plano).
2. Eliges una instrucción para la IA (escribirla o usar un botón rápido).
3. Click en **Generar informe**.
4. En unos segundos tienes un documento con 8 secciones listas para copiar, descargar o mandar al equipo.

**Promesa**: *Pasamos de una transcripción desordenada a un plan de acción claro, profesional y listo para ejecutar.*

---

## ¿Qué problema resuelve?

Las reuniones generan **transcripciones largas y desordenadas** (de Meet, Zoom, Teams). Convertirlas a mano en una minuta con responsables, plazos y un correo de seguimiento toma 30–60 minutos por persona. Esta app reduce eso a 1–2 minutos.

---

## ¿Qué es Spec-Driven Development (SDD)?

SDD es una metodología en la que **especificamos qué queremos antes de programar**. En lugar de abrir el editor y escribir código, definimos primero:

1. El **problema** que resuelve la app.
2. El **usuario** y el **flujo** principal.
3. Los **requisitos** funcionales y no funcionales.
4. Los **criterios de aceptación** verificables.
5. El **diseño** visual y la **arquitectura** técnica.
6. Solo después: **implementación**.

Resultado: cada línea de código se puede rastrear hasta una decisión que ya tomamos en la spec.

## ¿Cómo usa SDD esta app?

El archivo [`SPEC.md`](./SPEC.md) recorre **8 fases SDD** explícitamente rotuladas:

- **Fase 0** Detección del problema y alcance.
- **Fase 1** Product Spec.
- **Fase 2** UX/UI Spec.
- **Fase 3** Technical Spec.
- **Fase 4** Acceptance Criteria.
- **Fase 5** Implementation Plan.
- **Fase 6** Implementación.
- **Fase 7** Testing Guide.
- **Fase 8** Class Demo Script + desafío para alumnos.

Lee `SPEC.md` antes de tocar el código. Cada decisión técnica responde a un requisito definido ahí.

---

## Requisitos previos

| Herramienta | Mínimo | Cómo verificar |
|---|---|---|
| Node.js | 18 o superior | `node --version` |
| npm | viene con Node | `npm --version` |
| Ollama | última | `ollama --version` |

**Instalar Ollama**:
- **Windows / macOS / Linux**: https://ollama.com/download
- **Windows con winget**: `winget install Ollama.Ollama`

---

## Instalación

```bash
# 1. Posicionarse en la carpeta del ejercicio
cd "Asistente_Reunion_Ollama"

# 2. Instalar dependencias Node
npm install

# 3. Crear el archivo .env
copy .env.example .env       # Windows (CMD/PowerShell)
cp .env.example .env         # macOS / Linux

# 4. Descargar el modelo (la primera vez tarda unos minutos)
ollama pull llama3.2:3b
```

---

## Ejecutar la app

Necesitas **dos terminales abiertas**.

**Terminal 1 — Ollama**:
```bash
ollama serve
```
*(En Windows con la app oficial de Ollama, basta con abrir la app de la bandeja del sistema; puedes saltarte este paso.)*

**Terminal 2 — MinutIA**:
```bash
npm start
```

Verás:
```
MinutIA Ollama corriendo en http://localhost:3000
  Ollama:  http://localhost:11434
  Modelo:  llama3.2:3b
```

Abre `http://localhost:3000`. El **badge del topbar** debe ponerse verde a los pocos segundos.

---

## Cómo usar la app

### 1. Cargar la transcripción

Tienes dos opciones:

- **Pegar texto**: copia la transcripción y pégala en el textarea grande.
- **Cargar `.txt`**: click en "Cargar archivo .txt" y elige el archivo desde tu disco.

El **contador de caracteres** debe ponerse verde (mínimo 300, máximo 50.000).

### 2. Escribir o elegir la instrucción

- **Escribir libre**: describe qué quieres en la minuta (ej.: *"Genera una minuta enfocada en compromisos con el cliente"*).
- **Botones rápidos**: usa una de las 5 plantillas:
  - **Minuta ejecutiva** — formato profesional estándar.
  - **Plan de acción** — énfasis en responsables y plazos.
  - **Correo de seguimiento** — prioriza la sección 8.
  - **Resumen para gerencia** — para audiencia C-level.
  - **Acuerdos y responsables** — exhaustivo en la tabla.

### 3. Generar el informe

Click en **Generar informe**. Verás el pipeline avanzar (Validación → Análisis IA → Informe → Listo). Tiempo típico: 20–60 s en CPU con `llama3.2:3b`.

### 4. Resultado

Aparece la zona "Informe ejecutivo" con **8 cards**:

1. Resumen ejecutivo
2. Temas tratados
3. Acuerdos principales
4. Responsables (tabla)
5. Pendientes
6. Riesgos o bloqueos
7. Próximos pasos
8. **Correo de seguimiento** (destacado)

Acciones disponibles:
- **Copiar informe** — todo el markdown.
- **Copiar correo** — solo la sección 8 (sin encabezado).
- **Descargar .md** — archivo `minutia-YYYYMMDD-HHmm.md`.
- **Limpiar** — vuelve a empezar.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Badge **rojo** "Ollama no responde" | Ollama no está corriendo | Ejecuta `ollama serve` o abre la app de Ollama |
| Badge **ámbar** "Falta modelo X" | El modelo no está descargado | `ollama pull <nombre-modelo>` (el badge muestra el comando exacto en su tooltip) |
| Error 504 "Ollama tardó más de…" | Modelo lento en CPU o transcripción muy larga | Usa `llama3.2:3b` (más rápido) o aumenta `OLLAMA_TIMEOUT_MS` en `.env` |
| Error 404 "MODEL_NOT_PULLED" | El nombre en `.env` no coincide con un modelo descargado | Verifica con `ollama list` y ajusta `OLLAMA_MODEL` |
| Contador en **rojo** | Transcripción supera el máximo | Reduce el texto o sube `MAX_TRANSCRIPT_CHARS` en `.env` |
| Botón "Generar" deshabilitado | Falta transcripción ≥ 300 chars o instrucción | Completa ambos campos |
| El informe no respeta las 8 secciones | El modelo es muy pequeño o el contexto se pierde | Prueba con `qwen2.5:7b-instruct` o `mistral:7b-instruct` |
| "El archivo está vacío" / "Formato no válido" | Solo se aceptan `.txt` con contenido | Usa un archivo de texto plano no vacío |

---

## Modificar el prompt interno

El prompt sistema vive en [`server.js`](./server.js), función `buildPrompt(instruction, transcript)`. Es el cerebro de la app. Modificarlo cambia el comportamiento de la IA sin tocar el frontend.

Ideas de experimentación:
- Cambiar el idioma del informe (agregar al prompt: *"Responde en inglés"*).
- Agregar una sección 9 con "Acciones sugeridas" para diferenciar de los acuerdos.
- Pedir un tono más informal o más ejecutivo.
- Pedir que detecte automáticamente fechas en formato ISO.

Tras editar, basta con reiniciar (`Ctrl+C` y `npm start`) o usar `npm run dev` para auto-reload.

---

## Variables de entorno (`.env`)

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto Express | `3000` |
| `OLLAMA_BASE_URL` | URL de Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modelo a usar | `llama3.2:3b` |
| `OLLAMA_TIMEOUT_MS` | Timeout de generación (ms) | `180000` |
| `MAX_TRANSCRIPT_CHARS` | Máximo de caracteres aceptados | `50000` |

**Modelos sugeridos** (descarga con `ollama pull <nombre>`):

| Modelo | Tamaño | Para |
|---|---|---|
| `llama3.2:3b` | 2 GB | Default. Rápido en CPU, 8 GB RAM mínimo. |
| `qwen2.5:7b-instruct` | 4 GB | Mejor calidad de tablas y formato. 16 GB RAM o GPU. |
| `mistral:7b-instruct` | 4 GB | Alternativa equilibrada. |

---

## Cómo usar esta app como ejercicio de clase

1. **Antes de la sesión**: revisa con tu profesor `SPEC.md` para entender la metodología.
2. **Durante la sesión**: el profesor demostrará la app en vivo y recorrerá las fases.
3. **Después**:
   - Lee `SPEC.md` completo y marca el checklist final.
   - Escoge una mejora del **desafío para alumnos** (Fase 8 de `SPEC.md`).
   - **Antes de codear**, escribe tu propia mini-spec (Product Spec breve · Requisito funcional · Criterio de aceptación · Plan breve).
   - Implementa la mejora.
   - Verifica que tu código respeta tu mini-spec.
   - Comparte el resultado con tu equipo.

---

## Estructura del proyecto

```
Asistente_Reunion_Ollama/
├── server.js              # Backend Express + cliente Ollama
├── package.json           # Dependencias y scripts
├── .env.example           # Plantilla de configuración
├── .gitignore             # Ignora node_modules y .env
├── README.md              # Este archivo
├── SPEC.md                # Documento maestro SDD (8 fases)
└── public/
    ├── index.html         # Estructura semántica (3 zonas)
    ├── styles.css         # Tema dark premium
    └── app.js             # Máquina de estados + fetch + render
```

---

## Licencia

MIT — uso libre con fines educativos y profesionales.
