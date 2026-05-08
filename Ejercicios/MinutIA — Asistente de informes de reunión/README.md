# MinutIA — Asistente de informes de reunión

Convierte un audio de reunión en un **informe ejecutivo estructurado** y un **correo de seguimiento** listos para enviar, en menos de dos minutos. Aplicación web local construida con Node.js, Express y Google Gemini.

> "De reunión grabada a plan de acción claro, profesional y listo para ejecutar."

---

## 1. Qué hace la app

MinutIA recibe un archivo de audio (`mp3`, `wav`, `m4a`, `ogg`, `webm`), lo procesa con Google Gemini y devuelve un informe en Markdown con:

1. Resumen ejecutivo
2. Temas tratados
3. Acuerdos principales
4. Responsables (tabla: tarea, responsable, plazo)
5. Pendientes
6. Riesgos o bloqueos
7. Próximos pasos
8. Correo de seguimiento listo para copiar y enviar

La interfaz incluye botones para copiar el informe completo, copiar solo el correo, descargar el resultado como `.md` o limpiar todo y empezar de nuevo.

## 2. Qué problema resuelve

Después de cada reunión queda un audio o notas dispersas, y redactar la minuta toma 30–60 minutos. MinutIA reduce ese trabajo a un par de minutos, con calidad consistente y estructura profesional. Pensada para líderes de proyecto, jefaturas, asistentes ejecutivos y equipos pequeños que sostienen reuniones recurrentes.

## 3. Instalar dependencias

Requisitos:
- **Node.js 18 o superior**
- Una **API Key de Google AI Studio** (gratuita): https://aistudio.google.com/app/apikey

```bash
cd "Ejercicios/MinutIA — Asistente de informes de reunión"
npm install
```

## 4. Crear el archivo `.env`

Copia el archivo `.env.example` como `.env`:

**macOS / Linux**
```bash
cp .env.example .env
```

**Windows (PowerShell)**
```powershell
Copy-Item .env.example .env
```

## 5. Dónde poner la API Key de Google AI Studio

Abre `.env` y reemplaza `tu_api_key_aqui` por tu API Key real:

```
GEMINI_API_KEY=AIzaSy...tu_clave_real
GEMINI_MODEL=gemini-1.5-pro
PORT=3000
MAX_AUDIO_MB=25
```

> **Importante:** la API Key vive solo en el backend. Nunca se envía al navegador. El archivo `.env` está excluido de git mediante `.gitignore`.

## 6. Cómo elegir o modificar el modelo de Gemini

Cambia `GEMINI_MODEL` en `.env`. Modelos compatibles con audio:

| Modelo               | Calidad | Latencia | Coste |
|----------------------|---------|----------|-------|
| `gemini-1.5-pro`     | Alta    | Media    | $$    |
| `gemini-1.5-flash`   | Media   | Baja     | $     |
| `gemini-2.5-pro`     | Alta+   | Media    | $$$   |
| `gemini-2.5-flash`   | Media+  | Baja     | $     |

Reinicia el servidor después de cambiar la variable.

## 7. Ejecutar la app localmente

```bash
npm start
```

En la consola verás:
```
MinutIA listo en http://localhost:3000
Modelo: gemini-1.5-pro · Audio máx: 25 MB
```

Abre tu navegador en `http://localhost:3000`. Si todo está bien, el indicador de la barra superior mostrará un punto verde y el nombre del modelo activo.

Para desarrollo con recarga automática:
```bash
npm run dev
```

## 8. Cómo probarla con un audio corto

1. Graba un audio de 30–90 segundos con tu celular o computadora simulando una mini-reunión: menciona temas, asigna una tarea con responsable y plazo, y declara algún riesgo.
2. Arrástralo al recuadro "Arrastra tu audio aquí" o haz clic para seleccionarlo.
3. Pulsa el chip **"Minuta ejecutiva"** (rellena automáticamente la instrucción) o escribe la tuya.
4. Pulsa **"Generar informe"**.
5. Observa el pipeline visual: Audio cargado → Procesando → Analizando → Generando → Listo.
6. Revisa el informe, copia el correo o descarga el `.md`.

## 9. Qué hacer si falla la API

| Síntoma                                              | Causa probable                            | Solución                                                          |
|------------------------------------------------------|-------------------------------------------|-------------------------------------------------------------------|
| "Falta configurar la API Key en el servidor"         | `GEMINI_API_KEY` vacía                    | Edita `.env` y reinicia con `npm start`.                          |
| "La API Key parece inválida o sin permisos"          | Key incorrecta o sin permisos al modelo   | Genera una nueva en Google AI Studio.                             |
| "Cuota de Gemini excedida"                           | Límite del plan gratuito                  | Espera unos minutos o cambia a otro modelo (ej. `gemini-1.5-flash`). |
| "Gemini tardó demasiado"                             | Audio muy largo                           | Recorta el audio o usa un modelo más rápido (`flash`).            |
| "Formato no compatible"                              | Archivo no es audio                       | Usa mp3, wav, m4a, ogg o webm.                                    |
| "El audio supera el tamaño máximo"                   | > 25 MB                                   | Reduce calidad/duración o aumenta `MAX_AUDIO_MB` en `.env`.       |
| "Sin conexión" / "Backend OK" no aparece             | Servidor caído o puerto distinto          | Verifica que `npm start` esté corriendo y que `PORT` coincida.    |

## 10. Cómo modificar el prompt interno

El prompt se construye en [`server.js`](server.js) en la constante `REPORT_STRUCTURE` y la función `buildPrompt(userInstruction)`. Para cambiar la estructura del informe, las reglas (no inventar, "No indicado", etc.) o agregar nuevas secciones, edita esas dos piezas.

Si modificas las **secciones del informe** (cantidad, títulos), recuerda actualizar también:
- El array `SECTION_TITLES` en [`public/app.js`](public/app.js).
- El parser `splitSections()` en el mismo archivo, que asume secciones numeradas `## 1.`, `## 2.`, etc.

## 11. Cómo usar esta app como ejercicio de clase

MinutIA está construida con **Spec-Driven Development**: primero la especificación, luego el código. Sirve para enseñar:

1. **Cómo formular un problema antes de programar** (ver Fase 1 de la especificación).
2. **Cómo proteger una API Key** (vive en `.env`, jamás en el frontend).
3. **Cómo integrar audio multimodal** con Gemini usando `inlineData`.
4. **Cómo diseñar un dashboard premium** con HTML/CSS/JS vanilla (sin frameworks).
5. **Cómo iterar la app rápidamente** pidiendo cambios a Claude Code (nuevos chips, nuevas secciones, idiomas, persistencia).

### Desafíos sugeridos para los alumnos
- Agregar una sección "Métricas mencionadas" al informe.
- Permitir cambiar el idioma del informe (es / en).
- Agregar persistencia local con `localStorage` para recuperar la última minuta.
- Soportar múltiples audios concatenados en un mismo informe.
- Exportar a PDF en lugar de solo Markdown.

---

## Estructura del proyecto

```
Ejercicios/MinutIA — Asistente de informes de reunión/
├── public/
│   ├── index.html       # Estructura de la página
│   ├── styles.css       # Tema oscuro premium
│   └── app.js           # Lógica frontend (estado, dropzone, render, acciones)
├── server.js            # Backend Express + cliente Gemini
├── package.json
├── .env.example         # Plantilla de variables de entorno
├── .gitignore
└── README.md
```

## Endpoints

| Método | Ruta             | Descripción                                                    |
|--------|------------------|----------------------------------------------------------------|
| GET    | `/api/health`    | Devuelve `{ ok, model, hasKey, maxAudioMb }`. Sin la API Key.  |
| POST   | `/api/generate`  | Recibe `multipart/form-data` con `audio` e `instruction`.      |
| GET    | `/`              | Sirve el frontend estático (`public/`).                        |

## Seguridad

- La API Key se lee solo desde `process.env.GEMINI_API_KEY` en el backend.
- El frontend nunca recibe la key ni metadata sensible.
- `multer` usa storage en memoria; el audio no se persiste en disco.
- `.env` está en `.gitignore`.
- CORS restringido a `http://localhost:<PORT>`.

## Licencia

Proyecto educativo. Úsalo libremente como base para tus propias herramientas.
