import { useState } from 'react'
import { FlaskConical, Sparkles } from 'lucide-react'
import { classifyBalancedReaction } from '../../chemistry/reactions.js'
import { parseFormulaList } from '../../chemistry/formulas.js'
import usePersistentState from '../../hooks/usePersistentState.js'
import { FormulaDisplay, ModuleCard, ReactionFormulaEditor, ResultMessage } from '../ModuleCard.jsx'
import ThermochemistryResult from '../ThermochemistryResult.jsx'

export default function ReactionClassifierModule({ atoms, setAtoms, removeAtom, onReport, onPersistenceError }) {
  const [reactantsText, setReactantsText] = usePersistentState('reactions.reactants', 'Zn + HCl', onPersistenceError)
  const [productsText, setProductsText] = usePersistentState('reactions.products', 'ZnCl2 + H2', onPersistenceError)
  const [result, setResult] = usePersistentState('reactions.result', null, onPersistenceError)
  const [error, setError] = useState(null)

  function classify() {
    try {
      const reactants = parseFormulaList(reactantsText)
      const products = parseFormulaList(productsText)
      const analysis = classifyBalancedReaction(reactants, products)
      setResult(analysis)
      const formatSide = (side) =>
        side.map(({ formula, coefficient }) => `${coefficient > 1 ? coefficient : ''}${formula}`).join(' + ')
      onReport?.({
        title: `Clasificación: ${analysis.classification.type}`,
        details: `${formatSide(analysis.equation.reactants)} → ${formatSide(analysis.equation.products)}${analysis.thermochemistry ? ` · ΔH ${analysis.thermochemistry.deltaH} ${analysis.thermochemistry.unit}` : ''}`,
      })
      setError(null)
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : 'Revisa la ecuación.')
    }
  }

  return (
    <ModuleCard
      icon={Sparkles}
      title="Clasificación y evidencias"
      description="Clasifica patrones de reacción con una ecuación balanceable y muestra posibles productos gaseosos o precipitados del catálogo limitado."
    >
      <ReactionFormulaEditor
        reactants={reactantsText}
        setReactants={(value) => {
          setReactantsText(value)
          setResult(null)
        }}
        products={productsText}
        setProducts={(value) => {
          setProductsText(value)
          setResult(null)
        }}
        atoms={atoms}
        setAtoms={setAtoms}
        onRemoveAtom={removeAtom}
      />
      <button className="tool-primary-button" type="button" onClick={classify}>
        Clasificar reacción
      </button>
      {error && <ResultMessage type="error" title="No se pudo clasificar">{error}</ResultMessage>}
      {result && (
        <div className="reaction-analysis">
          <div className="balanced-equation">
            {result.equation.reactants.map((item, index) => (
              <span key={`${item.formula}-${index}`}>
                {index > 0 && ' + '}
                {item.coefficient > 1 && item.coefficient}
                <FormulaDisplay formula={item.formula} />
              </span>
            ))}
            <span aria-hidden="true">→</span>
            {result.equation.products.map((item, index) => (
              <span key={`${item.formula}-${index}`}>
                {index > 0 && ' + '}
                {item.coefficient > 1 && item.coefficient}
                <FormulaDisplay formula={item.formula} />
              </span>
            ))}
          </div>
          <ResultMessage
            type={result.classification.type === 'No identificada' ? 'warning' : 'success'}
            title={result.classification.type}
          >
            {result.classification.pattern}
          </ResultMessage>
          {result.classification.effects.length > 0 ? (
            <div className="reaction-effects">
              {result.classification.effects.map((effect) => (
                <div className={`reaction-effect effect-${effect.type}`} key={effect.type}>
                  {effect.type === 'gas' ? <span className="gas-bubble" aria-hidden="true" /> : <FlaskConical size={18} aria-hidden="true" />}
                  {effect.label}
                </div>
              ))}
            </div>
          ) : (
            <p className="module-inline-hint">No hay evidencia visual incluida en las reglas locales para estos productos.</p>
          )}
          <ThermochemistryResult thermochemistry={result.thermochemistry} />
          <p className="tool-result-caption">{result.classification.caveat}</p>
        </div>
      )}
    </ModuleCard>
  )
}
