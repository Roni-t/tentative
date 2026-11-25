import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  time: number;
}

// How long each part of the tail stays visible, in milliseconds
const TAIL_LIFE = 650;

// A comet streak that follows the cursor. It is only meant for the landing page.
export const CometTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // No trail for people who asked for less motion, or on touch screens
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (reducedMotion || !hasMouse) return;

    let points: Point[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const fit = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      points.push({ x: e.clientX, y: e.clientY, time: performance.now() });
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      points = points.filter((p) => now - p.time < TAIL_LIFE);

      // Draw the tail as short segments that get thinner and fainter toward the end
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const point = points[i];
        const age = (now - point.time) / TAIL_LIFE; // 0 = new, 1 = gone
        const strength = 1 - age;

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.5 + strength * 3.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${strength * strength * 0.85})`;
        ctx.stroke();
      }

      // Bright head at the newest point
      const head = points[points.length - 1];
      if (head) {
        const headStrength = 1 - (now - head.time) / TAIL_LIFE;
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 9);
        glow.addColorStop(0, `rgba(255, 255, 255, ${headStrength})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('pointermove', onMove, { passive: true });
    frame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-20" aria-hidden="true" />;
};
