"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { onBurst } from "@/lib/fx";

type Props = { max: number };

function Particles({ max }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const data = useMemo(
    () => ({
      x: new Float32Array(max), y: new Float32Array(max), vx: new Float32Array(max), vy: new Float32Array(max),
      life: new Float32Array(max), ttl: new Float32Array(max), s: new Float32Array(max), rot: new Float32Array(max), vr: new Float32Array(max),
    }),
    [max],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < max; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set("#ffffff"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [max, dummy, color]);

  useEffect(
    () =>
      onBurst((b) => {
        const m = mesh.current;
        if (!m) return;
        const { width, height } = sizeRef.current;
        const power = b.power ?? 1;
        let spawned = 0;
        for (let i = 0; i < max && spawned < b.count; i++) {
          if (data.life[i] > 0) continue;
          const a = Math.random() * Math.PI * 2;
          const sp = (140 + Math.random() * 360) * power;
          data.x[i] = b.x - width / 2;
          data.y[i] = height / 2 - b.y;
          data.vx[i] = Math.cos(a) * sp;
          data.vy[i] = Math.sin(a) * sp + 160;
          data.ttl[i] = data.life[i] = 0.7 + Math.random() * 0.6;
          data.s[i] = 6 + Math.random() * 8;
          data.rot[i] = Math.random() * 3;
          data.vr[i] = (Math.random() - 0.5) * 10;
          m.setColorAt(i, color.set(b.colors[Math.floor(Math.random() * b.colors.length)] ?? "#ffffff"));
          spawned++;
        }
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        invalidate();
      }),
    [max, data, color, invalidate],
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const step = Math.min(dt, 0.05);
    let alive = 0;
    for (let i = 0; i < max; i++) {
      if (data.life[i] <= 0) continue;
      data.life[i] -= step;
      data.vy[i] -= 900 * step;
      data.x[i] += data.vx[i] * step;
      data.y[i] += data.vy[i] * step;
      data.rot[i] += data.vr[i] * step;
      const k = Math.max(0, data.life[i] / data.ttl[i]);
      dummy.position.set(data.x[i], data.y[i], 0);
      dummy.rotation.z = data.rot[i];
      dummy.scale.setScalar(data.life[i] > 0 ? data.s[i] * Math.min(1, k * 2.5) : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (data.life[i] > 0) alive++;
    }
    m.instanceMatrix.needsUpdate = true;
    if (alive > 0) invalidate();
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, max]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

/** Full-screen, click-through overlay that draws pixel confetti. Idle (zero GPU work) until a burst is emitted. */
export default function ParticleLayer({ max }: Props) {
  return (
    <div className="fxlayer" aria-hidden>
      {/* R3F's wrapper defaults to pointer-events:auto, which would swallow every click on the page */}
      <Canvas
        style={{ pointerEvents: "none" }}
        orthographic
        camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        frameloop="demand"
        dpr={1}
        gl={{ antialias: false, alpha: true }}
      >
        <Particles max={max} />
      </Canvas>
    </div>
  );
}
