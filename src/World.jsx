import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";

// ----------------------------------------------------------------------------
// YOUR WORLD LIVES HERE.
// Replace / add things freely. To use a free GLB model later:
//   import { useGLTF } from "@react-three/drei";
//   const { scene } = useGLTF("/models/house.glb");
//   <RigidBody type="fixed" colliders="trimesh"><primitive object={scene} /></RigidBody>
// ----------------------------------------------------------------------------

function Ground() {
  return (
    <RigidBody type="fixed" friction={1}>
      <CuboidCollider args={[150, 0.5, 150]} position={[0, -0.5, 0]} />
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#6fbf73" />
      </mesh>
    </RigidBody>
  );
}

function Ramp({ position, rotation = [0, 0, 0], size = [6, 0.4, 10] }) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} friction={1}>
      <CuboidCollider args={size.map((s) => s / 2)} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#e0a458" />
      </mesh>
    </RigidBody>
  );
}

function Crate({ position, color = "#c97b4a" }) {
  return (
    <RigidBody position={position} colliders="cuboid" mass={4}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

function Tree({ position }) {
  return (
    <RigidBody type="fixed" position={position}>
      <CylinderCollider args={[1.5, 0.3]} position={[0, 1.5, 0]} />
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
        <meshStandardMaterial color="#7a5230" />
      </mesh>
      <mesh castShadow position={[0, 4, 0]}>
        <coneGeometry args={[1.8, 4, 8]} />
        <meshStandardMaterial color="#2f7d4f" />
      </mesh>
    </RigidBody>
  );
}

export default function World() {
  const trees = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 55 + (i % 3) * 6;
    trees.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }

  return (
    <>
      <hemisphereLight args={["#ffffff", "#6fbf73", 0.9]} />
      <directionalLight
        castShadow
        position={[30, 50, 20]}
        intensity={1.6}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      <Ground />

      {/* A ramp to jump from */}
      <Ramp position={[0, 1, -25]} rotation={[-0.2, 0, 0]} />
      <Ramp position={[-18, 1, -10]} rotation={[-0.2, 0.6, 0]} size={[5, 0.4, 8]} />

      {/* Pushable crates */}
      {[...Array(10)].map((_, i) => (
        <Crate
          key={i}
          position={[8 + (i % 5) * 1.4, 0.7 + Math.floor(i / 5) * 1.3, -8]}
          color={i % 2 ? "#c97b4a" : "#d9a066"}
        />
      ))}

      {trees.map((p, i) => (
        <Tree key={i} position={p} />
      ))}
    </>
  );
}
