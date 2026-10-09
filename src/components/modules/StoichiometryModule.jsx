import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { balanceEquation } from '../../chemistry/balance.js'
import { parseFormulaList } from '../../chemistry/formulas.js'
import { calculateStoichiometry } from '../../chemistry/stoichiometry.js'
import { ATOMIC_MASS_REFERENCE } from '../../data/atomic-properties.js'
import usePersistentState from '../../hooks/usePersistentState.js'
import {
  FormulaDisplay,
  ModuleCard,
  ReactionFormulaEditor,
  ResultMessage,
} from '../ModuleCard.jsx'

function numberEs(value, digits = 6) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(value)
}

export default function StoichiometryModule({ atoms, setAtoms, removeAtom, onReport, onPersistenceError }) {
  const [reactantsText, setReactantsText] = usePersistentState('stoichiometry.reactants', 'H2 + O2', onPersistenceError)
  const [productsText, setProductsText] = usePersistentState('stoichiometry.products', 'H2O', onPersistenceError)
  const [masses, setMasses] = usePersistentState('stoichiometry.masses', ['10', '10'], onPersistenceError)
  const [actualProductMass, setActualProductMass] = usePersistentState('stoichiometry.actual-product-mass', '', onPersistenceError)
  const [result, setResult] = usePersistentState('stoichiometry.result', null, onPersistenceError)
  const [error, setError] = useState(null)

  function calculate() {
    try {
      const reactants = parseFormulaList(reactantsText)
      const products = parseFormulaList(productsText)
      const balanced = balanceEquation(reactants, products)
      const calculation = calculateStoichiometry(
        balanced.reactants,
        balanced.products,
        masses.slice(0, reactants.length),
        actualProductMass,
      )
      setResult({ balanced, calculation })
      setError(null)
      const equation = (side) =>
        side.map(({ formula, coefficient }) => `${coefficient > 1 ? coefficient : ''}${formula}`).join(' + ')
      const details = [
        `${equation(balanced.reactants)} → ${equation(balanced.products)}`,
        `Reactivo limitante: ${calculation.limitingReactant.formula}.`,
        ...calculation.leftovers.map((item) => `Exceso de ${item.formula}: ${numberEs(item.remainingMass)} g.`),
        ...calculation.theoreticalProducts.map((item) => `Rendimiento teórico de ${item.formula}: ${numberEs(item.mass)} g.`),
      ]
      if (calculation.actualYieldPercent !== null) {
        details.push(`Rendimiento porcentual: ${numberEs(calculation.actualYieldPercent)} %.`)
      }
      onReport?.({ title: 'Cálculo estequiométrico', details: details.join(' ') })
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : 'Revisa los datos ingresados.')
    }
  }
  const firstProduct = result?.calculation.theoreticalProducts[0]
  let reactantFormulas = []
  let formulaEntryError = null
  try {
    reactantFormulas = parseFormulaList(reactantsText)
  } catch (reason) {
    formulaEntryError = reason instanceof Error ? reason.message : 'Revisa las fórmulas.'
  }

  return (
    <ModuleCard
      icon={Calculator}
      title="Calculadora estequiométrica"
      description="Ingresa las masas iniciales para calcular reactivo limitante, sobrantes y rendimiento teórico en la ecuación balanceada."
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
      <div className="mass-input-grid">
        {reactantFormulas.map((formula, index) => (
            <label key={`${formula}-${index}`}>
              Masa inicial de <FormulaDisplay formula={formula} /> (g)
              <input
                type="number"
                min="0"
                step="any"
                value={masses[index] ?? ''}
                onChange={(event) => setMasses((current) => {
                  const next = [...current]
                  next[index] = event.target.value
                  return next
                })}
              />
            </label>
          ))}
      </div>
      {formulaEntryError && <p className="field-hint">{formulaEntryError}</p>}
      <label className="field-label">
        Masa real del primer producto (g, opcional)
        <input
          type="number"
          min="0"
          step="any"
          value={actualProductMass}
          onChange={(event) => setActualProductMass(event.target.value)}
        />
      </label>
      <button className="tool-primary-button" type="button" onClick={calculate}>
        Calcular estequiometría
      </button>
      {error && <ResultMessage type="error" title="No se pudo calcular">{error}</ResultMessage>}
      {result && (
        <div className="stoichiometry-results">
          <ResultMessage type="success" title={`Reactivo limitante: ${result.calculation.limitingReactant.formula}`}>
            Ecuación balanceada: {result.balanced.reactants.map((item, index) => (
              <span key={`r-${index}`}>
                {index > 0 && ' + '}{item.coefficient > 1 && item.coefficient}<FormulaDisplay formula={item.formula} />
              </span>
            ))} → {result.balanced.products.map((item, index) => (
              <span key={`p-${index}`}>
                {index > 0 && ' + '}{item.coefficient > 1 && item.coefficient}<FormulaDisplay formula={item.formula} />
              </span>
            ))}
          </ResultMessage>
          <div className="stoich-result-grid">
            {result.calculation.leftovers.map((item, index) => (
              <div key={`${item.formula}-${index}`}>
                <span>Exceso de {item.formula}</span>
                <strong>{numberEs(item.remainingMass)} g</strong>
              </div>
            ))}
            {result.calculation.theoreticalProducts.map((item, index) => (
              <div key={`${item.formula}-${index}`}>
                <span>Rendimiento teórico de {item.formula}</span>
                <strong>{numberEs(item.mass)} g</strong>
              </div>
            ))}
            {result.calculation.actualYieldPercent !== null && firstProduct && (
              <div>
                <span>Rendimiento porcentual de {firstProduct.formula}</span>
                <strong>{numberEs(result.calculation.actualYieldPercent)} %</strong>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="tool-result-caption">
        El rendimiento teórico supone conversión completa del reactivo limitante y no considera pérdidas experimentales. Los resultados se redondean a un máximo de seis decimales y usan masas atómicas tabuladas.
        {' '}Referencia de masas: <a href={ATOMIC_MASS_REFERENCE.url} target="_blank" rel="noreferrer">
          {ATOMIC_MASS_REFERENCE.organization}
        </a>.
      </p>
    </ModuleCard>
  )
}
