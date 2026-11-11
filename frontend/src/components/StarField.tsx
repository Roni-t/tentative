import React, { useEffect, useRef, useState } from 'react';

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  dx: number;
  dy: number;
  opacity: number;
  active: boolean;
}

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // High-performance direct DOM transform tracking with zero React re-renders
  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${e.clientX - 225}px, ${e.clientY - 225}px, 0)`;
        }
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate stars
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 6500);
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.3 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.12 + 0.04,
      twinkle: Math.random() * 0.02 + 0.005,
    }));

    // Shooting star state
    let shootingStar: ShootingStar = {
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      dx: 0,
      dy: 0,
      opacity: 0,
      active: false,
    };

    let nextShootTime = Date.now() + Math.random() * 6000 + 4000;

    const spawnShootingStar = () => {
      const startX = Math.random() * canvas.width * 0.8;
      const startY = Math.random() * canvas.height * 0.3;
      const angle = (Math.PI / 4) + (Math.random() * 0.2 - 0.1); // ~45 deg downward
      const speed = Math.random() * 8 + 12;
      shootingStar = {
        x: startX,
        y: startY,
        length: Math.random() * 80 + 60,
        speed,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        opacity: 0.85,
        active: true,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 240, 255, ${star.alpha})`;
        ctx.fill();

        if (!reducedMotion) {
          star.y -= star.speed;
          if (star.y < 0) {
            star.y = canvas.height;
            star.x = Math.random() * canvas.width;
          }
          star.alpha += (Math.random() - 0.5) * star.twinkle;
          if (star.alpha < 0.2) star.alpha = 0.2;
          if (star.alpha > 0.85) star.alpha = 0.85;
        }
      });

      // Render & update shooting star
      if (!reducedMotion) {
        const now = Date.now();
        if (!shootingStar.active && now > nextShootTime) {
          spawnShootingStar();
          nextShootTime = now + Math.random() * 8000 + 6000;
        }

        if (shootingStar.active) {
          const tailX = shootingStar.x - (shootingStar.dx / shootingStar.speed) * shootingStar.length;
          const tailY = shootingStar.y - (shootingStar.dy / shootingStar.speed) * shootingStar.length;

          const grad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.6, `rgba(220, 225, 235, ${shootingStar.opacity * 0.4})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${shootingStar.opacity})`);

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(shootingStar.x, shootingStar.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          shootingStar.x += shootingStar.dx;
          shootingStar.y += shootingStar.dy;
          shootingStar.opacity -= 0.015;

          if (
            shootingStar.opacity <= 0 ||
            shootingStar.x > canvas.width ||
            shootingStar.y > canvas.height
          ) {
            shootingStar.active = false;
          }
        }

        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Background canvas for stars and meteor streaks */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      {/* Subtle interactive cursor light glow that follows mouse pointer */}
      <div
        ref={glowRef}
        className="absolute w-[450px] h-[450px] rounded-full pointer-events-none will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
          transform: 'translate3d(-1000px, -1000px, 0)',
        }}
      />

      {/* Atmospheric monochrome silver/white gradient glows using GPU-friendly radial gradients */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.035) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.025) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.025) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};
