import { useMemo, useRef, useState } from 'react'
import { PencilRuler } from 'lucide-react'
import { analyzeLewisStructure } from '../../chemistry/organic.js'
import { countsFromAtoms, formulaFromCounts } from '../../chemistry/formulas.js'
import usePersistentState from '../../hooks/usePersistentState.js'
import { AtomComposer, ModuleCard, ResultMessage } from '../ModuleCard.jsx'

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360

function createDefaultPositions(atomCount) {
  return Array.from({ length: atomCount }, (_, index) => ({
    x: 80 + (index % 6) * 96,
    y: 55 + Math.floor(index / 6) * 80,
  }))
}

function electronPosition(index, count) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
  return { x: 31 * Math.cos(angle), y: 31 * Math.sin(angle) }
}

export default function LewisModule({ atoms, setAtoms, onReport, onPersistenceError }) {
  const [bonds, setBonds] = usePersistentState('lewis.bonds', [], onPersistenceError)
  const [fromNode, setFromNode] = usePersistentState('lewis.from-node', '0', onPersistenceError)
  const [toNode, setToNode] = usePersistentState('lewis.to-node', '1', onPersistenceError)
  const [bondOrder, setBondOrder] = usePersistentState('lewis.bond-order', '1', onPersistenceError)
  const [positions, setPositions] = usePersistentState('lewis.positions', [], onPersistenceError)
  const [feedback, setFeedback] = useState(null)
  const svgRef = useRef(null)
  const draggingNode = useRef(null)
  const analysis = useMemo(() => analyzeLewisStructure(atoms, bonds), [atoms, bonds])
  const activePositions =
    positions.length === atoms.length ? positions : createDefaultPositions(atoms.length)
  const incomplete = analysis.filter((item) => item.supported && !item.valid)
  const unsupported = analysis.filter((item) => !item.supported)
  const hasCompleteOctets = analysis.length > 0 && incomplete.length === 0 && unsupported.length === 0
  const formula = atoms.length ? formulaFromCounts(countsFromAtoms(atoms)) : ''

  function addBond() {
    const from = Number(fromNode)
    const to = Number(toNode)
    const order = Number(bondOrder)
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
      setFeedback({ type: 'error', title: 'Enlace no válido', message: 'Selecciona dos átomos diferentes.' })
      return
    }
    if (bonds.some((bond) =>
      (bond.from === from && bond.to === to) || (bond.from === to && bond.to === from),
    )) {
      setFeedback({ type: 'error', title: 'Enlace duplicado', message: 'Ya existe un enlace entre esos átomos.' })
      return
    }

    const nextBonds = [...bonds, { from, to, order }]
    const nextAnalysis = analyzeLewisStructure(atoms, nextBonds)
    const invalid = nextAnalysis.find(
      (item) =>
        !item.supported ||
        item.loneElectrons < 0 ||
        item.shownElectrons > item.targetElectrons,
    )
    if (invalid) {
      setFeedback({
        type: 'error',
        title: 'No se puede representar ese enlace',
        message: invalid.supported
          ? invalid.loneElectrons < 0
            ? `${invalid.symbol} excedería los electrones disponibles en este modelo neutro.`
            : `${invalid.symbol} superaría el dueto/octeto configurado en este modelo.`
          : `No hay datos de electrones de valencia para ${invalid.symbol} en este modelo.`,
      })
      return
    }
    setBonds(nextBonds)
    setFeedback({ type: 'info', title: 'Enlace agregado', message: 'Revisa si cada átomo alcanza dueto u octeto.' })
  }

  function startDrag(event, index) {
    event.preventDefault()
    draggingNode.current = index
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function moveNode(event, index) {
    setPositions((current) => {
      const next = current.length === atoms.length ? [...current] : createDefaultPositions(atoms.length)
      const bounds = svgRef.current?.getBoundingClientRect()
      if (!bounds) return next
      next[index] = {
        x: Math.max(36, Math.min(CANVAS_WIDTH - 36, ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH)),
        y: Math.max(36, Math.min(CANVAS_HEIGHT - 36, ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT)),
      }
      return next
    })
  }

  function handlePointerMove(event) {
    if (draggingNode.current !== null) moveNode(event, draggingNode.current)
  }

  function nudgeNode(event, index) {
    const offsets = {
      ArrowLeft: [-8, 0],
      ArrowRight: [8, 0],
      ArrowUp: [0, -8],
      ArrowDown: [0, 8],
    }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    setPositions((current) => {
      const next = current.length === atoms.length ? [...current] : createDefaultPositions(atoms.length)
      next[index] = {
        x: Math.max(36, Math.min(CANVAS_WIDTH - 36, next[index].x + offset[0])),
        y: Math.max(36, Math.min(CANVAS_HEIGHT - 36, next[index].y + offset[1])),
      }
      return next
    })
  }

  function resetCanvas() {
    setBonds([])
    setPositions(createDefaultPositions(atoms.length))
    setFeedback(null)
  }

  function removeAtomFromBoard(index) {
    setAtoms((current) => current.filter((_, atomIndex) => atomIndex !== index))
    setPositions(createDefaultPositions(Math.max(0, atoms.length - 1)))
    setBonds((current) =>
      current
        .filter((bond) => bond.from !== index && bond.to !== index)
        .map((bond) => ({
          ...bond,
          from: bond.from > index ? bond.from - 1 : bond.from,
          to: bond.to > index ? bond.to - 1 : bond.to,
        })),
    )
  }

  function clearComposition() {
    setAtoms([])
    setBonds([])
    setPositions([])
    setFeedback(null)
  }

  return (
    <ModuleCard
      icon={PencilRuler}
      title="Pizarra de estructuras de Lewis"
      description="Arrastra los átomos, conecta enlaces y revisa el modelo de electrones de valencia."
    >
      <AtomComposer atoms={atoms} setAtoms={clearComposition} onRemoveAtom={removeAtomFromBoard} />
      {atoms.length > 0 ? (
        <svg
          aria-label={`Estructura de Lewis de ${atoms.join(', ')}. Usa las flechas del teclado para mover átomos.`}
          className="lewis-canvas"
          height={CANVAS_HEIGHT}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { draggingNode.current = null }}
          ref={svgRef}
          role="group"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        >
          <rect height={CANVAS_HEIGHT} rx="14" width={CANVAS_WIDTH} />
          {bonds.map((bond, index) => {
            const start = activePositions[bond.from]
            const end = activePositions[bond.to]
            if (!start || !end) return null
            const dx = end.x - start.x
            const dy = end.y - start.y
            const length = Math.hypot(dx, dy) || 1
            const perpendicular = { x: (-dy / length) * 5, y: (dx / length) * 5 }
            return Array.from({ length: bond.order }, (_, lineIndex) => {
              const offset = (lineIndex - (bond.order - 1) / 2)
              return (
                <line
                  className="lewis-bond"
                  key={`${index}-${lineIndex}`}
                  x1={start.x + perpendicular.x * offset}
                  x2={end.x + perpendicular.x * offset}
                  y1={start.y + perpendicular.y * offset}
                  y2={end.y + perpendicular.y * offset}
                />
              )
            })
          })}
          {atoms.map((symbol, index) => {
            const position = activePositions[index]
            const atomState = analysis[index]
            const loneElectrons = atomState?.loneElectrons ?? 0
            return (
              <g
                aria-label={`Átomo ${index + 1}, ${symbol}. ${atomState?.shownElectrons ?? 'Electrones no modelados'} electrones alrededor.`}
                className="lewis-atom"
                key={`${symbol}-${index}`}
                onKeyDown={(event) => nudgeNode(event, index)}
                onPointerDown={(event) => startDrag(event, index)}
                role="button"
                tabIndex={0}
                transform={`translate(${position.x} ${position.y})`}
              >
                <circle r="23" />
                <text dominantBaseline="central" textAnchor="middle">{symbol}</text>
                {Array.from({ length: loneElectrons }, (_, electronIndex) => {
                  const point = electronPosition(electronIndex, Math.max(loneElectrons, 1))
                  return <circle className="lewis-electron" cx={point.x} cy={point.y} key={electronIndex} r="2.2" />
                })}
              </g>
            )
          })}
        </svg>
      ) : (
        <p className="composer-empty">Selecciona átomos en la tabla para iniciar una estructura.</p>
      )}
      {atoms.length >= 2 && (
        <div className="bond-editor">
          <label>
            Átomo inicial
            <select onChange={(event) => setFromNode(event.target.value)} value={fromNode}>
              {atoms.map((symbol, index) => <option key={`from-${index}`} value={index}>{index + 1}: {symbol}</option>)}
            </select>
          </label>
          <label>
            Átomo final
            <select onChange={(event) => setToNode(event.target.value)} value={toNode}>
              {atoms.map((symbol, index) => <option key={`to-${index}`} value={index}>{index + 1}: {symbol}</option>)}
            </select>
          </label>
          <label>
            Orden de enlace
            <select onChange={(event) => setBondOrder(event.target.value)} value={bondOrder}>
              <option value="1">Simple</option>
              <option value="2">Doble</option>
              <option value="3">Triple</option>
            </select>
          </label>
          <button className="tool-secondary-button" onClick={addBond} type="button">Conectar átomos</button>
        </div>
      )}
      <div aria-live="polite" className="lewis-validation">
        {analysis.map((item) => (
          <span className={item.valid ? 'valence-valid' : item.supported ? 'valence-invalid' : 'valence-unsupported'} key={`${item.index}-${item.symbol}`}>
            {item.index + 1}. {item.symbol}: {item.supported ? `${item.shownElectrons}/${item.targetElectrons} e⁻` : 'sin datos'}
          </span>
        ))}
      </div>
      {feedback && <ResultMessage type={feedback.type} title={feedback.title}>{feedback.message}</ResultMessage>}
      {atoms.length > 0 && <button className="text-button" onClick={resetCanvas} type="button">Quitar todos los enlaces</button>}
      {hasCompleteOctets && (
        <ResultMessage type="success" title="Dueto/octeto satisfecho en el modelo">
          La comprobación solo cubre átomos neutros de grupos principales; no calcula cargas formales ni resonancia.
        </ResultMessage>
      )}
      {hasCompleteOctets && (
        <button
          className="tool-secondary-button"
          onClick={() => onReport?.({
            title: `Estructura de Lewis: ${formula}`,
            details: `${atoms.length} átomos y ${bonds.length} enlaces; dueto/octeto satisfecho en el modelo didáctico.`,
          })}
          type="button"
        >
          Añadir estructura al cuaderno
        </button>
      )}
      {incomplete.length > 0 && (
        <p className="field-hint">Faltan enlaces para alcanzar el dueto/octeto en: {incomplete.map(({ symbol }, index) => `${symbol}${index < incomplete.length - 1 ? ', ' : ''}`)}</p>
      )}
      {unsupported.length > 0 && (
        <ResultMessage type="warning" title="Elementos fuera del modelo">
          No se valida el dueto/octeto para elementos de transición ni para elementos sin datos de grupo.
        </ResultMessage>
      )}
      <p className="tool-result-caption">
        Los electrones representados son un modelo didáctico para átomos neutros de grupos principales. No se calculan cargas formales, resonancia, geometría ni excepciones al octeto.
      </p>
    </ModuleCard>
  )
}
