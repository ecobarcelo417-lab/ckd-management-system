import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Float, MeshDistortMaterial, OrbitControls, Sparkles } from '@react-three/drei';

interface OrbProps {
  color?: string;
  secondaryColor?: string;
  distort?: number;
}

const Orb: React.FC<OrbProps> = ({ color = '#606060', secondaryColor = '#686868', distort = 0.35 }) => {
  return (
    <Float speed={1.8} rotationIntensity={0.7} floatIntensity={1.1}>
      <mesh>
        <icosahedronGeometry args={[1.35, 4]} />
        {/* MeshDistortMaterial extends MeshPhysicalMaterial, so the clearcoat /
            iridescence / sheen channels below are real physically-based
            layers — this is what turns a flat blob into a "studio product
            render" glassy sphere instead of a plain matte ball. */}
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={1.6}
          roughness={0.15}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={0.35}
          iridescenceIOR={1.3}
          sheen={0.5}
          sheenColor={secondaryColor}
        />
      </mesh>
    </Float>
  );
};

/**
 * A lightweight, self-contained 3D visual used to represent dialysis
 * clearance / fluid-flow adequacy on the dashboard. Kept dependency-light
 * (no external HDR/environment assets, no postprocessing) so it renders
 * reliably offline — depth and glow come entirely from a small three-point
 * studio lighting rig, a physically-based material, a procedural contact
 * shadow, and a scattering of ambient sparkles.
 */
const DialysisOrb: React.FC<OrbProps> = ({ color = '#606060', secondaryColor = '#686868', distort }) => {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 1.5]}>
      {/* Three-point studio rig: soft ambient fill, a bright key light, and a
          colored rim light picking out the silhouette edge. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, -3, -4]} intensity={0.6} color={secondaryColor} />
      <pointLight position={[-2, 2, 3]} intensity={0.4} color="#ffffff" />
      <Suspense fallback={null}>
        <Orb color={color} secondaryColor={secondaryColor} distort={distort} />
        <Sparkles count={26} scale={4.2} size={2.2} speed={0.25} opacity={0.45} color={secondaryColor} />
        <ContactShadows position={[0, -1.55, 0]} opacity={0.35} scale={7} blur={2.6} far={2.2} color="#1a1a1a" />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.1} />
    </Canvas>
  );
};

export default DialysisOrb;
