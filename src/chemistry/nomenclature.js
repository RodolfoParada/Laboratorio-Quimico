import { ATOMIC_PROPERTIES } from '../data/atomic-properties.js'
import { ELEMENTS } from '../data/elements.js'
import { formulaFromCounts, parseFormula } from './formulas.js'

const ELEMENT_BY_SYMBOL = Object.fromEntries(ELEMENTS.map((element) => [element.symbol, element]))
const PREFIXES = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa']
const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

const COMMON_NAMES = {
  H2O: 'Agua',
  CO: 'Monóxido de carbono',
  CO2: 'Dióxido de carbono',
  H3N: 'Amoníaco',
  CH4: 'Metano',
  O3: 'Ozono',
  ClNa: 'Cloruro de sodio',
  ClH: 'Cloruro de hidrógeno',
  CCaO3: 'Carbonato de calcio',
  C6H12O6: 'Glucosa',
  HNO3: 'Ácido nítrico',
  HNO2: 'Ácido nitroso',
  CH2O3: 'Ácido carbónico',
  H2O4S: 'Ácido sulfúrico',
  H2O3S: 'Ácido sulfuroso',
  H3O4P: 'Ácido fosfórico',
  HNaO: 'Hidróxido de sodio',
  CaH2O2: 'Hidróxido de calcio',
  FeH3O3: 'Hidróxido de hierro(III)',
  FeH2O2: 'Hidróxido de hierro(II)',
  CNa2O3: 'Carbonato de sodio',
  CHNaO3: 'Bicarbonato de sodio',
  CH4O: 'Metanol',
  C2H6O: 'Etanol o éter dimetílico (isómeros)',
  C2H4O2: 'Ácido acético o ésteres isómeros',
  H2S: 'Sulfuro de hidrógeno',
}

const ANION_NAMES = {
  F: 'fluoruro',
  Cl: 'cloruro',
  Br: 'bromuro',
  I: 'yoduro',
  O: 'óxido',
  S: 'sulfuro',
  N: 'nitruro',
  P: 'fosfuro',
  C: 'carburo',
  H: 'hidruro',
}

function toRoman(value) {
  let remainder = value
  return ROMAN_NUMERALS.map(([amount, roman]) => {
    const count = Math.floor(remainder / amount)
    remainder %= amount
    return roman.repeat(count)
  }).join('')
}

function getNeutralOxidationStates(counts) {
  const symbols = Object.keys(counts)
  if (symbols.length === 1) return { [symbols[0]]: 0 }
  if (symbols.length > 5) return null

  let visited = 0
  const chosen = {}
  let bestAssignment = null
  let bestScore = Infinity
  function search(index, charge) {
    visited += 1
    if (visited > 20000) return
    if (index === symbols.length) {
      if (charge !== 0) return
      const score = symbols.reduce(
        (total, symbol) =>
          total + ATOMIC_PROPERTIES[symbol].oxidationStates.indexOf(chosen[symbol]),
        0,
      )
      if (score < bestScore) {
        bestScore = score
        bestAssignment = { ...chosen }
      }
      return
    }

    const symbol = symbols[index]
    const states = ATOMIC_PROPERTIES[symbol]?.oxidationStates ?? []
    for (const state of states) {
      chosen[symbol] = state
      search(index + 1, charge + state * counts[symbol])
    }
    delete chosen[symbol]
    return null
  }
  search(0, 0)
  return bestAssignment
}

function nameBinary(counts, oxidationStates) {
  const symbols = Object.keys(counts)
  const anion = symbols.find((symbol) => oxidationStates[symbol] < 0 && ANION_NAMES[symbol])
  if (!anion) return null

  const cation = symbols.find((symbol) => symbol !== anion)
  if (!cation) return null
  const element = ELEMENT_BY_SYMBOL[cation]
  if (!element) return null
  if (element.category === 'no-metales' || element.category === 'metaloides') return null

  const cationStates = ATOMIC_PROPERTIES[cation].oxidationStates.filter((state) => state > 0)
  const stockSuffix =
    cationStates.length > 1 ? `(${toRoman(oxidationStates[cation])})` : ''
  return `${ANION_NAMES[anion]} de ${element.name.toLocaleLowerCase('es')}${stockSuffix}`
}

function nameCovalentBinary(counts, oxidationStates) {
  const symbols = Object.keys(counts)
  const anion = symbols.find((symbol) => oxidationStates[symbol] < 0)
  const cation = symbols.find((symbol) => symbol !== anion)
  if (!anion || !cation) return null

  const anionName = anion === 'O'
    ? 'óxido'
    : ANION_NAMES[anion] ?? `${ELEMENT_BY_SYMBOL[anion].name.toLocaleLowerCase('es')}uro`
  const prefix = PREFIXES[counts[anion]] ?? `${counts[anion]}-`
  const cationPrefix = counts[cation] > 1
    ? `${PREFIXES[counts[cation]] ?? `${counts[cation]}-`}`
    : ''
  return `${prefix}${anionName} de ${cationPrefix}${ELEMENT_BY_SYMBOL[cation].name.toLocaleLowerCase('es')}`
}

function nameHydroxide(counts, oxidationStates) {
  const symbols = Object.keys(counts)
  const metal = symbols.find((symbol) => symbol !== 'H' && symbol !== 'O')
  if (!metal || counts.H !== counts.O || counts[metal] !== 1) return null
  if (oxidationStates[metal] <= 0) return null

  const states = ATOMIC_PROPERTIES[metal].oxidationStates.filter((state) => state > 0)
  const suffix = states.length > 1 ? `(${toRoman(oxidationStates[metal])})` : ''
  return `Hidróxido de ${ELEMENT_BY_SYMBOL[metal].name.toLocaleLowerCase('es')}${suffix}`
}

export function analyzeInorganicFormula(formula) {
  const counts = typeof formula === 'string' ? parseFormula(formula) : formula
  const normalizedFormula = formulaFromCounts(counts)
  const oxidationStates = getNeutralOxidationStates(counts)
  const commonName = COMMON_NAMES[normalizedFormula]
  const symbols = Object.keys(counts)
  let name = commonName ?? null
  let nomenclature = commonName ? 'Nombre común (catálogo local)' : null

  if (!name && oxidationStates && symbols.length === 2) {
    name = nameBinary(counts, oxidationStates) ?? nameCovalentBinary(counts, oxidationStates)
    if (name) nomenclature = 'Nomenclatura Stock/sistemática'
  }

  if (!name && oxidationStates && symbols.length === 3) {
    name = nameHydroxide(counts, oxidationStates)
    if (name) nomenclature = 'Nomenclatura Stock'
  }

  return {
    formula: normalizedFormula,
    name,
    nomenclature,
    oxidationStates,
    supported: Boolean(name && oxidationStates),
    explanation: name
      ? null
      : 'La combinación no pertenece a las familias de nomenclatura localmente soportadas o su estado de oxidación no se puede resolver de forma única.',
  }
}

export function formatOxidationState(state) {
  if (state === null || state === undefined) return 'no determinado'
  if (state === 0) return '0'
  return `${state > 0 ? '+' : '−'}${Math.abs(state)}`
}
