import { useState } from 'react'
import { Scale } from 'lucide-react'
import { balanceEquation, validateEquationAnswer } from '../../chemistry/balance.js'
import { parseFormulaList } from '../../chemistry/formulas.js'
import { FormulaDisplay, ModuleCard, ReactionFormulaEditor, ResultMessage } from '../ModuleCard.jsx'

function formatEquation(side, coefficients) {
  return side
    .map((formula, index) => (
      <span key={`${formula}-${index}`}>
        {index > 0 && ' + '}
        {coefficients[index] > 1 && coefficients[index]}
        <FormulaDisplay formula={formula} />
      </span>
    ))
}

export default function EquationBalancerModule({ atoms, setAtoms, removeAtom, onReport }) {
  const [reactantsText, setReactantsText] = useState('H2 + O2')
  const [productsText, setProductsText] = useState('H2O')
  const [suggested, setSuggested] = useState(null)
  const [reactantCoefficients, setReactantCoefficients] = useState([])
  const [productCoefficients, setProductCoefficients] = useState([])
  const [feedback, setFeedback] = useState(null)

  function resetAnswer() {
    setSuggested(null)
    setFeedback(null)
  }

  function calculate() {
    try {
      const reactants = parseFormulaList(reactantsText)
      const products = parseFormulaList(productsText)
      const solution = balanceEquation(reactants, products)
      setSuggested({ reactants, products })
      setReactantCoefficients(solution.reactants.map((item) => String(item.coefficient)))
      setProductCoefficients(solution.products.map((item) => String(item.coefficient)))
      setFeedback({ type: 'info', title: 'Propuesta calculada', message: 'Modifica los coeficientes si quieres y luego valida tu respuesta.' })
    } catch (error) {
      setSuggested(null)
      setFeedback({
        type: 'error',
        title: 'No se pudo balancear',
        message: error instanceof Error ? error.message : 'Revisa la ecuación.',
      })
    }
  }

  function validate() {
    try {
      const valid = validateEquationAnswer(
        suggested.reactants,
        suggested.products,
        reactantCoefficients.map(Number),
        productCoefficients.map(Number),
      )
      setFeedback({
        type: valid ? 'success' : 'error',
        title: valid ? 'Ecuación balanceada correctamente' : 'Los coeficientes no conservan los átomos',
        message: valid
          ? 'Cada elemento aparece con la misma cantidad en ambos lados de la ecuación.'
          : 'Ajusta los coeficientes y vuelve a validar.',
      })
      if (valid) {
        const equation = (side, coefficients) =>
          side.map((formula, index) => `${coefficients[index] > 1 ? coefficients[index] : ''}${formula}`).join(' + ')
        onReport?.({
          title: 'Ecuación balanceada',
          details: `${equation(suggested.reactants, reactantCoefficients.map(Number))} → ${equation(suggested.products, productCoefficients.map(Number))}`,
        })
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Respuesta no válida',
        message: error instanceof Error ? error.message : 'Usa coeficientes enteros positivos.',
      })
    }
  }

  return (
    <ModuleCard
      icon={Scale}
      title="Balanceo de ecuaciones"
      description="Escribe fórmulas en ambos lados o compónlas con la tabla. La búsqueda usa aritmética exacta y un alcance limitado; no garantiza el mínimo global en sistemas con varias soluciones."
    >
      <ReactionFormulaEditor
        reactants={reactantsText}
        setReactants={(value) => {
          setReactantsText(value)
          resetAnswer()
        }}
        products={productsText}
        setProducts={(value) => {
          setProductsText(value)
          resetAnswer()
        }}
        atoms={atoms}
        setAtoms={setAtoms}
        onRemoveAtom={removeAtom}
      />
      <button className="tool-primary-button" type="button" onClick={calculate}>
        Calcular coeficientes
      </button>
      <p className="tool-result-caption">
        La validación compara cantidades enteras de átomos exactamente. La búsqueda automática está acotada a ocho para cada variable libre y no garantiza el mínimo global cuando existen varias soluciones.
      </p>
      {suggested && (
        <div className="coefficient-workspace">
          <div className="balanced-equation" aria-label="Ecuación balanceada propuesta">
            {formatEquation(suggested.reactants, reactantCoefficients.map(Number))}
            <span aria-hidden="true">→</span>
            {formatEquation(suggested.products, productCoefficients.map(Number))}
          </div>
          <p>Ingresa los coeficientes para comprobar la conservación de cada elemento:</p>
          <div className="coefficient-fields">
            {suggested.reactants.map((formula, index) => (
              <label key={`left-${formula}-${index}`}>
                Coeficiente de <FormulaDisplay formula={formula} />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={reactantCoefficients[index] ?? ''}
                  onChange={(event) =>
                    setReactantCoefficients((current) =>
                      current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)),
                    )
                  }
                />
              </label>
            ))}
            {suggested.products.map((formula, index) => (
              <label key={`right-${formula}-${index}`}>
                Coeficiente de <FormulaDisplay formula={formula} />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={productCoefficients[index] ?? ''}
                  onChange={(event) =>
                    setProductCoefficients((current) =>
                      current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <button className="tool-secondary-button" type="button" onClick={validate}>
            Validar mi balanceo
          </button>
        </div>
      )}
      {feedback && (
        <ResultMessage type={feedback.type} title={feedback.title}>
          {feedback.message}
        </ResultMessage>
      )}
    </ModuleCard>
  )
}
