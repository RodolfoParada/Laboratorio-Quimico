import { useMemo } from 'react'
import { Flag, RotateCw } from 'lucide-react'
import { countsFromAtoms, formulaFromCounts } from '../../chemistry/formulas.js'
import usePersistentState from '../../hooks/usePersistentState.js'
import { AtomComposer, FormulaDisplay, ModuleCard, ResultMessage } from '../ModuleCard.jsx'

const CHALLENGES = [
  { formula: 'H2O', title: 'Construye agua', hint: 'Combina hidrógeno y oxígeno en la proporción correcta.' },
  { formula: 'CO2', title: 'Construye dióxido de carbono', hint: 'Forma un óxido no metálico con carbono y oxígeno.' },
  { formula: 'NaCl', title: 'Construye cloruro de sodio', hint: 'Combina sodio y cloro en una composición neutra.' },
  { formula: 'H2SO4', title: 'Construye ácido sulfúrico', hint: 'Usa hidrógeno, azufre y oxígeno.' },
  { formula: 'CaCO3', title: 'Construye carbonato de calcio', hint: 'Incluye calcio, carbono y oxígeno.' },
  { formula: 'NH3', title: 'Construye amoníaco', hint: 'Combina nitrógeno e hidrógeno.' },
  { formula: 'CH4', title: 'Construye metano', hint: 'Forma la composición del hidrocarburo más simple.' },
]

function chooseChallenge(currentFormula) {
  const choices = CHALLENGES.filter(({ formula }) => formula !== currentFormula)
  return choices[Math.floor(Math.random() * choices.length)]
}

export default function ChallengesModule({ atoms, setAtoms, removeAtom, onReport, onPersistenceError }) {
  const [challenge, setChallenge] = usePersistentState(
    'challenges.current',
    () => chooseChallenge(''),
    onPersistenceError,
    (value) => CHALLENGES.some(({ formula }) => formula === value?.formula),
  )
  const [completed, setCompleted] = usePersistentState(
    'challenges.completed',
    [],
    onPersistenceError,
    (value) => Array.isArray(value) && value.every((formula) => CHALLENGES.some((item) => item.formula === formula)),
  )
  const currentFormula = useMemo(
    () => (atoms.length ? formulaFromCounts(countsFromAtoms(atoms)) : ''),
    [atoms],
  )
  const isComplete = currentFormula === challenge.formula

  function nextChallenge() {
    if (isComplete && !completed.includes(challenge.formula)) {
      setCompleted((current) => [...current, challenge.formula])
      onReport?.({
        title: `Reto completado: ${challenge.title}`,
        details: `La composición ${challenge.formula} coincidió con el objetivo.`,
      })
    }
    setChallenge((current) => chooseChallenge(current.formula))
  }

  return (
    <ModuleCard
      icon={Flag}
      title="Retos de química"
      description="Completa misiones de composición y recibe retroalimentación inmediata."
    >
      <div className="challenge-card">
        <span className="challenge-eyebrow">MISIÓN ACTUAL</span>
        <strong>{challenge.title}</strong>
        <p>{challenge.hint}</p>
        <span className="challenge-target">
          Objetivo: <FormulaDisplay formula={challenge.formula} />
        </span>
        <span>Tu composición: <FormulaDisplay formula={currentFormula} /></span>
        {isComplete ? (
          <ResultMessage type="success" title="¡Reto completado!">
            La composición coincide con el objetivo. Esto no demuestra que la reacción ocurra en condiciones experimentales.
          </ResultMessage>
        ) : (
          <p className="field-hint">Añade los elementos necesarios desde la tabla periódica.</p>
        )}
        <button className="tool-secondary-button" onClick={nextChallenge} type="button">
          <RotateCw aria-hidden="true" size={16} />
          {isComplete ? 'Registrar y continuar' : 'Saltar y elegir otro'}
        </button>
      </div>
      <AtomComposer atoms={atoms} setAtoms={setAtoms} onRemoveAtom={removeAtom} />
      <p className="challenge-progress" aria-live="polite">
        Misiones completadas en esta sesión: {completed.length} / {CHALLENGES.length}
      </p>
    </ModuleCard>
  )
}
