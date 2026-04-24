(function() {
  'use strict';

  // ===== LASER POINTER =====
  const laser = document.getElementById('laser-pointer');
  const laserDot = document.getElementById('laser-dot');
  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    laser.style.left = mouseX + 'px';
    laser.style.top = mouseY + 'px';
    laserDot.style.left = mouseX + 'px';
    laserDot.style.top = mouseY + 'px';
  });

  document.addEventListener('mouseenter', () => {
    laser.style.opacity = '1';
    laserDot.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    laser.style.opacity = '0';
    laserDot.style.opacity = '0';
  });

  function initSlideOneHero() {
    const canvas = document.getElementById('slide-1-canvas');
    const heroSection = document.getElementById('slide-1-hero');
    const heroSlide = document.getElementById('slide-1');

    if (!canvas || !heroSection || !heroSlide) {
      return {
        activate() {},
        deactivate() {}
      };
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return {
        activate() {},
        deactivate() {}
      };
    }

    const heroContent = heroSection.querySelector('.slide-hero__content');
    const coverTitle = heroSection.querySelector('.cover-title');
    const coverTitleTop = heroSection.querySelector('.cover-title__top');
    const coverSubtitle = heroSection.querySelector('.cover-subtitle');
    const coverBadge = heroSection.querySelector('.cover-badge');

    const COLORS = {
      bg: [0, 0, 0],
      deep: [41, 16, 84],
      blue: [42, 87, 210],
      cyan: [0, 178, 227],
      soft: [180, 200, 255],
      magenta: [105, 41, 196]
    };

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    const TAU = Math.PI * 2;
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      centerX: 0,
      centerY: 0,
      radius: 0,
      nodes: [],
      edges: [],
      pulses: [],
      stars: [],
      pulseClock: 0,
      burstClock: 2.4,
      waveClock: 0,
      pointerX: 0,
      pointerY: 0,
      targetPointerX: 0,
      targetPointerY: 0,
      motion: reducedMotionQuery.matches ? 0.45 : 1,
      isMobile: mobileQuery.matches,
      running: false
    };

    let rafId = 0;
    let lastTime = performance.now();
    let resizeTimer = 0;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function rgba(rgb, alpha) {
      return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
    }

    function fitCoverText() {
      if (!heroContent || !coverTitle || !coverTitleTop) return;

      coverTitle.style.fontSize = '';
      if (coverSubtitle) coverSubtitle.style.fontSize = '';
      if (coverBadge) coverBadge.style.fontSize = '';

      const contentWidth = heroContent.clientWidth;
      if (!contentWidth) return;

      const availableWidth = Math.max(280, contentWidth - 4);
      const titleSize = parseFloat(window.getComputedStyle(coverTitle).fontSize);
      const titleTopWidth = coverTitleTop.scrollWidth;

      if (titleTopWidth > availableWidth) {
        const fittedTitleSize = Math.max(
          state.isMobile ? 42 : 38,
          titleSize * (availableWidth / titleTopWidth) * 0.98
        );
        coverTitle.style.fontSize = fittedTitleSize + 'px';
      }

      const heroHeight = heroSection.clientHeight || window.innerHeight;
      const maxContentHeight = heroHeight * (state.isMobile ? 0.6 : 0.7);
      const contentHeight = heroContent.scrollHeight;

      if (contentHeight > maxContentHeight) {
        if (coverSubtitle) {
          const subtitleSize = parseFloat(window.getComputedStyle(coverSubtitle).fontSize);
          coverSubtitle.style.fontSize = Math.max(16, subtitleSize * 0.92) + 'px';
        }
        if (coverBadge) {
          const badgeSize = parseFloat(window.getComputedStyle(coverBadge).fontSize);
          coverBadge.style.fontSize = Math.max(14, badgeSize * 0.94) + 'px';
        }
      }
    }

    function dist3(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function fibonacciPoint(index, total) {
      if (total <= 1) return { x: 0, y: 0, z: 0 };
      const t = index / (total - 1);
      const y = 1 - t * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * index;
      return {
        x: Math.cos(theta) * radius,
        y: y,
        z: Math.sin(theta) * radius
      };
    }

    function nearestNodes(sourceId, candidates, nodes, limit, maxDistance) {
      const source = nodes[sourceId];
      const ranked = [];

      for (let i = 0; i < candidates.length; i += 1) {
        const targetId = candidates[i];
        if (targetId === sourceId) continue;
        const distance = dist3(source, nodes[targetId]);
        if (typeof maxDistance === 'number' && distance > maxDistance) continue;
        ranked.push({ id: targetId, distance: distance });
      }

      ranked.sort(function(a, b) {
        return a.distance - b.distance;
      });

      return ranked.slice(0, limit).map(function(item) {
        return item.id;
      });
    }

    function edgeColorByLayer(avgLayer) {
      if (avgLayer >= 3.5) return COLORS.cyan;
      if (avgLayer >= 2.5) return COLORS.blue;
      if (avgLayer >= 1.5) return COLORS.magenta;
      return COLORS.soft;
    }

    function spawnPulse(edgeIndex, startProgress) {
      if (!state.edges.length) return;

      const idx = typeof edgeIndex === 'number' ? edgeIndex : Math.floor(Math.random() * state.edges.length);
      const roll = Math.random();
      const color = roll < 0.4 ? COLORS.cyan : roll < 0.7 ? COLORS.blue : roll < 0.9 ? COLORS.magenta : COLORS.soft;

      state.pulses.push({
        edgeIndex: idx,
        progress: typeof startProgress === 'number' ? startProgress : 0,
        speed: random(0.34, 0.96) * state.motion,
        radius: random(1.8, 4.2),
        color: color
      });

      if (state.pulses.length > 340) {
        state.pulses.shift();
      }
    }

    function buildStars() {
      const areaFactor = clamp((state.width * state.height) / (1600 * 900), 0.6, 1.6);
      const baseCount = state.isMobile ? 100 : 200;
      const count = Math.round(baseCount * areaFactor);
      const stars = [];

      for (let i = 0; i < count; i += 1) {
        const choice = Math.random();
        const color = choice < 0.55 ? COLORS.soft : choice < 0.75 ? COLORS.cyan : choice < 0.9 ? COLORS.blue : COLORS.magenta;
        stars.push({
          x: Math.random(),
          y: Math.random(),
          depth: random(0.28, 1),
          size: random(0.35, 1.8),
          phase: random(0, TAU),
          twinkle: random(0.35, 1.4),
          color: color
        });
      }

      state.stars = stars;
    }

    function buildNetwork() {
      const density = state.isMobile ? 0.72 : 1;
      const layers = [
        { radius: 0.03, count: 1, size: 3.0, color: COLORS.soft },
        { radius: 0.22, count: Math.max(8, Math.round(14 * density)), size: 2.2, color: COLORS.cyan },
        { radius: 0.4, count: Math.max(14, Math.round(28 * density)), size: 1.7, color: COLORS.magenta },
        { radius: 0.58, count: Math.max(22, Math.round(44 * density)), size: 1.4, color: COLORS.blue },
        { radius: 0.78, count: Math.max(34, Math.round(64 * density)), size: 1.15, color: COLORS.soft },
        { radius: 1.0, count: Math.max(44, Math.round(88 * density)), size: 0.95, color: COLORS.cyan }
      ];

      const nodes = [];
      const layerBuckets = [];
      let nodeId = 0;

      for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
        const layer = layers[layerIndex];
        const bucket = [];

        for (let i = 0; i < layer.count; i += 1) {
          const base = layer.count === 1
            ? { x: 0, y: 0, z: 0 }
            : fibonacciPoint(i + Math.random() * 0.2, layer.count);

          const jitter = layerIndex === 0 ? 0 : (Math.random() - 0.5) * (0.14 / (layerIndex + 1));
          const radius = layer.radius * (1 + jitter);

          nodes.push({
            id: nodeId,
            layer: layerIndex,
            x: base.x * radius,
            y: base.y * radius,
            z: base.z * radius,
            baseSize: layer.size * random(0.86, 1.25),
            phase: random(0, TAU),
            twinkle: random(0.75, 1.25),
            color: layer.color,
            activation: 0,
            px: 0,
            py: 0,
            vis: 0,
            renderSize: 1
          });

          bucket.push(nodeId);
          nodeId += 1;
        }

        layerBuckets.push(bucket);
      }

      const edges = [];
      const edgeSet = new Set();

      function addEdge(a, b, strength) {
        if (a === b) return;
        const key = a < b ? a + '-' + b : b + '-' + a;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);

        const avgLayer = (nodes[a].layer + nodes[b].layer) * 0.5;
        edges.push({
          a: a,
          b: b,
          strength: strength,
          phase: Math.random(),
          color: edgeColorByLayer(avgLayer)
        });
      }

      for (let layer = 1; layer < layerBuckets.length; layer += 1) {
        const current = layerBuckets[layer];
        const previous = layerBuckets[layer - 1];

        for (let i = 0; i < current.length; i += 1) {
          const node = current[i];
          const prevNearest = nearestNodes(node, previous, nodes, layer === 1 ? 1 : 3);
          const sameNearest = nearestNodes(node, current, nodes, layer < 3 ? 2 : 3, 0.38 + layer * 0.22);

          for (let p = 0; p < prevNearest.length; p += 1) {
            addEdge(node, prevNearest[p], 0.88 - p * 0.18);
          }

          for (let s = 0; s < sameNearest.length; s += 1) {
            if (Math.random() < 0.78) {
              addEdge(node, sameNearest[s], 0.44 + Math.random() * 0.22);
            }
          }
        }

        if (layer < layerBuckets.length - 1) {
          const next = layerBuckets[layer + 1];
          for (let i = 0; i < Math.min(current.length, next.length); i += 2) {
            addEdge(current[i], next[(i * 7) % next.length], 0.48 + Math.random() * 0.2);
          }
        }
      }

      const outerNodes = layerBuckets.slice(2).flat();
      const extraLinks = Math.floor(outerNodes.length * (state.isMobile ? 0.22 : 0.36));

      for (let i = 0; i < extraLinks; i += 1) {
        const a = outerNodes[Math.floor(Math.random() * outerNodes.length)];
        const b = outerNodes[Math.floor(Math.random() * outerNodes.length)];
        if (a === b) continue;
        if (dist3(nodes[a], nodes[b]) < 0.95) {
          addEdge(a, b, 0.36 + Math.random() * 0.24);
        }
      }

      const core = layerBuckets[0][0];
      const bridges = state.isMobile ? 10 : 18;
      for (let i = 0; i < bridges; i += 1) {
        const target = outerNodes[Math.floor(Math.random() * outerNodes.length)];
        addEdge(core, target, 0.55 + Math.random() * 0.24);
      }

      for (let l = 0; l < layerBuckets.length - 2; l += 1) {
        const from = layerBuckets[l];
        const to = layerBuckets[l + 2];
        const skipCount = Math.floor(Math.min(from.length, to.length) * 0.18);
        for (let i = 0; i < skipCount; i += 1) {
          const a = from[Math.floor(Math.random() * from.length)];
          const b = to[Math.floor(Math.random() * to.length)];
          addEdge(a, b, 0.32 + Math.random() * 0.18);
        }
      }

      state.nodes = nodes;
      state.edges = edges;
      state.pulses = [];
      state.pulseClock = 0;
      state.burstClock = random(1.8, 3.2);
      state.waveClock = 0;

      const initialPulses = state.isMobile ? 18 : 36;
      for (let i = 0; i < initialPulses; i += 1) {
        spawnPulse(Math.floor(Math.random() * state.edges.length), Math.random());
      }
    }

    function resizeCanvas(rebuildNetwork) {
      state.isMobile = mobileQuery.matches;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = heroSection.clientWidth || window.innerWidth;
      state.height = heroSection.clientHeight || window.innerHeight;
      state.centerX = state.width * (state.isMobile ? 0.5 : 0.78);
      state.centerY = state.height * 0.5;
      state.radius = Math.min(state.width, state.height) * (state.isMobile ? 0.31 : 0.36);

      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      canvas.style.width = state.width + 'px';
      canvas.style.height = state.height + 'px';
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      buildStars();
      if (rebuildNetwork || state.nodes.length === 0) {
        buildNetwork();
      }

      window.requestAnimationFrame(fitCoverText);
    }

    function drawBackground(t) {
      ctx.fillStyle = rgba(COLORS.bg, 1);
      ctx.fillRect(0, 0, state.width, state.height);

      const swingX1 = state.centerX + Math.sin(t * 0.18 * state.motion) * state.width * 0.18;
      const swingY1 = state.centerY + Math.cos(t * 0.15 * state.motion) * state.height * 0.14;
      const swingX2 = state.centerX + Math.cos(t * 0.14 * state.motion + 2.1) * state.width * 0.22;
      const swingY2 = state.centerY + Math.sin(t * 0.12 * state.motion + 1.3) * state.height * 0.16;

      const minDim = Math.min(state.width, state.height);
      const maxDim = Math.max(state.width, state.height);

      const aura = ctx.createRadialGradient(
        swingX1, swingY1, minDim * 0.06,
        state.centerX, state.centerY, maxDim * 0.72
      );
      aura.addColorStop(0, rgba(COLORS.blue, 0.32));
      aura.addColorStop(0.3, rgba(COLORS.deep, 0.26));
      aura.addColorStop(0.65, rgba(COLORS.cyan, 0.12));
      aura.addColorStop(1, rgba(COLORS.bg, 0));
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, state.width, state.height);

      const aura2 = ctx.createRadialGradient(
        swingX2, swingY2, minDim * 0.04,
        state.centerX, state.centerY, maxDim * 0.6
      );
      aura2.addColorStop(0, rgba(COLORS.magenta, 0.18));
      aura2.addColorStop(0.4, rgba(COLORS.deep, 0.12));
      aura2.addColorStop(1, rgba(COLORS.bg, 0));
      ctx.fillStyle = aura2;
      ctx.fillRect(0, 0, state.width, state.height);

      const beam = ctx.createLinearGradient(0, 0, state.width, state.height);
      beam.addColorStop(0, rgba(COLORS.deep, 0.22));
      beam.addColorStop(0.52, 'rgba(7,12,30,0.06)');
      beam.addColorStop(1, rgba(COLORS.cyan, 0.1));
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    function drawStars(t) {
      for (let i = 0; i < state.stars.length; i += 1) {
        const star = state.stars[i];
        const x = star.x * state.width
          + Math.sin(t * 0.24 * state.motion + star.phase) * (14 * star.depth)
          + state.pointerX * 14 * star.depth;
        const y = star.y * state.height
          + Math.cos(t * 0.18 * state.motion + star.phase) * (10 * star.depth)
          + state.pointerY * 10 * star.depth;
        const flicker = (Math.sin(t * star.twinkle * state.motion + star.phase) + 1) * 0.5;
        const alpha = (0.08 + flicker * 0.4) * star.depth;
        const size = star.size * (0.65 + flicker * 0.7);

        ctx.fillStyle = rgba(star.color, alpha);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    }

    function drawNeuronRings(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cx = state.centerX + state.pointerX * 35;
      const cy = state.centerY + state.pointerY * 24;
      const layerRadii = [0.22, 0.4, 0.58, 0.78, 1.0];
      const ringColors = [COLORS.cyan, COLORS.magenta, COLORS.blue, COLORS.soft, COLORS.cyan];

      for (let r = 0; r < layerRadii.length; r += 1) {
        const baseR = layerRadii[r] * state.radius * 1.15;
        const wave = Math.sin(t * 0.8 * state.motion + r * 1.2) * 0.06;
        const radius = baseR * (1 + wave);
        const alpha = 0.03 + 0.025 * Math.sin(t * 1.2 * state.motion + r * 0.9);
        ctx.strokeStyle = rgba(ringColors[r], alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.stroke();
      }

      ctx.restore();
    }

    function projectNodes(t) {
      const yaw = t * 0.2 * state.motion + state.pointerX * 0.5;
      const pitch = Math.sin(t * 0.16 * state.motion) * 0.28 + state.pointerY * 0.25;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);

      const networkCenterX = state.centerX + state.pointerX * 35;
      const networkCenterY = state.centerY + state.pointerY * 24;

      state.waveClock += 0.016 * state.motion;
      const wavePos = (state.waveClock * 0.3) % 1.4;

      for (let i = 0; i < state.nodes.length; i += 1) {
        const node = state.nodes[i];
        const breathe = 1 + Math.sin(t * node.twinkle * state.motion + node.phase) * 0.06;

        const x = node.x * breathe;
        const y = node.y * breathe;
        const z = node.z * breathe;

        const xr = x * cosY - z * sinY;
        const zr = x * sinY + z * cosY;
        const yr = y * cosX - zr * sinX;
        const zf = y * sinX + zr * cosX;

        const vis = clamp((zf + 1.35) / 2.7, 0, 1);
        const perspective = 0.62 + vis * 1.06;

        node.px = networkCenterX + xr * state.radius * perspective;
        node.py = networkCenterY + yr * state.radius * perspective * 0.9;
        node.vis = vis;

        const layerNorm = node.layer / 5;
        const waveDist = Math.abs(layerNorm - wavePos);
        const activation = waveDist < 0.18 ? (1 - waveDist / 0.18) * 0.6 : 0;
        node.activation = node.activation * 0.92 + activation * 0.08;

        node.renderSize = node.baseSize
          * (0.78 + vis * 1.25)
          * (0.92 + Math.sin(t * 1.3 * state.motion + node.phase) * 0.12)
          * (1 + node.activation * 0.8);
      }
    }

    function drawConnections(t) {
      ctx.save();
      ctx.lineCap = 'round';

      for (let i = 0; i < state.edges.length; i += 1) {
        const edge = state.edges[i];
        const a = state.nodes[edge.a];
        const b = state.nodes[edge.b];
        const depthMix = (a.vis + b.vis) * 0.5;
        if (depthMix < 0.08) continue;

        const edgeActivation = (a.activation + b.activation) * 0.5;
        const shimmer = 0.82 + 0.18 * Math.sin(t * 2.2 * state.motion + edge.phase * TAU);
        const alpha = (0.05 + depthMix * 0.26 + edgeActivation * 0.35) * edge.strength * shimmer;
        const width = (0.35 + depthMix * 1.3 + edgeActivation * 1.5) * edge.strength;

        ctx.strokeStyle = rgba(edge.color, alpha * 0.35);
        ctx.lineWidth = width * 3;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();

        ctx.strokeStyle = rgba(edge.color, alpha);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();

        if (edge.phase < 0.2 || edgeActivation > 0.1) {
          const flow = (t * 0.3 * state.motion + edge.phase * 1.7) % 1;
          const hx = lerp(a.px, b.px, flow);
          const hy = lerp(a.py, b.py, flow);
          ctx.fillStyle = rgba(COLORS.cyan, depthMix * 0.3 + edgeActivation * 0.4);
          ctx.beginPath();
          ctx.arc(hx, hy, 1.4 + depthMix * 1.8 + edgeActivation * 2, 0, TAU);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function updateAndDrawPulses(dt) {
      state.pulseClock += dt * (state.isMobile ? 9 : 16) * state.motion;
      while (state.pulseClock >= 1) {
        spawnPulse();
        state.pulseClock -= 1;
      }

      state.burstClock -= dt * state.motion;
      if (state.burstClock <= 0 && state.edges.length) {
        const burstCount = state.isMobile ? 6 : 12;
        const seedEdge = Math.floor(Math.random() * state.edges.length);
        for (let i = 0; i < burstCount; i += 1) {
          spawnPulse((seedEdge + i * 13) % state.edges.length, Math.random() * 0.25);
        }
        state.burstClock = random(1.4, 2.8);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = state.pulses.length - 1; i >= 0; i -= 1) {
        const pulse = state.pulses[i];
        const edge = state.edges[pulse.edgeIndex];
        if (!edge) {
          state.pulses.splice(i, 1);
          continue;
        }

        const a = state.nodes[edge.a];
        const b = state.nodes[edge.b];
        const depthMix = (a.vis + b.vis) * 0.5;
        if (depthMix <= 0.05) continue;

        pulse.progress += dt * pulse.speed;
        if (pulse.progress >= 1.05) {
          b.activation = Math.min(1, b.activation + 0.15);
          state.pulses.splice(i, 1);
          continue;
        }

        const tailT = Math.max(0, pulse.progress - 0.12);
        const x = lerp(a.px, b.px, pulse.progress);
        const y = lerp(a.py, b.py, pulse.progress);
        const tx = lerp(a.px, b.px, tailT);
        const ty = lerp(a.py, b.py, tailT);

        const fade = pulse.progress < 0.85 ? 1 : 1 - (pulse.progress - 0.85) / 0.2;
        const alpha = clamp((0.22 + depthMix * 0.72) * fade, 0, 1);

        ctx.strokeStyle = rgba(pulse.color, alpha * 0.55);
        ctx.lineWidth = pulse.radius * (0.9 + depthMix * 1.3);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        const glowRadius = pulse.radius * (2.2 + depthMix * 2.6);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        glow.addColorStop(0, rgba(pulse.color, alpha));
        glow.addColorStop(0.4, rgba(pulse.color, alpha * 0.4));
        glow.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawCore(t) {
      const x = state.centerX + state.pointerX * 26;
      const y = state.centerY + state.pointerY * 18;
      const pulse = 1 + Math.sin(t * 1.5 * state.motion) * 0.12;
      const radius = state.radius * 0.14 * pulse;

      for (let ring = 3; ring >= 1; ring -= 1) {
        const ringR = radius * (1.8 + ring * 0.8);
        const ringAlpha = 0.04 + 0.03 * Math.sin(t * 2 * state.motion + ring * 1.1);
        ctx.strokeStyle = rgba(COLORS.cyan, ringAlpha);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, TAU);
        ctx.stroke();
      }

      const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.8);
      halo.addColorStop(0, rgba(COLORS.cyan, 0.32));
      halo.addColorStop(0.25, rgba(COLORS.blue, 0.22));
      halo.addColorStop(0.6, rgba(COLORS.magenta, 0.08));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3.8, 0, TAU);
      ctx.fill();

      const core = ctx.createRadialGradient(x, y, 0, x, y, radius);
      core.addColorStop(0, rgba(COLORS.soft, 0.98));
      core.addColorStop(0.3, rgba(COLORS.cyan, 0.75));
      core.addColorStop(0.7, rgba(COLORS.blue, 0.3));
      core.addColorStop(1, rgba(COLORS.deep, 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }

    function drawNodes() {
      const sorted = state.nodes.slice().sort(function(a, b) {
        return a.vis - b.vis;
      });

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < sorted.length; i += 1) {
        const node = sorted[i];
        const alpha = 0.12 + node.vis * 0.88;
        const activation = node.activation || 0;
        const radius = node.renderSize * (node.layer === 0 ? 1.8 : 1);
        if (radius <= 0.3) continue;

        if (activation > 0.02) {
          ctx.fillStyle = rgba(COLORS.cyan, activation * alpha * 0.3);
          ctx.beginPath();
          ctx.arc(node.px, node.py, radius * (3.5 + activation * 3), 0, TAU);
          ctx.fill();
        }

        ctx.fillStyle = rgba(node.color, alpha * (0.22 + activation * 0.3));
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius * 2.6, 0, TAU);
        ctx.fill();

        ctx.fillStyle = rgba(node.color, alpha * (0.7 + activation * 0.3));
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius, 0, TAU);
        ctx.fill();

        ctx.fillStyle = rgba(COLORS.soft, alpha * (0.75 + activation * 0.25));
        ctx.beginPath();
        ctx.arc(node.px, node.py, radius * 0.38, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    function render(now) {
      if (!state.running) return;

      const t = now * 0.001;
      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      state.pointerX = lerp(state.pointerX, state.targetPointerX, 0.035);
      state.pointerY = lerp(state.pointerY, state.targetPointerY, 0.035);

      drawBackground(t);
      drawStars(t);
      drawNeuronRings(t);
      projectNodes(t);
      drawConnections(t);
      updateAndDrawPulses(dt);
      drawCore(t);
      drawNodes();

      rafId = window.requestAnimationFrame(render);
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function() {
        resizeCanvas(true);
      }, 120);
    }

    function onPointerMove(event) {
      if (!state.running) return;
      const rect = heroSection.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const localX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const localY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      state.targetPointerX = localX * 2 - 1;
      state.targetPointerY = localY * 2 - 1;
    }

    function activate() {
      if (state.running) return;
      state.running = true;
      lastTime = performance.now();
      resizeCanvas(true);
      window.requestAnimationFrame(fitCoverText);
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(render);
    }

    function deactivate() {
      state.running = false;
      state.targetPointerX = 0;
      state.targetPointerY = 0;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', function() {
      state.targetPointerX = 0;
      state.targetPointerY = 0;
    });

    if ('ResizeObserver' in window) {
      const heroObserver = new ResizeObserver(function() {
        onResize();
      });
      heroObserver.observe(heroSection);
    }

    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', function(event) {
        state.motion = event.matches ? 0.45 : 1;
      });
    }

    if (document.fonts && typeof document.fonts.ready === 'object') {
      document.fonts.ready.then(function() {
        fitCoverText();
      });
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        deactivate();
      } else if (heroSlide.classList.contains('active')) {
        activate();
      }
    });

    resizeCanvas(true);

    return {
      activate: activate,
      deactivate: deactivate
    };
  }

  function initEvolutionSlide() {
    const slide = document.getElementById('slide-4a');
    const canvas = document.getElementById('evolution-chart');
    const replayBtn = document.getElementById('evolution-replay');
    const cards = slide ? slide.querySelectorAll('.evolution-card') : [];
    const chartShell = slide ? slide.querySelector('.evolution-chart-shell') : null;

    if (!slide || !canvas) {
      return {
        activate() {},
        deactivate() {}
      };
    }

    if (typeof Chart === 'undefined') {
      if (replayBtn) {
        replayBtn.hidden = true;
      }
      if (chartShell) {
        chartShell.innerHTML = '<div class="evolution-chart-fallback">No se pudo cargar el grafico interactivo. Si quieres, puedo dejar esta slide 100% offline.</div>';
      }
      return {
        activate() {},
        deactivate() {}
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        activate() {},
        deactivate() {}
      };
    }

    const baseColors = ['#00B2E3', '#2A57D2', '#6929C4'];
    const currentYear = 2026;
    const currentYearLabel = '2026 - Hoy';
    const years = [];
    let chart = null;
    let buildTimer = 0;

    for (let year = 2018; year <= 2030; year += 0.1) {
      years.push(Math.round(year * 10) / 10);
    }

    function sigmoid(x, x0, k, maxValue) {
      return maxValue / (1 + Math.exp(-k * (x - x0)));
    }

    const dataTraditional = years.map(function(year) {
      return sigmoid(year, 2020, 0.8, 85);
    });
    const dataGenerative = years.map(function(year) {
      return sigmoid(year, 2023.5, 1.5, 95);
    });
    const dataAgentic = years.map(function(year) {
      return sigmoid(year, 2026.5, 1.2, 90);
    });

    const totalDuration = 2500;
    const delayBetweenPoints = totalDuration / years.length;

    function hexToRgba(hex, alpha) {
      const normalized = hex.replace('#', '');
      const bigint = parseInt(normalized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function previousY(context) {
      if (context.index === 0) {
        return context.chart.scales.y.getPixelForValue(100);
      }
      return context.chart.getDatasetMeta(context.datasetIndex).data[context.index - 1].getProps(['y'], true).y;
    }

    function clearCardHighlight() {
      cards.forEach(function(card) {
        card.classList.remove('is-active');
      });
    }

    function showAllDatasets() {
      if (!chart) return;

      chart.data.datasets.forEach(function(dataset, index) {
        dataset.hidden = false;
        chart.setDatasetVisibility(index, true);
      });
    }

    function restoreChartHighlight() {
      clearCardHighlight();
      if (!chart) return;

      chart.data.datasets.forEach(function(dataset, index) {
        dataset.borderWidth = 4;
        dataset.borderColor = baseColors[index];
        dataset.backgroundColor = hexToRgba(baseColors[index], 0.1);
      });
      chart.update('none');
    }

    function highlightDataset(index) {
      if (!chart) return;

      clearCardHighlight();
      cards.forEach(function(card) {
        if (parseInt(card.getAttribute('data-dataset'), 10) === index) {
          card.classList.add('is-active');
        }
      });

      chart.data.datasets.forEach(function(dataset, datasetIndex) {
        const isActive = datasetIndex === index;
        dataset.borderWidth = isActive ? 6 : 2;
        dataset.borderColor = isActive ? baseColors[datasetIndex] : hexToRgba(baseColors[datasetIndex], 0.18);
        dataset.backgroundColor = isActive ? hexToRgba(baseColors[datasetIndex], 0.16) : hexToRgba(baseColors[datasetIndex], 0.04);
      });
      chart.update('none');
    }

    const currentYearPlugin = {
      id: 'evolutionCurrentYearLine',
      afterDraw: function(chartInstance) {
        const xAxis = chartInstance.scales.x;
        const yAxis = chartInstance.scales.y;
        const chartArea = chartInstance.chartArea;
        if (!xAxis || !yAxis || !chartArea) return;

        let currentYearIndex = -1;
        for (let i = 0; i < chartInstance.data.labels.length; i += 1) {
          if (Math.abs(chartInstance.data.labels[i] - currentYear) < 0.05) {
            currentYearIndex = i;
            break;
          }
        }

        if (currentYearIndex === -1) return;

        const chartCtx = chartInstance.ctx;
        const xPixel = xAxis.getPixelForValue(currentYearIndex);
        if (!Number.isFinite(xPixel)) return;

        const labelWidth = 116;
        const labelHeight = 28;
        const labelX = chartArea.right - labelWidth - 6;
        const labelY = chartArea.top + 8;

        chartCtx.save();
        chartCtx.shadowColor = 'rgba(239, 68, 68, 0.52)';
        chartCtx.shadowBlur = 14;
        chartCtx.beginPath();
        chartCtx.moveTo(xPixel, chartArea.top);
        chartCtx.lineTo(xPixel, chartArea.bottom);
        chartCtx.lineWidth = 4;
        chartCtx.lineCap = 'round';
        chartCtx.strokeStyle = 'rgba(248, 55, 65, 1)';
        chartCtx.setLineDash([]);
        chartCtx.stroke();

        chartCtx.shadowBlur = 0;
        chartCtx.setLineDash([]);
        chartCtx.fillStyle = 'rgba(127, 29, 29, 0.94)';
        chartCtx.fillRect(labelX, labelY, labelWidth, labelHeight);
        chartCtx.strokeStyle = 'rgba(248, 113, 113, 0.88)';
        chartCtx.strokeRect(labelX, labelY, labelWidth, labelHeight);

        chartCtx.fillStyle = '#ffffff';
        chartCtx.font = 'bold 12px "Inter", sans-serif';
        chartCtx.textAlign = 'center';
        chartCtx.textBaseline = 'middle';
        chartCtx.fillText(currentYearLabel, labelX + labelWidth / 2, labelY + labelHeight / 2);

        chartCtx.restore();
      }
    };

    function createChartConfig() {
      return {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            {
              label: 'IA Tradicional',
              data: dataTraditional,
              borderColor: baseColors[0],
              backgroundColor: hexToRgba(baseColors[0], 0.1),
              borderWidth: 4,
              pointRadius: 0,
              pointHoverRadius: 7,
              fill: true,
              tension: 0.4
            },
            {
              label: 'IA Generativa',
              data: dataGenerative,
              borderColor: baseColors[1],
              backgroundColor: hexToRgba(baseColors[1], 0.1),
              borderWidth: 4,
              pointRadius: 0,
              pointHoverRadius: 7,
              fill: true,
              tension: 0.4
            },
            {
              label: 'IA Agentica',
              data: dataAgentic,
              borderColor: baseColors[2],
              backgroundColor: hexToRgba(baseColors[2], 0.1),
              borderWidth: 4,
              pointRadius: 0,
              pointHoverRadius: 7,
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            x: {
              type: 'number',
              easing: 'linear',
              duration: delayBetweenPoints,
              from: NaN,
              delay: function(context) {
                if (context.type !== 'data' || context.xStarted) return 0;
                context.xStarted = true;
                return context.index * delayBetweenPoints;
              }
            },
            y: {
              type: 'number',
              easing: 'linear',
              duration: delayBetweenPoints,
              from: previousY,
              delay: function(context) {
                if (context.type !== 'data' || context.yStarted) return 0;
                context.yStarted = true;
                return context.index * delayBetweenPoints;
              }
            }
          },
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              onClick: function(event, legendItem, legend) {
                const datasetIndex = legendItem.datasetIndex;
                if (typeof datasetIndex !== 'number') return;

                const chartInstance = legend.chart;
                const shouldShow = !chartInstance.isDatasetVisible(datasetIndex);
                chartInstance.setDatasetVisibility(datasetIndex, shouldShow);
                clearCardHighlight();
                chartInstance.update();
              },
              labels: {
                color: '#cbd5e1',
                font: {
                  size: 13,
                  family: 'Inter, sans-serif'
                },
                usePointStyle: true,
                padding: 16
              }
            },
            tooltip: {
              backgroundColor: 'rgba(9, 15, 28, 0.96)',
              titleColor: '#ffffff',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              /* PARA CONTROLAR EL TAMAÑO DEL CUADRO: Ajustar padding (margen interno) */
              padding: 16,
              /* PARA CONTROLAR EL TAMAÑO DE LA FUENTE (Año): */
              titleFont: { size: 21 },
              /* PARA CONTROLAR EL TAMAÑO DE LA FUENTE (Datos de IA): */
              bodyFont: { size: 16 },
              callbacks: {
                title: function(context) {
                  return 'Ano: ' + context[0].label;
                },
                label: function(context) {
                  return context.dataset.label + ': ' + Math.round(context.raw) + '% de adopcion';
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(255,255,255,0.05)',
                drawBorder: false
              },
              ticks: {
                color: '#94a3b8',
                font: { size: 12 },
                maxTicksLimit: 13,
                callback: function(value) {
                  const label = this.getLabelForValue(value);
                  return label % 1 === 0 ? label : '';
                }
              }
            },
            y: {
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Nivel de adopcion e impacto (%)',
                color: '#94a3b8',
                font: {
                  size: 13,
                  weight: 'bold'
                }
              },
              grid: {
                color: 'rgba(255,255,255,0.05)',
                drawBorder: false
              },
              ticks: {
                color: '#94a3b8',
                font: { size: 12 }
              }
            }
          }
        },
        plugins: [currentYearPlugin]
      };
    }

    function buildChart(forceReplay) {
      clearTimeout(buildTimer);
      buildTimer = window.setTimeout(function() {
        if (!slide.classList.contains('active')) return;

        if (forceReplay && chart) {
          chart.destroy();
          chart = null;
        }

        if (!chart) {
          chart = new Chart(ctx, createChartConfig());
        } else {
          chart.resize();
          restoreChartHighlight();
        }
      }, 80);
    }

    cards.forEach(function(card) {
      const datasetIndex = parseInt(card.getAttribute('data-dataset'), 10);
      card.addEventListener('mouseenter', function() {
        highlightDataset(datasetIndex);
      });
      card.addEventListener('mouseleave', function() {
        restoreChartHighlight();
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        showAllDatasets();
        buildChart(true);
      });
    }

    window.addEventListener('resize', function() {
      if (chart) {
        chart.resize();
      }
    }, { passive: true });

    return {
      activate: function() {
        buildChart(false);
      },
      deactivate: function() {
        clearTimeout(buildTimer);
        restoreChartHighlight();
      }
    };
  }

  function initSlideFourUrgency() {
    const slide = document.getElementById('slide-4');
    const chartShell = document.getElementById('slide4-chart-shell');
    const chartSvg = document.getElementById('slide4-chart-svg');
    const slider = document.getElementById('slide4-time-slider');
    const maskRect = document.getElementById('slide4-mask-rect');
    const scrubberGroup = document.getElementById('slide4-scrubber-group');
    const scrubberLine = document.getElementById('slide4-scrubber-line');
    const aiPoint = document.getElementById('slide4-ai-point');
    const humanPoint = document.getElementById('slide4-human-point');
    const tooltip = document.getElementById('slide4-tooltip');
    const tooltipTitle = document.getElementById('slide4-tooltip-title');
    const tooltipAi = document.getElementById('slide4-tooltip-ai');
    const tooltipHuman = document.getElementById('slide4-tooltip-human');
    const pathAi = document.getElementById('slide4-path-ai');
    const pathHuman = document.getElementById('slide4-path-human');
    const areaAi = document.getElementById('slide4-area-ai');
    const labels = {
      0: document.getElementById('slide4-label-0'),
      7: document.getElementById('slide4-label-7'),
      14: document.getElementById('slide4-label-14'),
      21: document.getElementById('slide4-label-21')
    };

    if (!slide || !chartShell || !chartSvg || !slider || !maskRect || !scrubberGroup || !scrubberLine || !aiPoint || !humanPoint || !tooltip || !tooltipTitle || !tooltipAi || !tooltipHuman || !pathAi || !pathHuman || !areaAi) {
      return {
        activate: function() {},
        deactivate: function() {}
      };
    }

    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 300;
    const MAX_MONTHS = 21;
    const MAX_MULTIPLIER = 8;
    let active = false;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getX(months) {
      return (months / MAX_MONTHS) * SVG_WIDTH;
    }

    function getY(multiplier) {
      return SVG_HEIGHT - (multiplier / MAX_MULTIPLIER) * SVG_HEIGHT;
    }

    function getAiMultiplier(months) {
      return Math.pow(2, months / 7);
    }

    function getHumanMultiplier(months) {
      return 1 + (months / MAX_MONTHS) * 1.5;
    }

    function buildPaths() {
      let aiD = 'M 0,' + getY(1);
      let areaD = 'M 0,' + SVG_HEIGHT + ' L 0,' + getY(1);
      let humanD = 'M 0,' + getY(1);

      for (let month = 0; month <= MAX_MONTHS; month += 0.5) {
        const x = getX(month);
        const aiY = getY(getAiMultiplier(month));
        const humanY = getY(getHumanMultiplier(month));
        aiD += ' L ' + x + ',' + aiY;
        areaD += ' L ' + x + ',' + aiY;
        humanD += ' L ' + x + ',' + humanY;
      }

      areaD += ' L ' + SVG_WIDTH + ',' + SVG_HEIGHT + ' Z';
      pathAi.setAttribute('d', aiD);
      pathHuman.setAttribute('d', humanD);
      areaAi.setAttribute('d', areaD);
    }

    function setActiveLabel(months) {
      const anchors = [0, 7, 14, 21];
      let closest = anchors[0];
      let closestDistance = Math.abs(months - anchors[0]);

      for (let i = 1; i < anchors.length; i += 1) {
        const distance = Math.abs(months - anchors[i]);
        if (distance < closestDistance) {
          closest = anchors[i];
          closestDistance = distance;
        }
      }

      anchors.forEach(function(anchor) {
        if (labels[anchor]) {
          labels[anchor].classList.toggle('is-active', anchor === closest);
        }
      });
    }

    function update(months) {
      const safeMonths = clamp(months, 0, MAX_MONTHS);
      const xPos = getX(safeMonths);
      const aiValue = getAiMultiplier(safeMonths);
      const humanValue = getHumanMultiplier(safeMonths);
      const aiY = getY(aiValue);
      const humanY = getY(humanValue);
      const chartWidth = chartSvg.clientWidth || chartShell.clientWidth || SVG_WIDTH;
      const chartHeight = chartSvg.clientHeight || chartShell.clientHeight || SVG_HEIGHT;
      const tooltipWidth = tooltip.offsetWidth || 170;
      const xPx = (xPos / SVG_WIDTH) * chartWidth;
      const yPx = (aiY / SVG_HEIGHT) * chartHeight;
      const safeTooltipX = clamp(xPx, tooltipWidth * 0.5 + 18, chartWidth - tooltipWidth * 0.5 - 18);
      const safeTooltipY = clamp(yPx, 18, chartHeight - 22);
      const shouldShowBelow = yPx < 88;

      maskRect.setAttribute('width', Math.max(xPos, 2));
      scrubberLine.setAttribute('x1', xPos);
      scrubberLine.setAttribute('x2', xPos);
      aiPoint.setAttribute('cx', xPos);
      aiPoint.setAttribute('cy', aiY);
      humanPoint.setAttribute('cx', xPos);
      humanPoint.setAttribute('cy', humanY);

      tooltip.style.left = safeTooltipX + 'px';
      tooltip.style.top = safeTooltipY + 'px';
      tooltipTitle.textContent = safeMonths < 0.05 ? 'Hoy' : 'Mes +' + Math.round(safeMonths);
      tooltipAi.textContent = aiValue.toFixed(1) + 'x';
      tooltipHuman.textContent = humanValue.toFixed(1) + 'x';
      tooltip.classList.toggle('is-below', shouldShowBelow);
      setActiveLabel(safeMonths);

      if (active) {
        scrubberGroup.style.display = 'block';
        tooltip.classList.add('is-visible');
      }
    }

    slider.addEventListener('input', function() {
      update(parseFloat(slider.value));
    });

    window.addEventListener('resize', function() {
      if (!active) return;
      update(parseFloat(slider.value));
    }, { passive: true });

    buildPaths();

    return {
      activate: function() {
        active = true;
        slider.value = '0';
        update(0);
      },
      deactivate: function() {
        active = false;
        scrubberGroup.style.display = 'none';
        tooltip.classList.remove('is-visible');
        if (document.activeElement === slider) {
          slider.blur();
        }
      }
    };
  }

  function initPremiumModelsSlide() {
    const slide = document.getElementById('slide-models-premium');
    if (!slide || typeof Chart !== 'function') {
      return {
        activate: function() {},
        deactivate: function() {}
      };
    }

    const cards = Array.prototype.slice.call(slide.querySelectorAll('.premium-model-card'));
    const charts = {};
    const buildTimers = [];
    const reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let resizeTimer = null;

    const radarLabels = [
      ['Razonamiento', 'autonomo'],
      ['Codigo', 'de sistemas'],
      ['Contexto', 'masivo'],
      ['Procesamiento', 'multimodal'],
      'Precision',
      'Creatividad'
    ];

    const modelConfigs = {
      chatgpt: {
        canvasId: 'premium-radar-chatgpt',
        accent: '#10A37F',
        accentRgb: '16,163,127',
        deltaLabel: '+76,7%',
        free: [50, 40, 40, 50, 60, 60],
        paid: [90, 90, 90, 90, 90, 80]
      },
      gemini: {
        canvasId: 'premium-radar-gemini',
        accent: '#7C6CFF',
        accentRgb: '124,108,255',
        deltaLabel: '+51.69%',
        free: [70, 65, 50, 60, 80, 78],
        paid: [99, 98, 100, 97, 99, 98]
      },
      claude: {
        canvasId: 'premium-radar-claude',
        accent: '#D97706',
        accentRgb: '217,119,6',
        deltaLabel: '+38,78%',
        free: [65, 70, 60, 68, 72, 75],
        paid: [95, 92, 98, 93, 97, 94]
      }
    };

    function updateDeltaBadges() {
      cards.forEach(function(card) {
        const platform = card.getAttribute('data-premium-platform');
        const config = modelConfigs[platform];
        const delta = card.querySelector('.premium-model-card__delta');

        if (!config || !delta) return;
        delta.textContent = config.deltaLabel;
      });
    }

    function clearBuildTimers() {
      while (buildTimers.length) {
        clearTimeout(buildTimers.pop());
      }
    }

    function destroyCharts() {
      Object.keys(charts).forEach(function(key) {
        if (charts[key]) {
          charts[key].destroy();
          charts[key] = null;
        }
      });
    }

    function createRadarConfig(config) {
      const freeBorder = 'rgba(165,176,191,0.82)';
      const freeFill = 'rgba(148,163,184,0.08)';
      const freePoint = 'rgba(191,201,213,0.96)';
      const gridColor = 'rgba(255,255,255,0.08)';
      const labelColor = 'rgba(232,238,245,0.84)';
      const tickColor = 'rgba(255,255,255,0.34)';
      const paidFill = 'rgba(' + config.accentRgb + ',0.18)';
      const paidPoint = 'rgba(' + config.accentRgb + ',0.98)';

      return {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets: [
            {
              label: 'Gratis',
              data: config.free,
              backgroundColor: freeFill,
              borderColor: freeBorder,
              borderWidth: 1.8,
              borderDash: [6, 4],
              pointBackgroundColor: freePoint,
              pointBorderColor: '#08101c',
              pointRadius: 2.6,
              pointHoverRadius: 2.6
            },
            {
              label: 'Pago',
              data: config.paid,
              backgroundColor: paidFill,
              borderColor: config.accent,
              borderWidth: 2.6,
              pointBackgroundColor: paidPoint,
              pointBorderColor: '#08101c',
              pointRadius: 3.6,
              pointHoverRadius: 3.6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reducedMotion ? false : {
            duration: 1100,
            easing: 'easeOutQuart'
          },
          interaction: {
            mode: 'nearest',
            intersect: false
          },
          elements: {
            line: {
              tension: 0.14
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              displayColors: false,
              backgroundColor: 'rgba(6,10,20,0.94)',
              titleColor: '#ffffff',
              bodyColor: 'rgba(232,238,245,0.86)',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.raw + '/100';
                }
              }
            }
          },
          layout: {
            padding: {
              top: 24,
              right: 28,
              bottom: 24,
              left: 28
            }
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: {
                display: false,
                stepSize: 20,
                color: tickColor,
                backdropColor: 'transparent'
              },
              grid: {
                color: gridColor
              },
              angleLines: {
                color: gridColor
              },
              pointLabels: {
                color: labelColor,
                font: {
                  size: 13,
                  weight: '800',
                  lineHeight: 1.14,
                  family: 'Space Grotesk, sans-serif'
                }
              }
            }
          }
        }
      };
    }

    function buildChart(platform) {
      const config = modelConfigs[platform];
      if (!config) return;

      const canvas = document.getElementById(config.canvasId);
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      charts[platform] = new Chart(context, createRadarConfig(config));
    }

    function buildAllCharts() {
      clearBuildTimers();
      destroyCharts();
      cards.forEach(function(card, index) {
        const platform = card.getAttribute('data-premium-platform');
        const delay = reducedMotion ? 0 : (index * 120);
        const timer = window.setTimeout(function() {
          buildChart(platform);
        }, delay);
        buildTimers.push(timer);
      });
    }

    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function() {
        if (!slide.classList.contains('active')) return;
        buildAllCharts();
      }, 180);
    }, { passive: true });

    updateDeltaBadges();

    return {
      activate: function() {
        updateDeltaBadges();
        buildAllCharts();
      },
      deactivate: function() {
        clearBuildTimers();
        destroyCharts();
      }
    };
  }

  // ===== SLIDE NAVIGATION =====
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  let currentSlide = 0;
  let isAnimating = false;

  const prevArrow = document.getElementById('prev-arrow');
  const nextArrow = document.getElementById('next-arrow');
  const counter = document.getElementById('slide-counter');
  const progressBar = document.getElementById('progress-bar');
  const pdfCurrentButton = document.getElementById('pdf-current');
  const pdfAllButton = document.getElementById('pdf-all');
  const pdfExportStatus = document.getElementById('pdf-export-status');
  const summarySlide = document.getElementById('slide-summary');
  const summaryFocusButtons = document.querySelectorAll('.summary-focus-btn');
  const adoptionCard = document.getElementById('adoption-card');
  const adoptionGrid = document.getElementById('adoption-grid');
  const adoptionTooltip = document.getElementById('adoption-tooltip');
  const adoptionLegendItems = document.querySelectorAll('.adoption-legend-item');
  const slideOneHero = initSlideOneHero();
  const slideFourUrgency = initSlideFourUrgency();
  const premiumModelsSlide = initPremiumModelsSlide();
  const evolutionSlide = initEvolutionSlide();

  const adoptionDataConfig = [
    { class: 'grey', count: 2100, label: 'Nunca ha usado IA' },
    { class: 'green', count: 393, label: 'Usa IA gratuita' },
    { class: 'yellow', count: 6, label: 'Paga por IA' },
    { class: 'red', count: 1, label: 'Usa IA para programar' }
  ];

  let adoptionBuilt = false;
  let adoptionAnimated = false;
  let isExporting = false;
  let pdfStatusTimer = null;

  function setSummaryFocus(focus) {
    if (!summarySlide) return;

    if (focus) {
      summarySlide.dataset.summaryFocus = focus;
    } else {
      delete summarySlide.dataset.summaryFocus;
    }

    summaryFocusButtons.forEach(function(button) {
      const isActive = Boolean(focus) && button.dataset.summaryFocus === focus;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  summaryFocusButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      const requestedFocus = button.dataset.summaryFocus;
      const currentFocus = summarySlide ? summarySlide.dataset.summaryFocus : '';
      setSummaryFocus(currentFocus === requestedFocus ? '' : requestedFocus);
    });
  });

  function buildAdoptionGrid() {
    if (adoptionBuilt || !adoptionGrid) return;

    const fragment = document.createDocumentFragment();
    let dotIndex = 0;

    adoptionDataConfig.forEach(category => {
      for (let i = 0; i < category.count; i++) {
        const dot = document.createElement('div');
        dot.className = category.class === 'grey' ? 'adoption-dot' : `adoption-dot ${category.class}`;
        dot.dataset.label = category.label;
        dot.dataset.group = category.class;
        dot.style.animationDelay = `${dotIndex * 0.0002}s`;
        fragment.appendChild(dot);
        dotIndex++;
      }
    });

    adoptionGrid.appendChild(fragment);
    adoptionBuilt = true;
  }

  function clearAdoptionHighlight() {
    if (!adoptionGrid) return;
    Array.from(adoptionGrid.children).forEach(dot => dot.classList.remove('dimmed'));
    if (adoptionTooltip) {
      adoptionTooltip.classList.remove('visible');
    }
  }

  function playAdoptionGrid() {
    buildAdoptionGrid();
    if (!adoptionCard || adoptionAnimated) return;
    adoptionCard.classList.add('play');
    adoptionAnimated = true;
  }

  if (adoptionGrid && adoptionTooltip) {
    adoptionGrid.addEventListener('mouseover', (e) => {
      if (!e.target.classList.contains('adoption-dot')) return;
      adoptionTooltip.innerHTML = `<strong>${e.target.dataset.label}</strong><br>1 punto = ~3.2M personas`;
      adoptionTooltip.classList.add('visible');
    });

    adoptionGrid.addEventListener('mousemove', (e) => {
      if (!e.target.classList.contains('adoption-dot')) return;
      adoptionTooltip.style.left = `${e.clientX}px`;
      adoptionTooltip.style.top = `${e.clientY}px`;
    });

    adoptionGrid.addEventListener('mouseout', (e) => {
      if (!e.target.classList.contains('adoption-dot')) return;
      adoptionTooltip.classList.remove('visible');
    });
  }

  adoptionLegendItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (!adoptionGrid || !adoptionBuilt) return;
      const filterClass = item.dataset.filter;
      Array.from(adoptionGrid.children).forEach(dot => {
        dot.classList.toggle('dimmed', dot.dataset.group !== filterClass);
      });
    });

    item.addEventListener('mouseleave', clearAdoptionHighlight);
  });

  function updateUI() {
    counter.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    progressBar.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
    prevArrow.classList.toggle('disabled', currentSlide === 0);
    nextArrow.classList.toggle('disabled', currentSlide === totalSlides - 1);
  }

  function goToSlide(index, direction) {
    if (isExporting || isAnimating || index < 0 || index >= totalSlides || index === currentSlide) return;
    isAnimating = true;

    const oldSlide = slides[currentSlide];
    const newSlide = slides[index];

    if (newSlide.id === 'slide-1') {
      slideOneHero.activate();
    }

    if (oldSlide.id === 'slide-5a') {
      clearAdoptionHighlight();
    }

    // Reset animation classes
    oldSlide.classList.add('animating');
    newSlide.classList.add('animating');

    // Position new slide off-screen on the correct side
    newSlide.style.transition = 'none';
    newSlide.style.transform = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
    newSlide.style.opacity = '0';
    newSlide.classList.add('active');

    // Force reflow
    newSlide.offsetHeight;

    // Re-enable transitions
    newSlide.style.transition = '';

    // Animate
    requestAnimationFrame(() => {
      oldSlide.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';
      oldSlide.style.opacity = '0';
      newSlide.style.transform = 'translateX(0)';
      newSlide.style.opacity = '1';
    });

    setTimeout(() => {
      oldSlide.classList.remove('active', 'animating');
      oldSlide.style.transform = '';
      oldSlide.style.opacity = '';
      oldSlide.style.transition = '';
      newSlide.classList.remove('animating');
      newSlide.style.transform = '';
      newSlide.style.opacity = '';
      newSlide.style.transition = '';

      currentSlide = index;
      if (oldSlide.id === 'slide-1' && newSlide.id !== 'slide-1') {
        slideOneHero.deactivate();
      }
      if (oldSlide.id === 'slide-2' && newSlide.id !== 'slide-2') {
        slideTwoStory.deactivate();
      }
      if (oldSlide.id === 'slide-3' && newSlide.id !== 'slide-3') {
        slideThreeTension.deactivate();
      }
      if (oldSlide.id === 'slide-6' && newSlide.id !== 'slide-6') {
        slideSixSignal.deactivate();
      }
      if (oldSlide.id === 'slide-4' && newSlide.id !== 'slide-4') {
        slideFourUrgency.deactivate();
      }
      if (oldSlide.id === 'slide-4a' && newSlide.id !== 'slide-4a') {
        evolutionSlide.deactivate();
      }
      if (oldSlide.id === 'slide-models-premium' && newSlide.id !== 'slide-models-premium') {
        premiumModelsSlide.deactivate();
      }
      updateUI();
      triggerSlideAnimations(currentSlide);
      isAnimating = false;
    }, 650);
  }

  function nextSlide() { goToSlide(currentSlide + 1, 'next'); }
  function prevSlide() { goToSlide(currentSlide - 1, 'prev'); }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (isExporting) return;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && document.activeElement && document.activeElement.id === 'slide4-time-slider') {
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextSlide(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevSlide(); }
  });

  // Arrow clicks
  prevArrow.addEventListener('click', prevSlide);
  nextArrow.addEventListener('click', nextSlide);

  // ===== SLIDE ANIMATIONS =====
  function triggerSlideAnimations(slideIndex) {
    const slide = slides[slideIndex];

    // Fade-in elements
    const fadeIns = slide.querySelectorAll('.fade-in');
    fadeIns.forEach(el => el.classList.add('visible'));

    // Big numbers
    const bigNums = slide.querySelectorAll('.big-number');
    setTimeout(() => {
      bigNums.forEach(el => el.classList.add('visible'));
    }, 300);

    // Bullet lists
    const bullets = slide.querySelectorAll('.bullet-list li');
    bullets.forEach((li, i) => {
      setTimeout(() => li.classList.add('visible'), 400 + i * 150);
    });

    if (slide.id === 'slide-2') {
      setTimeout(function() {
        slideTwoStory.activate();
      }, 180);
    }

    if (slide.id === 'slide-3') {
      setTimeout(function() {
        slideThreeTension.activate();
      }, 220);
    }

    if (slide.id === 'slide-6') {
      setTimeout(function() {
        slideSixSignal.activate();
      }, 280);
    }

    if (slide.id === 'slide-4') {
      setTimeout(function() {
        slideFourUrgency.activate();
      }, 220);
    }

    if (slide.id === 'slide-5a') {
      setTimeout(playAdoptionGrid, 260);
    }

    if (slide.id === 'slide-4a') {
      setTimeout(function() {
        evolutionSlide.activate();
      }, 220);
    }

    if (slide.id === 'slide-models-premium') {
      setTimeout(function() {
        premiumModelsSlide.activate();
      }, 220);
    }

  }

  // ===== SLIDE 2 STORY FOCUS =====
  const slideTwoStory = (function() {
    const slide = document.getElementById('slide-2');
    if (!slide) return { activate: function() {}, deactivate: function() {} };

    const stage = slide.querySelector('.s2-metric-stage');
    const numEl = document.getElementById('slide-2-metric-num');
    const buttons = Array.prototype.slice.call(slide.querySelectorAll('.context-sequence__step'));
    const steps = [
      {
        key: 'adoption',
        num: 82, prefix: '', suffix: '%'
      },
      {
        key: 'advantage',
        num: 78, prefix: '', suffix: '%'
      },
      {
        key: 'impact',
        num: 55, prefix: '', suffix: '%'
      }
    ];
    const initialStepIndex = 2;
    let current = -1;
    let counterRAF = null;
    let leavingTimer = null;

    const reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function cancelCounter() {
      if (counterRAF !== null) {
        cancelAnimationFrame(counterRAF);
        counterRAF = null;
      }
    }

    function animateCounter(el, to, prefix, suffix, duration) {
      cancelCounter();
      if (!el) return;
      if (reducedMotion) {
        el.textContent = prefix + to + suffix;
        return;
      }
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(to * eased) + suffix;
        if (t < 1) {
          counterRAF = requestAnimationFrame(tick);
        } else {
          counterRAF = null;
        }
      }
      counterRAF = requestAnimationFrame(tick);
    }

    function applyStep(step, duration) {
      slide.dataset.focusStep = step.key;
      animateCounter(numEl, step.num, step.prefix, step.suffix, duration);
    }

    function syncButtons(index) {
      buttons.forEach(function(button, buttonIndex) {
        const active = buttonIndex === index;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function setStep(index, immediate) {
      const next = Math.max(0, Math.min(index, steps.length - 1));
      if (next === current && !immediate) return;
      const step = steps[next];
      current = next;

      syncButtons(next);

      if (leavingTimer !== null) {
        clearTimeout(leavingTimer);
        leavingTimer = null;
      }

      if (!stage || reducedMotion || immediate) {
        if (stage) stage.classList.remove('is-leaving');
        applyStep(step, immediate ? 1100 : 900);
        return;
      }

      stage.classList.add('is-leaving');
      leavingTimer = setTimeout(function() {
        applyStep(step, 900);
        requestAnimationFrame(function() {
          stage.classList.remove('is-leaving');
        });
        leavingTimer = null;
      }, 150);
    }

    buttons.forEach(function(button) {
      button.addEventListener('click', function() {
        const raw = button.getAttribute('data-step');
        const parsed = parseInt(raw, 10);
        setStep(Number.isNaN(parsed) ? 0 : parsed);
      });
    });

    document.addEventListener('keydown', function(e) {
      if (!slide.classList.contains('active')) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setStep(parseInt(e.key, 10) - 1);
      }
    });

    function activate() {
      current = -1;
      setStep(initialStepIndex, true);
    }

    function deactivate() {
      cancelCounter();
      if (leavingTimer !== null) {
        clearTimeout(leavingTimer);
        leavingTimer = null;
      }
      if (stage) stage.classList.remove('is-leaving');
      current = -1;
      const step = steps[initialStepIndex];
      slide.dataset.focusStep = step.key;
      if (numEl) numEl.textContent = step.prefix + step.num + step.suffix;
      syncButtons(initialStepIndex);
    }

    return { activate: activate, deactivate: deactivate };
  })();

  // ===== SLIDE 3 TENSION =====
  const slideThreeTension = (function() {
    const slide = document.getElementById('slide-3');
    if (!slide) return { activate: function() {}, deactivate: function() {} };

    const stage = slide.querySelector('.t3-stage');
    const investValue = slide.querySelector('.t3-card--invest .t3-card__num-value');
    const matureValue = slide.querySelector('.t3-card--mature .t3-card__num-value');
    const reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let counterStates = [];
    let timers = [];

    function setValue(el, value) {
      if (el) el.textContent = String(value);
    }

    function clearTimers() {
      timers.forEach(function(timerId) { clearTimeout(timerId); });
      timers = [];
    }

    function cancelCounters() {
      counterStates.forEach(function(state) {
        if (state.rafId !== null) cancelAnimationFrame(state.rafId);
      });
      counterStates = [];
    }

    function animateCounter(el, to, prefix, suffix, duration) {
      if (!el) return;
      if (reducedMotion) {
        el.textContent = prefix + to + suffix;
        return;
      }
      const state = { rafId: null };
      counterStates.push(state);
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(to * eased) + suffix;
        if (t < 1) {
          state.rafId = requestAnimationFrame(tick);
        } else {
          state.rafId = null;
        }
      }
      state.rafId = requestAnimationFrame(tick);
    }

    function revealStage() {
      if (!stage) return;
      stage.classList.remove('is-settled');
      requestAnimationFrame(function() {
        stage.classList.add('is-revealed');
      });
    }

    function activate() {
      deactivate();
      revealStage();
      if (reducedMotion) {
        if (stage) stage.classList.add('is-settled');
        setValue(investValue, 92);
        setValue(matureValue, 1);
        return;
      }
      animateCounter(investValue, 92, '', '', 900);
      timers.push(setTimeout(function() {
        animateCounter(matureValue, 1, '', '', 700);
      }, 250));
      timers.push(setTimeout(function() {
        if (stage) stage.classList.add('is-settled');
      }, 1520));
    }

    function deactivate() {
      clearTimers();
      cancelCounters();
      if (stage) stage.classList.remove('is-revealed', 'is-settled');
      setValue(investValue, 0);
      setValue(matureValue, 0);
    }

    deactivate();

    return { activate: activate, deactivate: deactivate };
  })();

  // ===== SLIDE 6 SIGNAL (adopcion vs rezago interactivo) =====
  const slideSixSignal = (function() {
    const slide = document.getElementById('slide-6');
    if (!slide) return { activate: function() {}, deactivate: function() {} };

    const statValue = slide.querySelector('.slide6-stat__num-value');
    const slider = slide.querySelector('#slide6-timeline');
    const timeLabel = slide.querySelector('#slide6-time-label');
    const adoptVal = slide.querySelector('#slide6-metric-adopt');
    const waitVal = slide.querySelector('#slide6-metric-wait');
    const gapVal = slide.querySelector('#slide6-metric-gap');
    const adoptBar = slide.querySelector('#slide6-bar-adopt');
    const waitBar = slide.querySelector('#slide6-bar-wait');
    const centerCircle = slide.querySelector('#slide6-center-circle');
    
    let rafId = null;

    function updateDashboard(val) {
      if (!slider) return;
      
      const v = parseFloat(val);
      const progress = v / 24; // 0 to 1
      
      if (timeLabel) {
        timeLabel.textContent = 'Mes ' + Math.round(v);
      }
      
      // Calculate metrics based on MIT and McKinsey ranges
      const adoptScore = Math.round(progress * 40);
      const waitScore = Math.round(progress * 20); // shown with negative sign in HTML
      
      // Exponential gap multiplier: 1.0x to 3.0x
      let gapMul = 1.0 + (Math.pow(progress, 1.5) * 2.0);
      const gapScore = gapMul.toFixed(1);
      
      if (adoptVal) adoptVal.textContent = adoptScore;
      if (waitVal) waitVal.textContent = waitScore;
      if (gapVal) gapVal.textContent = gapScore;
      
      if (adoptBar) adoptBar.style.width = Math.min(100, progress * 100) + '%';
      if (waitBar) waitBar.style.width = Math.min(100, progress * 100) + '%';
      
      if (centerCircle) {
        if (progress > 0.6) {
          centerCircle.classList.add('pulsing');
        } else {
          centerCircle.classList.remove('pulsing');
        }
      }
    }

    if (slider) {
      slider.addEventListener('input', function(e) {
        updateDashboard(e.target.value);
      });
    }

    function animateCount(target, duration) {
      if (!statValue) return;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        if (statValue) statValue.textContent = Math.round(target * eased);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    function activate() {
      deactivate();
      animateCount(26, 1100);
      updateDashboard(slider ? slider.value : 0);
    }

    function deactivate() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (statValue) statValue.textContent = '0';
      if (slider) {
        slider.value = 0;
        updateDashboard(0);
      }
    }

    deactivate();

    return { activate: activate, deactivate: deactivate };
  })();

  // ===== PDF EXPORT =====
  function wait(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  function waitForPaint() {
    return new Promise(function(resolve) {
      requestAnimationFrame(function() {
        requestAnimationFrame(resolve);
      });
    });
  }

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
      pdfStatusTimer = setTimeout(function() {
        pdfExportStatus.classList.remove('is-visible');
        pdfStatusTimer = null;
      }, autoHideDelay);
    }
  }

  function setPdfBusy(busy) {
    isExporting = busy;
    document.body.classList.toggle('pdf-exporting', busy);
    if (pdfCurrentButton) pdfCurrentButton.disabled = busy;
    if (pdfAllButton) pdfAllButton.disabled = busy;
  }

  function getPdfDependencies() {
    if (typeof window.html2canvas !== 'function' || !window.jspdf || !window.jspdf.jsPDF) {
      setPdfStatus('No se pudieron cargar las librerías PDF. Revisa la conexión y recarga la presentación.', 5200);
      return null;
    }
    return {
      html2canvas: window.html2canvas,
      jsPDF: window.jspdf.jsPDF
    };
  }

  async function waitForExportAssets() {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        // Font loading failures should not block PDF generation.
      }
    }
    await waitForPaint();
  }

  function makeSlideVisibleForExport(slide) {
    const previousClassName = slide.className;
    const previousStyle = slide.getAttribute('style');
    const previousScrollTop = slide.scrollTop;

    slide.classList.add('active');
    slide.classList.remove('animating', 'exit-left', 'exit-right');
    slide.style.transition = 'none';
    slide.style.transform = 'translateX(0)';
    slide.style.opacity = '1';
    slide.style.pointerEvents = 'all';
    slide.style.zIndex = '60';
    slide.style.overflow = 'hidden';
    slide.scrollTop = 0;

    return function restoreSlide() {
      slide.className = previousClassName;
      if (previousStyle === null) {
        slide.removeAttribute('style');
      } else {
        slide.setAttribute('style', previousStyle);
      }
      slide.scrollTop = previousScrollTop;
    };
  }

  async function prepareOriginalSlideForExport(slide, mode) {
    if (slide.id === 'slide-1') {
      slideOneHero.activate();
      await wait(mode === 'deck' ? 420 : 180);
    }

    if (slide.id === 'slide-4a') {
      evolutionSlide.activate();
      await wait(mode === 'deck' ? 2800 : 320);
    }

    if (slide.id === 'slide-5a') {
      playAdoptionGrid();
      await wait(420);
    }

    if (slide.id === 'slide-models-premium') {
      premiumModelsSlide.activate();
      await wait(mode === 'deck' ? 1500 : 1250);
    }

    await waitForPaint();
  }

  function setCloneSlideActive(clonedDocument, slideId) {
    const clonedSlides = clonedDocument.querySelectorAll('.slide');
    clonedSlides.forEach(function(clonedSlide) {
      clonedSlide.classList.remove('active', 'animating', 'exit-left', 'exit-right');
      clonedSlide.style.transition = 'none';
      clonedSlide.style.transform = 'translateX(100%)';
      clonedSlide.style.opacity = '0';
      clonedSlide.style.pointerEvents = 'none';
      clonedSlide.style.zIndex = '1';
    });

    const clonedSlide = clonedDocument.getElementById(slideId);
    if (!clonedSlide) return null;

    clonedSlide.classList.add('active');
    clonedSlide.style.transition = 'none';
    clonedSlide.style.transform = 'translateX(0)';
    clonedSlide.style.opacity = '1';
    clonedSlide.style.pointerEvents = 'all';
    clonedSlide.style.zIndex = '2';
    clonedSlide.style.overflow = 'hidden';
    clonedSlide.scrollTop = 0;

    return clonedSlide;
  }

  function revealCloneAnimations(clonedSlide) {
    clonedSlide.querySelectorAll('.fade-in').forEach(function(el) {
      el.classList.add('visible');
    });
    clonedSlide.querySelectorAll('.big-number').forEach(function(el) {
      el.classList.add('visible');
    });
    clonedSlide.querySelectorAll('.bullet-list li').forEach(function(el) {
      el.classList.add('visible');
    });
    clonedSlide.querySelectorAll('[data-target]').forEach(function(el) {
      if (el.dataset && el.dataset.target) {
        el.textContent = el.dataset.target;
      }
    });
  }

  function forceDeckCloneState(clonedSlide, slideId) {
    if (slideId === 'slide-3') {
      const stage = clonedSlide.querySelector('.t3-stage');
      if (stage) stage.classList.add('is-revealed', 'is-settled');
    }

    if (slideId === 'slide-4') {
      const maskRect = clonedSlide.querySelector('#slide4-mask-rect');
      const scrubberGroup = clonedSlide.querySelector('#slide4-scrubber-group');
      const scrubberLine = clonedSlide.querySelector('#slide4-scrubber-line');
      const aiPoint = clonedSlide.querySelector('#slide4-ai-point');
      const humanPoint = clonedSlide.querySelector('#slide4-human-point');
      const tooltip = clonedSlide.querySelector('#slide4-tooltip');

      if (maskRect) maskRect.setAttribute('width', '500');
      if (scrubberGroup) scrubberGroup.style.display = 'block';
      if (scrubberLine) {
        scrubberLine.setAttribute('x1', '500');
        scrubberLine.setAttribute('x2', '500');
      }
      if (aiPoint) {
        aiPoint.setAttribute('cx', '500');
        aiPoint.setAttribute('cy', '0');
      }
      if (humanPoint) {
        humanPoint.setAttribute('cx', '500');
        humanPoint.setAttribute('cy', '206.25');
      }
      if (tooltip) tooltip.classList.remove('is-visible');

      [0, 7, 14, 21].forEach(function(anchor) {
        const label = clonedSlide.querySelector('#slide4-label-' + anchor);
        if (label) label.classList.toggle('is-active', anchor === 21);
      });
    }

    if (slideId === 'slide-5a') {
      const card = clonedSlide.querySelector('#adoption-card');
      if (card) card.classList.add('play');
      clonedSlide.querySelectorAll('.adoption-dot').forEach(function(dot) {
        dot.style.opacity = '1';
        dot.style.transform = 'scale(1)';
      });
    }

    if (slideId === 'slide-6') {
      const timeLabel = clonedSlide.querySelector('#slide6-time-label');
      const adoptVal = clonedSlide.querySelector('#slide6-metric-adopt');
      const waitVal = clonedSlide.querySelector('#slide6-metric-wait');
      const gapVal = clonedSlide.querySelector('#slide6-metric-gap');
      const adoptBar = clonedSlide.querySelector('#slide6-bar-adopt');
      const waitBar = clonedSlide.querySelector('#slide6-bar-wait');
      const centerCircle = clonedSlide.querySelector('#slide6-center-circle');
      const slider = clonedSlide.querySelector('#slide6-timeline');

      if (slider) slider.value = '24';
      if (timeLabel) timeLabel.textContent = 'Mes 24';
      if (adoptVal) adoptVal.textContent = '40';
      if (waitVal) waitVal.textContent = '20';
      if (gapVal) gapVal.textContent = '3.0';
      if (adoptBar) adoptBar.style.width = '100%';
      if (waitBar) waitBar.style.width = '100%';
      if (centerCircle) centerCircle.classList.add('pulsing');
    }
  }

  function prepareCloneForExport(clonedDocument, slideId, mode) {
    clonedDocument.body.classList.add('pdf-exporting');
    clonedDocument.documentElement.style.width = window.innerWidth + 'px';
    clonedDocument.documentElement.style.height = window.innerHeight + 'px';
    clonedDocument.body.style.width = window.innerWidth + 'px';
    clonedDocument.body.style.height = window.innerHeight + 'px';

    const clonedSlide = setCloneSlideActive(clonedDocument, slideId);
    if (!clonedSlide) return;

    revealCloneAnimations(clonedSlide);
    if (mode === 'deck') {
      forceDeckCloneState(clonedSlide, slideId);
    } else if (slideId === 'slide-5a') {
      forceDeckCloneState(clonedSlide, slideId);
    }
  }

  async function captureSlideCanvas(slide, mode, dependencies) {
    const restoreSlide = makeSlideVisibleForExport(slide);
    try {
      await prepareOriginalSlideForExport(slide, mode);
      return await dependencies.html2canvas(slide, {
        backgroundColor: '#000000',
        scale: Math.min(2, Math.max(1.25, window.devicePixelRatio || 1.5)),
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: function(clonedDocument) {
          prepareCloneForExport(clonedDocument, slide.id, mode);
        }
      });
    } finally {
      restoreSlide();
      if (slide.id === 'slide-1' && slides[currentSlide] !== slide) {
        slideOneHero.deactivate();
      }
      if (slide.id === 'slide-models-premium' && slides[currentSlide] !== slide) {
        premiumModelsSlide.deactivate();
      }
    }
  }

  function createPdfDocument(canvas, dependencies) {
    const pageWidth = 960;
    const pageHeight = Math.round(pageWidth * (canvas.height / canvas.width));
    const orientation = pageWidth >= pageHeight ? 'landscape' : 'portrait';
    const pdf = new dependencies.jsPDF({
      orientation: orientation,
      unit: 'pt',
      format: [pageWidth, pageHeight],
      compress: true
    });

    return {
      pdf: pdf,
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      orientation: orientation
    };
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
      const canvas = await captureSlideCanvas(slide, 'current', dependencies);
      const pdfState = createPdfDocument(canvas, dependencies);
      addCanvasPage(pdfState, canvas, true);
      pdfState.pdf.save('desafia-webinar-lamina-' + String(slideIndex + 1).padStart(2, '0') + '-' + getPdfDateStamp() + '.pdf');
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
        if (!pdfState) {
          pdfState = createPdfDocument(canvas, dependencies);
        }
        addCanvasPage(pdfState, canvas, i === 0);
      }

      if (pdfState) {
        pdfState.pdf.save('desafia-webinar-presentacion-completa-' + getPdfDateStamp() + '.pdf');
      }
      setPdfStatus('PDF completo descargado.', 3600);
    } catch (err) {
      console.error('PDF deck export failed:', err);
      setPdfStatus('No se pudo generar el PDF completo. Intenta nuevamente.', 5600);
    } finally {
      if (slides[currentSlide] && slides[currentSlide].id !== 'slide-1') {
        slideOneHero.deactivate();
      }
      if (slides[currentSlide] && slides[currentSlide].id !== 'slide-models-premium') {
        premiumModelsSlide.deactivate();
      }
      setPdfBusy(false);
    }
  }

  if (pdfCurrentButton) {
    pdfCurrentButton.addEventListener('click', downloadCurrentSlidePdf);
  }

  if (pdfAllButton) {
    pdfAllButton.addEventListener('click', downloadAllSlidesPdf);
  }

  // ===== INIT =====
  updateUI();
  slideOneHero.activate();
  triggerSlideAnimations(0);

})();
