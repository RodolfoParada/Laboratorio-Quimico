import { useCallback, useRef, useState } from 'react'
import {
  Atom,
  Beaker,
  Calculator,
  Download,
  FlaskConical,
  GitBranch,
  Flag,
  PencilRuler,
  Scale,
  Sparkles,
} from 'lucide-react'
import PeriodicTable from './components/PeriodicTable.jsx'
import SynthesisModule from './components/modules/SynthesisModule.jsx'
import NomenclatureModule from './components/modules/NomenclatureModule.jsx'
import EquationBalancerModule from './components/modules/EquationBalancerModule.jsx'
import ReactionClassifierModule from './components/modules/ReactionClassifierModule.jsx'
import StoichiometryModule from './components/modules/StoichiometryModule.jsx'
import SolutionsModule from './components/modules/SolutionsModule.jsx'
import OrganicModule from './components/modules/OrganicModule.jsx'
import ChallengesModule from './components/modules/ChallengesModule.jsx'
import LewisModule from './components/modules/LewisModule.jsx'
import { MAX_ATOMS } from './data/constants.js'
import usePersistentState from './hooks/usePersistentState.js'
import './App.css'

const TABS = [
  { id: 'synthesis', label: 'Matraz / Síntesis', Icon: FlaskConical },
  { id: 'nomenclature', label: 'Nomenclatura', Icon: Atom },
  { id: 'balancer', label: 'Balanceo', Icon: Scale },
  { id: 'reactions', label: 'Clasificación', Icon: Sparkles },
  { id: 'stoichiometry', label: 'Estequiometría', Icon: Calculator },
  { id: 'solutions', label: 'Soluciones', Icon: Beaker },
  { id: 'organic', label: 'Química orgánica', Icon: GitBranch },
  { id: 'challenges', label: 'Retos', Icon: Flag },
  { id: 'lewis', label: 'Lewis', Icon: PencilRuler },
]

function createModuleAtoms() {
  return Object.fromEntries(TABS.map(({ id }) => [id, []]))
}

export default function App() {
  const [persistenceErrors, setPersistenceErrors] = useState({})
  const setPersistenceError = useCallback((key, error) => {
    setPersistenceErrors((current) => {
      if (error) return { ...current, [key]: error }
      if (!Object.hasOwn(current, key)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])
  const [activeTab, setActiveTab] = usePersistentState(
    'app.active-tab',
    TABS[0].id,
    setPersistenceError,
    (value) => TABS.some(({ id }) => id === value),
  )
  const [moduleAtoms, setModuleAtoms] = usePersistentState(
    'app.module-atoms',
    createModuleAtoms,
    setPersistenceError,
    (value) =>
      value !== null &&
      typeof value === 'object' &&
      TABS.every(
        ({ id }) =>
          Array.isArray(value[id]) &&
          value[id].length <= MAX_ATOMS &&
          value[id].every((symbol) => typeof symbol === 'string'),
      ),
  )
  const [showGuide, setShowGuide] = useState(false)
  const [notebookEntries, setNotebookEntries] = usePersistentState(
    'app.notebook',
    [],
    setPersistenceError,
    (value) =>
      Array.isArray(value) &&
      value.every(
        (entry) =>
          entry !== null &&
          typeof entry === 'object' &&
          Number.isSafeInteger(entry.id) &&
          typeof entry.title === 'string' &&
          typeof entry.details === 'string' &&
          typeof entry.module === 'string' &&
          typeof entry.recordedAt === 'string',
      ),
  )
  const nextNotebookEntryId = useRef(
    notebookEntries.reduce((nextId, entry) => Math.max(nextId, entry.id + 1), 0),
  )

  function setAtomsFor(moduleId, nextAtoms) {
    setModuleAtoms((current) => ({
      ...current,
      [moduleId]: typeof nextAtoms === 'function' ? nextAtoms(current[moduleId]) : nextAtoms,
    }))
  }

  function addAtomToActiveModule(symbol) {
    setAtomsFor(activeTab, (current) => (current.length >= MAX_ATOMS ? current : [...current, symbol]))
  }

  function removeAtomFromModule(moduleId, index) {
    setAtomsFor(moduleId, (current) => current.filter((_, atomIndex) => atomIndex !== index))
  }

  function recordNotebookEntry(moduleId, entry) {
    setNotebookEntries((current) => [
      ...current,
      {
        ...entry,
        id: nextNotebookEntryId.current++,
        module: TABS.find((tab) => tab.id === moduleId)?.label ?? moduleId,
        recordedAt: new Date().toLocaleString('es-CL'),
      },
    ])
  }

  function handleTabKeyDown(event, index) {
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = TABS.length - 1
    else return

    event.preventDefault()
    const nextTab = TABS[nextIndex]
    setActiveTab(nextTab.id)
    document.getElementById(`tab-${nextTab.id}`)?.focus()
  }

  const moduleProps = (moduleId) => ({
    atoms: moduleAtoms[moduleId],
    setAtoms: (nextAtoms) => setAtomsFor(moduleId, nextAtoms),
    removeAtom: (index) => removeAtomFromModule(moduleId, index),
    onReport: (entry) => recordNotebookEntry(moduleId, entry),
    onPersistenceError: setPersistenceError,
  })

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-icon"><Atom size={25} strokeWidth={2.3} /></div>
          <div>
            <p className="brand-eyebrow">LABORATORIO INTERACTIVO</p>
            <h1>Simulador Químico</h1>
          </div>
        </div>
        <button
          aria-expanded={showGuide}
          className="guide-toggle"
          onClick={() => setShowGuide((visible) => !visible)}
          type="button"
        >
          {showGuide ? 'Ocultar guía' : 'Cómo usarlo'}
        </button>
        <button
          className="guide-toggle"
          disabled={notebookEntries.length === 0}
          onClick={() => window.print()}
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          Imprimir / guardar PDF ({notebookEntries.length})
        </button>
      </header>

      {Object.keys(persistenceErrors).length > 0 && (
        <p className="persistence-warning" role="alert">
          {Object.values(persistenceErrors)[0]}
        </p>
      )}

      {showGuide && (
        <aside className="guide-banner">
          <strong>Elige una herramienta y construye con la tabla.</strong>
          <span>La tabla periódica permanece visible. Sus elementos se agregan a la herramienta activa; cada pestaña conserva su propio trabajo al cambiar de módulo.</span>
        </aside>
      )}

      <div className="workspace-layout">
        <aside aria-label="Tabla periódica" className="periodic-column">
          <PeriodicTable
            atoms={moduleAtoms[activeTab]}
            onAddAtom={addAtomToActiveModule}
          />
        </aside>

        <section className="tools-column">
          <nav aria-label="Herramientas químicas" className="module-tabs" role="tablist">
            {TABS.map(({ id, label, Icon }, index) => (
              <button
                aria-controls={`panel-${id}`}
                aria-selected={activeTab === id}
                className={`module-tab${activeTab === id ? ' active' : ''}`}
                id={`tab-${id}`}
                key={id}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                tabIndex={activeTab === id ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden="true" size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="module-panels">
            {TABS.map(({ id }) => (
              <section
                aria-labelledby={`tab-${id}`}
                hidden={activeTab !== id}
                id={`panel-${id}`}
                key={id}
                role="tabpanel"
                tabIndex={0}
              >
                {id === 'synthesis' && <SynthesisModule {...moduleProps(id)} />}
                {id === 'nomenclature' && <NomenclatureModule {...moduleProps(id)} />}
                {id === 'balancer' && <EquationBalancerModule {...moduleProps(id)} />}
                {id === 'reactions' && <ReactionClassifierModule {...moduleProps(id)} />}
                {id === 'stoichiometry' && <StoichiometryModule {...moduleProps(id)} />}
                {id === 'solutions' && <SolutionsModule {...moduleProps(id)} />}
                {id === 'organic' && <OrganicModule {...moduleProps(id)} />}
                {id === 'challenges' && <ChallengesModule {...moduleProps(id)} />}
                {id === 'lewis' && <LewisModule {...moduleProps(id)} />}
              </section>
            ))}
          </div>
        </section>
      </div>
      <section aria-label="Cuaderno de laboratorio para exportar" className="notebook-print-view">
        <h1>Cuaderno de laboratorio químico</h1>
        <p>Último resultado registrado: {notebookEntries.at(-1)?.recordedAt ?? 'sin resultados'}</p>
        <p>Los resultados conservan los límites, supuestos y redondeos mostrados por el simulador.</p>
        {notebookEntries.length ? (
          <ol>
            {notebookEntries.map((entry) => (
              <li key={entry.id}>
                <h2>{entry.title}</h2>
                <p><strong>Módulo:</strong> {entry.module} · {entry.recordedAt}</p>
                <p>{entry.details}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>Aún no se han registrado resultados en esta sesión.</p>
        )}
        <p className="notebook-disclaimer">Los cálculos son educativos y dependen de los datos, condiciones y aproximaciones descritos por cada módulo.</p>
      </section>
    </main>
  )
}
