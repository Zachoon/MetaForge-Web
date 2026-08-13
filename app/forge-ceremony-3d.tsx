"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const MODEL_ROOT = "/assets/forge/models/quaternius";
const CARD_MODEL_ROOT = "/assets/forge/models/quaternius-cards";
const CARD_MODELS = ["1_Fireball", "20_Element_Fire", "22_Element_Air", "24_Element_Dark", "25_Element_Earth", "23_Element_Water", "21_Element_Lightning"] as const;
const FORGE_CAMERA_WIDE = new THREE.Vector3(.15, 2.1, 6.4);
const FORGE_CAMERA_FINAL = new THREE.Vector3(0, 1.8, 5.55);

class ForgeWebGLErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function FoundryEnvironment() {
  const texture = useLoader(RGBELoader, "/assets/forge/environment/industrial-workshop-foundry-1k.hdr");
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.environmentIntensity = .72;
    return () => {
      if (scene.environment === texture) scene.environment = null;
    };
  }, [scene, texture]);
  return null;
}

function SourcedCard({ name }: { name: typeof CARD_MODELS[number] }) {
  const { scene } = useLoader(GLTFLoader, `${CARD_MODEL_ROOT}/${name}.gltf`);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} scale={.225} rotation={[0, 0, 0]} />;
}

function SourcedModel({ name, ...props }: { name: "Anvil" | "Workbench" | "Chain_Coil" } & JSX.IntrinsicElements["group"]) {
  const { scene } = useLoader(GLTFLoader, `${MODEL_ROOT}/${name}.gltf`);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} {...props} />;
}

function ForgeSparks({ impact }: { impact: MutableRefObject<number> }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = .15 + Math.random() * 1.25;
      values[index * 3] = Math.cos(angle) * radius;
      values[index * 3 + 1] = Math.random() * 1.4;
      values[index * 3 + 2] = Math.sin(angle) * radius * .55;
    }
    return values;
  }, []);
  useFrame(({ clock }) => {
    if (!points.current) return;
    points.current.rotation.y = clock.elapsedTime * .18;
    const material = points.current.material as THREE.PointsMaterial;
    material.opacity = .04 + impact.current * .92;
    const burstScale = .72 + impact.current * .6;
    points.current.scale.setScalar(burstScale);
  });
  return (
    <points ref={points} position={[0, .5, .5]}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#ffb468" size={.038} transparent opacity={.04} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function Hammer({ stage, impactSignal }: { stage: number; impactSignal: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const impact = useRef<THREE.PointLight>(null);
  const observedStage = useRef(stage);
  const stageStartedAt = useRef(0);
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (observedStage.current !== stage) {
      observedStage.current = stage;
      stageStartedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - stageStartedAt.current;
    const canStrike = stage > 0 && stage < 6;
    const strikeWindow = canStrike && elapsed > .44 && elapsed < .9
      ? Math.sin(((elapsed - .44) / .46) * Math.PI)
      : 0;
    const strike = Math.pow(Math.max(0, strikeWindow), 1.7);
    impactSignal.current = strike;
    group.current.rotation.z = THREE.MathUtils.lerp(-.84, -.12, strike);
    group.current.position.y = THREE.MathUtils.lerp(2.5, 1.72, strike);
    if (impact.current) impact.current.intensity = strike * 26;
  });
  return (
    <>
      <group ref={group} position={[1.4, 2.5, .48]} rotation={[0, 0, -.84]}>
        <mesh position={[0, -.7, 0]} castShadow><cylinderGeometry args={[.07, .095, 1.8, 12]} /><meshStandardMaterial color="#6d3219" roughness={.72} /></mesh>
        <mesh position={[0, -1.55, 0]} castShadow><boxGeometry args={[.82, .34, .42]} /><meshStandardMaterial color="#57584f" metalness={.82} roughness={.28} /></mesh>
        <mesh position={[-.46, -1.55, 0]} castShadow><coneGeometry args={[.28, .48, 4]} /><meshStandardMaterial color="#4a4c46" metalness={.86} roughness={.25} /></mesh>
      </group>
      <pointLight ref={impact} position={[.35, .58, .8]} intensity={0} distance={3.2} decay={2} color="#fff0ba" />
    </>
  );
}

function ForgedCards({ stage }: { stage: number }) {
  const group = useRef<THREE.Group>(null);
  const cards = useRef<Array<THREE.Group | null>>([]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * .3) * .035;
    cards.current.forEach((card, index) => {
      if (!card) return;
      const center = index - 3;
      let x = center * .24;
      let y = 1.38 - Math.abs(center) * .035;
      let z = index * .018;
      let rotation = center * -.095;
      if (stage === 0) {
        x = center < 0 ? -2.8 - Math.abs(center) * .18 : center > 0 ? 2.8 + Math.abs(center) * .18 : 0;
        y = center === 0 ? 3.25 : 1.9 + Math.abs(center) * .08;
        rotation = center * -.18;
      } else if (stage === 2 || stage === 5) {
        const column = index % 3;
        x = (column - 1) * .72;
        y = 1.34 + Math.floor(index / 3) * .035;
        z = Math.floor(index / 3) * .055;
        rotation = (column - 1) * -.055;
      } else if (stage >= 6) {
        x = 0;
        y = 1.3 + index * .022;
        z = index * .025;
        rotation = 0;
      } else if (stage >= 3) {
        x = center * .15;
        rotation = center * -.045;
      }
      card.position.x = THREE.MathUtils.lerp(card.position.x, x, .075);
      card.position.y = THREE.MathUtils.lerp(card.position.y, y + Math.sin(clock.elapsedTime * .9 + index) * .012, .075);
      card.position.z = THREE.MathUtils.lerp(card.position.z, z, .075);
      card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, rotation, .075);
      card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, rotation * -.45, .075);
    });
  });
  return (
    <group ref={group} position={[0, 0, .1]} scale={.78}>
      {Array.from({ length: 7 }, (_, index) => {
        const center = index - 3;
        const initialX = center < 0 ? -2.8 - Math.abs(center) * .18 : center > 0 ? 2.8 + Math.abs(center) * .18 : 0;
        const initialY = center === 0 ? 3.25 : 1.9 + Math.abs(center) * .08;
        return (
          <group key={index} ref={(node) => { cards.current[index] = node; }} position={[initialX, initialY, index * .018]}>
            <SourcedCard name={CARD_MODELS[index]} />
          </group>
        );
      })}
    </group>
  );
}

function ForgeScene({ stage, onReady }: { stage: number; onReady: () => void }) {
  const cameraRig = useRef<THREE.Group>(null);
  const impactSignal = useRef(0);
  useEffect(() => onReady(), [onReady]);
  useFrame(({ clock, camera }) => {
    if (!cameraRig.current) return;
    cameraRig.current.rotation.y = Math.sin(clock.elapsedTime * .22) * .025;
    const final = stage >= 6;
    camera.position.lerp(final ? FORGE_CAMERA_FINAL : FORGE_CAMERA_WIDE, .035);
    camera.lookAt(0, .78, 0);
  });
  const heat = .8 + stage * .16;
  return (
    <group ref={cameraRig} position={[-.2, -.42, 0]}>
      <FoundryEnvironment />
      <ambientLight intensity={.42} color="#82b9ae" />
      <directionalLight position={[-4, 6, 4]} intensity={1.65} color="#9adfd3" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, .55, 1]} intensity={heat * 8} distance={7} decay={2} color="#ff762e" />
      <pointLight position={[-2.4, 2.2, -1]} intensity={4} distance={7} color="#42b8af" />
      <mesh position={[0, -.34, 0]} receiveShadow>
        <cylinderGeometry args={[1.72, 2.02, .42, 12]} />
        <meshStandardMaterial color="#111511" metalness={.55} roughness={.68} />
      </mesh>
      <SourcedModel name="Anvil" position={[0, -.05, .05]} scale={2.65} rotation={[0, -.08, 0]} />
      <Hammer stage={stage} impactSignal={impactSignal} />
      <ForgedCards stage={stage} />
      <ForgeSparks impact={impactSignal} />
      <mesh position={[0, -.7, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#050605" roughness={1} transparent opacity={.7} />
      </mesh>
    </group>
  );
}

export function ForgeCeremony3D({ stage, quiet = false }: { stage: number; quiet?: boolean }) {
  const [ready, setReady] = useState(false);
  if (quiet) return null;
  return (
    <ForgeWebGLErrorBoundary>
      <div className={`forge-webgl-scene${ready ? " is-ready" : ""}`} aria-hidden="true">
        <Canvas
          camera={{ position: [0, 2.1, 6.4], fov: 36 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          shadows
        >
          <Suspense fallback={null}><ForgeScene stage={stage} onReady={() => setReady(true)} /></Suspense>
        </Canvas>
      </div>
    </ForgeWebGLErrorBoundary>
  );
}
