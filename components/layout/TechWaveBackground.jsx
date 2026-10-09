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

    // Subtle drifting ambient particles
    const particleCount = 20;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * (window.innerWidth || 1000),
      y: Math.random() * (window.innerHeight || 800),
      radius: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.45 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

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
      ctx.fillStyle = 'rgba(167, 243, 208, 0.35)';
      ctx.beginPath();
      for (let x = 15; x < width; x += dotSpacing) {
        for (let y = 15; y < height; y += dotSpacing) {
          // 3D diagonal wavy undulation
          const wave = Math.sin(x * 0.0035 + y * 0.0025 + time * 0.016);
          const crossWave = Math.cos(x * 0.002 - y * 0.003 + time * 0.012);
          const totalWave = wave + crossWave; // -2 to +2

          // Highlighted crest dots
          if (totalWave > 0.4) {
            const offsetY = totalWave * 7;
            const radius = 1.3 + (totalWave - 0.4) * 0.5;
            ctx.moveTo(x + radius, y + offsetY);
            ctx.arc(x, y + offsetY, radius, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();

      // Batch 2: Ambient background undulating dots
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
      // 2. DRIFTING AMBIENT PARTICLES
      // ========================================================
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += p.pulseSpeed;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = Math.max(0.1, p.alpha + Math.sin(p.phase) * 0.25);

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 243, 208, ${currentAlpha})`;
        ctx.shadowColor = 'rgba(52, 211, 153, 0.7)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Tab visibility handling (auto-pause on hidden tab)
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

      {/* Canvas rendering: Clean Animated Wavy Dotted Grid */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
