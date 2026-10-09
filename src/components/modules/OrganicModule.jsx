import { useRef, useState } from 'react'
import { GitBranch } from 'lucide-react'
import {
  areGraphsIsomorphic,
  findStructuralIsomers,
  formatGraphFormula,
  identifyFunctionalGroups,
  isGraphConnected,
  removeGraphAtom,
  validateValences,
} from '../../chemistry/organic.js'
import { AtomComposer, FormulaDisplay, ModuleCard, ResultMessage } from '../ModuleCard.jsx'

export default function OrganicModule({ atoms, setAtoms, onReport }) {
  const [bonds, setBonds] = useState([])
  const [fromNode, setFromNode] = useState('0')
  const [toNode, setToNode] = useState('1')
  const [bondOrder, setBondOrder] = useState('1')
  const [savedStructures, setSavedStructures] = useState([])
  const [feedback, setFeedback] = useState(null)
  const nextStructureId = useRef(0)
  const valences = validateValences(atoms, bonds)
  const invalidValences = valences.filter((item) => !item.valid)
  const formula = atoms.length ? formatGraphFormula(atoms) : ''
  const functionalGroups = identifyFunctionalGroups(atoms, bonds)

  function addBond() {
    const from = Number(fromNode)
    const to = Number(toNode)
    const order = Number(bondOrder)
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
      setFeedback({ type: 'error', title: 'Enlace no válido', message: 'Selecciona dos átomos diferentes.' })
      return
    }
    if (bonds.some((bond) => (bond.from === from && bond.to === to) || (bond.from === to && bond.to === from))) {
      setFeedback({ type: 'error', title: 'Enlace duplicado', message: 'Ya existe un enlace entre esos átomos.' })
      return
    }

    const nextBonds = [...bonds, { from, to, order }]
    const invalid = validateValences(atoms, nextBonds).find((item) => !item.valid)
    if (invalid) {
      setFeedback({
        type: 'error',
        title: 'La valencia excede el modelo admitido',
        message: `${invalid.symbol} usa ${invalid.used} enlaces; el máximo configurado es ${invalid.maximum ?? 'no definido'}.`,
      })
      return
    }
    setBonds(nextBonds)
    setFeedback({ type: 'success', title: 'Enlace agregado', message: 'La conectividad se actualizó.' })
  }

  function removeGraphNode(index) {
    const next = removeGraphAtom(atoms, bonds, index)
    setAtoms(next.atoms)
    setBonds(next.bonds)
    setFeedback(null)
  }

  function saveStructure() {
    if (atoms.length < 2 || bonds.length === 0) {
      setFeedback({ type: 'error', title: 'Estructura incompleta', message: 'Agrega al menos un enlace antes de guardar.' })
      return
    }
    if (!isGraphConnected(atoms, bonds)) {
      setFeedback({
        type: 'error',
        title: 'La estructura está desconectada',
        message: 'Conecta todos los átomos para analizar una molécula individual.',
      })
      return
    }
    if (invalidValences.length) {
      setFeedback({ type: 'error', title: 'Valencias pendientes', message: 'Corrige los enlaces que exceden la valencia admitida.' })
      return
    }

    const structure = {
      id: `structure-${nextStructureId.current++}`,
      atoms: [...atoms],
      bonds: bonds.map((bond) => ({ ...bond })),
      formula,
    }
    const possibleIsomers = findStructuralIsomers(structure, savedStructures)
    const equivalent = savedStructures.find(
      (candidate) => candidate.formula === formula && areGraphsIsomorphic(structure, candidate) === true,
    )
    setSavedStructures((current) => [...current, structure])
    setFeedback({
      type: possibleIsomers.length
        ? 'warning'
        : equivalent
          ? 'info'
          : 'success',
      title: possibleIsomers.length
        ? 'Posible isomería estructural'
        : equivalent
          ? 'Estructura equivalente guardada'
          : 'Estructura guardada',
      message: possibleIsomers.length
        ? `Comparte la fórmula ${formula} con ${possibleIsomers.length} estructura(s) guardada(s), pero su grafo de enlaces es distinto.`
        : equivalent
          ? `Su grafo coincide con ${equivalent.formula} guardada anteriormente.`
          : `Se guardó ${formula}. El detector compara grafos y solo informa candidatos dentro de esta sesión.`,
    })
    onReport?.({
        title: `Estructura orgánica guardada: ${formula}`,
        details: `${atoms.length} átomos, ${bonds.length} enlaces. Grupos funcionales detectados: ${functionalGroups.join(', ') || 'ninguno en las reglas locales'}.`,
    })
  }

  return (
    <ModuleCard
      icon={GitBranch}
      title="Constructor de química orgánica"
      description="Añade átomos desde la tabla, conéctalos con enlaces simples, dobles o triples y revisa valencias y grupos funcionales."
    >
      <AtomComposer atoms={atoms} setAtoms={setAtoms} onRemoveAtom={removeGraphNode} />
      {atoms.length >= 2 && (
        <div className="bond-editor">
          <label>
            Átomo inicial
            <select value={fromNode} onChange={(event) => setFromNode(event.target.value)}>
              {atoms.map((symbol, index) => (
                <option key={`from-${index}`} value={index}>{index + 1}: {symbol}</option>
              ))}
            </select>
          </label>
          <label>
            Átomo final
            <select value={toNode} onChange={(event) => setToNode(event.target.value)}>
              {atoms.map((symbol, index) => (
                <option key={`to-${index}`} value={index}>{index + 1}: {symbol}</option>
              ))}
            </select>
          </label>
          <label>
            Orden
            <select value={bondOrder} onChange={(event) => setBondOrder(event.target.value)}>
              <option value="1">Simple</option>
              <option value="2">Doble</option>
              <option value="3">Triple</option>
            </select>
          </label>
          <button className="tool-secondary-button" type="button" onClick={addBond}>Agregar enlace</button>
        </div>
      )}
      <div className="organic-graph">
        <strong>Grafo molecular · <FormulaDisplay formula={formula} /></strong>
        {bonds.length ? (
          <ul>
            {bonds.map((bond, index) => (
              <li key={`${bond.from}-${bond.to}-${index}`}>
                Átomo {bond.from + 1} ({atoms[bond.from]}) —{bond.order === 1 ? '' : bond.order === 2 ? '=' : '≡'}— átomo {bond.to + 1} ({atoms[bond.to]})
                <button
                  className="text-button"
                  type="button"
                  aria-label={`Quitar enlace entre átomo ${bond.from + 1} y ${bond.to + 1}`}
                  onClick={() => setBonds((current) => current.filter((_, bondIndex) => bondIndex !== index))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">Aún no hay enlaces. Cada fila seleccionada es un nodo independiente.</p>
        )}
      </div>
      <div className="valence-grid">
        {valences.map((item) => (
          <span className={item.valid ? 'valence-valid' : 'valence-invalid'} key={`${item.index}-${item.symbol}`}>
            {item.index + 1}: {item.symbol} · {item.used}/{item.maximum ?? '—'} enlaces
          </span>
        ))}
      </div>
      {functionalGroups.length > 0 && (
        <div className="functional-group-list">
          <strong>Grupos funcionales detectados</strong>
          <ul>{functionalGroups.map((group) => <li key={group}>{group}</li>)}</ul>
        </div>
      )}
      {feedback && <ResultMessage type={feedback.type} title={feedback.title}>{feedback.message}</ResultMessage>}
      <button className="tool-primary-button" type="button" onClick={saveStructure}>Guardar estructura y revisar isomería</button>
      {savedStructures.length > 0 && (
        <div className="saved-structures">
          <strong>Estructuras guardadas en esta pestaña</strong>
          <ul>
            {savedStructures.map((structure, index) => (
              <li key={structure.id}>
                {index + 1}. <FormulaDisplay formula={structure.formula} /> · {structure.atoms.length} átomos, {structure.bonds.length} enlaces
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="tool-result-caption">
        El constructor usa enlaces explícitos y valencias máximas comunes. No modela aromaticidad, cargas ni estereoisomería; la comparación de isómeros se limita al grafo de enlaces de las estructuras guardadas en esta pestaña.
      </p>
    </ModuleCard>
  )
}
