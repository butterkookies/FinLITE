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

    // Subtle drifting digital tech particles
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (window.innerWidth || 1000),
      y: Math.random() * (window.innerHeight || 800),
      radius: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    // Wave definition presets with harmonic frequencies
    const waves = [
      {
        yBaseRatio: 0.38,
        amplitude: 48,
        harmonicAmp: 22,
        frequency: 0.0022,
        harmonicFreq: 0.0051,
        speed: 0.012,
        colorStart: 'rgba(52, 211, 153, 0.45)', // Mint / Emerald
        colorEnd: 'rgba(16, 185, 129, 0.25)',
        fillColor: 'rgba(16, 185, 129, 0.06)',
        lineWidth: 2.2,
        glowColor: 'rgba(52, 211, 153, 0.5)',
        glowBlur: 14,
      },
      {
        yBaseRatio: 0.52,
        amplitude: 58,
        harmonicAmp: 28,
        frequency: 0.0018,
        harmonicFreq: 0.0044,
        speed: -0.015,
        colorStart: 'rgba(110, 231, 183, 0.40)', // Bright Mint
        colorEnd: 'rgba(20, 184, 166, 0.20)', // Teal tint
        fillColor: 'rgba(20, 184, 166, 0.05)',
        lineWidth: 1.8,
        glowColor: 'rgba(110, 231, 183, 0.45)',
        glowBlur: 16,
      },
      {
        yBaseRatio: 0.68,
        amplitude: 65,
        harmonicAmp: 34,
        frequency: 0.0015,
        harmonicFreq: 0.0036,
        speed: 0.010,
        colorStart: 'rgba(16, 185, 129, 0.35)', // Vibrant Emerald
        colorEnd: 'rgba(5, 150, 105, 0.15)',
        fillColor: 'rgba(16, 185, 129, 0.04)',
        lineWidth: 2.0,
        glowColor: 'rgba(16, 185, 129, 0.4)',
        glowBlur: 12,
      },
      {
        yBaseRatio: 0.82,
        amplitude: 40,
        harmonicAmp: 18,
        frequency: 0.0028,
        harmonicFreq: 0.0062,
        speed: -0.008,
        colorStart: 'rgba(52, 211, 153, 0.28)',
        colorEnd: 'rgba(16, 185, 129, 0.10)',
        fillColor: 'transparent',
        lineWidth: 1.4,
        glowColor: 'rgba(52, 211, 153, 0.3)',
        glowBlur: 8,
      },
    ];

    // Rendering loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      time += 1;

      // 1. Draw glowing multi-harmonic waves
      waves.forEach((wave) => {
        const yBase = height * wave.yBaseRatio;

        ctx.save();
        ctx.beginPath();

        // Start point
        const startY =
          yBase +
          Math.sin(time * wave.speed) * wave.amplitude +
          Math.cos(time * wave.speed * 0.7) * wave.harmonicAmp;

        ctx.moveTo(0, startY);

        // Compute curve points across screen width
        const step = 8;
        for (let x = 0; x <= width; x += step) {
          const y =
            yBase +
            Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.cos(x * wave.harmonicFreq + time * wave.speed * 0.8) * wave.harmonicAmp +
            Math.sin((x * 0.5 + time * 2) * 0.001) * 8;
          ctx.lineTo(x, y);
        }

        // Stroke styling with subtle neon glow
        ctx.shadowColor = wave.glowColor;
        ctx.shadowBlur = wave.glowBlur;

        const strokeGrad = ctx.createLinearGradient(0, yBase - 80, width, yBase + 80);
        strokeGrad.addColorStop(0, wave.colorStart);
        strokeGrad.addColorStop(0.5, '#34d399');
        strokeGrad.addColorStop(1, wave.colorEnd);

        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Optional wave area fill for ribbon depth
        if (wave.fillColor !== 'transparent') {
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const fillGrad = ctx.createLinearGradient(0, yBase - 50, 0, height);
          fillGrad.addColorStop(0, wave.fillColor);
          fillGrad.addColorStop(1, 'rgba(7, 33, 21, 0)');
          ctx.fillStyle = fillGrad;
          ctx.shadowBlur = 0;
          ctx.fill();
        }

        ctx.restore();
      });

      // 2. Draw drifting ambient digital particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += p.pulseSpeed;

        // Wrap around screen boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = Math.max(0.1, p.alpha + Math.sin(p.phase) * 0.25);

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(110, 231, 183, ${currentAlpha})`;
        ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Pause animation when tab is inactive to save battery/performance
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
        // Dark to medium-light green balanced base gradient (not super light, but definitely not dark obsidian)
        background: 'linear-gradient(140deg, #09281a 0%, #0d3824 25%, #124d32 55%, #186341 82%, #1d734c 100%)',
      }}
    >
      {/* Radiant ambient aura glows that bring vibrant luminosity */}
      <div
        className="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none opacity-45 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.45) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 75%)',
          animationDuration: '8s',
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.40) 0%, rgba(5, 150, 105, 0.2) 50%, transparent 75%)',
        }}
      />
      <div
        className="absolute -bottom-32 left-10 w-[750px] h-[750px] rounded-full blur-[160px] pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 80%)',
        }}
      />

      {/* Modern cybernetic tech dot-grid texture */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(110, 231, 183, 0.25) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* High-performance animated tech wave canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
