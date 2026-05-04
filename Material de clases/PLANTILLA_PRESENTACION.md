# Plantilla de Presentación HTML (estilo PPTX)

Este documento contiene **el esqueleto reutilizable** que hace que una página HTML se comporte como una presentación PowerPoint: slides a pantalla completa, transición horizontal al avanzar/retroceder, teclado, flechas laterales, puntero láser, barra de progreso y contador.

**Filosofía**: el esqueleto (layout + navegación + animaciones base) se mantiene **idéntico** entre presentaciones. Lo que cambia por cada línea de negocio es una hoja de **branding** (colores, tipografías, logo) que se adjunta como archivo separado.

---

## 1. Arquitectura (3 archivos)

```
presentacion/
├── index.html          ← estructura: slides + controles
├── css/
│   ├── framework.css   ← ESQUELETO: no se toca entre presentaciones
│   └── branding.css    ← BRANDING: colores/tipografías/logo por negocio
└── js/
    └── framework.js    ← ESQUELETO: navegación, láser, animaciones base
```

El orden de carga importa: `framework.css` primero (define tokens por defecto y layout), `branding.css` después (sobreescribe las variables CSS).

---

## 2. Mecanismos clave a replicar

| Funcionalidad             | Cómo se implementa                                                                 |
|---------------------------|------------------------------------------------------------------------------------|
| Slides a pantalla completa| Cada `<section class="slide">` es `position: absolute; width: 100vw; height: 100vh`|
| Transición horizontal     | `transform: translateX(...)` + `opacity` con transición `cubic-bezier`             |
| Solo una visible          | `.slide.active` controla opacity/z-index/pointer-events                            |
| Navegación teclado        | `keydown` escucha `ArrowRight/ArrowDown` (next) y `ArrowLeft/ArrowUp` (prev)       |
| Flechas laterales         | `#prev-arrow` y `#next-arrow` fijas, estilo circular con backdrop-filter           |
| Contador                  | `#slide-counter` en `bottom: 20px`, centrado                                       |
| Barra progreso            | `#progress-bar` fija arriba, `width` en %                                          |
| Puntero láser             | Dos divs fijos (`#laser-pointer` rojo + `#laser-dot` blanco) que siguen al mouse   |
| Cursor oculto             | `html, body { cursor: none }` para que se vea solo el láser                        |
| Animaciones por slide     | Clase `.fade-in` (+ delays `.fade-in-delay-1..6`) que se activa al entrar          |

---

## 3. HTML — estructura base

Guarda esto como `index.html`. Los comentarios marcan dónde insertar tus slides de contenido.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Título de tu presentación</title>

  <!-- Framework primero, branding después (branding sobreescribe tokens) -->
  <link rel="stylesheet" href="css/framework.css">
  <link rel="stylesheet" href="css/branding.css">
</head>
<body>

  <!-- Puntero láser (sigue al mouse) -->
  <div id="laser-pointer"></div>
  <div id="laser-dot"></div>

  <!-- Barra de progreso arriba -->
  <div id="progress-bar"></div>

  <!-- Flechas laterales -->
  <button class="nav-arrow" id="prev-arrow" title="Anterior (←)">&lsaquo;</button>
  <button class="nav-arrow" id="next-arrow" title="Siguiente (→)">&rsaquo;</button>

  <!-- Contador de slides -->
  <div id="slide-counter">1 / 1</div>

  <div id="presentation">

    <!-- =============== SLIDE 1: PORTADA =============== -->
    <section class="slide active" id="slide-1">
      <div class="cover-brand-row fade-in">
        <img src="images/logo.png" alt="Logo" class="cover-logo">
        <span class="cover-brand-sep" aria-hidden="true"></span>
        <div class="cover-eyebrow fade-in fade-in-delay-1">
          <span class="cover-eyebrow__dot" aria-hidden="true"></span>
          <span>Etiqueta superior</span>
        </div>
      </div>
      <div class="cover-divider" aria-hidden="true"></div>
      <h1 class="cover-title fade-in fade-in-delay-2">
        <span class="cover-title__top">Primera línea del título</span>
        <span class="cover-title__line">Segunda línea destacada</span>
      </h1>
    </section>

    <!-- =============== SLIDE DE CONTENIDO (plantilla) =============== -->
    <section class="slide slide-dark" id="slide-2">
      <div class="slide-bg" aria-hidden="true">
        <img src="images/fondo.jpg" alt="" class="slide-bg__img">
        <div class="slide-bg__overlay"></div>
        <div class="slide-bg__grid"></div>
      </div>
      <div class="slide-tag fade-in">Sección</div>
      <h2 class="slide-title fade-in fade-in-delay-1">
        Título con <span class="animated-title-underline">palabra clave</span>
      </h2>
      <p class="slide-subtitle fade-in fade-in-delay-2">
        Subtítulo o bajada explicativa.
      </p>
      <ul class="bullet-list fade-in fade-in-delay-3">
        <li>Primer punto</li>
        <li>Segundo punto</li>
        <li>Tercer punto</li>
      </ul>
      <p class="visual-phrase fade-in fade-in-delay-4">Frase de cierre.</p>
      <div class="links-section fade-in fade-in-delay-5">
        <a href="#" target="_blank" rel="noopener">Fuente</a>
      </div>
    </section>

    <!-- =============== SLIDE DE CIERRE =============== -->
    <section class="slide slide-dark" id="slide-final">
      <div class="floating-shapes">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <h2 class="closing-title fade-in">¿Preguntas?</h2>
      <p class="closing-sub fade-in fade-in-delay-2">Gracias</p>
    </section>

  </div>

  <script src="js/framework.js" defer></script>
</body>
</html>
```

**Regla de oro para agregar slides**: copia un bloque `<section class="slide slide-dark" id="slide-N">…</section>` y cambia el `id`. El JS detecta automáticamente todas las `.slide` y las numera en orden de aparición en el DOM.

---

## 4. CSS — framework esqueleto (`css/framework.css`)

Contiene: tokens por defecto, reset, layout de slide, transición horizontal, puntero láser, flechas, contador, barra de progreso, clases `.fade-in`, portada, fondos y utilidades de tipografía.

```css
/* ===== RESET ===== */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

/* ===== TOKENS (por defecto — sobreescribir en branding.css) ===== */
:root {
  --primary: #2A57D2;
  --primary-dark: #1A3FA0;
  --accent: #00B2E3;
  --accent2: #F79646;
  --dark: #0A0A14;
  --darker: #000000;
  --surface: #0D1124;
  --surface2: #12152B;
  --text: #e8e8f0;
  --text-muted: #9ca3af;
  --highlight: #00B2E3;

  --font-body: 'Inter', sans-serif;
  --font-display: 'Space Grotesk', sans-serif;

  --gradient1: linear-gradient(135deg, #00B2E3 0%, #2A57D2 50%, #6929C4 100%);
  --gradient2: linear-gradient(135deg, #000000 0%, #0A0A14 50%, #12152B 100%);
  --gradient3: linear-gradient(135deg, #00B2E3 0%, #2A57D2 100%);

  --slide-safe-x: clamp(22px, 1.8vw, 48px);
  --slide-content-max: min(96vw, 1820px);
  --slide-copy-max: min(90vw, 1480px);
}

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  font-family: var(--font-body);
  background: var(--darker);
  color: var(--text);
  cursor: none;              /* oculta cursor nativo (lo reemplaza el láser) */
}

/* ===== PUNTERO LÁSER ===== */
#laser-pointer {
  position: fixed;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff0000 0%, #ff0000 40%, rgba(255,0,0,0.4) 70%, transparent 100%);
  box-shadow: 0 0 8px 3px rgba(255,0,0,0.6), 0 0 20px 6px rgba(255,0,0,0.2);
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  transition: opacity 0.15s;
  mix-blend-mode: screen;
}
#laser-dot {
  position: fixed;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
  z-index: 10001;
  transform: translate(-50%, -50%);
}

/* ===== CONTENEDOR ===== */
#presentation {
  width: 100vw; height: 100vh;
  position: relative;
  overflow: hidden;
}

/* ===== SLIDES (el corazón del efecto PPTX) ===== */
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
  transform: translateX(100%);   /* inicia fuera de pantalla a la derecha */
  transition: none;
  pointer-events: none;
  overflow-y: auto;
}
.slide.active {
  opacity: 1;
  transform: translateX(0);
  pointer-events: all;
  z-index: 2;
}
.slide.exit-left  { opacity: 0; transform: translateX(-100%); z-index: 1; }
.slide.exit-right { opacity: 0; transform: translateX(100%);  z-index: 1; }
.slide.animating {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              opacity   0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== BARRA DE PROGRESO (arriba) ===== */
#progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: var(--gradient1);
  z-index: 100;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(42,87,210,0.5);
}

/* ===== CONTADOR ===== */
#slide-counter {
  position: fixed;
  bottom: 20px; left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--text-muted);
  z-index: 100;
  font-family: var(--font-display);
  letter-spacing: 2px;
}

/* ===== FLECHAS LATERALES ===== */
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
  background: rgba(42,87,210,0.3);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 0 20px rgba(42,87,210,0.3);
}
.nav-arrow.disabled { opacity: 0.2; pointer-events: none; }
#prev-arrow { left: 20px; }
#next-arrow { right: 20px; }

/* ===== ANIMACIÓN DE ENTRADA (fade-in escalonado) ===== */
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

/* ===== SUBRAYADO ANIMADO EN TÍTULOS ===== */
.animated-title-underline { position: relative; display: inline-block; }
.animated-title-underline::after {
  content: '';
  position: absolute;
  left: 0; bottom: -8px;
  width: 100%; height: 3px;
  background: var(--gradient1);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1) 0.4s;
}
.slide.active .animated-title-underline::after { transform: scaleX(1); }

/* ===== FONDOS INMERSIVOS (reutilizable en cualquier slide) ===== */
.slide-dark   { background: var(--gradient2); }
.slide-accent { background: linear-gradient(135deg, #050510 0%, #0A0520 60%, #120A2E 100%); }

.slide-bg {
  position: absolute; inset: 0;
  z-index: 0; overflow: hidden; pointer-events: none;
}
.slide-bg__img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  filter: saturate(0.75) contrast(1.08) brightness(0.75);
  transform: scale(1.08);
  transition: opacity 1.4s ease, transform 18s ease;
}
.slide.active .slide-bg__img { opacity: 0.22; transform: scale(1); }
.slide-bg__overlay {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 70% 30%, rgba(0,178,227,0.22), transparent 55%),
    radial-gradient(ellipse at 25% 85%, rgba(42,87,210,0.22), transparent 55%),
    linear-gradient(135deg, rgba(10,15,30,0.82) 0%, rgba(10,15,30,0.62) 50%, rgba(10,15,30,0.88) 100%);
}
.slide-bg__grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 80px 80px;
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  opacity: 0.4;
}
.slide > *:not(.slide-bg) { position: relative; z-index: 1; }

/* ===== TIPOGRAFÍA / COMPONENTES BASE ===== */
.slide-tag {
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 3px;
  color: var(--accent);
  margin-bottom: 16px;
  font-family: var(--font-display);
}
.slide-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.5vw, 52px);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #fff 0%, #ccd6e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.slide-subtitle {
  font-size: clamp(16px, 1.8vw, 22px);
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 800px;
}
.bullet-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.bullet-list li {
  display: flex; align-items: flex-start; gap: 12px;
  font-size: clamp(14px, 1.3vw, 18px);
  line-height: 1.5; color: var(--text);
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.5s ease;
}
.bullet-list li.visible { opacity: 1; transform: translateX(0); }
.bullet-list li::before {
  content: '';
  flex-shrink: 0;
  width: 8px; height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--accent);
}
.visual-phrase {
  font-size: clamp(14px, 1.4vw, 18px);
  color: var(--accent);
  font-weight: 500; font-style: italic;
  margin-top: 16px; opacity: 0.8;
}
.links-section {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  letter-spacing: 0.02em;
}
.links-section a {
  color: rgba(255,255,255,0.6);
  text-decoration: underline;
  text-decoration-color: rgba(255,255,255,0.2);
  text-underline-offset: 4px;
  word-break: break-all;
}

/* ===== PORTADA (slide-1) ===== */
#slide-1 {
  padding: 0; align-items: stretch; justify-content: stretch;
  background: #050510; text-align: left; isolation: isolate;
}
.cover-brand-row {
  display: flex; align-items: center;
  gap: clamp(18px, 2vw, 36px);
  margin: 72px 84px 0;
  position: relative; z-index: 1;
}
.cover-logo {
  height: clamp(64px, 6.5vw, 110px);
  width: auto; object-fit: contain;
  filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));
}
.cover-brand-sep {
  width: 2px; align-self: stretch; min-height: 42px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(0,178,227,0.6) 0%, rgba(42,87,210,0.25) 100%);
  box-shadow: 0 0 14px rgba(0,178,227,0.35);
}
.cover-eyebrow {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 14px 28px 14px 22px;
  border-radius: 14px;
  border: 1px solid rgba(0,178,227,0.28);
  background: linear-gradient(135deg, rgba(0,178,227,0.08) 0%, rgba(42,87,210,0.06) 100%);
  backdrop-filter: blur(12px);
  font-family: var(--font-display);
  font-size: clamp(15px, 1.2vw, 22px);
  font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
  color: rgba(220,232,246,0.95);
}
.cover-eyebrow__dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 14px rgba(0,178,227,0.9);
  animation: coverPulse 2s ease-in-out infinite;
}
@keyframes coverPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.55; }
}
.cover-divider {
  width: 140px; height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), rgba(0,178,227,0));
  box-shadow: 0 0 24px rgba(0,178,227,0.55);
  transform-origin: left center;
  animation: coverDivider 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
  margin: clamp(18px, 2vw, 32px) 84px;
}
.cover-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 9.2vw, 150px);
  font-weight: 800;
  line-height: 1.05; letter-spacing: -0.05em;
  color: #fff;
  margin: 0 84px clamp(22px, 2.4vw, 40px);
}
.cover-title__top {
  display: block;
  padding-bottom: 0.15em;
  background: linear-gradient(120deg, #fff 0%, #e7effa 55%, #c9dbeb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 6px 26px rgba(0,0,0,0.7));
}
.cover-title__line {
  display: block;
  margin-top: 0.04em;
  background: var(--gradient3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: coverGradientShift 6s ease-in-out infinite alternate;
}
@keyframes coverGradientShift {
  0%   { filter: drop-shadow(0 0 22px rgba(0,178,227,0.25)) brightness(1); }
  100% { filter: drop-shadow(0 0 38px rgba(0,178,227,0.55)) brightness(1.12); }
}
@keyframes coverDivider {
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
}

/* ===== CIERRE ===== */
.closing-title {
  font-family: var(--font-display);
  font-size: clamp(48px, 6vw, 96px);
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
}
.closing-sub {
  font-size: clamp(20px, 2.5vw, 36px);
  color: var(--text-muted);
  font-weight: 300;
}

/* ===== DECORATIVO: formas flotantes (opcional, slide de cierre) ===== */
.floating-shapes {
  position: absolute; inset: 0;
  overflow: hidden; z-index: 0;
}
.floating-shapes span {
  position: absolute;
  border: 1px solid rgba(42,87,210,0.15);
  border-radius: 50%;
  animation: float-shape 12s ease-in-out infinite;
}
.floating-shapes span:nth-child(1) { width: 120px; height: 120px; top: 10%; left: 5%;  animation-delay: 0s; }
.floating-shapes span:nth-child(2) { width: 80px;  height: 80px;  top: 60%; right: 10%; animation-delay: 2s; }
.floating-shapes span:nth-child(3) { width: 200px; height: 200px; bottom: 10%; left: 20%; animation-delay: 4s; border-color: rgba(0,178,227,0.1); }
.floating-shapes span:nth-child(4) { width: 60px;  height: 60px;  top: 20%; right: 25%; animation-delay: 1s; }
.floating-shapes span:nth-child(5) { width: 150px; height: 150px; top: 40%; left: 60%; animation-delay: 3s; border-color: rgba(0,178,227,0.08); }
@keyframes float-shape {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-30px) rotate(180deg); }
}
```

---

## 5. JS — framework esqueleto (`js/framework.js`)

Contiene solo el núcleo: puntero láser, navegación (teclado + flechas), transición entre slides, activación de `.fade-in` y `.bullet-list li`. **Sin lógica específica de slides de contenido** — esa parte se agrega por presentación si se necesita.

```javascript
(function() {
  'use strict';

  // ===== PUNTERO LÁSER =====
  const laser = document.getElementById('laser-pointer');
  const laserDot = document.getElementById('laser-dot');

  document.addEventListener('mousemove', (e) => {
    laser.style.left    = e.clientX + 'px';
    laser.style.top     = e.clientY + 'px';
    laserDot.style.left = e.clientX + 'px';
    laserDot.style.top  = e.clientY + 'px';
  });
  document.addEventListener('mouseenter', () => {
    laser.style.opacity = '1';
    laserDot.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    laser.style.opacity = '0';
    laserDot.style.opacity = '0';
  });

  // ===== NAVEGACIÓN =====
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  let currentSlide = 0;
  let isAnimating = false;

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

  function goToSlide(index, direction) {
    if (isAnimating || index < 0 || index >= totalSlides || index === currentSlide) return;
    isAnimating = true;

    const oldSlide = slides[currentSlide];
    const newSlide = slides[index];

    oldSlide.classList.add('animating');
    newSlide.classList.add('animating');

    // Posicionar el nuevo fuera de pantalla en el lado correcto
    newSlide.style.transition = 'none';
    newSlide.style.transform  = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
    newSlide.style.opacity    = '0';
    newSlide.classList.add('active');

    // Forzar reflow para que el navegador aplique el estado inicial
    newSlide.offsetHeight;
    newSlide.style.transition = '';

    // Animar
    requestAnimationFrame(() => {
      oldSlide.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';
      oldSlide.style.opacity   = '0';
      newSlide.style.transform = 'translateX(0)';
      newSlide.style.opacity   = '1';
    });

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

  // Teclado
  document.addEventListener('keydown', (e) => {
    // No interceptar si hay un input activo (ej. sliders, textarea)
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextSlide(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')                    { e.preventDefault(); prevSlide(); }
  });

  // Click en flechas
  prevArrow.addEventListener('click', prevSlide);
  nextArrow.addEventListener('click', nextSlide);

  // ===== ANIMACIONES AL ENTRAR A UN SLIDE =====
  function triggerSlideAnimations(slideIndex) {
    const slide = slides[slideIndex];

    slide.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));

    const bullets = slide.querySelectorAll('.bullet-list li');
    bullets.forEach((li, i) => {
      setTimeout(() => li.classList.add('visible'), 400 + i * 150);
    });
  }

  // ===== INIT =====
  updateUI();
  triggerSlideAnimations(0);
})();
```

---

## 6. Hoja de branding por línea de negocio (`css/branding.css`)

Este es el único archivo que cambia entre presentaciones. Define la identidad visual sobreescribiendo las variables CSS del framework.

**Plantilla mínima** — copia y ajusta por negocio:

```css
/* ========================================
   BRANDING — <NOMBRE DE TU LÍNEA DE NEGOCIO>
   ======================================== */
:root {
  /* Colores principales */
  --primary:      #2A57D2;   /* color dominante de botones / acentos */
  --primary-dark: #1A3FA0;
  --accent:       #00B2E3;   /* color secundario (subrayados, dots) */
  --accent2:      #F79646;   /* color de apoyo puntual */

  /* Fondos */
  --dark:     #0A0A14;
  --darker:   #000000;
  --surface:  #0D1124;
  --surface2: #12152B;

  /* Texto */
  --text:       #e8e8f0;
  --text-muted: #9ca3af;
  --highlight:  #00B2E3;

  /* Tipografía (recuerda importar las fuentes en branding.css si son distintas) */
  --font-body:    'Inter', sans-serif;
  --font-display: 'Space Grotesk', sans-serif;

  /* Gradientes (estos se usan en el subrayado animado, barra de progreso y portada) */
  --gradient1: linear-gradient(135deg, var(--accent) 0%, var(--primary) 50%, #6929C4 100%);
  --gradient2: linear-gradient(135deg, var(--darker) 0%, var(--dark) 50%, var(--surface2) 100%);
  --gradient3: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
}

/* Si tu negocio usa una tipografía distinta, impórtala acá: */
/* @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap'); */
```

### Qué puedes cambiar sin tocar el framework

1. **Paleta**: reasignar `--primary`, `--accent`, `--accent2` propaga a títulos, bordes, subrayado animado, barra de progreso.
2. **Gradientes**: `--gradient1` domina el subrayado animado + barra de progreso; `--gradient2` es el fondo oscuro; `--gradient3` el acento del título de portada.
3. **Tipografía**: cambia `--font-body` y `--font-display` y, si son fuentes externas, impórtalas al inicio del archivo de branding.
4. **Logo**: reemplaza `images/logo.png` — el tamaño está limitado por `clamp()` en `.cover-logo`.

---

## 7. Cómo agregar un slide nuevo

1. Duplica la `<section class="slide slide-dark" id="slide-N">` en el HTML.
2. Cambia el `id` para que sea único.
3. Usa las clases utilitarias ya definidas:
   - `slide-tag`, `slide-title`, `slide-subtitle`, `bullet-list`, `visual-phrase`, `links-section`
   - `animated-title-underline` dentro del `slide-title` para el subrayado animado
   - `fade-in` + `fade-in-delay-1..6` en cualquier elemento para aparición escalonada
   - `slide-bg` (con hijo `slide-bg__img`, `slide-bg__overlay`, `slide-bg__grid`) para fondo inmersivo

No hay que tocar el JS: detecta automáticamente todas las `.slide` al cargar.

---

## 8. Teclado y atajos soportados

| Tecla                | Acción              |
|----------------------|---------------------|
| `→`, `↓`, `Espacio`  | Siguiente slide     |
| `←`, `↑`             | Slide anterior      |
| Click flecha izq/der | Navegación manual   |
| Mouse                | Puntero láser rojo  |

---

## 9. Checklist para replicar

- [ ] Crear `index.html` con la estructura del punto 3.
- [ ] Crear `css/framework.css` con el contenido del punto 4 (no modificar).
- [ ] Crear `css/branding.css` con el contenido del punto 6 (ajustar por negocio).
- [ ] Crear `js/framework.js` con el contenido del punto 5 (no modificar).
- [ ] Agregar `images/logo.png` correspondiente al negocio.
- [ ] Probar en el navegador: flechas, teclado, contador, barra de progreso y puntero láser.
- [ ] Duplicar el bloque slide plantilla tantas veces como secciones necesites.

---

## 10. Extensiones opcionales (si las necesitas más adelante)

- **Modo presentador con notas**: agregar un `<aside>` por slide con clase `.presenter-notes` y toggle con tecla `N`.
- **Fullscreen**: llamar `document.documentElement.requestFullscreen()` al presionar `F`.
- **Imprimir a PDF**: agregar `@media print { .slide { page-break-after: always; position: relative; ... } }`.
- **Navegación por miniaturas**: pantalla de overview al presionar `Esc` que muestre todas las slides a escala.

Si alguna de estas te interesa, se implementan encima del framework sin romperlo.
