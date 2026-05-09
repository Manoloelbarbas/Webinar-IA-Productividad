(function () {
  'use strict';

  const slide = document.getElementById('slide-15');
  const trailsCanvas = document.getElementById('trails-canvas');
  const mainCanvas = document.getElementById('main-canvas');
  if (!slide || !trailsCanvas || !mainCanvas || slide.dataset.fireworksEngine) return;
  slide.dataset.fireworksEngine = '1';

  const canvasContainer = slide.querySelector('.fireworks-canvas-container');
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_DESKTOP = window.innerWidth > 800;
  const IS_HIGH_END_DEVICE = (navigator.hardwareConcurrency || 0) >= (window.innerWidth <= 1024 ? 4 : 8);
  const MAX_WIDTH = 7680;
  const MAX_HEIGHT = 4320;
  const GRAVITY = 0.9;
  const PI_2 = Math.PI * 2;
  const PI_HALF = Math.PI * 0.5;
  const QUALITY_LOW = 1;
  const QUALITY_NORMAL = 2;
  const QUALITY_HIGH = 3;
  const SKY_LIGHT_NORMAL = 2;

  const COLOR = {
    Red: '#ff0043',
    Green: '#14fc56',
    Blue: '#1e7fff',
    Purple: '#e60aff',
    Gold: '#ffbf36',
    White: '#ffffff'
  };
  const INVISIBLE = '_INVISIBLE_';
  const COLOR_NAMES = Object.keys(COLOR);
  const COLOR_CODES = COLOR_NAMES.map((name) => COLOR[name]);
  const COLOR_CODES_W_INVIS = COLOR_CODES.concat(INVISIBLE);
  const COLOR_TUPLES = {};

  COLOR_CODES.forEach((hex) => {
    COLOR_TUPLES[hex] = {
      r: parseInt(hex.substr(1, 2), 16),
      g: parseInt(hex.substr(3, 2), 16),
      b: parseInt(hex.substr(5, 2), 16)
    };
  });

  const quality = IS_HIGH_END_DEVICE ? QUALITY_NORMAL : QUALITY_LOW;
  const isLowQuality = quality === QUALITY_LOW;
  const isHighQuality = quality === QUALITY_HIGH;
  const shellSize = IS_DESKTOP ? 2.6 : 2.1;
  const maxStars = IS_DESKTOP ? 880 : 560;
  const maxSparks = IS_DESKTOP ? 760 : 460;
  const frameInterval = 1000 / 36;

  let stageW = 0;
  let stageH = 0;
  let simSpeed = 1;
  let currentFrame = 0;
  let autoLaunchTime = 0;
  let currentFinaleCount = 0;
  let isFirstSeq = true;
  let running = false;
  let raf = 0;
  let lastFrameTime = 0;
  let lastTickTime = 0;
  let syncTimer = 0;
  let activeStarCount = 0;
  let activeSparkCount = 0;

  const currentSkyColor = { r: 0, g: 0, b: 0 };
  const targetSkyColor = { r: 0, g: 0, b: 0 };

  const MyMath = {
    random(min, max) {
      return Math.random() * (max - min) + min;
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    pointDist(x1, y1, x2, y2) {
      const x = x2 - x1;
      const y = y2 - y1;
      return Math.sqrt((x * x) + (y * y));
    },
    pointAngle(x1, y1, x2, y2) {
      return Math.atan2(x2 - x1, y2 - y1);
    }
  };

  class Stage {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      this.dpr = 1;
      this.canvas.width = Math.floor(width * this.dpr);
      this.canvas.height = Math.floor(height * this.dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    clear() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  const trailsStage = new Stage(trailsCanvas);
  const mainStage = new Stage(mainCanvas);
  const stages = [trailsStage, mainStage];

  function createParticleCollection() {
    const collection = {};
    COLOR_CODES_W_INVIS.forEach((color) => {
      collection[color] = [];
    });
    return collection;
  }

  function trimCollection(collection, countName, limit) {
    while ((countName === 'star' ? activeStarCount : activeSparkCount) > limit) {
      let largestColor = COLOR_CODES_W_INVIS[0];
      for (const color of COLOR_CODES_W_INVIS) {
        if (collection[color].length > collection[largestColor].length) largestColor = color;
      }
      const removed = collection[largestColor].shift();
      if (!removed) break;
      if (countName === 'star') activeStarCount -= 1;
      else activeSparkCount -= 1;
    }
  }

  const BurstFlash = {
    active: [],
    pool: [],
    add(x, y, radius) {
      const instance = this.pool.pop() || {};
      instance.x = x;
      instance.y = y;
      instance.radius = radius;
      this.active.push(instance);
    },
    returnInstance(instance) {
      this.pool.push(instance);
    },
    reset() {
      this.active.length = 0;
      this.pool.length = 0;
    }
  };

  const Star = {
    drawWidth: isLowQuality ? 1.15 : 1.35,
    airDrag: 0.98,
    airDragHeavy: 0.992,
    active: createParticleCollection(),
    pool: [],

    add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
      if (!this.active[color]) color = COLOR.White;
      const instance = this.pool.pop() || {};
      instance.visible = true;
      instance.heavy = false;
      instance.x = x;
      instance.y = y;
      instance.prevX = x;
      instance.prevY = y;
      instance.color = color;
      instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
      instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
      instance.life = life;
      instance.fullLife = life;
      instance.spinAngle = Math.random() * PI_2;
      instance.spinSpeed = 0.8;
      instance.spinRadius = 0;
      instance.sparkFreq = 0;
      instance.sparkSpeed = 1;
      instance.sparkTimer = 0;
      instance.sparkColor = color;
      instance.sparkLife = 750;
      instance.sparkLifeVariation = 0.25;
      instance.strobe = false;
      instance.onDeath = null;
      instance.secondColor = null;
      instance.transitionTime = 0;
      instance.colorChanged = false;
      instance.updateFrame = 0;

      this.active[color].push(instance);
      activeStarCount += 1;
      trimCollection(this.active, 'star', maxStars);
      return instance;
    },

    returnInstance(instance) {
      activeStarCount = Math.max(0, activeStarCount - 1);
      const onDeath = instance.onDeath;
      instance.onDeath = null;
      instance.secondColor = null;
      instance.transitionTime = 0;
      instance.colorChanged = false;
      instance.strobe = false;
      if (onDeath) onDeath(instance);
      this.pool.push(instance);
    },

    reset() {
      COLOR_CODES_W_INVIS.forEach((color) => {
        this.active[color].length = 0;
      });
      this.pool.length = 0;
      activeStarCount = 0;
    }
  };

  const Spark = {
    drawWidth: isLowQuality ? 0.65 : 0.85,
    airDrag: 0.9,
    active: createParticleCollection(),
    pool: [],

    add(x, y, color, angle, speed, life) {
      if (!this.active[color]) color = COLOR.Gold;
      const instance = this.pool.pop() || {};
      instance.x = x;
      instance.y = y;
      instance.prevX = x;
      instance.prevY = y;
      instance.color = color;
      instance.speedX = Math.sin(angle) * speed;
      instance.speedY = Math.cos(angle) * speed;
      instance.life = life;

      this.active[color].push(instance);
      activeSparkCount += 1;
      trimCollection(this.active, 'spark', maxSparks);
      return instance;
    },

    returnInstance(instance) {
      activeSparkCount = Math.max(0, activeSparkCount - 1);
      this.pool.push(instance);
    },

    reset() {
      COLOR_CODES_W_INVIS.forEach((color) => {
        this.active[color].length = 0;
      });
      this.pool.length = 0;
      activeSparkCount = 0;
    }
  };

  function randomColorSimple() {
    return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
  }

  let lastColor;
  function randomColor(options) {
    const notSame = options && options.notSame;
    const notColor = options && options.notColor;
    const limitWhite = options && options.limitWhite;
    let color = randomColorSimple();

    if (limitWhite && color === COLOR.White && Math.random() < 0.6) color = randomColorSimple();
    if (notSame) {
      while (color === lastColor) color = randomColorSimple();
    } else if (notColor) {
      while (color === notColor) color = randomColorSimple();
    }

    lastColor = color;
    return color;
  }

  function whiteOrGold() {
    return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
  }

  function makePistilColor(shellColor) {
    return (shellColor === COLOR.White || shellColor === COLOR.Gold)
      ? randomColor({ notColor: shellColor })
      : whiteOrGold();
  }

  function crysanthemumShell(size) {
    const glitter = Math.random() < 0.25;
    const singleColor = Math.random() < 0.72;
    const color = singleColor
      ? randomColor({ limitWhite: true })
      : [randomColor(), randomColor({ notSame: true })];
    const pistil = singleColor && Math.random() < 0.42;
    const pistilColor = pistil && makePistilColor(color);
    const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White)
      ? pistilColor || randomColor({ notColor: color, limitWhite: true })
      : null;
    const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
    let starDensity = glitter ? 1.1 : 1.25;
    if (isLowQuality) starDensity *= 0.72;

    return {
      shellSize: size,
      spreadSize: 285 + size * 88,
      starLife: 860 + size * 170,
      starDensity,
      color,
      secondColor,
      glitter: glitter ? 'light' : '',
      glitterColor: whiteOrGold(),
      pistil,
      pistilColor,
      streamers
    };
  }

  function ringShell(size) {
    const color = randomColor();
    const pistil = Math.random() < 0.75;
    return {
      shellSize: size,
      ring: true,
      color,
      spreadSize: 300 + size * 90,
      starLife: 900 + size * 180,
      starCount: 2.2 * PI_2 * (size + 1),
      pistil,
      pistilColor: makePistilColor(color),
      glitter: !pistil ? 'light' : '',
      glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
      streamers: Math.random() < 0.24
    };
  }

  function palmShell(size) {
    const color = randomColor();
    const thick = Math.random() < 0.5;
    return {
      shellSize: size,
      color,
      spreadSize: 245 + size * 70,
      starDensity: thick ? 0.14 : 0.34,
      starLife: 1750 + size * 180,
      glitter: thick ? 'thick' : 'heavy'
    };
  }

  function willowShell(size) {
    return {
      shellSize: size,
      spreadSize: 300 + size * 92,
      starDensity: 0.42,
      starLife: 2600 + size * 260,
      glitter: 'willow',
      glitterColor: COLOR.Gold,
      color: INVISIBLE
    };
  }

  function crackleShell(size) {
    const color = Math.random() < 0.75 ? COLOR.Gold : randomColor();
    return {
      shellSize: size,
      spreadSize: 330 + size * 68,
      starDensity: isLowQuality ? 0.56 : 0.78,
      starLife: 540 + size * 90,
      starLifeVariation: 0.32,
      glitter: 'light',
      glitterColor: COLOR.Gold,
      color,
      crackle: true,
      pistil: Math.random() < 0.52,
      pistilColor: makePistilColor(color)
    };
  }

  function createParticleArc(start, arcLength, count, randomness, particleFactory) {
    const angleDelta = arcLength / count;
    const end = start + arcLength - (angleDelta * 0.5);

    if (end > start) {
      for (let angle = start; angle < end; angle = angle + angleDelta) {
        particleFactory(angle + Math.random() * angleDelta * randomness);
      }
    } else {
      for (let angle = start; angle > end; angle = angle + angleDelta) {
        particleFactory(angle + Math.random() * angleDelta * randomness);
      }
    }
  }

  function createBurst(count, particleFactory, startAngle, arcLength) {
    startAngle = startAngle || 0;
    arcLength = arcLength || PI_2;
    const R = 0.5 * Math.sqrt(count / Math.PI);
    const C = 2 * R * Math.PI;
    const C_HALF = C / 2;

    for (let ring = 0; ring <= C_HALF; ring += 1) {
      const ringAngle = ring / C_HALF * PI_HALF;
      const ringSize = Math.cos(ringAngle);
      const partsPerFullRing = C * ringSize;
      const partsPerArc = partsPerFullRing * (arcLength / PI_2);
      const angleInc = PI_2 / partsPerFullRing;
      const angleOffset = Math.random() * angleInc + startAngle;
      const maxRandomAngleOffset = angleInc * 0.33;

      for (let i = 0; i < partsPerArc; i += 1) {
        const randomAngleOffset = Math.random() * maxRandomAngleOffset;
        const angle = angleInc * i + angleOffset + randomAngleOffset;
        particleFactory(angle, ringSize);
      }
    }
  }

  function crackleEffect(star) {
    const count = isHighQuality ? 32 : 16;
    createParticleArc(0, PI_2, count, 1.8, (angle) => {
      Spark.add(
        star.x,
        star.y,
        COLOR.Gold,
        angle,
        Math.pow(Math.random(), 0.45) * 2.4,
        300 + Math.random() * 200
      );
    });
  }

  class Shell {
    constructor(options) {
      Object.assign(this, options);
      this.starLifeVariation = options.starLifeVariation || 0.125;
      this.color = options.color || randomColor();
      this.glitterColor = options.glitterColor || this.color;

      if (!this.starCount) {
        const density = options.starDensity || 1;
        const scaledSize = this.spreadSize / 54;
        this.starCount = Math.max(6, scaledSize * scaledSize * density);
      }
    }

    launch(position, launchHeight) {
      const width = stageW;
      const height = stageH;
      const hpad = 60;
      const vpad = 50;
      const minHeightPercent = 0.45;
      const minHeight = height - height * minHeightPercent;
      const launchX = position * (width - hpad * 2) + hpad;
      const launchY = height;
      const burstY = minHeight - (launchHeight * (minHeight - vpad));
      const launchDistance = launchY - burstY;
      const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

      const comet = this.comet = Star.add(
        launchX,
        launchY,
        typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
        Math.PI,
        launchVelocity,
        launchVelocity * 390
      );

      if (!comet) return;
      comet.heavy = true;
      comet.spinRadius = MyMath.random(0.32, 0.85);
      comet.sparkFreq = 32 / quality;
      comet.sparkLife = 320;
      comet.sparkLifeVariation = 3;

      if (this.glitter === 'willow') {
        comet.sparkFreq = 20 / quality;
        comet.sparkSpeed = 0.5;
        comet.sparkLife = 500;
      }
      if (this.color === INVISIBLE) comet.sparkColor = COLOR.Gold;
      if (Math.random() > 0.4) {
        comet.secondColor = INVISIBLE;
        comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
      }

      comet.onDeath = (deadComet) => this.burst(deadComet.x, deadComet.y);
    }

    burst(x, y) {
      const speed = this.spreadSize / 96;
      let color;
      let onDeath;
      let sparkFreq = 0;
      let sparkSpeed = 0;
      let sparkLife = 0;
      let sparkLifeVariation = 0.25;

      if (this.crackle) onDeath = crackleEffect;

      if (this.glitter === 'light') {
        sparkFreq = 400;
        sparkSpeed = 0.3;
        sparkLife = 300;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'medium') {
        sparkFreq = 200;
        sparkSpeed = 0.44;
        sparkLife = 700;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'heavy') {
        sparkFreq = 80;
        sparkSpeed = 0.8;
        sparkLife = 1400;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'thick') {
        sparkFreq = 16;
        sparkSpeed = 1.5;
        sparkLife = 1400;
        sparkLifeVariation = 3;
      } else if (this.glitter === 'streamer') {
        sparkFreq = 32;
        sparkSpeed = 1.05;
        sparkLife = 620;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'willow') {
        sparkFreq = 120;
        sparkSpeed = 0.34;
        sparkLife = 1400;
        sparkLifeVariation = 3.8;
      }

      sparkFreq = sparkFreq ? sparkFreq / quality : 0;

      const starFactory = (angle, speedMult) => {
        const standardInitialSpeed = this.spreadSize / 1800;
        const star = Star.add(
          x,
          y,
          color || randomColor(),
          angle,
          speedMult * speed,
          this.starLife + Math.random() * this.starLife * this.starLifeVariation,
          0,
          -standardInitialSpeed
        );

        if (!star) return;
        if (this.secondColor) {
          star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
          star.secondColor = this.secondColor;
        }
        star.onDeath = onDeath;

        if (this.glitter && sparkFreq) {
          star.sparkFreq = sparkFreq;
          star.sparkSpeed = sparkSpeed;
          star.sparkLife = sparkLife;
          star.sparkLifeVariation = sparkLifeVariation;
          star.sparkColor = this.glitterColor;
          star.sparkTimer = Math.random() * star.sparkFreq;
        }
      };

      if (typeof this.color === 'string') {
        color = this.color === 'random' ? null : this.color;

        if (this.ring) {
          const ringStartAngle = Math.random() * Math.PI;
          const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;

          createParticleArc(0, PI_2, this.starCount, 0, (angle) => {
            const initSpeedX = Math.sin(angle) * speed * ringSquash;
            const initSpeedY = Math.cos(angle) * speed;
            const newSpeed = MyMath.pointDist(0, 0, initSpeedX, initSpeedY);
            const newAngle = MyMath.pointAngle(0, 0, initSpeedX, initSpeedY) + ringStartAngle;
            const star = Star.add(
              x,
              y,
              color,
              newAngle,
              newSpeed,
              this.starLife + Math.random() * this.starLife * this.starLifeVariation
            );

            if (star && this.glitter && sparkFreq) {
              star.sparkFreq = sparkFreq;
              star.sparkSpeed = sparkSpeed;
              star.sparkLife = sparkLife;
              star.sparkLifeVariation = sparkLifeVariation;
              star.sparkColor = this.glitterColor;
              star.sparkTimer = Math.random() * star.sparkFreq;
            }
          });
        } else {
          createBurst(this.starCount, starFactory);
        }
      } else if (Array.isArray(this.color)) {
        if (Math.random() < 0.5) {
          const start = Math.random() * Math.PI;
          color = this.color[0];
          createBurst(this.starCount, starFactory, start, Math.PI);
          color = this.color[1];
          createBurst(this.starCount, starFactory, start + Math.PI, Math.PI);
        } else {
          color = this.color[0];
          createBurst(this.starCount / 2, starFactory);
          color = this.color[1];
          createBurst(this.starCount / 2, starFactory);
        }
      }

      if (this.pistil) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.48,
          starLife: this.starLife * 0.58,
          starLifeVariation: this.starLifeVariation,
          starDensity: 0.95,
          color: this.pistilColor,
          glitter: 'light',
          glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White
        });
        innerShell.burst(x, y);
      }

      if (this.streamers) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.84,
          starLife: this.starLife * 0.76,
          starLifeVariation: this.starLifeVariation,
          starCount: Math.floor(Math.max(6, this.spreadSize / 54)),
          color: COLOR.White,
          glitter: 'streamer'
        });
        innerShell.burst(x, y);
      }

      BurstFlash.add(x, y, this.spreadSize / 4);
    }
  }

  const shellTypes = [crysanthemumShell, ringShell, palmShell, willowShell, crackleShell];

  function fitShellPositionInBoundsH(position) {
    const edge = 0.18;
    return (1 - edge * 2) * position + edge;
  }

  function fitShellPositionInBoundsV(position) {
    return position * 0.75;
  }

  function getRandomShellSize() {
    const baseSize = shellSize;
    const maxVariance = Math.min(2.1, baseSize);
    const variance = Math.random() * maxVariance;
    const size = baseSize - variance;
    const height = maxVariance === 0 ? Math.random() : 1 - (variance / maxVariance);
    const centerOffset = Math.random() * (1 - height * 0.65) * 0.5;
    const x = Math.random() < 0.5 ? 0.5 - centerOffset : 0.5 + centerOffset;
    return {
      size,
      x: fitShellPositionInBoundsH(x),
      height: fitShellPositionInBoundsV(height)
    };
  }

  function randomFastShell() {
    return shellTypes[(Math.random() * shellTypes.length) | 0];
  }

  function seqRandomShell() {
    const size = getRandomShellSize();
    const shell = new Shell(randomFastShell()(size.size));
    shell.launch(size.x, size.height);
    return 900 + Math.random() * 600 + shell.starLife;
  }

  function seqTwoRandom() {
    const size1 = getRandomShellSize();
    const size2 = getRandomShellSize();
    const shell1 = new Shell(randomFastShell()(size1.size));
    const shell2 = new Shell(randomFastShell()(size2.size));
    shell1.launch(0.3 + Math.random() * 0.18 - 0.09, size1.height);
    window.setTimeout(() => {
      if (running) shell2.launch(0.7 + Math.random() * 0.18 - 0.09, size2.height);
    }, 120);
    return 1000 + Math.random() * 500 + Math.max(shell1.starLife, shell2.starLife);
  }

  function seqTriple() {
    const shellType = randomFastShell();
    const largeSize = shellSize;
    const smallSize = Math.max(0, largeSize - 1.3);
    const shell1 = new Shell(shellType(largeSize));
    shell1.launch(0.5 + Math.random() * 0.08 - 0.04, 0.7);

    window.setTimeout(() => {
      if (running) new Shell(shellType(smallSize)).launch(0.22 + Math.random() * 0.08 - 0.04, 0.14);
    }, 950 + Math.random() * 300);
    window.setTimeout(() => {
      if (running) new Shell(shellType(smallSize)).launch(0.78 + Math.random() * 0.08 - 0.04, 0.14);
    }, 950 + Math.random() * 300);

    return 3800;
  }

  function seqSmallBarrage() {
    const barrageCount = IS_DESKTOP ? 9 : 5;
    const smallSize = Math.max(0, shellSize - 2);
    let count = 0;
    let delay = 0;

    while (count < barrageCount) {
      const offset = (count + 1) / barrageCount / 2;
      window.setTimeout(() => {
        if (!running) return;
        new Shell(crysanthemumShell(smallSize)).launch(0.5 + offset, 0.35 + Math.random() * 0.25);
        new Shell(crysanthemumShell(smallSize)).launch(0.5 - offset, 0.35 + Math.random() * 0.25);
      }, delay);
      count += 2;
      delay += 210;
    }

    return 3300 + barrageCount * 110;
  }

  const sequences = [seqRandomShell, seqTwoRandom, seqTriple, seqSmallBarrage];

  function startSequence() {
    if (isFirstSeq) {
      isFirstSeq = false;
      new Shell(crysanthemumShell(shellSize)).launch(0.5, 0.52);
      window.setTimeout(() => {
        if (running) new Shell(ringShell(Math.max(1, shellSize - 0.6))).launch(0.34, 0.38);
      }, 420);
      window.setTimeout(() => {
        if (running) new Shell(palmShell(Math.max(1, shellSize - 0.4))).launch(0.66, 0.40);
      }, 760);
      return 2600;
    }

    if (currentFinaleCount > 0) {
      seqRandomShell();
      currentFinaleCount -= 1;
      return 220;
    }

    const rand = Math.random();
    if (rand < 0.08) {
      currentFinaleCount = 7;
      return 170;
    }
    if (rand < 0.20) return seqSmallBarrage();
    return sequences[(Math.random() * sequences.length) | 0]();
  }

  function updateGlobals(timeStep) {
    currentFrame += 1;
    autoLaunchTime -= timeStep;
    if (autoLaunchTime <= 0) {
      autoLaunchTime = startSequence() * 1.15;
    }
  }

  function colorSky(speed) {
    const maxSkySaturation = SKY_LIGHT_NORMAL * 15;
    const maxStarCount = 500;
    let totalStarCount = 0;
    targetSkyColor.r = 0;
    targetSkyColor.g = 0;
    targetSkyColor.b = 0;

    COLOR_CODES.forEach((color) => {
      const tuple = COLOR_TUPLES[color];
      const count = Star.active[color].length;
      totalStarCount += count;
      targetSkyColor.r += tuple.r * count;
      targetSkyColor.g += tuple.g * count;
      targetSkyColor.b += tuple.b * count;
    });

    const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
    const maxColorComponent = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);
    targetSkyColor.r = targetSkyColor.r / maxColorComponent * maxSkySaturation * intensity;
    targetSkyColor.g = targetSkyColor.g / maxColorComponent * maxSkySaturation * intensity;
    targetSkyColor.b = targetSkyColor.b / maxColorComponent * maxSkySaturation * intensity;

    const colorChange = 10;
    currentSkyColor.r += (targetSkyColor.r - currentSkyColor.r) / colorChange * speed;
    currentSkyColor.g += (targetSkyColor.g - currentSkyColor.g) / colorChange * speed;
    currentSkyColor.b += (targetSkyColor.b - currentSkyColor.b) / colorChange * speed;

    if (canvasContainer) {
      canvasContainer.style.backgroundColor = `rgb(${currentSkyColor.r | 0}, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0})`;
    }
  }

  function updateParticles(frameTime, lag) {
    const timeStep = frameTime * simSpeed;
    const speed = simSpeed * lag;
    const starDrag = 1 - (1 - Star.airDrag) * speed;
    const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
    const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
    const gAcc = timeStep / 1000 * GRAVITY;

    updateGlobals(timeStep);

    COLOR_CODES_W_INVIS.forEach((color) => {
      const stars = Star.active[color];
      for (let i = stars.length - 1; i >= 0; i -= 1) {
        const star = stars[i];
        if (star.updateFrame === currentFrame) continue;
        star.updateFrame = currentFrame;
        star.life -= timeStep;

        if (star.life <= 0) {
          stars.splice(i, 1);
          Star.returnInstance(star);
          continue;
        }

        const burnRate = Math.pow(star.life / star.fullLife, 0.5);
        const burnRateInverse = 1 - burnRate;
        star.prevX = star.x;
        star.prevY = star.y;
        star.x += star.speedX * speed;
        star.y += star.speedY * speed;

        if (!star.heavy) {
          star.speedX *= starDrag;
          star.speedY *= starDrag;
        } else {
          star.speedX *= starDragHeavy;
          star.speedY *= starDragHeavy;
        }

        star.speedY += gAcc;

        if (star.spinRadius) {
          star.spinAngle += star.spinSpeed * speed;
          star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
          star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
        }

        if (star.sparkFreq) {
          star.sparkTimer -= timeStep;
          while (star.sparkTimer < 0) {
            star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
            Spark.add(
              star.x,
              star.y,
              star.sparkColor,
              Math.random() * PI_2,
              Math.random() * star.sparkSpeed * burnRate,
              star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife
            );
          }
        }

        if (star.life < star.transitionTime) {
          if (star.secondColor && !star.colorChanged) {
            star.colorChanged = true;
            star.color = star.secondColor;
            stars.splice(i, 1);
            Star.active[star.secondColor].push(star);
            if (star.secondColor === INVISIBLE) star.sparkFreq = 0;
          }
        }
      }

      const sparks = Spark.active[color];
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.life -= timeStep;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          Spark.returnInstance(spark);
          continue;
        }

        spark.prevX = spark.x;
        spark.prevY = spark.y;
        spark.x += spark.speedX * speed;
        spark.y += spark.speedY * speed;
        spark.speedX *= sparkDrag;
        spark.speedY *= sparkDrag;
        spark.speedY += gAcc;
      }
    });

    render(speed);
  }

  function render(speed) {
    const width = stageW;
    const height = stageH;
    const trailsCtx = trailsStage.ctx;
    const mainCtx = mainStage.ctx;

    colorSky(speed);

    trailsCtx.globalCompositeOperation = 'source-over';
    trailsCtx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.24, 0.175 * speed)})`;
    trailsCtx.fillRect(0, 0, width, height);
    mainCtx.clearRect(0, 0, width, height);

    while (BurstFlash.active.length) {
      const bf = BurstFlash.active.pop();
      const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
      burstGradient.addColorStop(0.024, 'rgba(255, 255, 255, 1)');
      burstGradient.addColorStop(0.125, 'rgba(255, 160, 20, 0.2)');
      burstGradient.addColorStop(0.32, 'rgba(255, 140, 20, 0.11)');
      burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
      trailsCtx.fillStyle = burstGradient;
      trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
      BurstFlash.returnInstance(bf);
    }

    trailsCtx.globalCompositeOperation = 'lighten';
    trailsCtx.lineWidth = Star.drawWidth;
    trailsCtx.lineCap = isLowQuality ? 'square' : 'round';
    mainCtx.globalCompositeOperation = 'source-over';
    mainCtx.strokeStyle = '#fff';
    mainCtx.lineWidth = 1;
    mainCtx.beginPath();

    COLOR_CODES.forEach((color) => {
      const stars = Star.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      stars.forEach((star) => {
        if (!star.visible) return;
        trailsCtx.moveTo(star.x, star.y);
        trailsCtx.lineTo(star.prevX, star.prevY);
        mainCtx.moveTo(star.x, star.y);
        mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
      });
      trailsCtx.stroke();
    });
    mainCtx.stroke();

    trailsCtx.lineWidth = Spark.drawWidth;
    trailsCtx.lineCap = 'butt';
    COLOR_CODES.forEach((color) => {
      const sparks = Spark.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      sparks.forEach((spark) => {
        trailsCtx.moveTo(spark.x, spark.y);
        trailsCtx.lineTo(spark.prevX, spark.prevY);
      });
      trailsCtx.stroke();
    });
  }

  function resize() {
    const rect = slide.getBoundingClientRect();
    const width = Math.min(Math.max(1, Math.floor(rect.width || window.innerWidth || 1)), MAX_WIDTH);
    const height = Math.min(Math.max(1, Math.floor(rect.height || window.innerHeight || 1)), MAX_HEIGHT);
    stageW = width;
    stageH = height;
    stages.forEach((stage) => stage.resize(width, height));
    trailsStage.ctx.fillStyle = '#000';
    trailsStage.ctx.fillRect(0, 0, width, height);
    if (canvasContainer) canvasContainer.style.backgroundColor = '#000';
  }

  function tick(now) {
    if (!running) return;
    if (!lastTickTime) lastTickTime = now;
    if (now - lastFrameTime < frameInterval) {
      raf = window.requestAnimationFrame(tick);
      return;
    }

    const frameTime = Math.min(40, now - lastTickTime || 16.67);
    const lag = frameTime / 16.67;
    lastTickTime = now;
    lastFrameTime = now;
    updateParticles(frameTime, lag);
    raf = window.requestAnimationFrame(tick);
  }

  function resetSimulation() {
    Star.reset();
    Spark.reset();
    BurstFlash.reset();
    currentFrame = 0;
    autoLaunchTime = 0;
    currentFinaleCount = 0;
    isFirstSeq = true;
    currentSkyColor.r = 0;
    currentSkyColor.g = 0;
    currentSkyColor.b = 0;
  }

  function start() {
    if (running || prefersReducedMotion) return;
    resize();
    resetSimulation();
    running = true;
    lastFrameTime = 0;
    lastTickTime = 0;
    raf = window.requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    resetSimulation();
    stages.forEach((stage) => stage.clear());
    if (canvasContainer) canvasContainer.style.backgroundColor = '#000';
  }

  function sync() {
    if (slide.classList.contains('active') && document.visibilityState !== 'hidden') start();
    else stop();
  }

  const observer = new MutationObserver(sync);
  observer.observe(slide, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', () => {
    if (running) resize();
  });

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => {
    if (syncTimer) window.clearInterval(syncTimer);
    stop();
  });

  syncTimer = window.setInterval(sync, 700);
  sync();
})();
