import { Atom } from 'lucide-react'
import { countsFromAtoms, formulaFromCounts } from '../chemistry/formulas.js'
import { MAX_ATOMS } from '../data/constants.js'

export function ModuleCard({ icon: Icon = Atom, title, description, children }) {
  return (
    <section className="module-card">
      <header className="module-heading">
        <span className="module-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

export function ResultMessage({ type = 'info', title, children }) {
  return (
    <div className={`tool-result result-${type}`} role="status" aria-live="polite">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

export function FormulaDisplay({ formula }) {
  if (!formula) return '—'
  return formula.split(/(\d+)/).map((part, index) =>
    /^\d+$/.test(part) ? <sub key={`${part}-${index}`}>{part}</sub> : part,
  )
}

export function AtomComposer({ atoms, setAtoms, onRemoveAtom }) {
  const formula = atoms.length ? formulaFromCounts(countsFromAtoms(atoms)) : ''

  return (
    <div className="atom-composer">
      <div className="composer-heading">
        <strong>Composición seleccionada</strong>
        <span>{atoms.length} / {MAX_ATOMS} átomos</span>
      </div>
      {atoms.length === 0 ? (
        <p className="composer-empty">Selecciona elementos en la tabla para construir una fórmula.</p>
      ) : (
        <>
          <div className="composer-atoms">
            {atoms.map((symbol, index) => (
              <button
                className="composer-atom"
                key={`${symbol}-${index}`}
                type="button"
                title={`Quitar ${symbol}`}
                aria-label={`Quitar átomo ${symbol}`}
                onClick={() => onRemoveAtom(index)}
              >
                {symbol} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <div className="composer-actions">
            <span>Fórmula: <strong>{formula}</strong></span>
            <button className="tool-secondary-button" type="button" onClick={() => setAtoms([])}>
              Limpiar selección
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ReactionFormulaEditor({
  reactants,
  setReactants,
  products,
  setProducts,
  atoms,
  setAtoms,
  onRemoveAtom,
}) {
  function addFormula(setSide) {
    if (atoms.length === 0) return
    const formula = formulaFromCounts(countsFromAtoms(atoms))
    setSide((current) => `${current.trim()}${current.trim() ? ' + ' : ''}${formula}`)
    setAtoms([])
  }

  return (
    <>
      <AtomComposer atoms={atoms} setAtoms={setAtoms} onRemoveAtom={onRemoveAtom} />
      {atoms.length > 0 && (
        <div className="composer-actions">
          <button className="tool-secondary-button" type="button" onClick={() => addFormula(setReactants)}>
            Usar selección como reactante
          </button>
          <button className="tool-secondary-button" type="button" onClick={() => addFormula(setProducts)}>
            Usar selección como producto
          </button>
        </div>
      )}
      <div className="reaction-inputs">
        <label>
          Reactantes <span>(separa fórmulas con +)</span>
          <input
            value={reactants}
            onChange={(event) => setReactants(event.target.value)}
            placeholder="H2 + O2"
          />
        </label>
        <span className="reaction-arrow" aria-hidden="true">→</span>
        <label>
          Productos <span>(separa fórmulas con +)</span>
          <input
            value={products}
            onChange={(event) => setProducts(event.target.value)}
            placeholder="H2O"
          />
        </label>
      </div>
    </>
  )
}
