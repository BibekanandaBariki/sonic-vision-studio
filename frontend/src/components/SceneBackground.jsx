import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useMemo } from 'react'

const FloatingSphere = ({ position = [0, 0, 0], color = '#00D4FF' }) => (
  <mesh position={position}>
    <icosahedronGeometry args={[0.8, 1]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} />
  </mesh>
)

const SceneBackground = () => {
  const spheres = useMemo(
    () => [
      { position: [3, 1, -5], color: '#9D00FF' },
      { position: [-2, -1, -4], color: '#00D4FF' },
      { position: [0, 2, -6], color: '#FF006E' },
    ],
    [],
  )

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#0A0E27']} />
          <ambientLight intensity={0.15} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#00D4FF" />
          <pointLight position={[-5, -5, -5]} intensity={0.9} color="#FF006E" />
          <Stars radius={60} depth={40} count={1200} factor={4} saturation={0} fade speed={0.6} />
          {spheres.map((s, idx) => (
            <FloatingSphere key={idx} position={s.position} color={s.color} />
          ))}
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default SceneBackground

