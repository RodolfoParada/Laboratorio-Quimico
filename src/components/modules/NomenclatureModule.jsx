import { useMemo } from 'react'
import { Atom } from 'lucide-react'
import { analyzeInorganicFormula, formatOxidationState } from '../../chemistry/nomenclature.js'
import { countsFromAtoms } from '../../chemistry/formulas.js'
import { AtomComposer, FormulaDisplay, ModuleCard, ResultMessage } from '../ModuleCard.jsx'

export default function NomenclatureModule({ atoms, setAtoms, removeAtom, onReport }) {
  const result = useMemo(() => {
    if (!atoms.length) return null
    try {
      return analyzeInorganicFormula(countsFromAtoms(atoms))
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo analizar la fórmula.' }
    }
  }, [atoms])

  return (
    <ModuleCard
      icon={Atom}
      title="Nomenclatura inorgánica"
      description="Forma una composición con la tabla para consultar su fórmula, estados de oxidación y un nombre compatible con las reglas locales."
    >
      <AtomComposer atoms={atoms} setAtoms={setAtoms} onRemoveAtom={removeAtom} />
      {result?.error ? (
        <ResultMessage type="error" title="No se pudo analizar la composición">
          {result.error}
        </ResultMessage>
      ) : result ? (
        <div className={`tool-result ${result.supported ? 'result-success' : 'result-warning'}`}>
          {result.supported ? (
            <>
              <strong>{result.name}</strong>
              <p>Fórmula: <FormulaDisplay formula={result.formula} /></p>
              <p className="tool-result-caption">{result.nomenclature}</p>
              <button
                className="text-button"
                onClick={() =>
                  onReport?.({
                    title: `Nomenclatura: ${result.formula}`,
                    details: `${result.name}. ${Object.entries(result.oxidationStates ?? {})
                      .map(([symbol, state]) => `${symbol}: ${formatOxidationState(state)}`)
                      .join('; ')}`,
                  })
                }
                type="button"
              >
                Añadir al cuaderno
              </button>
            </>
          ) : (
            <>
              <strong>Nomenclatura no determinada</strong>
              <p>{result.explanation}</p>
              <p>Fórmula: <FormulaDisplay formula={result.formula} /></p>
            </>
          )}
          <div className="oxidation-grid">
            {Object.entries(result.oxidationStates ?? {}).map(([symbol, state]) => (
              <span key={symbol}>
                <strong>{symbol}</strong>
                <span>número de oxidación {formatOxidationState(state)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <ResultMessage title="Selecciona elementos">
          Los estados de oxidación se muestran solo cuando la fórmula puede neutralizarse con los valores locales.
        </ResultMessage>
      )}
    </ModuleCard>
  )
}
