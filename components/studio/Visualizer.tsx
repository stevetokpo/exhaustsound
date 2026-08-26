"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

interface VisualizerProps {
  getAnalyser: () => AnalyserNode | null;
  active: boolean;
}

/**
 * Tracé de l'onde réellement envoyée à la sortie.
 * Sa seule fonction est de confirmer que quelque chose sort : à 20 Hz ou à
 * volume très bas, l'oreille ne suffit pas à lever le doute.
 */
export function Visualizer({ getAnalyser, active }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let buffer: Uint8Array<ArrayBuffer> | null = null;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#7c6bf0";
    const faint = styles.getPropertyValue("--fg-faint").trim() || "#625f76";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const drawFlat = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = faint;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const analyser = getAnalyser();
      const { width, height } = canvas.getBoundingClientRect();

      if (!analyser || !active) {
        drawFlat();
        return;
      }

      if (!buffer || buffer.length !== analyser.fftSize) {
        buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }
      analyser.getByteTimeDomainData(buffer);

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();

      const step = width / buffer.length;
      for (let i = 0; i < buffer.length; i++) {
        const amplitude = (buffer[i] - 128) / 128;
        const y = height / 2 + amplitude * (height / 2 - 4);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      frame = requestAnimationFrame(draw);
    };

    if (active && !reducedMotion) {
      frame = requestAnimationFrame(draw);
    } else if (active) {
      draw(); // image fixe : mouvement réduit demandé
    } else {
      drawFlat();
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [getAnalyser, active, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="h-20 w-full sm:h-24"
      role="img"
      aria-label={
        active ? "Onde sonore en cours de lecture" : "Aucun son en cours"
      }
    />
  );
}
