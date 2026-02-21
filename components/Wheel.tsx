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
  targetIndex: number | null; // null = not yet spun
  onSpinComplete: () => void;
  isSpinning: boolean;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

const NOOP_COLOR = "#9CA3AF";
const SPIN_DURATION_MS = 4000;

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

  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 4;

      ctx.clearRect(0, 0, size, size);

      const segRad = (2 * Math.PI) / segments.length;
      const rotRad = (rotation * Math.PI) / 180;

      segments.forEach((seg, i) => {
        const startAngle = rotRad + i * segRad - Math.PI / 2;
        const endAngle = startAngle + segRad;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = seg.id === "__noop__" ? NOOP_COLOR : COLORS[i % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + segRad / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(10, Math.min(14, size / segments.length / 2))}px system-ui`;
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 3;

        const emoji = seg.emoji ?? "";
        const textRadius = radius * 0.72;
        ctx.fillText(emoji + " " + truncate(seg.label, 12), textRadius, 5);
        ctx.restore();
      });

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
      ctx.fillStyle = "#1F2937";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();
    },
    [segments]
  );

  // Easing: starts fast, decelerates smoothly
  function easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  useEffect(() => {
    drawWheel(displayRotation);
  }, [displayRotation, drawWheel]);

  useEffect(() => {
    if (!isSpinning || targetIndex === null) return;

    hasCompletedRef.current = false;

    // Calculate the angle so the pointer (top/12-o'clock) lands on targetIndex segment center
    const targetSegCenter = targetIndex * segDeg + segDeg / 2;
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    const needed = ((360 - targetSegCenter) - currentNorm + 360) % 360;
    const fullSpins = 360 * 6; // 6 full rotations for drama
    const totalDelta = fullSpins + needed;

    startAngleRef.current = rotationRef.current;
    targetAngleRef.current = rotationRef.current + totalDelta;
    startTimeRef.current = performance.now();

    // Tick sound: AudioContext one-shot oscillator
    let tickContext: AudioContext | null = null;
    try {
      tickContext = new AudioContext();
    } catch {
      // AudioContext not available — silent
    }

    let lastTickSegment = -1;

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased = easeOut(t);
      const current = startAngleRef.current + eased * totalDelta;

      rotationRef.current = current;
      setDisplayRotation(current);
      drawWheel(current);

      // Tick on segment boundary
      const normalised = ((current % 360) + 360) % 360;
      const currentSeg = Math.floor(normalised / segDeg);
      if (currentSeg !== lastTickSegment && tickContext) {
        lastTickSegment = currentSeg;
        // Click sound
        const osc = tickContext.createOscillator();
        const gain = tickContext.createGain();
        osc.connect(gain);
        gain.connect(tickContext.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, tickContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, tickContext.currentTime + 0.06);
        osc.start(tickContext.currentTime);
        osc.stop(tickContext.currentTime + 0.06);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        rotationRef.current = targetAngleRef.current;
        drawWheel(targetAngleRef.current);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setTimeout(onSpinComplete, 400);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpinning, targetIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex items-center justify-center">
      {/* Pointer */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
        style={{ marginTop: -2 }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "28px solid #EF4444",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="rounded-full shadow-2xl"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
