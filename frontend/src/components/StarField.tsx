import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  twinkle: number;
}

interface ShootingStar {
  x: number;
  y: number;
  dx: number;
  dy: number;
  length: number;
  opacity: number;
}

const makeStar = (width: number, height: number): Star => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: Math.random() * 1.3 + 0.3,
  alpha: Math.random() * 0.7 + 0.2,
  speed: Math.random() * 0.12 + 0.04,
  twinkle: Math.random() * 0.02 + 0.005,
});

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // Cursor glow follows the mouse without re-rendering React
  useEffect(() => {
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${e.clientX - 225}px, ${e.clientY - 225}px, 0)`;
        }
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let meteor: ShootingStar | null = null;
    let nextMeteorAt = Date.now() + 5000;
    let frame = 0;

    // Match the canvas to the window, and keep the star density the same when the window changes size.
    const fit = () => {
      const oldWidth = width;
      const oldHeight = height;
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (oldWidth && oldHeight) {
        stars.forEach((s) => {
          s.x = (s.x / oldWidth) * width;
          s.y = (s.y / oldHeight) * height;
        });
      }
      const target = Math.floor((width * height) / 6500);
      while (stars.length < target) stars.push(makeStar(width, height));
      stars.length = Math.min(stars.length, target);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 240, 255, ${s.alpha})`;
        ctx.fill();
      }
      if (meteor) {
        const speed = Math.hypot(meteor.dx, meteor.dy);
        const tailX = meteor.x - (meteor.dx / speed) * meteor.length;
        const tailY = meteor.y - (meteor.dy / speed) * meteor.length;
        const grad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, `rgba(255, 255, 255, ${meteor.opacity})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    };

    const step = () => {
      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = height;
          s.x = Math.random() * width;
        }
        s.alpha = Math.min(0.85, Math.max(0.2, s.alpha + (Math.random() - 0.5) * s.twinkle));
      }

      const now = Date.now();
      if (!meteor && now > nextMeteorAt) {
        const angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1);
        const speed = Math.random() * 8 + 12;
        meteor = {
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.3,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          length: Math.random() * 80 + 60,
          opacity: 0.85,
        };
        nextMeteorAt = now + Math.random() * 8000 + 6000;
      }
      if (meteor) {
        meteor.x += meteor.dx;
        meteor.y += meteor.dy;
        meteor.opacity -= 0.015;
        if (meteor.opacity <= 0 || meteor.x > width || meteor.y > height) meteor = null;
      }

      draw();
      frame = requestAnimationFrame(step);
    };

    fit();
    window.addEventListener('resize', fit);
    if (!reducedMotion) frame = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      <div
        ref={glowRef}
        className="absolute w-[450px] h-[450px] rounded-full will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
          transform: 'translate3d(-1000px, -1000px, 0)',
        }}
      />

      {/* Faint light patches. These are sized in vw so they scale with the window. */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.07) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)' }}
      />
    </div>
  );
};
