"use client";

import { Edges } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ORBIT, ORBIT_AI } from "@/lib/data";
import GameCanvas from "./GameCanvas";
import { labelTexture, usePixelFont } from "./textures";
import { useThemeColors, type Palette } from "./useThemeColors";

const HOP_MS = 950;
// squash-and-stretch keyframes: [t, lift, scaleX, scaleY]
const HOP: [number, number, number, number][] = [
  [0, 0, 1, 1], [0.14, -0.13, 1.14, 0.8], [0.38, 0.97, 0.9, 1.16], [0.54, 1.1, 0.97, 1.04],
  [0.74, 0, 1.16, 0.82], [0.86, 0.2, 0.95, 1.07], [0.94, 0, 1.04, 0.96], [1, 0, 1, 1],
];
const smooth = (u: number) => u * u * (3 - 2 * u);

function hopAt(u: number) {
  for (let i = 1; i < HOP.length; i++) {
    if (u <= HOP[i][0]) {
      const a = HOP[i - 1];
      const b = HOP[i];
      const k = smooth((u - a[0]) / (b[0] - a[0]));
      return { y: a[1] + (b[1] - a[1]) * k, sx: a[2] + (b[2] - a[2]) * k, sy: a[3] + (b[3] - a[3]) * k };
    }
  }
  return { y: 0, sx: 1, sy: 1 };
}

function Box({ size, pos, color, edge, rot }: { size: [number, number, number]; pos: [number, number, number]; color: string; edge?: string; rot?: [number, number, number] }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshToonMaterial color={color} />
      {edge && <Edges color={edge} />}
    </mesh>
  );
}

function LookAt({ y }: { y: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, y, 0);
  }, [camera, y]);
  return null;
}

function Robot({ p, onPoke, pointer }: { p: Palette; onPoke: () => void; pointer: React.RefObject<{ x: number; y: number }> }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const hopStart = useRef<number | null>(null);

  const hop = () => {
    if (hopStart.current === null) hopStart.current = performance.now();
  };

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    let y = Math.sin(t * 2.2) * 0.04;
    let sx = 1;
    let sy = 1;
    if (hopStart.current !== null) {
      const u = (performance.now() - hopStart.current) / HOP_MS;
      if (u >= 1) hopStart.current = null;
      else {
        const h = hopAt(u);
        y += h.y;
        sx = h.sx;
        sy = h.sy;
      }
    }
    if (root.current) {
      root.current.position.y = Math.max(0, y);
      root.current.scale.set(sx, sy, sx);
    }
    if (shadow.current) {
      const s = Math.max(0.45, 1 - Math.max(0, y) * 0.5);
      shadow.current.scale.set(s, s, s);
    }
    if (head.current) {
      const k = 1 - Math.pow(0.001, dt);
      head.current.rotation.y += (pointer.current.x * 0.7 - head.current.rotation.y) * k;
      head.current.rotation.x += (-pointer.current.y * 0.35 - head.current.rotation.x) * k;
    }
  });

  return (
    <group
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
        hop();
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
      onClick={() => {
        hop();
        onPoke();
      }}
    >
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.01}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>
      <group ref={root}>
        <Box size={[0.3, 0.38, 0.32]} pos={[-0.26, 0.19, 0]} color={p.line} edge={p.ink} />
        <Box size={[0.3, 0.38, 0.32]} pos={[0.26, 0.19, 0]} color={p.line} edge={p.ink} />
        <Box size={[1, 0.8, 0.62]} pos={[0, 0.78, 0]} color={p.line} edge={p.ink} />
        <Box size={[0.46, 0.28, 0.05]} pos={[0, 0.82, 0.33]} color={p.ac} />
        <Box size={[0.2, 0.62, 0.26]} pos={[-0.66, 0.82, 0]} color={p.line} edge={p.ink} />
        <Box size={[0.2, 0.62, 0.26]} pos={[0.66, 0.82, 0]} color={p.line} edge={p.ink} />
        <group ref={head} position={[0, 1.2, 0]}>
          <Box size={[1.15, 0.88, 0.88]} pos={[0, 0.5, 0]} color={p.line} edge={p.ink} />
          <Box size={[0.2, 0.2, 0.06]} pos={[-0.27, 0.58, 0.45]} color={p.ac} />
          <Box size={[0.2, 0.2, 0.06]} pos={[0.27, 0.58, 0.45]} color={p.ac} />
          <Box size={[0.42, 0.08, 0.06]} pos={[0, 0.28, 0.45]} color={p.coral} />
          <Box size={[0.07, 0.34, 0.07]} pos={[0, 1.1, 0]} color={p.ink} />
          <Box size={[0.2, 0.2, 0.2]} pos={[0, 1.34, 0]} color={p.coral} edge={p.ink} />
        </group>
      </group>
    </group>
  );
}

function Orbit({ p }: { p: Palette }) {
  const spin = useRef<THREE.Group>(null);
  const family = usePixelFont();

  const textures = useMemo(
    () =>
      ORBIT.map((label, i) =>
        ORBIT_AI.has(label)
          ? labelTexture(label, p.coral, "#0F1020", p.ink, family)
          : i % 2 === 0
            ? labelTexture(label, p.ac, "#0F1020", p.ink, family)
            : labelTexture(label, p.card2, p.ink, p.line, family),
      ),
    [p, family],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  const R = 1.65;
  // the ring is a loop of square "pixel" dots, constant size on screen
  const ring = useMemo(() => {
    const pts = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) {
      pts[i * 3] = Math.cos((i / 72) * Math.PI * 2) * R;
      pts[i * 3 + 2] = Math.sin((i / 72) * Math.PI * 2) * R;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.45;
  });

  return (
    <group position={[0, 1.15, 0]} rotation={[0.45, 0, 0]}>
      <group ref={spin}>
        <points geometry={ring}>
          <pointsMaterial color={p.ink} size={3} sizeAttenuation={false} transparent opacity={0.55} />
        </points>
        {ORBIT.map((label, i) => {
          const a = (i / ORBIT.length) * Math.PI * 2;
          return (
            <sprite key={label} position={[Math.cos(a) * R, 0, Math.sin(a) * R]} scale={[0.85, 0.27, 1]}>
              <spriteMaterial map={textures[i]} transparent depthWrite={false} />
            </sprite>
          );
        })}
      </group>
    </group>
  );
}

export default function PlayerSprite({ low, onPoke }: { low: boolean; onPoke: () => void }) {
  const p = useThemeColors();
  const pointer = useRef({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const x = (e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 320);
      const y = (e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 320);
      pointer.current = { x: Math.max(-1, Math.min(1, x * 2)), y: Math.max(-1, Math.min(1, y * 2)) };
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  if (lost) return null;
  return (
    <div ref={wrap} className="stage3d" role="img" aria-label="Player sprite: a robot orbited by my skills">
      <GameCanvas low={low} className="stage3d-canvas" camera={{ position: [0, 1.7, 7.2], fov: 35 }} onLost={() => setLost(true)}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <LookAt y={1.25} />
        <group scale={1.15}>
          <Robot p={p} onPoke={onPoke} pointer={pointer} />
        </group>
        <Orbit p={p} />
      </GameCanvas>
    </div>
  );
}
