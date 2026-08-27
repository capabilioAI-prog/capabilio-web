'use client';

import React, { useEffect, useRef } from 'react';

export function LandingBackgroundGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Nodes in the Career Intelligence Network
    interface NetworkNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      label?: string;
      isBrand?: boolean;
      radius: number;
      pulsePhase: number;
    }

    const labels = ['SKILL', 'WORK', 'EVIDENCE', 'ROLE', 'ELO', 'PROVE', 'READINESS', 'SIGNAL'];
    const nodes: NetworkNode[] = [];
    const nodeCount = Math.min(28, Math.floor((width * height) / 38000));

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        label: i < labels.length ? labels[i] : undefined,
        isBrand: i % 4 === 0,
        radius: i % 4 === 0 ? 3 : 2,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid lines
      const gridSize = 80;
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.035)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) continue;

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          if (!other) continue;

          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = node.isBrand || other.isBrand
              ? `rgba(255, 87, 1, ${alpha * 1.5})`
              : `rgba(160, 160, 160, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();

            // Moving packet along connection line
            if (dist < 140 && (i + j) % 3 === 0) {
              const progress = (Math.sin(time + i + j) + 1) / 2;
              const px = node.x + dx * progress;
              const py = node.y + dy * progress;
              ctx.fillStyle = 'rgba(255, 87, 1, 0.4)';
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Draw node
        const pulse = 1 + Math.sin(time * 2 + node.pulsePhase) * 0.2;
        ctx.fillStyle = node.isBrand ? 'rgba(255, 87, 1, 0.65)' : 'rgba(150, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Node label (if present)
        if (node.label) {
          ctx.font = '9px "JetBrains Mono", Menlo, monospace';
          ctx.fillStyle = node.isBrand ? 'rgba(255, 87, 1, 0.55)' : 'rgba(140, 140, 140, 0.35)';
          ctx.fillText(node.label, node.x + 6, node.y + 3);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-90">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Vignette Overlay to maintain contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />
    </div>
  );
}
