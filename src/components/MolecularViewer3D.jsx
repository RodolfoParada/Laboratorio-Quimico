import { useMemo, useRef, useState } from 'react'

const ATOM_COLORS = {
  H: '#f8fafc',
  C: '#475569',
  N: '#2563eb',
  O: '#dc2626',
  F: '#16a34a',
  Cl: '#16a34a',
  Br: '#92400e',
  I: '#7e22ce',
  S: '#eab308',
  P: '#ea580c',
}

function rotateAtom(atom, rotation) {
  const yaw = rotation.yaw * Math.PI / 180
  const pitch = rotation.pitch * Math.PI / 180
  const x = atom.x * Math.cos(yaw) + atom.z * Math.sin(yaw)
  const z = -atom.x * Math.sin(yaw) + atom.z * Math.cos(yaw)
  return {
    ...atom,
    x,
    y: atom.y * Math.cos(pitch) - z * Math.sin(pitch),
    depth: atom.y * Math.sin(pitch) + z * Math.cos(pitch),
  }
}

export default function MolecularViewer3D({ structure, cid }) {
  const [rotation, setRotation] = useState({ yaw: -22, pitch: 16 })
  const [zoom, setZoom] = useState(1)
  const dragStart = useRef(null)
  const projected = useMemo(() => {
    const center = structure.atoms.reduce(
      (sum, atom) => ({ x: sum.x + atom.x, y: sum.y + atom.y, z: sum.z + atom.z }),
      { x: 0, y: 0, z: 0 },
    )
    center.x /= structure.atoms.length
    center.y /= structure.atoms.length
    center.z /= structure.atoms.length
    const centered = structure.atoms.map((atom) => ({
      ...atom,
      x: atom.x - center.x,
      y: atom.y - center.y,
      z: atom.z - center.z,
    }))
    const extent = Math.max(
      ...centered.map((atom) => Math.hypot(atom.x, atom.y, atom.z)),
      0.5,
    )
    return centered.map((atom, index) => {
      const rotated = rotateAtom(
        { ...atom, x: atom.x / extent, y: atom.y / extent, z: atom.z / extent },
        rotation,
      )
      const perspective = 1 / (1 + rotated.depth * 0.18)
      return {
        ...rotated,
        screenX: 260 + rotated.x * 115 * zoom * perspective,
        screenY: 170 + rotated.y * 115 * zoom * perspective,
        radius: (atom.symbol === 'H' ? 11 : 17) * perspective,
        index,
      }
    })
  }, [rotation, structure.atoms, zoom])

  function handlePointerDown(event) {
    dragStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (!dragStart.current) return
    const deltaX = event.clientX - dragStart.current.x
    const deltaY = event.clientY - dragStart.current.y
    dragStart.current = { x: event.clientX, y: event.clientY }
    setRotation((current) => ({
      yaw: current.yaw + deltaX * 0.7,
      pitch: Math.max(-85, Math.min(85, current.pitch + deltaY * 0.7)),
    }))
  }

  function handleWheel(event) {
    event.preventDefault()
    setZoom((current) => Math.max(0.65, Math.min(2.4, current - event.deltaY * 0.001)))
  }

  function handleKeyDown(event) {
    const rotationOffsets = {
      ArrowLeft: { yaw: -8, pitch: 0 },
      ArrowRight: { yaw: 8, pitch: 0 },
      ArrowUp: { yaw: 0, pitch: -8 },
      ArrowDown: { yaw: 0, pitch: 8 },
    }
    const offset = rotationOffsets[event.key]
    if (offset) {
      event.preventDefault()
      setRotation((current) => ({
        yaw: current.yaw + offset.yaw,
        pitch: Math.max(-85, Math.min(85, current.pitch + offset.pitch)),
      }))
    } else if (event.key === '+' || event.key === '=') {
      setZoom((current) => Math.min(2.4, current + 0.1))
    } else if (event.key === '-') {
      setZoom((current) => Math.max(0.65, current - 0.1))
    }
  }

  return (
    <div className="molecular-viewer">
      <svg
        aria-label={`Modelo molecular 3D de PubChem CID ${cid}; arrastra o usa las flechas para rotar, y usa la rueda o las teclas más y menos para acercar.`}
        className="molecular-viewer-canvas"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { dragStart.current = null }}
        onWheel={handleWheel}
        role="img"
        tabIndex={0}
        viewBox="0 0 520 340"
      >
        <rect height="340" rx="14" width="520" />
        {[...structure.bonds]
          .sort((left, right) => {
            const leftDepth = (projected[left.from].depth + projected[left.to].depth) / 2
            const rightDepth = (projected[right.from].depth + projected[right.to].depth) / 2
            return leftDepth - rightDepth
          })
          .map((bond, index) => {
            const from = projected[bond.from]
            const to = projected[bond.to]
            const dx = to.screenX - from.screenX
            const dy = to.screenY - from.screenY
            const length = Math.hypot(dx, dy) || 1
            const offsetX = (-dy / length) * 3.2
            const offsetY = (dx / length) * 3.2
            return Array.from({ length: bond.order }, (_, lineIndex) => {
              const offset = lineIndex - (bond.order - 1) / 2
              return (
                <line
                  className="molecule-bond"
                  key={`${index}-${lineIndex}`}
                  x1={from.screenX + offsetX * offset}
                  x2={to.screenX + offsetX * offset}
                  y1={from.screenY + offsetY * offset}
                  y2={to.screenY + offsetY * offset}
                />
              )
            })
          })}
        {projected
          .slice()
          .sort((left, right) => left.depth - right.depth)
          .map((atom) => (
            <g key={atom.index}>
              <circle
                cx={atom.screenX}
                cy={atom.screenY}
                fill={ATOM_COLORS[atom.symbol] ?? '#7c3aed'}
                r={atom.radius}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                dominantBaseline="central"
                fill={atom.symbol === 'H' || atom.symbol === 'S' ? '#1e293b' : '#fff'}
                textAnchor="middle"
                x={atom.screenX}
                y={atom.screenY}
              >
                {atom.symbol}
              </text>
            </g>
          ))}
      </svg>
      <p>Arrastra para rotar · rueda del ratón para acercar/alejar · CID {cid}</p>
    </div>
  )
}
