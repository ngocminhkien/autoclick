/**
 * Safari Magic Cursor & Trail - High Performance Canvas Trail Engine
 * Tối ưu hóa cho Safari macOS (Retina DPR, zero CPU khi đứng yên)
 */

class SafariTrailEngine {
  constructor(options = {}) {
    this.options = Object.assign({
      canvasId: 'safari-cursor-trail-canvas',
      trailEnabled: true,
      trailStyle: 'neon-ribbon', // 'neon-ribbon' | 'magic-sparkles' | 'rainbow-stream' | 'fire-embers' | 'ghost-echo' | 'floating-bubbles'
      trailColor: '#00f3ff',
      trailLength: 28,
      trailWidth: 6,
      clickEffect: 'ripple-burst', // 'ripple-burst' | 'spark-shower' | 'none'
      cursorStyle: 'neon-cyan',
      container: document.body || document.documentElement
    }, options);

    this.points = [];
    this.particles = [];
    this.clickRipples = [];
    this.ghosts = [];
    
    this.mouse = { x: -100, y: -100, px: -100, py: -100, vx: 0, vy: 0, speed: 0 };
    this.lastMoveTime = 0;
    this.isRunning = false;
    this.rafId = null;
    this.hueCounter = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    // Kiểm tra hoặc tạo Canvas
    let canvas = document.getElementById(this.options.canvasId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = this.options.canvasId;
      canvas.className = 'safari-trail-canvas-overlay';
      canvas.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        display: block !important;
      `;
      (this.options.container || document.body || document.documentElement).appendChild(canvas);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  bindEvents() {
    this._onMove = this.onPointerMove.bind(this);
    this._onDown = this.onPointerDown.bind(this);
    this._onResize = this.resize.bind(this);

    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('mousemove', this._onMove, { passive: true });
    window.addEventListener('pointerdown', this._onDown, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  updateSettings(newSettings) {
    Object.assign(this.options, newSettings);
    if (!this.options.trailEnabled) {
      this.clear();
    } else {
      this.wakeUp();
    }
  }

  onPointerMove(e) {
    const x = e.clientX;
    const y = e.clientY;
    const now = performance.now();

    const dx = x - (this.mouse.px === -100 ? x : this.mouse.px);
    const dy = y - (this.mouse.py === -100 ? y : this.mouse.py);
    const speed = Math.sqrt(dx * dx + dy * dy);

    this.mouse.vx = dx;
    this.mouse.vy = dy;
    this.mouse.speed = speed;
    this.mouse.px = this.mouse.x;
    this.mouse.py = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
    this.lastMoveTime = now;

    if (!this.options.trailEnabled) return;

    // 1. Thêm điểm vào quỹ đạo cho ribbon & rainbow
    this.points.unshift({
      x, y,
      time: now,
      hue: this.hueCounter
    });
    this.hueCounter = (this.hueCounter + 3) % 360;

    const maxLen = Math.max(8, parseInt(this.options.trailLength, 10) || 28);
    if (this.points.length > maxLen) {
      this.points.length = maxLen;
    }

    // 2. Sinh hạt hiệu ứng đặc thù theo phong cách
    const style = this.options.trailStyle;

    if (style === 'magic-sparkles' && speed > 1) {
      const count = Math.min(4, Math.floor(speed / 4) + 1);
      for (let i = 0; i < count; i++) {
        this.spawnSparkle(x, y, dx, dy);
      }
    } else if (style === 'fire-embers' && speed > 1) {
      const count = Math.min(5, Math.floor(speed / 3) + 1);
      for (let i = 0; i < count; i++) {
        this.spawnEmber(x, y, dx, dy);
      }
    } else if (style === 'floating-bubbles' && speed > 2) {
      if (Math.random() < 0.45) {
        this.spawnBubble(x, y);
      }
    } else if (style === 'ghost-echo' && speed > 8) {
      if (!this._lastGhostTime || now - this._lastGhostTime > 45) {
        this.spawnGhost(x, y);
        this._lastGhostTime = now;
      }
    }

    this.wakeUp();
  }

  onPointerDown(e) {
    if (this.options.clickEffect === 'none') return;
    const x = e.clientX;
    const y = e.clientY;

    if (this.options.clickEffect === 'ripple-burst' || this.options.clickEffect === 'spark-shower') {
      // Vòng tròn sóng tỏa (Shockwave Ripple)
      this.clickRipples.push({
        x, y,
        radius: 2,
        maxRadius: 40,
        opacity: 1,
        color: this.getEffectiveColor(),
        lineWidth: 3
      });

      // Bắn tia hạt nhỏ xung quanh
      const sparkCount = this.options.clickEffect === 'spark-shower' ? 16 : 8;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 / sparkCount) * i + Math.random() * 0.4;
        const speed = Math.random() * 4 + 2;
        this.particles.push({
          type: 'sparkle',
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 2,
          opacity: 1,
          decay: Math.random() * 0.03 + 0.02,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.2,
          color: this.getEffectiveColor()
        });
      }
    }
    this.wakeUp();
  }

  spawnSparkle(x, y, dx, dy) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 0.5;
    const offset = Math.random() * 6;
    this.particles.push({
      type: 'sparkle',
      x: x + (Math.random() - 0.5) * offset,
      y: y + (Math.random() - 0.5) * offset,
      vx: Math.cos(angle) * speed - dx * 0.1,
      vy: Math.sin(angle) * speed - dy * 0.1,
      size: Math.random() * 5 + 3,
      maxSize: Math.random() * 6 + 4,
      opacity: 1,
      decay: Math.random() * 0.03 + 0.02,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.25,
      color: this.getEffectiveColor()
    });
  }

  spawnEmber(x, y, dx, dy) {
    this.particles.push({
      type: 'ember',
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 1.5 - dx * 0.08,
      vy: -Math.random() * 2.2 - 0.8, // bay lên trời
      size: Math.random() * 5 + 2.5,
      opacity: 1,
      decay: Math.random() * 0.025 + 0.015,
      colorVariant: Math.random() // chuyển dần từ vàng -> cam -> đỏ
    });
  }

  spawnBubble(x, y) {
    this.particles.push({
      type: 'bubble',
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -Math.random() * 1.2 - 0.5,
      radius: Math.random() * 8 + 4,
      opacity: 0.85,
      decay: Math.random() * 0.015 + 0.01,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.1 + 0.05
    });
  }

  spawnGhost(x, y) {
    this.ghosts.push({
      x, y,
      opacity: 0.7,
      scale: 1,
      decay: 0.04
    });
  }

  getEffectiveColor() {
    if (this.options.trailColor === 'rainbow' || this.options.trailStyle === 'rainbow-stream') {
      return `hsl(${this.hueCounter}, 95%, 60%)`;
    }
    return this.options.trailColor || '#00f3ff';
  }

  wakeUp() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.render();
    }
  }

  render() {
    if (!this.isRunning) return;

    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const now = performance.now();
    const style = this.options.trailStyle;
    const baseColor = this.options.trailColor;
    const baseWidth = Math.max(2, parseFloat(this.options.trailWidth) || 6);

    // 1. RENDER RIBBON / RAINBOW STREAM
    if (this.options.trailEnabled && (style === 'neon-ribbon' || style === 'rainbow-stream')) {
      this.renderRibbon(ctx, style, baseColor, baseWidth);
    }

    // 2. RENDER PARTICLES (SPARKLES, EMBERS, BUBBLES)
    this.renderParticles(ctx);

    // 3. RENDER GHOST ECHOES
    this.renderGhosts(ctx);

    // 4. RENDER CLICK RIPPLES
    this.renderRipples(ctx);

    // DỌN DẸP ĐIỂM HẾT HẠN
    const maxAge = (parseInt(this.options.trailLength, 10) || 28) * 16;
    for (let i = this.points.length - 1; i >= 0; i--) {
      if (now - this.points[i].time > maxAge) {
        this.points.splice(i, 1);
      }
    }

    // KIỂM TRA TRẠNG THÁI NGHỈ (IDLE DETECTOR: 0% CPU KHI ĐỨNG YÊN)
    const isIdle = this.points.length === 0 &&
                   this.particles.length === 0 &&
                   this.clickRipples.length === 0 &&
                   this.ghosts.length === 0 &&
                   (now - this.lastMoveTime > 300);

    if (isIdle) {
      this.isRunning = false;
      ctx.clearRect(0, 0, w, h);
      return;
    }

    this.rafId = requestAnimationFrame(this.render.bind(this));
  }

  renderRibbon(ctx, style, baseColor, baseWidth) {
    const pts = this.points;
    if (pts.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const progress = 1 - (i / pts.length); // 1 tại đầu chuột, 0 tại đuôi
      const width = Math.max(0.5, baseWidth * progress);

      let strokeColor;
      if (style === 'rainbow-stream' || baseColor === 'rainbow') {
        strokeColor = `hsla(${p1.hue}, 95%, 60%, ${progress * 0.9})`;
      } else {
        strokeColor = baseColor;
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      // Pass 1: Lớp phát sáng neon aura bên ngoài
      ctx.shadowBlur = progress * 14;
      ctx.shadowColor = strokeColor;
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = progress * 0.75;
      ctx.lineWidth = width * 1.5;
      ctx.stroke();

      // Pass 2: Lõi trắng/sáng rõ nét ở trung tâm
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = progress * 0.9;
      ctx.lineWidth = Math.max(1, width * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderParticles(ctx) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'sparkle') {
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;

        // Vẽ ngôi sao 4 cánh lấp lánh
        const r = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();

        // Lõi sao màu trắng
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (p.type === 'ember') {
        p.vx += (Math.random() - 0.5) * 0.2; // rung lắc tự nhiên
        ctx.save();
        ctx.globalAlpha = p.opacity;
        
        // Màu chuyển sắc từ vàng -> cam -> đỏ
        let emberColor;
        if (p.colorVariant > 0.6) {
          emberColor = '#ffea00';
        } else if (p.colorVariant > 0.3) {
          emberColor = '#ff6b00';
        } else {
          emberColor = '#ff1100';
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = emberColor;
        ctx.fillStyle = emberColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * p.opacity), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'bubble') {
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.6;
        ctx.save();
        ctx.globalAlpha = p.opacity * 0.8;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#60a5fa';

        // Viền bong bóng
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Vệt phản chiếu ánh sáng trên bề mặt bong bóng
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(p.x - p.radius * 0.35, p.y - p.radius * 0.35, p.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
    ctx.restore();
  }

  renderGhosts(ctx) {
    if (this.ghosts.length === 0) return;

    ctx.save();
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.opacity -= g.decay;
      g.scale *= 0.96;

      if (g.opacity <= 0) {
        this.ghosts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.scale(g.scale, g.scale);
      ctx.globalAlpha = g.opacity * 0.6;

      const col = this.getEffectiveColor();
      ctx.shadowBlur = 10;
      ctx.shadowColor = col;
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;

      // Vẽ hình mũi tên bóng ma
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(4, 14);
      ctx.lineTo(8, 22);
      ctx.lineTo(11, 21);
      ctx.lineTo(7, 13);
      ctx.lineTo(13, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  renderRipples(ctx) {
    if (this.clickRipples.length === 0) return;

    ctx.save();
    for (let i = this.clickRipples.length - 1; i >= 0; i--) {
      const r = this.clickRipples[i];
      r.radius += (r.maxRadius - r.radius) * 0.16 + 0.8;
      r.opacity -= 0.035;

      if (r.opacity <= 0 || r.radius >= r.maxRadius) {
        this.clickRipples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = r.opacity;
      ctx.shadowBlur = 12;
      ctx.shadowColor = r.color;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * r.opacity;

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Vòng tròn thứ 2 phụ
      if (r.radius > 12) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  clear() {
    this.points = [];
    this.particles = [];
    this.clickRipples = [];
    this.ghosts = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

if (typeof window !== 'undefined') {
  window.SafariTrailEngine = SafariTrailEngine;
}
