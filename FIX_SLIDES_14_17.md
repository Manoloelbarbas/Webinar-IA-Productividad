# Fix: láminas 14 y 17 se ven completamente negras al navegar a ellas

## TL;DR

Cambiar `position: relative` → `position: absolute` en dos reglas CSS de `css/webinar.css`:

1. `.title-only-slide` (línea ~1331)
2. `.countdown-slide` (línea ~1644)

Ese es el fix completo. **No** toques HTML ni JS.

---

## Contexto del problema

El proyecto es una presentación web HTML/CSS/JS con 23 láminas que se navegan con flechas izquierda/derecha. Cada `<section class="slide">` se posiciona absolutamente sobre el viewport (`top:0; left:0`) y se desplaza con `translateX()` para entrar/salir; la lámina activa lleva clase `.active`.

**Síntoma reportado:** Al navegar hasta la lámina 14 (`#slide-section-2`, "Sección 2") o la lámina 17 (`#slide-countdown-5`, cuenta regresiva), la pantalla se queda completamente negra. El contador inferior muestra "14 / 23" o "17 / 23" correctamente, pero el contenido del slide no aparece.

---

## Causa raíz (verificada con headless Chrome + dump del DOM)

La regla base de cualquier lámina, en [css/webinar.css:79-93](css/webinar.css#L79-L93), declara:

```css
.slide {
  position: absolute;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  ...
}
```

Esto hace que **todas** las láminas se apilen sobre la misma posición `(0,0)` y solo cambien con `transform: translateX(...)`.

Sin embargo, **dos clases específicas redefinen `position: relative`** y, al tener igual especificidad que `.slide` y aparecer después en el stylesheet, ganan en la cascada:

- [css/webinar.css:1330-1337](css/webinar.css#L1330-L1337) → `.title-only-slide { position: relative; ... }`
- [css/webinar.css:1644-1652](css/webinar.css#L1644-L1652) → `.countdown-slide { position: relative; ... }`

Las láminas afectadas (que llevan alguna de estas dos clases) son:

| # | id                 | clase modificadora     | `position` resultante |
|---|--------------------|------------------------|------------------------|
| 4 | `slide-intro-minute` | `title-only-slide`     | relative               |
| 14 | `slide-section-2`    | `title-only-slide` + `section-break-slide` | relative |
| 17 | `slide-countdown-5`  | `countdown-slide`      | relative               |

Como pasan a ser `position: relative`, se posicionan en el flujo del documento dentro de `#presentation`, **apiladas verticalmente**, no superpuestas en `(0,0)`. Resultado del `getBoundingClientRect()` cuando estas láminas son las activas:

```
[ 3] slide-intro-minute  | y=0    | pos=relative   ← cae en y=0 → visible por casualidad
[13] slide-section-2     | y=984  | pos=relative   ← justo DEBAJO del viewport (off-screen)
[16] slide-countdown-5   | y=1968 | pos=relative   ← doblemente off-screen
```

La lámina 4 sí funciona porque al ser la primera `relative` cae en `y=0` (dentro del viewport). Las láminas 14 y 17 se apilan debajo y quedan fuera de la pantalla. Por eso se ven negras: están físicamente fuera del área visible, aunque tengan `.active`, `opacity:1`, `transform: matrix(1,0,0,1,0,0)` y `visibility: visible`.

---

## Fix exacto

### Archivo: `css/webinar.css`

#### Cambio 1 — línea ~1331

**Antes:**
```css
.title-only-slide {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(0,178,227,0.12), transparent 34%),
    linear-gradient(225deg, rgba(247,150,70,0.1), transparent 42%),
    #050510;
}
```

**Después:**
```css
.title-only-slide {
  position: absolute;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(0,178,227,0.12), transparent 34%),
    linear-gradient(225deg, rgba(247,150,70,0.1), transparent 42%),
    #050510;
}
```

#### Cambio 2 — línea ~1644

**Antes:**
```css
.countdown-slide {
  --countdown-deg: 360deg;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(140deg, rgba(0,178,227,0.1), transparent 40%),
    linear-gradient(220deg, rgba(247,150,70,0.12), transparent 44%),
    #050510;
}
```

**Después:**
```css
.countdown-slide {
  --countdown-deg: 360deg;
  position: absolute;
  overflow: hidden;
  background:
    linear-gradient(140deg, rgba(0,178,227,0.1), transparent 40%),
    linear-gradient(220deg, rgba(247,150,70,0.12), transparent 44%),
    #050510;
}
```

Eso es todo. **No tocar nada más.**

---

## Por qué este cambio es seguro

- Las clases `.title-only-slide` y `.countdown-slide` se aplican únicamente a elementos que también tienen la clase `.slide`. Esa clase ya proporciona contexto de posicionamiento (`position: absolute`), por lo que los hijos absolute (`.title-only-bg`, `.countdown-bg`, `.countdown-stage`, etc.) seguirán anclándose al slide igual que antes.
- No hay reglas CSS que dependan específicamente de que estos slides sean `position: relative`. La única razón por la que estaban así era — aparentemente — un descuido al copiar reglas decorativas; el `position: relative` era redundante y rompía el sistema de slides.
- La lámina 4 (`slide-intro-minute`), que actualmente se ve por casualidad por estar en `y=0`, seguirá viéndose igual, pero ahora sin depender del orden de aparición en el DOM.

---

## Verificación end-to-end

1. Aplicar los dos cambios anteriores en `css/webinar.css`.
2. Comprobar que el archivo sigue siendo CSS válido (llaves balanceadas):
   ```bash
   awk '{count+=gsub(/\{/,"{"); count-=gsub(/\}/,"}")} END{print "Balance:", count}' css/webinar.css
   # Debe imprimir "Balance: 0"
   ```
3. Abrir `Webinar_V7.html` en Chrome o Edge.
4. **Hacer hard refresh (Ctrl + F5)** para evitar caché.
5. Navegar con la flecha derecha hasta la lámina 14: debe aparecer el badge **"SECCIÓN 2"**, el título grande **"Aplicación práctica de la IA en tu trabajo"** en degradado cyan, una línea decorativa, y la bajada **"Pasamos de la teoría a los ejercicios en vivo con archivos reales."**
6. Seguir hasta la lámina 17: debe verse el anillo cyan circular con **"05:00"** centrado y, debajo, el botón **"Reiniciar"** con icono giratorio. Al hacer clic en Reiniciar, el contador debe volver a 05:00 y empezar a descontar.
7. Verificar que la lámina 4 (`slide-intro-minute`, "Tomémonos un minuto para presentarnos") sigue mostrándose correctamente — no debe regresionar.

---

## Lo que NO hay que hacer

- **No modifiques** la regla base `.slide` (línea 79). Esa está bien.
- **No añadas** reglas con `!important` para forzar visibilidad de elementos hijos: el problema no es de opacidad ni de `display`, es de **posición** del slide entero.
- **No alteres** el HTML de las láminas 14 ni 17. La estructura es correcta.
- **No toques** `js/webinar.js`. La lógica de navegación funciona; el bug es puramente CSS.
- **No añadas** clases nuevas a las láminas en el HTML.

---

## Archivos relevantes

- `css/webinar.css` — único archivo a modificar (2 líneas)
- `Webinar_V7.html` — solo lectura para entender la estructura
- `js/webinar.js` — solo lectura, no se modifica

## Diagnóstico previo (referencia)

Si el revisor quiere reproducir el diagnóstico:

```js
// Inyectar tras navegar a slide 14 o 17 con keydown ArrowRight × 13 o × 16
const slide = document.querySelector('.slide.active');
const r = slide.getBoundingClientRect();
console.log(slide.id, 'y=', r.y, 'h=', r.height, 'pos=', getComputedStyle(slide).position);
// Esperado tras el fix: y=0, h=alturaViewport, pos=absolute
```
