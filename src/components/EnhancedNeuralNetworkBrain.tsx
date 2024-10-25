'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'

const Neuron = ({ position }: { position: [number, number, number] }) => (
  <Sphere args={[0.02, 16, 16]} position={position}>
    <meshStandardMaterial color="#00ffff" />
  </Sphere>
)

const Connection = ({ start, end }: { start: [number, number, number]; end: [number, number, number] }) => {
  const ref = useRef<THREE.Line>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.material.opacity = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5
    }
  })

  return (
    <Line
      ref={ref}
      points={[start, end]}
      color="#00ffff"
      lineWidth={1}
      transparent
      opacity={0.5}
    />
  )
}

const BrainNetwork = () => {
  const neurons = useMemo(() => {
    const temp = []
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 2
      const y = (Math.random() - 0.5) * 2
      const z = (Math.random() - 0.5) * 2
      temp.push([x, y, z])
    }
    return temp
  }, [])

  const connections = useMemo(() => {
    const temp = []
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        if (Math.random() > 0.95) {
          temp.push([neurons[i], neurons[j]])
        }
      }
    }
    return temp
  }, [neurons])

  return (
    <group>
      {neurons.map((pos, index) => (
        <Neuron key={index} position={pos as [number, number, number]} />
      ))}
      {connections.map((conn, index) => (
        <Connection key={index} start={conn[0] as [number, number, number]} end={conn[1] as [number, number, number]} />
      ))}
    </group>
  )
}

export default function Component() {
  return (
    <div className="w-full h-screen bg-gray-900">
      <Canvas camera={{ position: [0, 0, 2.5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <BrainNetwork />
        <OrbitControls />
      </Canvas>
    </div>
  )
}