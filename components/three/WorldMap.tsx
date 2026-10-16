"use client";

import { Edges } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import GameCanvas from "./GameCanvas";
import { labelTexture, usePixelFont } from "./textures";
import { useThemeColors, type Palette } from "./useThemeColors";

export type MapStage = { id: string; label: string; unlocked: boolean; visited: boolean; boss?: boolean };
type Props = {
  stages: MapStage[];
  target: number | null;
  low: boolean;
  onTravel: (i: number) => void;
  onArrive: (i: number) => void;
  onStep?: () => void;
};

const SPEED = 3.6;

function nodePos(i: number, n: number): THREE.Vector3 {
  const x = -5.4 + (i * 10.8) / Math.max(1, n - 1);
  return new THREE.Vector3(x, 0, i % 2 === 0 ? 1.1 : -1.1);
}

function buildPath(n: number) {
  const pts = Array.from({ length: n }, (_, i) => nodePos(i, n));
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum };
}

function pointAt(pts: THREE.Vector3[], cum: number[], d: number, out: THREE.Vector3) {
  let i = 1;
  while (i < cum.length - 1 && d > cum[i]) i++;
  const k = THREE.MathUtils.clamp((d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), 0, 1);
  return out.lerpVectors(pts[i - 1], pts[i], k);
}

function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const dist = Math.max(12, 7.4 / (Math.tan((30 * Math.PI) / 360) * aspect));
    camera.position.set(0, dist * 0.7, dist * 0.72);
    camera.lookAt(0, 0.2, 0);
  }, [camera, size]);
  return null;
}

function Ground({ p, n }: { p: Palette; n: number }) {
  const ground = useRef<THREE.InstancedMesh>(null);
  const trees = useRef<THREE.InstancedMesh>(null);
  const { pts } = useMemo(() => buildPath(n), [n]);
  const cols = 30;
  const rows = 13;

  const treeSpots = useMemo(() => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const spots: [number, number, number][] = [];
    for (let tries = 0; tries < 400 && spots.length < 30; tries++) {
      const x = (rnd() * 2 - 1) * 12;
      const z = (rnd() * 2 - 1) * 5;
      const nearPath = pts.some((q, i) => {
        const a = q;
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const ab = b.clone().sub(a);
        const t = THREE.MathUtils.clamp(((x - a.x) * ab.x + (z - a.z) * ab.z) / (ab.lengthSq() || 1), 0, 1);
        return Math.hypot(a.x + ab.x * t - x, a.z + ab.z * t - z) < 1.3;
      });
      if (!nearPath) spots.push([x, z, 0.3 + rnd() * 0.45]);
    }
    return spots;
  }, [pts]);

  useEffect(() => {
    const m = ground.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const base = new THREE.Color(p.card);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        d.position.set(c - cols / 2 + 0.5, -0.12, r - rows / 2 + 0.5);
        d.scale.set(0.94, 0.24, 0.94);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        m.setColorAt(i, col.set((r + c) % 2 ? p.card2 : p.line).lerp(base, 0.55));
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [p]);

  useEffect(() => {
    const m = trees.current;
    if (!m) return;
    const d = new THREE.Object3D();
    treeSpots.forEach(([x, z, h], i) => {
      d.position.set(x, h / 2, z);
      d.scale.set(0.3, h, 0.3);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [treeSpots]);

  const leaf = useMemo(() => new THREE.Color(p.ac).lerp(new THREE.Color(p.bg), 0.62), [p]);
  return (
    <>
      <instancedMesh ref={ground} args={[undefined, undefined, cols * rows]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial />
      </instancedMesh>
      <instancedMesh ref={trees} args={[undefined, undefined, treeSpots.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={leaf} />
      </instancedMesh>
    </>
  );
}

function PathTiles({ p, stages }: { p: Palette; stages: MapStage[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { pts, cum } = useMemo(() => buildPath(stages.length), [stages.length]);
  const tiles = useMemo(() => {
    const out: { pos: THREE.Vector3; seg: number }[] = [];
    const v = new THREE.Vector3();
    for (let d = 0.2; d < cum[cum.length - 1]; d += 0.42) {
      let seg = 1;
      while (seg < cum.length - 1 && d > cum[seg]) seg++;
      out.push({ pos: pointAt(pts, cum, d, v).clone(), seg: seg - 1 });
    }
    return out;
  }, [pts, cum]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    tiles.forEach((t, i) => {
      d.position.set(t.pos.x, 0.03, t.pos.z);
      d.scale.set(0.3, 0.06, 0.3);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      // a leg of the path lights up once the stage it leads to has been visited
      m.setColorAt(i, col.set(stages[t.seg + 1]?.visited ? p.ac : p.line));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tiles, stages, p]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, tiles.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function Node({ i, n, stage, p, family, onTravel }: { i: number; n: number; stage: MapStage; p: Palette; family: string; onTravel: (i: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const pos = useMemo(() => nodePos(i, n), [i, n]);
  const state = stage.visited ? "done" : stage.unlocked ? "open" : "locked";
  const baseColor = state === "done" ? p.ac : state === "open" ? p.coral : p.line;
  const plate = useMemo(() => new THREE.Color(baseColor).lerp(new THREE.Color(p.ink), 0.4), [baseColor, p.ink]);

  const tex = useMemo(() => {
    if (state === "locked") return labelTexture("LOCKED", p.card2, p.ink, p.line, family, 512, 144);
    if (state === "open") return labelTexture(stage.label, p.coral, "#0F1020", p.ink, family, 640, 160);
    return labelTexture(stage.label, p.ac, "#0F1020", p.ink, family, 640, 160);
  }, [state, stage.label, p, family]);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((s) => {
    const g = group.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    const lift = (hover.current && stage.unlocked ? 0.18 : 0) + (state === "open" ? Math.abs(Math.sin(t * 3 + i)) * 0.12 : 0);
    g.position.y += (lift - g.position.y) * 0.2;
  });

  return (
    <group position={pos}>
      <group
        ref={group}
        onPointerOver={() => {
          hover.current = true;
          if (stage.unlocked) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hover.current = false;
          document.body.style.cursor = "";
        }}
        onClick={() => stage.unlocked && onTravel(i)}
      >
        <mesh position-y={0.2}>
          <boxGeometry args={[1.15, 0.4, 1.15]} />
          <meshToonMaterial color={baseColor} />
          <Edges color={p.ink} />
        </mesh>
        <mesh position-y={0.46}>
          <boxGeometry args={[0.8, 0.12, 0.8]} />
          <meshToonMaterial color={plate} />
        </mesh>
        {stage.boss ? (
          <group position-y={0.52}>
            <mesh position-y={0.34}>
              <boxGeometry args={[0.5, 0.5, 0.4]} />
              <meshToonMaterial color={state === "locked" ? p.line : p.coral} />
              <Edges color={p.ink} />
            </mesh>
            {[-0.17, 0.17].map((x) => (
              <mesh key={x} position={[x, 0.4, 0.21]}>
                <boxGeometry args={[0.1, 0.1, 0.03]} />
                <meshBasicMaterial color={p.ac} />
              </mesh>
            ))}
          </group>
        ) : (
          state === "done" && (
            <group position-y={0.52}>
              <mesh position-y={0.4}>
                <boxGeometry args={[0.06, 0.8, 0.06]} />
                <meshToonMaterial color={p.ink} />
              </mesh>
              <mesh position={[0.2, 0.68, 0]}>
                <boxGeometry args={[0.36, 0.22, 0.04]} />
                <meshToonMaterial color={p.ac} />
              </mesh>
            </group>
          )
        )}
        <sprite position={[0, 1.65, 0]} scale={[tex.image.width / 150, tex.image.height / 150, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}

function Avatar({ p, target, cum, pts, onArrive, onStep }: { p: Palette; target: number | null; cum: number[]; pts: THREE.Vector3[]; onArrive: (i: number) => void; onStep?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const d = useRef(0);
  const arrived = useRef<number | null>(null);
  const lastStep = useRef(0);
  const heading = useRef(0);
  const cb = useRef({ onArrive, onStep });
  cb.current = { onArrive, onStep };
  const v = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);

  useFrame((s, dt) => {
    const g = root.current;
    if (!g) return;
    let moving = false;
    if (target !== null) {
      const diff = cum[target] - d.current;
      if (Math.abs(diff) > 0.02) {
        d.current += Math.sign(diff) * Math.min(Math.abs(diff), SPEED * dt);
        moving = true;
        arrived.current = null;
        const ahead = pointAt(pts, cum, d.current + Math.sign(diff) * 0.1, v2);
        const here = pointAt(pts, cum, d.current, v);
        heading.current = Math.atan2(ahead.x - here.x, ahead.z - here.z);
      } else if (arrived.current !== target) {
        arrived.current = target;
        cb.current.onArrive(target);
      }
    }
    pointAt(pts, cum, d.current, v);
    const bob = moving ? Math.abs(Math.sin(s.clock.elapsedTime * 11)) * 0.2 : Math.sin(s.clock.elapsedTime * 2.2) * 0.03;
    g.position.set(v.x, 0.52 + bob, v.z);
    g.rotation.y += (heading.current - g.rotation.y) * 0.25;
    const stepIdx = Math.floor(d.current / 0.55);
    if (moving && stepIdx !== lastStep.current) cb.current.onStep?.();
    lastStep.current = stepIdx;
  });

  return (
    <group ref={root} scale={0.62}>
      <mesh position-y={0.3}>
        <boxGeometry args={[0.8, 0.7, 0.55]} />
        <meshToonMaterial color={p.line} />
        <Edges color={p.ink} />
      </mesh>
      <mesh position-y={1.0}>
        <boxGeometry args={[0.95, 0.75, 0.75]} />
        <meshToonMaterial color={p.line} />
        <Edges color={p.ink} />
      </mesh>
      {[-0.23, 0.23].map((x) => (
        <mesh key={x} position={[x, 1.06, 0.39]}>
          <boxGeometry args={[0.18, 0.18, 0.05]} />
          <meshBasicMaterial color={p.ac} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshToonMaterial color={p.coral} />
      </mesh>
    </group>
  );
}

export default function WorldMap({ stages, target, low, onTravel, onArrive, onStep }: Props) {
  const p = useThemeColors();
  const family = usePixelFont();
  const [lost, setLost] = useState(false);
  const { pts, cum } = useMemo(() => buildPath(stages.length), [stages.length]);
  if (lost) return null;
  return (
    <GameCanvas low={low} className="map3d" camera={{ position: [0, 9, 10], fov: 30 }} onLost={() => setLost(true)}>
      <FitCamera />
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 8, 5]} intensity={1.5} />
      <Ground p={p} n={stages.length} />
      <PathTiles p={p} stages={stages} />
      {stages.map((s, i) => (
        <Node key={s.id} i={i} n={stages.length} stage={s} p={p} family={family} onTravel={onTravel} />
      ))}
      <Avatar p={p} target={target} cum={cum} pts={pts} onArrive={onArrive} onStep={onStep} />
    </GameCanvas>
  );
}
