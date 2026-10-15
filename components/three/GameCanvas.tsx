"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  low?: boolean;
  className?: string;
  style?: CSSProperties;
  camera?: { position: [number, number, number]; fov?: number };
  onLost?: () => void;
};

/** R3F canvas that only renders while it is on screen, with a capped pixel ratio and no antialiasing (pixel look). */
export default function GameCanvas({ children, low = false, className, style, camera, onLost }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={low ? 1 : [1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={camera}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            onLost?.();
          });
        }}
      >
        {children}
      </Canvas>
    </div>
  );
}
