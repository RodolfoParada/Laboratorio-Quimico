import { useState } from 'react'
import { Beaker } from 'lucide-react'
import { ATOMIC_MASS_REFERENCE } from '../../data/atomic-properties.js'
import { calculateSolution } from '../../chemistry/solutions.js'
import {
  formulaFromCounts,
  countsFromAtoms,
  molarMass,
  molarMassRational,
} from '../../chemistry/formulas.js'
import { AtomComposer, FormulaDisplay, ModuleCard, ResultMessage } from '../ModuleCard.jsx'

function numberEs(value, digits = 6) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(value)
}

export default function SolutionsModule({ atoms, setAtoms, removeAtom, onReport }) {
  const [manualFormula, setManualFormula] = useState('NaCl')
  const [soluteMass, setSoluteMass] = useState('10')
  const [solventMass, setSolventMass] = useState('100')
  const [solutionVolume, setSolutionVolume] = useState('250')
  const [soluteVolume, setSoluteVolume] = useState('')
  const [solventVolume, setSolventVolume] = useState('')
  const [vanthoffFactor, setVanthoffFactor] = useState('1')
  const [freezingPoint, setFreezingPoint] = useState('0')
  const [boilingPoint, setBoilingPoint] = useState('100')
  const [freezingConstant, setFreezingConstant] = useState('1.86')
  const [boilingConstant, setBoilingConstant] = useState('0.512')
  const [solubility, setSolubility] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const selectedFormula = atoms.length ? formulaFromCounts(countsFromAtoms(atoms)) : manualFormula
  let selectedMolarMass = null
  let selectedMolarMassExact = null
  let formulaError = null
  try {
    selectedMolarMass = molarMass(selectedFormula)
    selectedMolarMassExact = molarMassRational(selectedFormula)
  } catch (reason) {
    formulaError = reason instanceof Error ? reason.message : 'La fórmula no es válida.'
  }

  function calculate() {
    try {
      if (selectedMolarMass === null) throw new Error(formulaError)
      const composition = calculateSolution({
        soluteMassG: soluteMass,
        solventMassG: solventMass,
        solutionVolumeMl: solutionVolume,
        soluteVolumeMl: soluteVolume,
        solventVolumeMl: solventVolume,
        soluteMolarMass: selectedMolarMassExact,
        vanthoffFactor,
        freezingPointC: freezingPoint,
        boilingPointC: boilingPoint,
        freezingPointConstant: freezingConstant,
        boilingPointConstant: boilingConstant,
        solubilityLimitGPer100GSolvent: solubility,
      })
      setResult(composition)
      setError(null)
      onReport?.({
        title: `Cálculo de soluciones: ${selectedFormula}`,
        details: `Molaridad ${numberEs(composition.molarity)} mol/L; % m/m ${numberEs(composition.massPercent)} %; % m/V ${numberEs(composition.massVolumePercent)} g/100 mL; molalidad ${numberEs(composition.molality)} mol/kg; congelación ${numberEs(composition.freezingPointC)} °C; ebullición ${numberEs(composition.boilingPointC)} °C.${composition.saturation ? ` Solubilidad: ${composition.saturation}` : ''}`,
      })
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : 'Revisa la fórmula y las unidades.')
    }
  }

  return (
    <ModuleCard
      icon={Beaker}
      title="Laboratorio de soluciones"
      description="Calcula concentraciones y propiedades coligativas. Las constantes del solvente se pueden modificar."
    >
      <AtomComposer atoms={atoms} setAtoms={setAtoms} onRemoveAtom={removeAtom} />
      {!atoms.length && (
        <label className="field-label">
          Fórmula del soluto
          <input value={manualFormula} onChange={(event) => setManualFormula(event.target.value)} />
        </label>
      )}
      <p className="formula-mass-note">
        Soluto analizado: <strong><FormulaDisplay formula={selectedFormula} /></strong>
        {' · '}Masa molar: {selectedMolarMass === null ? 'fórmula inválida' : `${numberEs(selectedMolarMass)} g/mol`}
      </p>
        <p className="field-hint">
          La masa molar usa valores de referencia de{' '}
          <a href={ATOMIC_MASS_REFERENCE.url} target="_blank" rel="noreferrer">
            {ATOMIC_MASS_REFERENCE.organization} ({ATOMIC_MASS_REFERENCE.name})
          </a>
          ; los isótopos y la composición de una muestra pueden cambiar la masa real.
        </p>
      {formulaError && <p className="field-hint">{formulaError}</p>}
      <div className="tool-fields-grid">
        <label>Masa de soluto (g)<input type="number" min="0" step="any" value={soluteMass} onChange={(event) => setSoluteMass(event.target.value)} /></label>
        <label>Masa de solvente (g)<input type="number" min="0" step="any" value={solventMass} onChange={(event) => setSolventMass(event.target.value)} /></label>
        <label>Volumen final de solución (mL)<input type="number" min="0" step="any" value={solutionVolume} onChange={(event) => setSolutionVolume(event.target.value)} /></label>
        <label>Volumen de soluto (mL, para % V/V)<input type="number" min="0" step="any" value={soluteVolume} onChange={(event) => setSoluteVolume(event.target.value)} /></label>
        <label>Volumen de solvente (mL, para % V/V)<input type="number" min="0" step="any" value={solventVolume} onChange={(event) => setSolventVolume(event.target.value)} /></label>
      </div>
      <details className="advanced-fields">
        <summary>Solubilidad y propiedades coligativas</summary>
        <div className="tool-fields-grid">
          <label>Solubilidad de referencia a la temperatura de trabajo (g / 100 g de solvente)<input type="number" min="0" step="any" value={solubility} onChange={(event) => setSolubility(event.target.value)} placeholder="Opcional" /></label>
          <label>Factor de Van ’t Hoff, i<input type="number" min="0" step="any" value={vanthoffFactor} onChange={(event) => setVanthoffFactor(event.target.value)} /></label>
          <label>Punto de congelación del solvente (°C)<input type="number" step="any" value={freezingPoint} onChange={(event) => setFreezingPoint(event.target.value)} /></label>
          <label>Punto de ebullición del solvente (°C)<input type="number" step="any" value={boilingPoint} onChange={(event) => setBoilingPoint(event.target.value)} /></label>
          <label>Constante crioscópica Kf (°C·kg/mol)<input type="number" min="0" step="any" value={freezingConstant} onChange={(event) => setFreezingConstant(event.target.value)} /></label>
          <label>Constante ebulloscópica Kb (°C·kg/mol)<input type="number" min="0" step="any" value={boilingConstant} onChange={(event) => setBoilingConstant(event.target.value)} /></label>
        </div>
      </details>
      <button className="tool-primary-button" type="button" onClick={calculate}>Calcular solución</button>
      {error && <ResultMessage type="error" title="No se pudo calcular">{error}</ResultMessage>}
      {result && (
        <>
          <div className="solution-result-grid">
            <div><span>Molaridad</span><strong>{numberEs(result.molarity)} mol/L</strong></div>
            <div><span>Porcentaje m/m</span><strong>{numberEs(result.massPercent)} %</strong></div>
            <div><span>Porcentaje m/V</span><strong>{numberEs(result.massVolumePercent)} g/100 mL</strong></div>
            <div><span>Porcentaje V/V</span><strong>{result.volumePercent === null ? 'Ingresa ambos volúmenes' : `${numberEs(result.volumePercent)} %`}</strong></div>
            <div><span>Molalidad</span><strong>{numberEs(result.molality)} mol/kg</strong></div>
            <div><span>Punto de congelación calculado</span><strong>{numberEs(result.freezingPointC)} °C</strong></div>
            <div><span>Punto de ebullición calculado</span><strong>{numberEs(result.boilingPointC)} °C</strong></div>
          </div>
          {result.saturation && <ResultMessage type="info" title="Estado según solubilidad ingresada">{result.saturation}</ResultMessage>}
          <p className="tool-result-caption">{result.caveat}</p>
          <p className="tool-result-caption">Resultados numéricos redondeados a un máximo de seis decimales.</p>
        </>
      )}
      <p className="tool-result-caption">
        Basado en conceptos de concentración y propiedades coligativas del material de Química. No se incorpora una tabla universal de solubilidad; ingresa un valor correspondiente a la temperatura de trabajo.
      </p>
    </ModuleCard>
  )
}
