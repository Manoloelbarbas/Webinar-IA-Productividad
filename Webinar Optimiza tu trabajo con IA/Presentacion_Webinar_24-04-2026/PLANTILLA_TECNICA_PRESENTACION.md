# Plantilla Técnica de Presentación HTML Single-File

> Receta técnica completa para reproducir el formato funcional de una presentación HTML single-file (transiciones, navegación, puntero láser, exportación PDF, animaciones).
> Esta plantilla es **autocontenida**: una IA leyéndola puede generar una presentación nueva sobre cualquier tema sin acceso al HTML de referencia.
> Se complementa con dos documentos separados que aporta el usuario: **paleta de colores y tipografías** y **descripción de imágenes**.

**Última sincronización con HTML de referencia:** 2026-04-26
**HTML de referencia:** `Webinar_Optimiza_tu_trabajo_con_IA.html`

---

## Tabla de contenidos

0. [Instrucciones para la IA generadora](#0-instrucciones-para-la-ia-generadora)
1. [Arquitectura general](#1-arquitectura-general)
2. [Esqueleto HTML base](#2-esqueleto-html-base)
3. [CSS base del sistema de slides](#3-css-base-del-sistema-de-slides)
4. [Variantes de slide reutilizables](#4-variantes-de-slide-reutilizables)
5. [Animaciones y keyframes](#5-animaciones-y-keyframes)
6. [UI fija de presentación](#6-ui-fija-de-presentacion)
7. [JavaScript de navegación y láser](#7-javascript-de-navegacion-y-laser)
8. [Exportación a PDF](#8-exportacion-a-pdf)
9. [Chart.js (gráficos en slides)](#9-chartjs-graficos-en-slides)
10. [Integración con documentos complementarios](#10-integracion-con-documentos-complementarios)
11. [Placeholders y convenciones](#11-placeholders-y-convenciones)
12. [Checklist final de verificación](#12-checklist-final-de-verificacion)

---

## 0. Instrucciones para la IA generadora

Cuando recibas este documento junto a un encargo del tipo *"genera una presentación con este formato sobre el tema X"*, sigue estas reglas de forma estricta:

1. **HTML single-file**: produce **un único archivo `.html`** con `<style>` y `<script>` 100 % embebidos. No referencias archivos externos salvo los CDNs documentados en la sección 2.
2. **Reemplaza todos los `{{PLACEHOLDERS}}`** por el contenido del usuario. La lista exhaustiva está en la sección 11.
3. **Documentos complementarios**: si el usuario adjunta un documento de paleta/tipografías o de imágenes, **cárgalos antes** y aplica sus tokens. Donde esta plantilla diga `/* Ver doc paleta */`, sustituye por el valor concreto. Donde diga `{{IMG_*}}`, usa la ruta o base64 que indique el doc de imágenes.
4. **No modifiques los IDs críticos**: `laser-pointer`, `laser-dot`, `progress-bar`, `prev-arrow`, `next-arrow`, `slide-counter`, `pdf-current`, `pdf-all`, `pdf-actions`, `pdf-export-status`. El JS depende de ellos.
5. **No modifiques los IDs de slides**: deben ser `slide-1`, `slide-2`, ..., `slide-N` en orden secuencial. Si necesitas un alias semántico (por ejemplo `slide-summary`), añádelo como **clase**, no como ID.
6. **Mantén la transición**: `0.6s cubic-bezier(0.4, 0, 0.2, 1)` sobre `transform` y `opacity`. La función `goToSlide` espera 650 ms para limpiar; cualquier cambio rompería la sincronía.
7. **La primera slide siempre tiene la clase `active`**. El resto **no**.
8. **Aspect ratio de imágenes**: por defecto `4 / 5` (vertical) salvo que el doc de imágenes indique otra cosa.
9. **Idioma**: `<html lang="{{LANG}}">` (por defecto `es`).
10. **Fuentes**: Inter (300-900) para body, Space Grotesk (400-700) para headings y elementos UI. Carga vía Google Fonts (sección 2).
11. **Cantidad de slides**: respeta exactamente la cantidad pedida por el usuario. Si no la especifica, asume 10.
12. **Si pides PDF o gráficos**: están **siempre incluidos** en esta plantilla. Carga los CDNs aunque la presentación no use Chart.js — el coste es despreciable y el código asume que están disponibles.

---

## 1. Arquitectura general

### Modelo conceptual

Cada slide es una **capa absoluta** que ocupa el viewport completo (`100vw × 100vh`). En cualquier momento solo una capa tiene la clase `active` (visible, opacity 1, `translateX(0)`). Las demás están ocultas en `translateX(100%)` (a la derecha) o `translateX(-100%)` (a la izquierda, si ya pasaron). Al navegar:

- La capa saliente recibe `exit-left` (next) o `exit-right` (prev) → se desliza fuera.
- La capa entrante pierde su `translateX(±100%)` → entra desde el lado correcto.
- Ambas tienen la clase `animating` durante la transición (650 ms) que aplica el `cubic-bezier`.

### Árbol DOM raíz

```
<html lang="es">
└── <head>
│   ├── <meta>, <title>
│   ├── <script src="chart.js">          (CDN)
│   ├── <script src="html2canvas">       (CDN, defer)
│   ├── <script src="jspdf">             (CDN, defer)
│   └── <style>...</style>               (CSS embebido)
└── <body>
    ├── <div id="laser-pointer">         (puntero láser anillo)
    ├── <div id="laser-dot">             (puntero láser punto)
    ├── <div id="progress-bar">          (barra superior)
    ├── <button id="prev-arrow">         (flecha izquierda)
    ├── <button id="next-arrow">         (flecha derecha)
    ├── <div id="pdf-actions">           (botones PDF)
    ├── <div id="pdf-export-status">     (mensajes de estado)
    ├── <div id="slide-counter">         (contador "1 / N")
    ├── <section class="slide active" id="slide-1">  (primera slide)
    ├── <section class="slide" id="slide-2">
    ├── ...
    ├── <section class="slide" id="slide-N">
    └── <script>...</script>             (JS embebido)
```

---

## 2. Esqueleto HTML base

```html
<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITULO_PRESENTACION}}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js" defer></script>
<style>
/* === Reset === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

/* === Google Fonts === */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

/* Aquí va el resto del CSS de las secciones 3 a 6 */
</style>
</head>
<body>

<div id="laser-pointer"></div>
<div id="laser-dot"></div>

<div id="progress-bar"></div>

<button class="nav-arrow" id="prev-arrow" title="Anterior (←)">‹</button>
<button class="nav-arrow" id="next-arrow" title="Siguiente (→)">›</button>

<div class="pdf-actions" id="pdf-actions" aria-label="Descargas PDF">
  <button class="pdf-action" id="pdf-current" type="button" title="Descargar lámina actual en PDF">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M14 2v5h5M12 11v6m0 0 3-3m-3 3-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Lámina</span>
  </button>
  <button class="pdf-action" id="pdf-all" type="button" title="Descargar presentación completa en PDF">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 12v5m0 0 2-2m-2 2-2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Completa</span>
  </button>
</div>

<div class="pdf-export-status" id="pdf-export-status" role="status" aria-live="polite"></div>

<div id="slide-counter">1 / {{N_SLIDES}}</div>

<!-- Primera slide: SIEMPRE con la clase "active" -->
<section class="slide active slide-hero" id="slide-1">
  {{CONTENIDO_PORTADA}}
</section>

<!-- Resto de slides: SIN "active" -->
<section class="slide slide-dark" id="slide-2">{{CONTENIDO_SLIDE_2}}</section>
<section class="slide slide-dark" id="slide-3">{{CONTENIDO_SLIDE_3}}</section>
<!-- ... hasta slide-N ... -->

<script>
/* Aquí va el JS de las secciones 7 y 8 */
</script>
</body>
</html>
```

---

## 3. CSS base del sistema de slides

### 3.1 Variables raíz

```css
:root {
  /* === Tokens estructurales (esta plantilla) === */
  --slide-safe-x: clamp(22px, 1.8vw, 48px);
  --slide-content-max: min(96vw, 1820px);
  --slide-grid-max: min(94vw, 1720px);
  --slide-copy-max: min(90vw, 1480px);

  /* === Tokens de Speaker Cards === */
  --speaker-name-size: clamp(44px, 4.2vw, 72px);
  --speaker-role-size: clamp(12px, 0.95vw, 16px);
  --speaker-list-size: clamp(17px, 1.18vw, 22px);
  --speaker-photo-width: clamp(360px, 27vw, 470px);
  --speaker-photo-radius: 30px;

  /* === Tokens cromáticos: ver doc paleta === */
  /* --primary, --primary-dark, --accent, --accent2,
     --dark, --darker, --surface, --surface2,
     --text, --text-muted, --highlight,
     --gradient1, --gradient2, --gradient3, --gradient-brand */
}
```

### 3.2 Reset HTML/body

```css
html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  background: var(--darker);          /* Ver doc paleta */
  color: var(--text);                 /* Ver doc paleta */
  cursor: none;                       /* Cursor oculto: lo reemplaza el láser */
}
```

### 3.3 Slide base y estados

```css
/* === Slide base === */
.slide {
  position: absolute;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: clamp(42px, 4.8vh, 62px) var(--slide-safe-x) clamp(52px, 6vh, 74px);
  opacity: 0;
  transform: translateX(100%);
  transition: none;
  pointer-events: none;
  overflow-y: auto;
}

/* === Slide activa (visible) === */
.slide.active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: all;
  z-index: 2;
}

/* === Slide saliendo hacia la izquierda (next) === */
.slide.exit-left {
  opacity: 0;
  transform: translateX(-100%);
  z-index: 1;
}

/* === Slide saliendo hacia la derecha (prev) === */
.slide.exit-right {
  opacity: 0;
  transform: translateX(100%);
  z-index: 1;
}

/* === Estado durante la transición (aplica el easing) === */
.slide.animating {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3.4 Restricciones de ancho de contenido

```css
/* Limita el ancho de los bloques semánticos a `--slide-content-max` y `--slide-copy-max`. */
/* Las slides 1 (hero) y la última (cierre) suelen ir full-bleed; ajusta si tu primera/última es diferente. */
.slide:not(#slide-1):not(#slide-{{N_SLIDES}}) > .slide-title {
  width: min(100%, var(--slide-content-max));
  max-width: min(var(--slide-content-max), calc(100vw - (var(--slide-safe-x) * 2))) !important;
}

.slide:not(#slide-1):not(#slide-{{N_SLIDES}}) > .slide-subtitle,
.slide:not(#slide-1):not(#slide-{{N_SLIDES}}) > .bullet-list,
.slide:not(#slide-1):not(#slide-{{N_SLIDES}}) > .big-number-label,
.slide:not(#slide-1):not(#slide-{{N_SLIDES}}) > .visual-phrase {
  width: min(100%, var(--slide-copy-max));
  max-width: var(--slide-copy-max) !important;
}
```

---

## 4. Variantes de slide reutilizables

Cada variante se aplica **además** de `.slide`, como clase modificadora.

### 4.1 `.slide-hero` — portada

Layout split (1.1fr / 0.9fr) con título grande y subtítulo. Suele tener fondo oscuro con gradientes radiales y un canvas decorativo opcional.

```html
<section class="slide active slide-hero" id="slide-1">
  <div class="slide-hero__bg"></div>
  <div class="cover-brand-row">
    <img class="cover-logo" src="{{IMG_LOGO}}" alt="{{ALT_LOGO}}">
    <div class="cover-brand-sep"></div>
    <div class="cover-eyebrow">
      <span class="cover-eyebrow__dot"></span>
      <span>{{EYEBROW_TEXTO}}</span>
    </div>
  </div>
  <div class="cover-divider"></div>
  <h1 class="cover-title">
    <span class="cover-title__top">{{TITULO_LINEA_1}}</span>
    <span class="cover-title__line">{{TITULO_LINEA_2}}</span>
  </h1>
  <p class="cover-subtitle">{{SUBTITULO_PORTADA}}</p>
</section>
```

```css
#slide-1 {
  padding: 0;
  align-items: stretch;
  justify-content: stretch;
  background: #050510;                 /* Ver doc paleta */
  text-align: left;
  isolation: isolate;
}
#slide-1 .cover-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(40px, 9.2vw, 150px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.05em;
  color: #ffffff;
}
.cover-divider {
  width: 140px; height: 4px; border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), transparent);  /* Ver doc paleta */
  transform-origin: left center;
  animation: coverDivider 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}
.cover-eyebrow__dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent);                                       /* Ver doc paleta */
  animation: coverPulse 2s ease-in-out infinite;
}
```

### 4.2 `.slide-dark` y `.slide-accent` — fondos

- `.slide-dark`: fondo oscuro (mayoría de slides). Contraste alto, texto claro.
- `.slide-accent`: fondo con color de acento. Para slides de énfasis (citas, datos clave).

```html
<section class="slide slide-dark" id="slide-2">
  <h2 class="slide-title">{{TITULO_SLIDE}}</h2>
  <p class="slide-subtitle">{{SUBTITULO_SLIDE}}</p>
  <ul class="bullet-list">
    <li>{{BULLET_1}}</li>
    <li>{{BULLET_2}}</li>
  </ul>
</section>

<section class="slide slide-accent" id="slide-3">
  <div class="big-number">{{NUMERO_DESTACADO}}</div>
  <p class="big-number-label">{{ETIQUETA_NUMERO}}</p>
</section>
```

```css
.slide-dark { background: var(--darker); color: var(--text); }      /* Ver doc paleta */
.slide-accent {
  background: var(--gradient-brand);                                 /* Ver doc paleta */
  color: #fff;
}
```

### 4.3 `.exercise-slide.exercise-slide--N` — slides numeradas de ejercicio

Layout uniforme con número grande visible, título de ejercicio y descripción. Útil para serie de prácticas o pasos.

```html
<section class="slide slide-dark exercise-slide exercise-slide--01" id="slide-8">
  <div class="exercise-number">01</div>
  <h2 class="slide-title">{{TITULO_EJERCICIO}}</h2>
  <p class="slide-subtitle">{{INSTRUCCION_EJERCICIO}}</p>
</section>
```

### 4.4 `.speaker-card-slide.speaker-card-slide--{nombre}` — presentación de persona

Layout 2 columnas: foto vertical (aspect-ratio 4:5) a un lado, nombre + rol + bullets al otro.

```html
<section class="slide slide-dark speaker-card-slide speaker-card-slide--{{NOMBRE_KEY}}" id="slide-speaker-{{NOMBRE_KEY}}">
  <div class="speaker-bg"></div>
  <div class="speaker-photo" style="background-image: url('{{IMG_FOTO_PERSONA}}');"></div>
  <div class="speaker-copy">
    <p class="speaker-role">{{ROL}}</p>
    <h2 class="speaker-name">{{NOMBRE}}</h2>
    <ul class="speaker-list">
      <li>{{LOGRO_1}}</li>
      <li>{{LOGRO_2}}</li>
    </ul>
  </div>
</section>
```

```css
.speaker-card-slide {
  --speaker-photo-position: center center;
  justify-content: center;
  overflow: hidden;
  background: #050510;                                               /* Ver doc paleta */
}
.speaker-photo {
  width: var(--speaker-photo-width);
  aspect-ratio: 4 / 5;
  border-radius: var(--speaker-photo-radius);
  background-size: cover;
  background-position: var(--speaker-photo-position);
}
.speaker-name { font-size: var(--speaker-name-size); font-weight: 800; }
.speaker-role {
  font-size: var(--speaker-role-size);
  font-family: 'Space Grotesk', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.32em;
}
```

### 4.5 `.summary-slide` — slide de resumen / cierre temático

Tres "carriles" o columnas con efecto de barrido de luz y scan animado. Usado al final o como recap intermedio.

```html
<section class="slide slide-dark summary-slide" id="slide-summary">
  <div class="summary-scan"></div>
  <h2 class="slide-title">{{TITULO_RESUMEN}}</h2>
  <div class="summary-lanes">
    <div class="summary-lane">
      <h3>{{TEMA_1}}</h3>
      <ul class="summary-topic-list">
        <li>{{ITEM_1_1}}</li>
        <li>{{ITEM_1_2}}</li>
      </ul>
    </div>
    <div class="summary-lane">
      <h3>{{TEMA_2}}</h3>
      <ul class="summary-topic-list">
        <li>{{ITEM_2_1}}</li>
      </ul>
    </div>
    <div class="summary-lane">
      <h3>{{TEMA_3}}</h3>
      <ul class="summary-topic-list">
        <li>{{ITEM_3_1}}</li>
      </ul>
    </div>
  </div>
</section>
```

### 4.6 Otras variantes específicas (opcionales)

| Clase | Uso | Cuándo aplicar |
|-------|-----|----------------|
| `.evolution-slide` | Línea de tiempo o evolución de un concepto | Para slides con timeline |
| `.premium-models-slide` | Comparativa de modelos/planes | Para tablas comparativas con cards |
| `.s12-bridge-slide` | Slide-puente entre secciones | Para transición de tema |
| `.workshop-start-slide` | Apertura de bloque práctico | Antes de las exercise-slides |

### 4.7 Layouts internos reutilizables

| Clase | Descripción | Estructura |
|-------|-------------|------------|
| `.split-hero` | Grid 2 columnas (1.1fr / 0.9fr): contenido a la izquierda, visual a la derecha | `display: grid; grid-template-columns: 1.1fr 0.9fr;` |
| `.bullet-list` | Lista de viñetas con animación de entrada secuencial | `<ul>` + `<li class="fade-in fade-in-delay-N">` |
| `.big-number` | Número gigante destacado (estadística clave) | `font-size: clamp(80px, 12vw, 220px); font-weight: 800;` |
| `.slide-title` | Título principal de slide (h1/h2) | `font-family: 'Space Grotesk'; font-weight: 700-800;` |
| `.slide-subtitle` | Subtítulo o descripción debajo del título | `font-family: 'Inter'; color: var(--text-muted);` |
| `.visual-phrase` | Frase corta en cursiva como cita visual | `font-style: italic; color: var(--accent);` |
| `.links-section` | Bloque de enlaces externos al pie de slide | `<div class="links-section"><a href="...">...</a></div>` |

---

## 5. Animaciones y keyframes

### 5.1 Sistema fade-in con delays

```css
.fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
.fade-in-delay-1 { transition-delay: 0.1s; }
.fade-in-delay-2 { transition-delay: 0.2s; }
.fade-in-delay-3 { transition-delay: 0.3s; }
.fade-in-delay-4 { transition-delay: 0.4s; }
.fade-in-delay-5 { transition-delay: 0.5s; }
.fade-in-delay-6 { transition-delay: 0.6s; }
```

**Cómo se activa:** el JS añade la clase `.visible` cuando la slide se vuelve activa (función `triggerSlideAnimations`, sección 7).

**Uso recomendado:**

```html
<h2 class="slide-title fade-in">{{TITULO}}</h2>
<p class="slide-subtitle fade-in fade-in-delay-1">{{SUBTITULO}}</p>
<ul class="bullet-list">
  <li class="fade-in fade-in-delay-2">{{ITEM_1}}</li>
  <li class="fade-in fade-in-delay-3">{{ITEM_2}}</li>
  <li class="fade-in fade-in-delay-4">{{ITEM_3}}</li>
</ul>
```

### 5.2 Keyframes especiales

```css
/* Pulso de un punto de acento (eyebrow, indicador) */
@keyframes coverPulse {
  0%, 100% { transform: scale(1);    opacity: 1;    }
  50%      { transform: scale(1.35); opacity: 0.55; }
}

/* Gradiente animado del título de portada */
@keyframes coverGradientShift {
  0%   { filter: drop-shadow(0 0 22px rgba(0,178,227,0.25)) brightness(1);    }
  100% { filter: drop-shadow(0 0 38px rgba(0,178,227,0.55)) brightness(1.12); }
}

/* Subrayado animado del título (crece desde 0 hasta 42% del ancho) */
@keyframes coverUnderline {
  to { width: 42%; }
}

/* Divider que aparece estirándose desde la izquierda */
@keyframes coverDivider {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}

/* Órbita rotando lentamente (decoración de portada) */
@keyframes slide1Orbit {
  0%   { transform: rotate(0deg)   scale(1);    }
  50%  { transform: rotate(180deg) scale(1.04); }
  100% { transform: rotate(360deg) scale(1);    }
}

/* Barrido de luz en summary-slide (de izquierda a derecha) */
@keyframes summaryLightSweep {
  0%   { transform: translateX(-100%); opacity: 0;   }
  50%  { opacity: 0.6; }
  100% { transform: translateX(100%);  opacity: 0;   }
}

/* Línea de scan vertical en summary-slide */
@keyframes summaryScan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%);  }
}
```

### 5.3 Cuándo aplicar cada animación

| Animación | Slide objetivo | Elemento | Duración |
|-----------|----------------|----------|----------|
| `coverPulse` | `.slide-hero` | `.cover-eyebrow__dot` | 2s infinite |
| `coverGradientShift` | `.slide-hero` | `.cover-title__line` | 6s infinite alternate |
| `coverUnderline` | `.slide-hero` | `.cover-title__line::after` | 1.6s, delay 0.9s, una vez |
| `coverDivider` | `.slide-hero` | `.cover-divider` | 1.2s, delay 0.3s, una vez |
| `slide1Orbit` | `.slide-hero` | `.slide-hero__orbits > *` | 16-28s linear infinite |
| `summaryLightSweep` | `.summary-slide` | `.summary-lane::before` | 3-5s |
| `summaryScan` | `.summary-slide` | `.summary-scan` | 4-6s linear infinite |
| `.fade-in` (genérico) | Cualquier slide | Cualquier elemento | 0.7s al activarse la slide |

---

## 6. UI fija de presentación

### 6.1 Barra de progreso

```css
#progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: var(--gradient1);                             /* Ver doc paleta */
  z-index: 100;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(42,87,210,0.5);                 /* Ver doc paleta */
}
```

El JS actualiza `progressBar.style.width = ((currentSlide + 1) / totalSlides * 100) + '%'`.

### 6.2 Flechas de navegación

```css
.nav-arrow {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 50px; height: 50px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.5);
  font-size: 20px;
  display: flex; align-items: center; justify-content: center;
  cursor: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}
.nav-arrow:hover {
  background: rgba(42,87,210,0.3);                          /* Ver doc paleta */
  border-color: var(--primary);                             /* Ver doc paleta */
  color: #fff;
  box-shadow: 0 0 20px rgba(42,87,210,0.3);                 /* Ver doc paleta */
}
.nav-arrow.disabled {
  opacity: 0.2;
  pointer-events: none;
}
#prev-arrow { left: 20px; }
#next-arrow { right: 20px; }
```

### 6.3 Contador de slides

```css
#slide-counter {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--text-muted);                                 /* Ver doc paleta */
  z-index: 100;
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: 2px;
}
```

El JS actualiza `counter.textContent = (currentSlide + 1) + ' / ' + totalSlides`.

### 6.4 Puntero láser doble

```css
/* Anillo exterior con glow rojo */
#laser-pointer {
  position: fixed;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff0000 0%, #ff0000 40%, rgba(255,0,0,0.4) 70%, transparent 100%);
  box-shadow: 0 0 8px 3px rgba(255,0,0,0.6),
              0 0 20px 6px rgba(255,0,0,0.2);
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  transition: opacity 0.15s;
  mix-blend-mode: screen;
}

/* Punto blanco central */
#laser-dot {
  position: fixed;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
  z-index: 10001;
  transform: translate(-50%, -50%);
}
```

El JS asocia `mousemove` a ambos para actualizar `left`/`top`, y `mouseenter`/`mouseleave` para `opacity`.

### 6.5 Botones de exportación PDF

```css
.pdf-actions {
  position: fixed;
  top: 18px; right: 20px;
  z-index: 120;
  display: flex; align-items: center; gap: 8px;
}
.pdf-action {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 9px 12px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  background: rgba(7, 12, 24, 0.68);                        /* Ver doc paleta */
  color: rgba(232,238,245,0.82);                            /* Ver doc paleta */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 16px 34px rgba(0,0,0,0.24),
              inset 0 1px 0 rgba(255,255,255,0.08);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  cursor: none;
  transition: transform 0.22s ease, color 0.22s ease, border-color 0.22s ease,
              background 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
}
.pdf-action svg { width: 16px; height: 16px; flex: 0 0 auto; }
.pdf-action:hover, .pdf-action:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(0,178,227,0.5);                        /* Ver doc paleta */
  background: rgba(0,178,227,0.12);                         /* Ver doc paleta */
  color: #fff;
  outline: none;
}
.pdf-action:disabled { opacity: 0.45; transform: none; pointer-events: none; }

.pdf-export-status {
  position: fixed;
  top: 68px; right: 20px;
  z-index: 130;
  max-width: min(360px, calc(100vw - 40px));
  padding: 11px 14px;
  border: 1px solid rgba(0,178,227,0.22);                   /* Ver doc paleta */
  border-radius: 14px;
  background: rgba(6, 10, 22, 0.86);                        /* Ver doc paleta */
  color: rgba(245,248,255,0.9);                             /* Ver doc paleta */
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-size: 13px; line-height: 1.35;
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.pdf-export-status.is-visible { opacity: 1; transform: translateY(0); }

/* Ocultar UI durante exportación PDF para no contaminar el render */
body.pdf-exporting .pdf-actions,
body.pdf-exporting .nav-arrow,
body.pdf-exporting #slide-counter,
body.pdf-exporting #progress-bar,
body.pdf-exporting #laser-pointer,
body.pdf-exporting #laser-dot {
  visibility: hidden;
}
```

---

## 7. JavaScript de navegación y láser

Todo el JS va dentro de un IIFE al final del `<body>` para evitar contaminar el global.

```javascript
(function() {
  // ===== LASER POINTER =====
  const laser = document.getElementById('laser-pointer');
  const laserDot = document.getElementById('laser-dot');
  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    laser.style.left = mouseX + 'px';
    laser.style.top  = mouseY + 'px';
    laserDot.style.left = mouseX + 'px';
    laserDot.style.top  = mouseY + 'px';
  });
  document.addEventListener('mouseenter', () => {
    laser.style.opacity = '1';
    laserDot.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    laser.style.opacity = '0';
    laserDot.style.opacity = '0';
  });

  // ===== SLIDE NAVIGATION =====
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  let currentSlide = 0;
  let isAnimating = false;
  let isExporting = false;

  const prevArrow   = document.getElementById('prev-arrow');
  const nextArrow   = document.getElementById('next-arrow');
  const counter     = document.getElementById('slide-counter');
  const progressBar = document.getElementById('progress-bar');

  function updateUI() {
    counter.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    progressBar.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
    prevArrow.classList.toggle('disabled', currentSlide === 0);
    nextArrow.classList.toggle('disabled', currentSlide === totalSlides - 1);
  }

  function triggerSlideAnimations(index) {
    const slide = slides[index];
    // Marcar elementos .fade-in como visibles para activar transiciones internas
    const fadeEls = slide.querySelectorAll('.fade-in');
    fadeEls.forEach(el => el.classList.remove('visible'));
    // Forzar reflow para reiniciar las transiciones
    void slide.offsetHeight;
    requestAnimationFrame(() => {
      fadeEls.forEach(el => el.classList.add('visible'));
    });
  }

  function goToSlide(index, direction) {
    if (isExporting || isAnimating || index < 0 || index >= totalSlides || index === currentSlide) return;
    isAnimating = true;

    const oldSlide = slides[currentSlide];
    const newSlide = slides[index];

    // Marca ambas como animating (aplica el cubic-bezier)
    oldSlide.classList.add('animating');
    newSlide.classList.add('animating');

    // Posiciona la nueva slide fuera de pantalla (en el lado correcto)
    newSlide.style.transition = 'none';
    newSlide.style.transform  = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
    newSlide.style.opacity    = '0';
    newSlide.classList.add('active');

    // Force reflow (necesario para que el browser registre la posición inicial)
    newSlide.offsetHeight;

    // Reactiva la transición CSS y dispara la animación
    newSlide.style.transition = '';
    requestAnimationFrame(() => {
      oldSlide.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';
      oldSlide.style.opacity   = '0';
      newSlide.style.transform = 'translateX(0)';
      newSlide.style.opacity   = '1';
    });

    // Limpieza al terminar la transición
    setTimeout(() => {
      oldSlide.classList.remove('active', 'animating');
      oldSlide.style.transform = '';
      oldSlide.style.opacity   = '';
      oldSlide.style.transition = '';
      newSlide.classList.remove('animating');
      newSlide.style.transform = '';
      newSlide.style.opacity   = '';
      newSlide.style.transition = '';

      currentSlide = index;
      updateUI();
      triggerSlideAnimations(currentSlide);
      isAnimating = false;
    }, 650);
  }

  function nextSlide() { goToSlide(currentSlide + 1, 'next'); }
  function prevSlide() { goToSlide(currentSlide - 1, 'prev'); }

  // Teclado: ← / ↑ retroceden, → / ↓ avanzan
  document.addEventListener('keydown', (e) => {
    if (isExporting) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextSlide(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); prevSlide(); }
  });

  // Click en flechas
  prevArrow.addEventListener('click', prevSlide);
  nextArrow.addEventListener('click', nextSlide);

  // ===== INIT =====
  updateUI();
  triggerSlideAnimations(0);

  // (continúa en sección 8: PDF export) ...
})();
```

---

## 8. Exportación a PDF

Continúa **dentro del mismo IIFE** que la sección 7. Usa `html2canvas` (rasteriza cada slide) + `jsPDF` (compone el documento).

```javascript
  // ===== PDF EXPORT =====
  const pdfCurrentButton = document.getElementById('pdf-current');
  const pdfAllButton     = document.getElementById('pdf-all');
  const pdfExportStatus  = document.getElementById('pdf-export-status');
  let pdfStatusTimer = null;

  function getPdfDateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function setPdfStatus(message, autoHideDelay) {
    if (!pdfExportStatus) return;
    if (pdfStatusTimer !== null) {
      clearTimeout(pdfStatusTimer);
      pdfStatusTimer = null;
    }
    pdfExportStatus.textContent = message;
    pdfExportStatus.classList.add('is-visible');
    if (autoHideDelay) {
      pdfStatusTimer = setTimeout(() => {
        pdfExportStatus.classList.remove('is-visible');
        pdfStatusTimer = null;
      }, autoHideDelay);
    }
  }

  function setPdfBusy(busy) {
    isExporting = busy;
    document.body.classList.toggle('pdf-exporting', busy);
    if (pdfCurrentButton) pdfCurrentButton.disabled = busy;
    if (pdfAllButton)     pdfAllButton.disabled     = busy;
  }

  function getPdfDependencies() {
    if (typeof window.html2canvas !== 'function' || !window.jspdf || !window.jspdf.jsPDF) {
      setPdfStatus('No se pudieron cargar las librerías PDF. Revisa la conexión y recarga.', 5200);
      return null;
    }
    return { html2canvas: window.html2canvas, jsPDF: window.jspdf.jsPDF };
  }

  async function waitForExportAssets() {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (err) { /* no bloquear */ }
    }
  }

  async function captureSlideCanvas(slide, mode, dependencies) {
    // Activa la slide objetivo si no es la actual (necesario para que html2canvas la rasterice)
    const wasActive = slide.classList.contains('active');
    if (!wasActive) {
      slides.forEach(s => s.classList.remove('active'));
      slide.classList.add('active');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    const canvas = await dependencies.html2canvas(slide, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false
    });
    if (!wasActive) {
      slide.classList.remove('active');
      slides[currentSlide].classList.add('active');
    }
    return canvas;
  }

  function createPdfDocument(canvas, dependencies) {
    const pageWidth  = 960;
    const pageHeight = Math.round(pageWidth * (canvas.height / canvas.width));
    const orientation = pageWidth >= pageHeight ? 'landscape' : 'portrait';
    const pdf = new dependencies.jsPDF({
      orientation,
      unit: 'pt',
      format: [pageWidth, pageHeight],
      compress: true
    });
    return { pdf, pageWidth, pageHeight, orientation };
  }

  function addCanvasPage(pdfState, canvas, isFirstPage) {
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    if (!isFirstPage) {
      pdfState.pdf.addPage([pdfState.pageWidth, pdfState.pageHeight], pdfState.orientation);
    }
    pdfState.pdf.addImage(imageData, 'JPEG', 0, 0, pdfState.pageWidth, pdfState.pageHeight);
    canvas.width = 1;
    canvas.height = 1;
  }

  async function downloadCurrentSlidePdf() {
    if (isExporting) return;
    const dependencies = getPdfDependencies();
    if (!dependencies) return;
    const slideIndex = currentSlide;
    const slide = slides[slideIndex];
    try {
      setPdfBusy(true);
      setPdfStatus('Preparando PDF de la lámina actual...');
      await waitForExportAssets();
      const canvas   = await captureSlideCanvas(slide, 'current', dependencies);
      const pdfState = createPdfDocument(canvas, dependencies);
      addCanvasPage(pdfState, canvas, true);
      pdfState.pdf.save('{{NOMBRE_PRESENTACION_KEBAB}}-lamina-' + String(slideIndex + 1).padStart(2, '0') + '-' + getPdfDateStamp() + '.pdf');
      setPdfStatus('PDF de la lámina descargado.', 3200);
    } catch (err) {
      console.error('PDF current slide export failed:', err);
      setPdfStatus('No se pudo generar el PDF de la lámina. Intenta nuevamente.', 5200);
    } finally {
      setPdfBusy(false);
    }
  }

  async function downloadAllSlidesPdf() {
    if (isExporting) return;
    const dependencies = getPdfDependencies();
    if (!dependencies) return;
    let pdfState = null;
    try {
      setPdfBusy(true);
      await waitForExportAssets();
      for (let i = 0; i < slides.length; i += 1) {
        const slide = slides[i];
        setPdfStatus('Generando PDF completo: lámina ' + (i + 1) + ' de ' + totalSlides + '...');
        const canvas = await captureSlideCanvas(slide, 'deck', dependencies);
        if (!pdfState) pdfState = createPdfDocument(canvas, dependencies);
        addCanvasPage(pdfState, canvas, i === 0);
      }
      if (pdfState) {
        pdfState.pdf.save('{{NOMBRE_PRESENTACION_KEBAB}}-presentacion-completa-' + getPdfDateStamp() + '.pdf');
      }
      setPdfStatus('PDF completo descargado.', 3600);
    } catch (err) {
      console.error('PDF deck export failed:', err);
      setPdfStatus('No se pudo generar el PDF completo. Intenta nuevamente.', 5600);
    } finally {
      setPdfBusy(false);
    }
  }

  if (pdfCurrentButton) pdfCurrentButton.addEventListener('click', downloadCurrentSlidePdf);
  if (pdfAllButton)     pdfAllButton.addEventListener('click',     downloadAllSlidesPdf);
```

**Notas de implementación:**

- El `setPdfBusy(true)` añade `body.pdf-exporting`, que oculta UI fija (flechas, contador, láser) gracias al CSS de la sección 6.5. Sin esto, los controles aparecerían capturados en el PDF.
- `captureSlideCanvas` activa temporalmente la slide objetivo antes de rasterizarla, y luego restaura la slide original. Esto permite exportar todas las láminas sin cambiar la posición visible del usuario.
- `scale: 2` en html2canvas duplica la resolución para PDF nítido a costa de tiempo de render.
- Sustituye `{{NOMBRE_PRESENTACION_KEBAB}}` por un slug del título (ej. `desafia-webinar`).

---

## 9. Chart.js (gráficos en slides)

Chart.js está cargado vía CDN en la sección 2 (sin `defer`) por lo que está disponible inmediatamente.

### Patrón de uso

```html
<section class="slide slide-dark" id="slide-{{N}}">
  <h2 class="slide-title">{{TITULO_GRAFICO}}</h2>
  <div class="chart-wrapper" style="width: min(80vw, 900px); height: 60vh;">
    <canvas id="chart-{{ID_GRAFICO}}"></canvas>
  </div>
</section>
```

### Inicialización (al final del IIFE, después de la navegación)

```javascript
  // ===== CHARTS =====
  const ctxExample = document.getElementById('chart-{{ID_GRAFICO}}');
  if (ctxExample) {
    new Chart(ctxExample, {
      type: 'bar',  // o 'line', 'pie', 'doughnut', 'radar', etc.
      data: {
        labels: {{LABELS_GRAFICO}},
        datasets: [{
          label: '{{LABEL_DATASET}}',
          data: {{DATOS_GRAFICO}},
          backgroundColor: 'var(--primary)',  /* Ver doc paleta — usar variable o color directo */
          borderColor: 'var(--accent)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e8e8f0' } }   /* Ver doc paleta */
        },
        scales: {
          x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.08)' } }
        }
      }
    });
  }
```

**Importante:** Chart.js no acepta `var(--token)` directamente en `backgroundColor`. Resuélvelo a un color real con `getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()` o pasa el hex directo desde el doc de paleta.

---

## 10. Integración con documentos complementarios

### 10.1 Documento de paleta y tipografías

El doc de paleta debe definir los valores que esta plantilla referencia como `/* Ver doc paleta */`. Mapeo recomendado:

| Si el doc paleta define… | …rellena en esta plantilla |
|---------------------------|----------------------------|
| Color primario | `--primary` en `:root` |
| Color primario oscuro | `--primary-dark` |
| Color de acento principal | `--accent` |
| Color de acento secundario | `--accent2` |
| Fondo oscuro principal | `--dark` y `--darker` |
| Superficie sobre fondo | `--surface`, `--surface2` |
| Texto principal | `--text` |
| Texto secundario | `--text-muted` |
| Color de éxito / positivo | `--green` |
| Color de error / alerta | `--red` |
| Color de énfasis / destacado | `--highlight` |
| Gradiente brand principal | `--gradient1`, `--gradient-brand` |
| Gradiente fondo oscuro | `--gradient2` |
| Familia tipográfica body | `font-family` en `html, body` |
| Familia tipográfica headings | `font-family` en `.slide-title`, `.cover-title`, `.speaker-name`, `#slide-counter` |

### 10.2 Documento de imágenes

El doc de imágenes debe especificar, para cada imagen:

- **Identificador** (ej. `IMG_LOGO`, `IMG_FOTO_PERSONA_MANUEL`)
- **Slide donde se usa** (ej. `slide-1`, `slide-speaker-manuel`)
- **Aspect-ratio recomendado** (`4 / 5` por defecto en speaker cards y visuales secundarios)
- **Formato**: base64 inline (el HTML resulta autocontenido pero pesado) o ruta relativa `images/nombre.jpg`
- **Texto alternativo** (`alt`)

Ejemplo:

```html
<!-- En speaker-card-slide -->
<div class="speaker-photo" style="background-image: url('{{IMG_FOTO_PERSONA_MANUEL}}');"></div>

<!-- En slide hero -->
<img class="cover-logo" src="{{IMG_LOGO}}" alt="{{ALT_LOGO}}">
```

---

## 11. Placeholders y convenciones

### 11.1 Lista exhaustiva de placeholders

| Placeholder | Tipo | Ejemplo |
|-------------|------|---------|
| `{{LANG}}` | código ISO | `es`, `en` |
| `{{TITULO_PRESENTACION}}` | string | `"Optimiza tu trabajo con IA"` |
| `{{N_SLIDES}}` | int | `20` |
| `{{NOMBRE_PRESENTACION_KEBAB}}` | slug kebab-case | `optimiza-trabajo-ia` |
| `{{TITULO_LINEA_1}}`, `{{TITULO_LINEA_2}}` | string | `"OPTIMIZA"`, `"tu trabajo con IA"` |
| `{{SUBTITULO_PORTADA}}` | string | `"Master Webinar DesafIA — abril 2026"` |
| `{{EYEBROW_TEXTO}}` | string corto | `"WEBINAR EN VIVO"` |
| `{{TITULO_SLIDE}}`, `{{SUBTITULO_SLIDE}}` | string | (por slide) |
| `{{BULLET_N}}` | string | (ítems de lista) |
| `{{NUMERO_DESTACADO}}`, `{{ETIQUETA_NUMERO}}` | string | `"87%"`, `"de los profesionales..."` |
| `{{NOMBRE_KEY}}` | slug | `manuel`, `andres` |
| `{{NOMBRE}}`, `{{ROL}}`, `{{LOGRO_N}}` | string | (speaker cards) |
| `{{TEMA_N}}`, `{{ITEM_N_M}}` | string | (summary slide) |
| `{{TITULO_EJERCICIO}}`, `{{INSTRUCCION_EJERCICIO}}` | string | (exercise slides) |
| `{{IMG_LOGO}}` | URL/base64 | `"data:image/png;base64,..."` o `"images/logo.png"` |
| `{{IMG_FOTO_PERSONA}}` | URL/base64 | (speaker cards) |
| `{{ALT_LOGO}}` | string | (texto alternativo) |
| `{{ID_GRAFICO}}`, `{{LABELS_GRAFICO}}`, `{{DATOS_GRAFICO}}`, `{{LABEL_DATASET}}` | varios | (Chart.js) |

### 11.2 Convenciones de IDs y clases

- **IDs de slides**: `slide-1`, `slide-2`, …, `slide-N` secuenciales sin saltos. Si hay subdivisiones (slide-4a), aceptable pero el orden DOM debe coincidir con el orden lógico.
- **Alias semánticos**: usar **clases** (`.summary-slide`, `.speaker-card-slide`), no IDs adicionales — los IDs deben mantenerse numéricos para que `slides[index]` funcione.
- **Variantes BEM-like**: `.exercise-slide.exercise-slide--01`, `.speaker-card-slide.speaker-card-slide--manuel`. Doble guion (`--`) separa el modificador.
- **Primera slide**: clase `active` obligatoria. Las demás **no** la llevan.

---

## 12. Checklist final de verificación

Antes de entregar el HTML generado, verifica:

- [ ] `<!DOCTYPE html>` y `<html lang="...">` correcto.
- [ ] `<title>` reemplazado.
- [ ] CDNs de Chart.js, html2canvas y jsPDF cargados en `<head>`.
- [ ] Google Fonts importadas en CSS (Inter + Space Grotesk).
- [ ] Bloque `:root` con todas las variables (estructurales + cromáticas del doc paleta).
- [ ] N `<section class="slide">` con IDs `slide-1` … `slide-N` secuenciales.
- [ ] Solo la primera slide tiene la clase `active`.
- [ ] Existen `#laser-pointer`, `#laser-dot`, `#progress-bar`, `#prev-arrow`, `#next-arrow`, `#pdf-actions`, `#pdf-current`, `#pdf-all`, `#pdf-export-status`, `#slide-counter`.
- [ ] El JS está dentro de un IIFE al final del `<body>`.
- [ ] Funciones presentes: `goToSlide`, `nextSlide`, `prevSlide`, `updateUI`, `triggerSlideAnimations`, `downloadCurrentSlidePdf`, `downloadAllSlidesPdf`.
- [ ] Listeners: `keydown` (flechas), `click` en flechas, `click` en botones PDF, `mousemove`/`mouseenter`/`mouseleave` para láser.
- [ ] La transición es `0.6s cubic-bezier(0.4, 0, 0.2, 1)` sobre `transform` y `opacity`.
- [ ] El timeout de limpieza es `650` ms (50 ms más que la transición).
- [ ] Imágenes con `aspect-ratio: 4 / 5` donde aplica (speaker cards, visuales).
- [ ] Todos los `{{PLACEHOLDERS}}` reemplazados (busca `{{` para asegurar que no quedan).
- [ ] Sin referencias a archivos externos salvo CDNs documentados.
- [ ] Test funcional al abrir en navegador:
  - [ ] La portada se ve y el láser sigue al cursor.
  - [ ] `→` / `←` (teclado) y click en flechas navegan.
  - [ ] El contador muestra `1 / N` y avanza.
  - [ ] La barra de progreso crece proporcionalmente.
  - [ ] Botón "Lámina" descarga PDF de slide actual.
  - [ ] Botón "Completa" descarga PDF de todas.
  - [ ] Sin errores en la consola.
