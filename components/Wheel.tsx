"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface WheelSegment {
  id: string;
  label: string;
  emoji?: string | null;
  imageUrl?: string | null;
  isFallback?: boolean;
}

interface WheelProps {
  segments: WheelSegment[];
  targetIndex: number | null;
  onSpinComplete: () => void;
  isSpinning: boolean;
}

// Warm hospitality palette — amber, brown, stone
const PRIZE_COLORS = [
  "#D97706", // amber
  "#B45309", // dark amber
  "#92400E", // warm brown
  "#78350F", // deep brown
  "#6B7280", // slate
  "#374151", // charcoal
  "#D44506", // burnt orange
  "#9A5A0A", // sienna
];

const NOOP_A = "#EFE9DF"; // warm cream
const NOOP_B = "#E8E1D7"; // slightly darker cream
const SPIN_DURATION_MS = 4500;
const SIZE = 380; // logical px
const SCALE = 2;  // retina 2×

function isNoop(id: string) {
  return id.startsWith("__noop__");
}

export default function Wheel({ segments, targetIndex, onSpinComplete, isSpinning }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const [displayRotation, setDisplayRotation] = useState(0);
  const hasCompletedRef = useRef(false);

  const segDeg = 360 / segments.length;

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use setTransform to avoid cumulative scale stacking across frames
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radius = SIZE / 2 - 14;   // segment outer edge
    const rimR   = SIZE / 2 - 4;    // decorative rim

    const segRad = (2 * Math.PI) / segments.length;
    const rotRad = (rotation * Math.PI) / 180;

    let prizeIdx = 0;
    let noopIdx  = 0;

    // ── Segments ────────────────────────────────────────────────────────────
    segments.forEach((seg, i) => {
      const startAngle = rotRad + i * segRad - Math.PI / 2;
      const endAngle   = startAngle + segRad;
      const noop = isNoop(seg.id);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      if (noop) {
        ctx.fillStyle = noopIdx++ % 2 === 0 ? NOOP_A : NOOP_B;
        ctx.fill();
        // Very subtle divider between noop slices
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        const color = PRIZE_COLORS[prizeIdx++ % PRIZE_COLORS.length];
        // Subtle centre-to-rim gradient — brighter toward rim
        const g = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
        g.addColorStop(0, color + "BB");
        g.addColorStop(1, color);
        ctx.fillStyle = g;
        ctx.fill();
        // Crisp border on prize slices so they pop
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // ── Prize label ───────────────────────────────────────────────────
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + segRad / 2);

        const emoji  = seg.emoji ?? "★";
        const textR  = radius * 0.79;

        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur  = 6;
        ctx.textAlign   = "right";

        // Emoji
        ctx.font      = "13px -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(emoji, textR, 4);

        // Short label
        ctx.font      = "bold 8.5px -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.shadowBlur = 3;
        ctx.fillText(truncate(seg.label, 9), textR - 17, 4);

        ctx.restore();
      }
    });

    // ── Decorative rim ───────────────────────────────────────────────────────
    ctx.shadowBlur = 0;

    // Outer rim ring
    ctx.beginPath();
    ctx.arc(cx, cy, rimR, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner edge highlight just inside the segments
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Centre hub ───────────────────────────────────────────────────────────
    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur  = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "#1F2937";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer hub ring
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Inner hub ring
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Centre dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();

  }, [segments]);

  function easeOut(t: number): number {
    // Smooth deceleration with a slight overshoot feel at the end
    return 1 - Math.pow(1 - t, 3.5);
  }

  useEffect(() => {
    drawWheel(displayRotation);
  }, [displayRotation, drawWheel]);

  useEffect(() => {
    if (!isSpinning || targetIndex === null) return;

    hasCompletedRef.current = false;

    const targetSegCenter = targetIndex * segDeg + segDeg / 2;
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    const needed = ((360 - targetSegCenter) - currentNorm + 360) % 360;
    const fullSpins = 360 * 7;
    const totalDelta = fullSpins + needed;

    startAngleRef.current  = rotationRef.current;
    targetAngleRef.current = rotationRef.current + totalDelta;
    startTimeRef.current   = performance.now();

    let tickContext: AudioContext | null = null;
    try { tickContext = new AudioContext(); } catch { /* silent */ }

    let lastTickSegment = -1;

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const t       = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased   = easeOut(t);
      const current = startAngleRef.current + eased * totalDelta;

      rotationRef.current = current;
      setDisplayRotation(current);
      drawWheel(current);

      // Tick sound on each segment crossing
      const normalised  = ((current % 360) + 360) % 360;
      const currentSeg  = Math.floor(normalised / segDeg);
      if (currentSeg !== lastTickSegment && tickContext) {
        lastTickSegment = currentSeg;
        const osc  = tickContext.createOscillator();
        const gain = tickContext.createGain();
        osc.connect(gain);
        gain.connect(tickContext.destination);
        osc.frequency.value = 900;
        gain.gain.setValueAtTime(0.04, tickContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, tickContext.currentTime + 0.04);
        osc.start(tickContext.currentTime);
        osc.stop(tickContext.currentTime + 0.04);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        rotationRef.current = targetAngleRef.current;
        drawWheel(targetAngleRef.current);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(onSpinComplete, 500);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [isSpinning, targetIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex items-center justify-center">

      {/* Pointer — minimal white teardrop */}
      <svg
        width="18"
        height="32"
        viewBox="0 0 18 32"
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: 0, marginTop: -20 }}
      >
        <defs>
          <filter id="ptr-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.7)" />
          </filter>
        </defs>
        {/* Teardrop: circle top, tapers to a point at bottom */}
        <path
          d="M9 32 C4 22, 0 15, 0 9 A9 9 0 0 1 18 9 C18 15, 14 22, 9 32 Z"
          fill="#D97706"
          fillOpacity="0.96"
          filter="url(#ptr-shadow)"
        />
        {/* Inner highlight */}
        <circle cx="9" cy="9" r="4" fill="rgba(255,255,255,0.35)" />
      </svg>

      {/* Outer glow / depth ring */}
      <div
        style={{
          position: "absolute",
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.06), " +
            "0 8px 32px rgba(0,0,0,0.08)",
          pointerEvents: "none",
        }}
      />

      <canvas
        ref={canvasRef}
        width={SIZE * SCALE}
        height={SIZE * SCALE}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
