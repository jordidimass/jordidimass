"use client";

import React, { useEffect, useRef } from "react";
import { useMotionContext } from "@/components/MotionProvider";
import { useTheme } from "@/components/ThemeProvider";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

function hexToRgb(hex: string): number[] {
  const strippedHex = hex.replace("#", "");
  const parsedHex = strippedHex.length === 3
    ? strippedHex.split("").map((char) => char + char).join("")
    : strippedHex;
  const hexInt = parseInt(parsedHex, 16);
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

const ParticlesCanvas: React.FC<ParticlesProps> = ({
  className = "",
  quantity = 450,
  staticity = 10,
  ease = 60,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0.01,
  vy = 0.01,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rgb = hexToRgb(color);
    const rgbPrefix = `rgba(${rgb.join(", ")}, `;

    const canvasSize = { w: 0, h: 0 };
    let circles: Circle[] = [];
    let rafId = 0;

    const circleParams = (): Circle => ({
      x: Math.floor(Math.random() * canvasSize.w),
      y: Math.floor(Math.random() * canvasSize.h),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + size,
      alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    });

    const drawCircle = (circle: Circle) => {
      const { x, y, translateX, translateY, size: r, alpha } = circle;
      ctx.translate(translateX, translateY);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = `${rgbPrefix}${alpha})`;
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const clearContext = () => ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    const resizeCanvas = () => {
      canvasSize.w = container.offsetWidth;
      canvasSize.h = container.offsetHeight;
      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
      canvas.style.width = `${canvasSize.w}px`;
      canvas.style.height = `${canvasSize.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initCanvas = () => {
      resizeCanvas();
      clearContext();
      circles = Array.from({ length: quantity }, circleParams);
      circles.forEach(drawCircle);
    };

    const remapValue = (
      value: number,
      start1: number,
      end1: number,
      start2: number,
      end2: number,
    ): number => {
      const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
      return Math.max(remapped, 0);
    };

    const animate = () => {
      clearContext();
      for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];
        const edge = [
          circle.x + circle.translateX - circle.size,
          canvasSize.w - circle.x - circle.translateX - circle.size,
          circle.y + circle.translateY - circle.size,
          canvasSize.h - circle.y - circle.translateY - circle.size,
        ];
        const closestEdge = edge.reduce((a, b) => Math.min(a, b));
        const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

        if (remapClosestEdge > 1) {
          circle.alpha = Math.min(circle.alpha + 0.02, circle.targetAlpha);
        } else {
          circle.alpha = circle.targetAlpha * remapClosestEdge;
        }

        circle.x += circle.dx + vx;
        circle.y += circle.dy + vy;
        circle.translateX += (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
        circle.translateY += (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

        if (
          circle.x < -circle.size ||
          circle.x > canvasSize.w + circle.size ||
          circle.y < -circle.size ||
          circle.y > canvasSize.h + circle.size
        ) {
          circles[i] = circleParams();
          drawCircle(circles[i]);
        } else {
          drawCircle(circle);
        }
      }
      rafId = window.requestAnimationFrame(animate);
    };

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const { w, h } = canvasSize;
      const x = event.clientX - rect.left - w / 2;
      const y = event.clientY - rect.top - h / 2;
      if (x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    };

    initCanvas();
    rafId = window.requestAnimationFrame(animate);
    window.addEventListener("resize", initCanvas);
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", initCanvas);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [color, quantity, staticity, ease, size, vx, vy, refresh]);

  return (
    <div className={className} ref={canvasContainerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};

// Outer gate: unmounts ParticlesCanvas entirely when motion is off so hooks reset cleanly on re-enable
const Particles: React.FC<ParticlesProps> = (props) => {
  const { motionEnabled } = useMotionContext();
  const { theme } = useTheme();
  if (!motionEnabled) return null;
  const color = props.color ?? (theme === "light" ? "#1C1614" : "#ffffff");
  return <ParticlesCanvas {...props} color={color} />;
};

export default Particles;
