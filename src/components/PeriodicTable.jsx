import { useState } from 'react'
import { Atom, Info, X } from 'lucide-react'
import { ELEMENTS, ELEMENT_CATEGORIES } from '../data/elements.js'
import { countsFromAtoms } from '../chemistry/formulas.js'
import { MAX_ATOMS } from '../data/constants.js'
import elementFacts from '../data/element-facts.json'

const CATEGORY_LABELS = {
  'no-metales': 'No metales',
  'gases-nobles': 'Gases nobles',
  'metales-alcalinos': 'Metales alcalinos',
  alcalinoterreos: 'Alcalinotérreos',
  metaloides: 'Metaloides',
  halogenos: 'Halógenos',
  'metales-transicion': 'Metales de transición',
  'otros-metales': 'Otros metales',
}

function BohrModel({ element, shells }) {
  const shellEntries = Object.entries(shells)
  return (
    <svg
      aria-label={`Modelo de Bohr simplificado de ${element.name}: ${shellEntries.map(([shell, electrons]) => `capa ${shell}, ${electrons} electrones`).join('; ')}`}
      className="bohr-model"
      role="img"
      viewBox="0 0 160 160"
    >
      <circle className="bohr-nucleus" cx="80" cy="80" r="17" />
      <text className="bohr-nucleus-label" dominantBaseline="central" textAnchor="middle" x="80" y="80">
        {element.symbol}
      </text>
      {shellEntries.map(([shell, electrons], index) => {
        const radius = 19 + index * 8
        return (
          <g key={shell}>
            <circle className="bohr-orbit" cx="80" cy="80" r={radius} />
            <g
              className="bohr-electrons"
              style={{ animationDuration: `${Math.max(3, 9 - index)}s` }}
            >
              {Array.from({ length: electrons }, (_, electronIndex) => {
                const angle = (electronIndex * 2 * Math.PI) / electrons
                return (
                  <circle
                    className="bohr-electron"
                    cx={80 + radius * Math.cos(angle)}
                    cy={80 + radius * Math.sin(angle)}
                    key={electronIndex}
                    r="3"
                  />
                )
              })}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

function getPosition(element) {
  if (element.atomicNumber >= 58 && element.atomicNumber <= 71) {
    return { column: element.atomicNumber - 58 + 5, row: 9 }
  }
  if (element.atomicNumber >= 90 && element.atomicNumber <= 103) {
    return { column: element.atomicNumber - 90 + 5, row: 10 }
  }
  return { column: element.group + 1, row: element.period + 1 }
}

export default function PeriodicTable({ atoms, onAddAtom }) {
  const [selectedElement, setSelectedElement] = useState(null)
  const atomCounts = countsFromAtoms(atoms)
  const full = atoms.length >= MAX_ATOMS
  const facts = selectedElement ? elementFacts[selectedElement.symbol] : null
  const shells = facts?.electronConfiguration
    ?.match(/\d+[spdfghik]\d+/g)
    ?.reduce((result, orbital) => {
      const [, shell, electrons] = orbital.match(/^(\d+)[spdfghik](\d+)$/)
      result[Number(shell)] = (result[Number(shell)] ?? 0) + Number(electrons)
      return result
    }, {}) ?? {}

  return (
    <section className="periodic-section" aria-labelledby="periodic-title">
      <div className="section-heading">
        <Atom size={20} aria-hidden="true" />
        <h2 id="periodic-title">Tabla Periódica</h2>
        <span>118 elementos disponibles</span>
      </div>
      <div className="periodic-card">
        <div className="periodic-scroll">
          <div className="periodic-grid" aria-label="Tabla periódica de los elementos">
            {Array.from({ length: 18 }, (_, index) => (
              <span
                className="group-number"
                key={`group-${index + 1}`}
                style={{ gridColumn: index + 2, gridRow: 1 }}
              >
                {index + 1}
              </span>
            ))}
            {Array.from({ length: 7 }, (_, index) => (
              <span
                className="period-number"
                key={`period-${index + 1}`}
                style={{ gridColumn: 1, gridRow: index + 2 }}
              >
                {index + 1}
              </span>
            ))}
            <span className="series-label lanthanide-label" style={{ gridColumn: 1, gridRow: 9 }}>
              Lantánidos
            </span>
            <span className="series-label actinide-label" style={{ gridColumn: 1, gridRow: 10 }}>
              Actínidos
            </span>
            {ELEMENTS.map((element) => {
              const position = getPosition(element)
              const selectedCount = atomCounts[element.symbol] ?? 0
              return (
                <div
                  className="element-cell"
                  key={element.atomicNumber}
                  style={{ gridColumn: position.column, gridRow: position.row }}
                >
                  <button
                    className={`element-card category-${element.category}`}
                    type="button"
                    disabled={full}
                    title={`${element.name} (${element.symbol}) · número atómico ${element.atomicNumber}`}
                    aria-label={`Añadir ${element.name}${selectedCount ? `. Ya hay ${selectedCount} en el módulo` : ''}`}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setSelectedElement(element)
                    }}
                    onClick={() => onAddAtom(element.symbol)}
                  >
                    <span className="atomic-number">{element.atomicNumber}</span>
                    {selectedCount > 0 && <span className="element-count">{selectedCount}</span>}
                    <span className="element-symbol">{element.symbol}</span>
                    <span className="element-name">{element.name}</span>
                  </button>
                  <button
                    aria-label={`Ver información de ${element.name}`}
                    className="element-info-trigger"
                    onClick={() => setSelectedElement(element)}
                    title={`Información de ${element.name}`}
                    type="button"
                  >
                    <Info aria-hidden="true" size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <ul className="category-legend" aria-label="Categorías de elementos">
          {ELEMENT_CATEGORIES.map((category) => (
            <li key={category}>
              <span className={`legend-dot category-${category}`} />
              {CATEGORY_LABELS[category]}
            </li>
          ))}
        </ul>
        <p className="table-hint">Selecciona un elemento para añadirlo al módulo activo.</p>
        {selectedElement && (
          <aside aria-labelledby="element-facts-title" className="element-facts-panel">
            <div className="element-facts-heading">
              <div>
                <span>N.º atómico {selectedElement.atomicNumber}</span>
                <h3 id="element-facts-title">
                  {selectedElement.name} ({selectedElement.symbol})
                </h3>
              </div>
              <button
                aria-label="Cerrar información del elemento"
                className="element-facts-close"
                onClick={() => setSelectedElement(null)}
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </div>
            <p>
              Configuración electrónica:{' '}
              <strong>{facts?.electronConfiguration ?? 'No disponible'}</strong>
            </p>
            <p>
              Electronegatividad de Pauling:{' '}
              <strong>
                {facts?.electronegativityPauling ?? 'No disponible'}
              </strong>
            </p>
            <p>
              Punto de fusión:{' '}
              <strong>
                {typeof facts?.meltingPointKelvin === 'number'
                  ? `${(facts.meltingPointKelvin - 273.15).toLocaleString('es', { maximumFractionDigits: 2 })} °C`
                  : 'No disponible'}
              </strong>
            </p>
            <div aria-label="Representación simplificada de electrones por capa" className="bohr-shells">
              {Object.entries(shells).map(([shell, electrons]) => (
                <span key={shell}>
                  <strong>Capa {shell}</strong>
                  {electrons} e⁻
                </span>
              ))}
            </div>
            {shells && Object.keys(shells).length > 0 && (
              <BohrModel element={selectedElement} shells={shells} />
            )}
            <p className="element-facts-note">
              Modelo de Bohr simplificado: muestra la distribución por capas, no orbitales ni geometría real.
            </p>
            <a
              href="https://github.com/Bowserinator/Periodic-Table-JSON"
              rel="noreferrer"
              target="_blank"
            >
              Fuente de propiedades
            </a>
          </aside>
        )}
      </div>
    </section>
  )
}
