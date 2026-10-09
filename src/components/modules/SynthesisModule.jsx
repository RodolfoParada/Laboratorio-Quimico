import { useState } from 'react'
import { FlaskConical, RotateCcw, Sparkles } from 'lucide-react'
import { ELEMENTS } from '../../data/elements.js'
import {
  fetchPubChem3DStructure,
  findCompoundsByFormula,
  PubChemApiError,
} from '../../services/pubchem.js'
import { countsFromAtoms, parseFormulaList } from '../../chemistry/formulas.js'
import { classifyBalancedReaction } from '../../chemistry/reactions.js'
import { ModuleCard, FormulaDisplay, ResultMessage } from '../ModuleCard.jsx'
import MolecularViewer3D from '../MolecularViewer3D.jsx'
import ThermochemistryResult from '../ThermochemistryResult.jsx'
import { MAX_ATOMS } from '../../data/constants.js'

const ELEMENT_BY_SYMBOL = Object.fromEntries(ELEMENTS.map((element) => [element.symbol, element]))

export default function SynthesisModule({ atoms, setAtoms, removeAtom, onReport }) {
  const [result, setResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [modelState, setModelState] = useState(null)
  const [thermoReactants, setThermoReactants] = useState('H2 + O2')
  const [thermoProducts, setThermoProducts] = useState('H2O')
  const [thermoResult, setThermoResult] = useState(null)
  const [thermoError, setThermoError] = useState(null)

  function clearAtoms() {
    setAtoms([])
    setResult(null)
    setModelState(null)
  }

  async function showModel(cid) {
    setModelState({ cid, type: 'loading' })
    try {
      const structure = await fetchPubChem3DStructure(cid)
      setModelState({ cid, type: 'success', structure })
    } catch (error) {
      setModelState({
        cid,
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cargar el modelo 3D.',
      })
    }
  }

  function checkThermochemistry() {
    try {
      const analysis = classifyBalancedReaction(
        parseFormulaList(thermoReactants),
        parseFormulaList(thermoProducts),
      )
      if (!analysis.thermochemistry) {
        setThermoResult(null)
        setThermoError('No hay datos termoquímicos verificados para esta reacción.')
        return
      }
      setThermoResult(analysis.thermochemistry)
      setThermoError(null)
      const sideText = (side) =>
        side.map(({ formula, coefficient }) => `${coefficient > 1 ? coefficient : ''}${formula}`).join(' + ')
      onReport?.({
        title: 'Consulta termoquímica',
        details: `${sideText(analysis.equation.reactants)} → ${sideText(analysis.equation.products)} · ΔH ${analysis.thermochemistry.deltaH} ${analysis.thermochemistry.unit}. ${analysis.thermochemistry.note}`,
      })
    } catch (error) {
      setThermoResult(null)
      setThermoError(error instanceof Error ? error.message : 'No se pudo analizar la reacción.')
    }
  }

  async function synthesize() {
    if (!atoms.length || isSearching) return
    setIsSearching(true)
    setModelState(null)
    setResult({
      type: 'info',
      title: 'Consultando PubChem…',
      message: 'Buscando registros con la fórmula elemental exacta.',
    })

    try {
      const lookup = await findCompoundsByFormula(countsFromAtoms(atoms))
      if (lookup.total === 0) {
        setResult({
          type: 'error',
          title: `Sin coincidencias para ${lookup.formula}`,
          formula: lookup.formula,
          message:
            'PubChem no devolvió registros para esta fórmula. Esto no demuestra que la combinación sea imposible ni que no exista en otras fuentes.',
        })
        return
      }
      setResult({
        type: 'success',
        title: `PubChem devolvió ${lookup.total} registros`,
        formula: lookup.formula,
        message:
          `Se muestran ${lookup.compounds.length} de ${lookup.total} resultados recibidos. La coincidencia por fórmula no confirma que haya ocurrido una reacción ni distingue todos los isómeros.`,
        compounds: lookup.compounds,
      })
      onReport?.({
        title: `Consulta de síntesis: ${lookup.formula}`,
        details: lookup.compounds
          .map((compound) => `${compound.spanishName ?? compound.name} (${compound.formula}; CID ${compound.cid})`)
          .join('; '),
      })
    } catch (error) {
      let message = 'Ocurrió un error inesperado al consultar PubChem.'
      if (error instanceof PubChemApiError) {
        message =
          error.status === 429 || error.status === 503
            ? 'PubChem está limitando o no puede atender consultas en este momento. Espera un momento e inténtalo de nuevo.'
            : `La API de PubChem respondió con un error (HTTP ${error.status}).`
      } else if (error instanceof TypeError) {
        message = 'No se pudo conectar con PubChem. Revisa tu conexión e inténtalo de nuevo.'
      } else if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
        message =
          error.name === 'TimeoutError'
            ? 'PubChem tardó demasiado en responder. Inténtalo de nuevo.'
            : `La consulta a PubChem se interrumpió: ${error.message}`
      } else if (error instanceof Error) {
        message = error.message
      }
      setResult({ type: 'error', title: 'No se pudo consultar PubChem', message })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <ModuleCard
      icon={FlaskConical}
      title="Matraz de Síntesis"
      description="Consulta en PubChem registros con la fórmula exacta de los átomos seleccionados."
    >
      <div className="flask-toolbar">
        <p>Capacidad: <strong>{atoms.length}</strong> / {MAX_ATOMS} átomos</p>
        {atoms.length > 0 && (
          <button className="clear-button" type="button" disabled={isSearching} onClick={clearAtoms}>
            <RotateCcw size={14} /> Vaciar matraz
          </button>
        )}
      </div>
      {atoms.length === 0 ? (
        <div className="flask-workspace empty-workspace">
          <FlaskConical size={46} aria-hidden="true" />
          <strong>El matraz está vacío.</strong>
          <span>Haz clic en la tabla para añadir átomos.</span>
        </div>
      ) : (
        <div className="flask-workspace filled-workspace" aria-label="Átomos dentro del matraz">
          {atoms.map((symbol, index) => {
            const element = ELEMENT_BY_SYMBOL[symbol]
            return (
              <button
                className={`atom-chip category-${element.category}`}
                key={`${symbol}-${index}`}
                type="button"
                disabled={isSearching}
                title={`Quitar ${element.name}`}
                aria-label={`Quitar ${element.name} del matraz`}
                onClick={() => removeAtom(index)}
              >
                <span className="chip-symbol">{symbol}</span>
                <span className="chip-name">{element.name}</span>
              </button>
            )
          })}
        </div>
      )}
      {result && (
        <div
          className={`synthesis-result result-${result.type}`}
          role="status"
          aria-live="polite"
          aria-busy={isSearching}
        >
          <div className="result-copy">
            <strong>{result.title}</strong>
            <p>{result.message}</p>
            {result.compounds && (
              <ul className="compound-list">
                {result.compounds.map((compound) => (
                  <li key={compound.cid}>
                    <strong className="compound-name-es">
                      {compound.spanishName ?? 'Nombre en español no disponible'}
                    </strong>
                    {!compound.spanishName && (
                      <span className="compound-composition">Composición: {compound.compositionEs}</span>
                    )}
                    <span className="compound-details">
                      Fórmula: <FormulaDisplay formula={compound.formula} />
                      {compound.iupacName && compound.iupacName !== compound.name
                        ? ` · Nombre IUPAC: ${compound.iupacName}`
                        : ''}
                    </span>
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver ficha en PubChem · CID {compound.cid}
                    </a>
                    <span className="compound-source-name">Nombre registrado en PubChem: {compound.name}</span>
                    <button
                      className="text-button"
                      disabled={modelState?.type === 'loading'}
                      onClick={() => showModel(compound.cid)}
                      type="button"
                    >
                      {modelState?.cid === compound.cid && modelState.type === 'loading'
                        ? 'Cargando modelo 3D…'
                        : 'Ver modelo molecular 3D'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {result.formula && <span className="result-formula"><FormulaDisplay formula={result.formula} /></span>}
        </div>
      )}
      {modelState?.type === 'error' && (
        <p className="field-hint" role="status">{modelState.message}</p>
      )}
      {modelState?.type === 'success' && (
        <MolecularViewer3D cid={modelState.cid} structure={modelState.structure} />
      )}
      <button
        className="synthesize-button"
        type="button"
        disabled={atoms.length === 0 || isSearching}
        aria-busy={isSearching}
        onClick={synthesize}
      >
        <Sparkles size={19} />
        {isSearching ? 'Consultando PubChem…' : 'Buscar compuesto en PubChem'}
      </button>
      <details className="advanced-fields">
        <summary>Termodinámica de reacciones con datos de referencia</summary>
        <p className="tool-result-caption">
          Ingresa una ecuación para consultar solo reacciones con ΔH tabulado; no se deduce energía a partir de la composición del matraz.
        </p>
        <div className="reaction-inputs">
          <label>
            Reactantes
            <input onChange={(event) => setThermoReactants(event.target.value)} value={thermoReactants} />
          </label>
          <span aria-hidden="true" className="reaction-arrow">→</span>
          <label>
            Productos
            <input onChange={(event) => setThermoProducts(event.target.value)} value={thermoProducts} />
          </label>
        </div>
        <button className="tool-secondary-button" onClick={checkThermochemistry} type="button">
          Consultar cambio térmico
        </button>
        {thermoError && <ResultMessage type="warning" title="Sin estimación termoquímica">{thermoError}</ResultMessage>}
        <ThermochemistryResult thermochemistry={thermoResult} />
      </details>
    </ModuleCard>
  )
}
