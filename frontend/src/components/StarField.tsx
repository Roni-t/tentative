import React, { useEffect, useRef } from 'react';

export const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 7000);
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.15 + 0.05,
      twinkle: Math.random() * 0.02 + 0.005,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw faint stars
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

      if (!reducedMotion) {
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
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background canvas for stars */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Subtle drifting nebula gradient glows */}
      <div className="absolute -top-[25%] -left-[15%] w-[60vw] h-[60vw] rounded-full bg-cosmic-purple/15 blur-[140px] pointer-events-none animate-drift" />
      <div className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-cosmic-cyan/12 blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-cosmic-pink/10 blur-[160px] pointer-events-none" />
    </div>
  );
};
