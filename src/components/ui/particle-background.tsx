"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

extend({ UnrealBloomPass });

const ParticleSwarm = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 15000; // slightly reduced for better performance on landing page
  const speedMult = 1;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);
  const color = pColor;
  
  const positions = useMemo(() => {
     const pos = [];
     for(let i=0; i<count; i++) pos.push(new THREE.Vector3((Math.random()-0.5)*200, (Math.random()-0.5)*200, (Math.random()-0.5)*200));
     return pos;
  }, []);

  // Material & Geom
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.25), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * speedMult;

    for (let i = 0; i < count; i++) {
        const s = Math.ceil(Math.pow(count, 1/3));
        const sep = 2.5; const off = (s * sep) / 2;
        let z = Math.floor(i / (s*s));
        let y = Math.floor((i % (s*s)) / s);
        let x = i % s;
        
        // Add some sine wave movement for a "breathing" effect
        const waveX = Math.sin(time * 0.5 + y) * 2;
        const waveY = Math.cos(time * 0.4 + z) * 2;
        
        target.set(x * sep - off + waveX, y * sep - off + waveY, z * sep - off);
        
        // Dynamic coloring based on position (purple/blue mix)
        const mix = (x / s);
        color.setHSL(0.6 + (mix * 0.2), 0.8, 0.5); // Range from deep blue to purple/pink

        positions[i].lerp(target, 0.05);
        dummy.position.copy(positions[i]);
        dummy.rotation.x = time * 0.5 + i;
        dummy.rotation.y = time * 0.5 + i;
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
};

export function ParticleBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 80], fov: 60 }}>
        <fog attach="fog" args={['#000000', 30, 120]} />
        <ParticleSwarm />
        <OrbitControls autoRotate={true} autoRotateSpeed={1.0} enableZoom={false} enablePan={false} enableRotate={false} />
        <Effects disableGamma>
            {/* @ts-ignore */}
            <unrealBloomPass threshold={0.1} strength={1.5} radius={0.5} />
        </Effects>
      </Canvas>
    </div>
  );
}
