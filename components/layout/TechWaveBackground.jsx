'use client';

import { useEffect, useRef } from 'react';

export default function TechWaveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let time = 0;

    // Handle high DPI display
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Drifting glass particles / light glints
    const glintCount = 18;
    const glints = Array.from({ length: glintCount }, () => ({
      x: Math.random() * (window.innerWidth || 1000),
      y: Math.random() * (window.innerHeight || 800),
      radius: Math.random() * 2.2 + 1.0,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.015,
      phase: Math.random() * Math.PI * 2,
    }));

    // Definition of layered curved glass wave ribbons
    const glassWaves = [
      {
        yBaseRatio: 0.36,
        amplitude: 52,
        harmonicAmp: 24,
        frequency: 0.0020,
        harmonicFreq: 0.0048,
        speed: 0.012,
        rimColor: 'rgba(255, 255, 255, 0.75)',
        rimGlow: 'rgba(167, 243, 208, 0.65)',
        glowBlur: 16,
        // Frosted glass gradient stops
        glassTop: 'rgba(255, 255, 255, 0.14)',
        glassMid: 'rgba(110, 231, 183, 0.08)',
        glassBot: 'rgba(8, 40, 26, 0.0)',
        specularPhase: 0,
      },
      {
        yBaseRatio: 0.53,
        amplitude: 62,
        harmonicAmp: 30,
        frequency: 0.0016,
        harmonicFreq: 0.0041,
        speed: -0.014,
        rimColor: 'rgba(255, 255, 255, 0.70)',
        rimGlow: 'rgba(52, 211, 153, 0.60)',
        glowBlur: 18,
        glassTop: 'rgba(255, 255, 255, 0.12)',
        glassMid: 'rgba(45, 212, 191, 0.07)',
        glassBot: 'rgba(8, 40, 26, 0.0)',
        specularPhase: Math.PI * 0.5,
      },
      {
        yBaseRatio: 0.70,
        amplitude: 68,
        harmonicAmp: 35,
        frequency: 0.0013,
        harmonicFreq: 0.0033,
        speed: 0.009,
        rimColor: 'rgba(255, 255, 255, 0.60)',
        rimGlow: 'rgba(16, 185, 129, 0.50)',
        glowBlur: 14,
        glassTop: 'rgba(255, 255, 255, 0.10)',
        glassMid: 'rgba(16, 185, 129, 0.06)',
        glassBot: 'rgba(8, 40, 26, 0.0)',
        specularPhase: Math.PI,
      },
    ];

    // Rendering loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      time += 1;

      // ========================================================
      // 1. ANIMATED WAVY DOTTED GRID (3D Undulating Dot Matrix)
      // ========================================================
      const dotSpacing = 30; // Grid resolution
      ctx.save();
      
      // Batch 1: Primary glowing dots on wave peaks
      ctx.fillStyle = 'rgba(167, 243, 208, 0.32)';
      ctx.beginPath();
      for (let x = 15; x < width; x += dotSpacing) {
        for (let y = 15; y < height; y += dotSpacing) {
          // 3D diagonal wavy undulation
          const wave = Math.sin(x * 0.0035 + y * 0.0025 + time * 0.016);
          const crossWave = Math.cos(x * 0.002 - y * 0.003 + time * 0.012);
          const totalWave = wave + crossWave; // -2 to +2

          // Only draw crest dots in this high-light batch
          if (totalWave > 0.4) {
            const offsetY = totalWave * 7;
            const radius = 1.3 + (totalWave - 0.4) * 0.5;
            ctx.moveTo(x + radius, y + offsetY);
            ctx.arc(x, y + offsetY, radius, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();

      // Batch 2: Subtle background undulating dots
      ctx.fillStyle = 'rgba(110, 231, 183, 0.14)';
      ctx.beginPath();
      for (let x = 15; x < width; x += dotSpacing) {
        for (let y = 15; y < height; y += dotSpacing) {
          const wave = Math.sin(x * 0.0035 + y * 0.0025 + time * 0.016);
          const crossWave = Math.cos(x * 0.002 - y * 0.003 + time * 0.012);
          const totalWave = wave + crossWave;

          if (totalWave <= 0.4) {
            const offsetY = totalWave * 7;
            const radius = 1.0;
            ctx.moveTo(x + radius, y + offsetY);
            ctx.arc(x, y + offsetY, radius, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();
      ctx.restore();

      // ========================================================
      // 2. LAYERED FROSTED GLASS WAVES (Curved Acrylic / Glass)
      // ========================================================
      glassWaves.forEach((wave, idx) => {
        const yBase = height * wave.yBaseRatio;
        const wavePoints = [];

        // Sample points across width for high-precision glass curvature
        const step = 6;
        for (let x = 0; x <= width + step; x += step) {
          const y =
            yBase +
            Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.cos(x * wave.harmonicFreq + time * wave.speed * 0.8) * wave.harmonicAmp +
            Math.sin((x * 0.4 + time * 1.5) * 0.0015) * 10;
          wavePoints.push({ x, y });
        }

        // --- Step A: Frosted Glass Body Translucency ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
        for (let i = 1; i < wavePoints.length; i++) {
          ctx.lineTo(wavePoints[i].x, wavePoints[i].y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const glassGrad = ctx.createLinearGradient(0, yBase - 60, 0, height);
        glassGrad.addColorStop(0, wave.glassTop);
        glassGrad.addColorStop(0.25, wave.glassMid);
        glassGrad.addColorStop(0.7, 'rgba(10, 42, 28, 0.04)');
        glassGrad.addColorStop(1, wave.glassBot);

        ctx.fillStyle = glassGrad;
        ctx.fill();
        ctx.restore();

        // --- Step B: Internal Glass Refraction Edge (Double Stroke) ---
        ctx.save();
        ctx.beginPath();
        // Slightly offset downward for 3D thickness reflection
        ctx.moveTo(wavePoints[0].x, wavePoints[0].y + 4.5);
        for (let i = 1; i < wavePoints.length; i++) {
          ctx.lineTo(wavePoints[i].x, wavePoints[i].y + 4.5);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // --- Step C: Specular Glass Crest Highlight (Glossy Top Rim) ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
        for (let i = 1; i < wavePoints.length; i++) {
          ctx.lineTo(wavePoints[i].x, wavePoints[i].y);
        }

        ctx.shadowColor = wave.rimGlow;
        ctx.shadowBlur = wave.glowBlur;

        const rimGrad = ctx.createLinearGradient(0, 0, width, 0);
        // Traveling specular glint across the glass edge
        const glintPos = (Math.sin(time * 0.01 + wave.specularPhase) + 1) / 2; // 0 to 1
        const gStart = Math.max(0, glintPos - 0.2);
        const gCenter = glintPos;
        const gEnd = Math.min(1, glintPos + 0.2);

        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        if (gStart > 0) rimGrad.addColorStop(gStart, 'rgba(167, 243, 208, 0.45)');
        rimGrad.addColorStop(gCenter, '#ffffff'); // bright specular highlight glint
        if (gEnd < 1) rimGrad.addColorStop(gEnd, 'rgba(167, 243, 208, 0.45)');
        rimGrad.addColorStop(1, wave.rimColor);

        ctx.strokeStyle = rimGrad;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      // ========================================================
      // 3. FLOATING GLASS SPECULAR GLINTS & PARTICLES
      // ========================================================
      glints.forEach((g) => {
        g.x += g.speedX;
        g.y += g.speedY;
        g.phase += g.pulseSpeed;

        if (g.x < 0) g.x = width;
        if (g.x > width) g.x = 0;
        if (g.y < 0) g.y = height;
        if (g.y > height) g.y = 0;

        const currentAlpha = Math.max(0.12, g.alpha + Math.sin(g.phase) * 0.3);

        ctx.save();
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.shadowColor = 'rgba(167, 243, 208, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Tab visibility handling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{
        // Balanced rich dark-to-medium-light green gradient
        background: 'linear-gradient(140deg, #09281a 0%, #0d3824 25%, #124d32 55%, #186341 82%, #1d734c 100%)',
      }}
    >
      {/* Radiant ambient aura glows */}
      <div
        className="absolute -top-32 left-1/4 w-[750px] h-[750px] rounded-full blur-[140px] pointer-events-none opacity-50 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.45) 0%, rgba(16, 185, 129, 0.20) 50%, transparent 75%)',
          animationDuration: '8s',
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.40) 0%, rgba(5, 150, 105, 0.20) 50%, transparent 75%)',
        }}
      />
      <div
        className="absolute -bottom-32 left-10 w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.38) 0%, rgba(16, 185, 129, 0.16) 50%, transparent 80%)',
        }}
      />

      {/* Modern Frosted Glass Ribbon Ambient Layer (CSS Hardware Blur) */}
      <div
        className="absolute -top-10 left-[-10%] right-[-10%] h-[320px] pointer-events-none opacity-40 rounded-[100%] blur-[24px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(110, 231, 183, 0.05) 50%, transparent 100%)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.3)',
        }}
      />

      {/* Canvas rendering: Wavy Dotted Grid + Specular Glass Waves */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
