import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CometTrail } from './CometTrail';
import { INTRO_DONE_EVENT, introIsPending } from '../utils/intro';

// A small fluid simulation. Moving the cursor pushes the "fluid" and adds a little glowing dye,
// which swirls and slowly fades, so the cursor leaves a soft, inky smoke trail.
// It is shown behind the page content on the landing page only.
//
// How it works each frame (a standard "stable fluids" simulation on the GPU):
//   1. work out where the fluid is spinning (curl) and add some of that spin back (vorticity)
//   2. make the flow incompressible (divergence, pressure, subtract the pressure gradient)
//   3. move the velocity and the dye along the flow (advection)
//   4. draw the dye

const SIM_RESOLUTION = 128; // size of the flow grid (short side)
const DYE_RESOLUTION = 512; // size of the dye grid (short side)
const DYE_FADE = 1.7; // higher means the trail fades faster
const VELOCITY_FADE = 1.2;
const PRESSURE_FADE = 0.8;
const PRESSURE_STEPS = 20;
const SWIRL = 14; // how much the smoke curls
const SPLAT_RADIUS = 0.1;
const SPLAT_FORCE = 3000;
const DYE_STRENGTH = 0.055; // keep this small so the trail stays subtle
const IDLE_STOP_MS = 5000; // stop simulating when the cursor has not moved for a while

const VERTEX = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv, vL, vR, vT, vB;
uniform vec2 texelSize;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const HEAD = 'precision highp float;\nprecision highp sampler2D;\nvarying vec2 vUv, vL, vR, vT, vB;\n';

const FRAGMENTS = {
  clear: `${HEAD} uniform sampler2D uTexture; uniform float value;
    void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`,

  splat: `${HEAD} uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main() {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`,

  advection: `${HEAD} uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform float dt; uniform float dissipation;
    void main() {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
    }`,

  divergence: `${HEAD} uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,

  curl: `${HEAD} uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,

  vorticity: `${HEAD} uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
    void main() {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(min(max(velocity, -1000.0), 1000.0), 0.0, 1.0);
    }`,

  pressure: `${HEAD} uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
    }`,

  gradient: `${HEAD} uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }`,

  // The canvas is see-through, so use the brightest channel as the opacity
  display: `${HEAD} uniform sampler2D uTexture;
    void main() {
      vec3 c = min(texture2D(uTexture, vUv).rgb, vec3(1.0));
      gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
    }`,
};

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };
type Target = { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelX: number; texelY: number };
type Double = { read: Target; write: Target; swap: () => void };

// Soft blue-violet colors, like a nebula. The color drifts slowly as the cursor moves.
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
};

const FluidCanvas: React.FC<{ onUnsupported: () => void }> = ({ onUnsupported }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Start after the intro, so setting up WebGL does not cause a stutter while the intro plays
    let stop: (() => void) | undefined;
    let cancelled = false;
    const begin = () => {
      if (!cancelled) stop = run();
    };
    if (introIsPending()) window.addEventListener(INTRO_DONE_EVENT, begin, { once: true });
    else begin();
    return () => {
      cancelled = true;
      window.removeEventListener(INTRO_DONE_EVENT, begin);
      stop?.();
    };

    function run(): (() => void) | undefined {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Nothing for people who asked for less motion, or on touch screens
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    const hasFloat = gl && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    if (!gl || !hasFloat) {
      onUnsupported();
      return;
    }

    // ---------- small WebGL helpers ----------
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader error');
      return shader;
    };
    const vertexShader = compile(gl.VERTEX_SHADER, VERTEX);

    const makeProgram = (fragment: string): Program => {
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link error');
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i)!.name;
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return { program, uniforms };
    };

    const makeTarget = (width: number, height: number): Target => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer not supported');
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo, width, height, texelX: 1 / width, texelY: 1 / height };
    };

    const makeDouble = (width: number, height: number): Double => {
      const pair = { read: makeTarget(width, height), write: makeTarget(width, height), swap() {
        const old = pair.read;
        pair.read = pair.write;
        pair.write = old;
      } };
      return pair;
    };

    // ---------- programs and a full-screen square ----------
    let programs: Record<keyof typeof FRAGMENTS, Program>;
    try {
      programs = Object.fromEntries(
        (Object.keys(FRAGMENTS) as (keyof typeof FRAGMENTS)[]).map((k) => [k, makeProgram(FRAGMENTS[k])])
      ) as Record<keyof typeof FRAGMENTS, Program>;
    } catch {
      onUnsupported();
      return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const draw = (target: Target | null) => {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const use = (p: Program) => gl.useProgram(p.program);
    const bindTexture = (location: WebGLUniformLocation | null, target: Target, unit: number) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.uniform1i(location, unit);
    };

    // ---------- buffers (recreated when the window size changes) ----------
    let velocity: Double;
    let dye: Double;
    let pressure: Double;
    let divergence: Target;
    let curl: Target;

    const gridSize = (resolution: number) => {
      const aspect = canvas.width / canvas.height;
      const ratio = aspect < 1 ? 1 / aspect : aspect;
      const short = Math.round(resolution);
      const long = Math.round(resolution * ratio);
      return canvas.width > canvas.height ? { width: long, height: short } : { width: short, height: long };
    };

    const setup = () => {
      // A soft, low-resolution canvas is enough, the smoke is blurry anyway
      canvas.width = Math.max(2, Math.floor(window.innerWidth * 0.5));
      canvas.height = Math.max(2, Math.floor(window.innerHeight * 0.5));
      const sim = gridSize(SIM_RESOLUTION);
      const dyeSize = gridSize(DYE_RESOLUTION);
      velocity = makeDouble(sim.width, sim.height);
      pressure = makeDouble(sim.width, sim.height);
      divergence = makeTarget(sim.width, sim.height);
      curl = makeTarget(sim.width, sim.height);
      dye = makeDouble(dyeSize.width, dyeSize.height);
    };

    try {
      setup();
    } catch {
      onUnsupported();
      return;
    }

    // ---------- one simulation step ----------
    const step = (dt: number) => {
      gl.disable(gl.BLEND);

      use(programs.curl);
      gl.uniform2f(programs.curl.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.curl.uniforms.uVelocity, velocity.read, 0);
      draw(curl);

      use(programs.vorticity);
      gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.vorticity.uniforms.uVelocity, velocity.read, 0);
      bindTexture(programs.vorticity.uniforms.uCurl, curl, 1);
      gl.uniform1f(programs.vorticity.uniforms.curl, SWIRL);
      gl.uniform1f(programs.vorticity.uniforms.dt, dt);
      draw(velocity.write);
      velocity.swap();

      use(programs.divergence);
      gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.divergence.uniforms.uVelocity, velocity.read, 0);
      draw(divergence);

      use(programs.clear);
      bindTexture(programs.clear.uniforms.uTexture, pressure.read, 0);
      gl.uniform1f(programs.clear.uniforms.value, PRESSURE_FADE);
      draw(pressure.write);
      pressure.swap();

      use(programs.pressure);
      gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.pressure.uniforms.uDivergence, divergence, 0);
      for (let i = 0; i < PRESSURE_STEPS; i++) {
        bindTexture(programs.pressure.uniforms.uPressure, pressure.read, 1);
        draw(pressure.write);
        pressure.swap();
      }

      use(programs.gradient);
      gl.uniform2f(programs.gradient.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.gradient.uniforms.uPressure, pressure.read, 0);
      bindTexture(programs.gradient.uniforms.uVelocity, velocity.read, 1);
      draw(velocity.write);
      velocity.swap();

      use(programs.advection);
      gl.uniform2f(programs.advection.uniforms.texelSize, velocity.read.texelX, velocity.read.texelY);
      bindTexture(programs.advection.uniforms.uVelocity, velocity.read, 0);
      bindTexture(programs.advection.uniforms.uSource, velocity.read, 1);
      gl.uniform1f(programs.advection.uniforms.dt, dt);
      gl.uniform1f(programs.advection.uniforms.dissipation, VELOCITY_FADE);
      draw(velocity.write);
      velocity.swap();

      bindTexture(programs.advection.uniforms.uVelocity, velocity.read, 0);
      bindTexture(programs.advection.uniforms.uSource, dye.read, 1);
      gl.uniform1f(programs.advection.uniforms.dissipation, DYE_FADE);
      draw(dye.write);
      dye.swap();
    };

    const render = () => {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      use(programs.display);
      gl.uniform2f(programs.display.uniforms.texelSize, dye.read.texelX, dye.read.texelY);
      bindTexture(programs.display.uniforms.uTexture, dye.read, 0);
      draw(null);
    };

    // ---------- the cursor adds force and dye ----------
    const splat = (x: number, y: number, dx: number, dy: number, color: [number, number, number]) => {
      const aspect = canvas.width / canvas.height;
      const radius = (aspect > 1 ? (SPLAT_RADIUS / 100) * aspect : SPLAT_RADIUS / 100);

      use(programs.splat);
      gl.uniform1f(programs.splat.uniforms.aspectRatio, aspect);
      gl.uniform2f(programs.splat.uniforms.point, x, y);
      gl.uniform1f(programs.splat.uniforms.radius, radius);

      bindTexture(programs.splat.uniforms.uTarget, velocity.read, 0);
      gl.uniform3f(programs.splat.uniforms.color, dx, dy, 0);
      draw(velocity.write);
      velocity.swap();

      bindTexture(programs.splat.uniforms.uTarget, dye.read, 0);
      gl.uniform3f(programs.splat.uniforms.color, color[0], color[1], color[2]);
      draw(dye.write);
      dye.swap();
    };

    let lastX = -1;
    let lastY = -1;
    let hue = 0.6;
    let lastMove = 0;
    let running = false;
    let frame = 0;
    let lastTime = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 60);
      lastTime = now;
      step(dt);
      render();
      if (now - lastMove > IDLE_STOP_MS) {
        running = false; // nothing left to see, so stop until the cursor moves again
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = 1 - e.clientY / window.innerHeight;
      if (lastX >= 0) {
        const aspect = canvas.width / canvas.height;
        let dx = (x - lastX) * SPLAT_FORCE;
        let dy = (y - lastY) * SPLAT_FORCE;
        if (aspect < 1) dx *= aspect;
        if (aspect > 1) dy /= aspect;
        // Fast movement leaves more dye than slow movement, so the trail does not pile up where the cursor stops
        const speed = Math.min(1, (Math.abs(x - lastX) + Math.abs(y - lastY)) / 0.012);
        if (speed > 0.02) {
          // Drift between cool blue and soft violet, with a hint of white
          hue = 0.56 + 0.14 * (0.5 + 0.5 * Math.sin(performance.now() / 2500));
          const amount = DYE_STRENGTH * speed;
          const [r, g, b] = hsvToRgb(hue, 0.4, amount);
          const white = amount * 0.35;
          splat(x, y, dx, dy, [r + white, g + white, b + white]);
        }
      }
      lastX = x;
      lastY = y;
      lastMove = performance.now();
      if (!running) {
        running = true;
        lastTime = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };

    const onResize = () => {
      try {
        setup();
      } catch {
        // keep what we have
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
    }
  }, [onUnsupported]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[1]" aria-hidden="true" />;
};

// Uses the fluid smoke, or the thin streak if this browser cannot run the simulation
export const CursorTrail: React.FC = () => {
  const [fluidWorks, setFluidWorks] = useState(true);
  const onUnsupported = useCallback(() => setFluidWorks(false), []);
  return fluidWorks ? <FluidCanvas onUnsupported={onUnsupported} /> : <CometTrail />;
};
