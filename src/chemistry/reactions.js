import { balanceEquation, validateEquationAnswer } from './balance.js'
import { parseFormula } from './formulas.js'

const GAS_PRODUCTS = new Set(['H2', 'N2', 'O2', 'O3', 'CO2', 'CO', 'NH3', 'SO2', 'H2S'])
const KNOWN_PRECIPITATES = new Set([
  'AgCl', 'AgBr', 'AgI', 'BaSO4', 'PbI2', 'PbSO4', 'CaCO3', 'Cu(OH)2', 'Fe(OH)3',
])

const STANDARD_THERMOCHEMISTRY = [
  {
    reactants: [['H2', 2], ['O2', 1]],
    products: [['H2O', 2]],
    deltaH: -483.6528,
    source: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=1',
    note: 'Formación de vapor de agua desde H2(g) y O2(g), a 298,15 K y 1 bar.',
  },
]

function reactionSideSignature(items) {
  return items
    .map(({ formula, coefficient }) => `${formula}:${coefficient}`)
    .sort()
    .join('+')
}

function getStandardThermochemistry(equation) {
  const reactants = reactionSideSignature(equation.reactants)
  const products = reactionSideSignature(equation.products)
  const record = STANDARD_THERMOCHEMISTRY.find(
    (item) =>
      reactionSideSignature(item.reactants.map(([formula, coefficient]) => ({ formula, coefficient }))) === reactants &&
      reactionSideSignature(item.products.map(([formula, coefficient]) => ({ formula, coefficient }))) === products,
  )
  return record
    ? {
        deltaH: record.deltaH,
        unit: 'kJ por ecuación balanceada',
        conditions: '298,15 K · 1 bar · reactivos y productos en estado estándar',
        note: record.note,
        source: record.source,
      }
    : null
}

function isElemental(formula) {
  return Object.keys(parseFormula(formula)).length === 1
}

function balancedSides(equation) {
  return validateEquationAnswer(
    equation.reactants.map((item) => item.formula),
    equation.products.map((item) => item.formula),
    equation.reactants.map((item) => item.coefficient),
    equation.products.map((item) => item.coefficient),
  )
}

export function classifyReaction(reactants, products) {
  if (!balancedSides(balanceEquation(reactants, products))) {
    throw new Error('Balancea la ecuación antes de clasificarla.')
  }

  let type = 'No identificada'
  let pattern = 'La ecuación no coincide con un patrón de clasificación implementado.'
  if (reactants.length === 2 && products.length === 1) {
    type = 'Síntesis'
    pattern = 'Dos reactantes forman un producto.'
  } else if (reactants.length === 1 && products.length === 2) {
    type = 'Descomposición'
    pattern = 'Un reactante forma dos productos.'
  } else if (
    reactants.length === 2 &&
    products.length === 2 &&
    reactants.filter(isElemental).length === 1 &&
    products.filter(isElemental).length === 1
  ) {
    type = 'Sustitución simple'
    pattern = 'Un elemento libre desplaza a otro dentro de un compuesto.'
  } else if (
    reactants.length === 2 &&
    products.length === 2 &&
    reactants.every((formula) => !isElemental(formula)) &&
    products.every((formula) => !isElemental(formula))
  ) {
    type = 'Doble sustitución'
    pattern = 'Dos compuestos intercambian sus componentes.'
  }

  const gasProducts = products.filter((formula) => GAS_PRODUCTS.has(formula))
  const precipitates = products.filter((formula) => KNOWN_PRECIPITATES.has(formula))
  const effects = []
  if (gasProducts.length) {
    effects.push({ type: 'gas', label: `Producto gaseoso posible: ${gasProducts.join(', ')}` })
  }
  if (precipitates.length) {
    effects.push({ type: 'precipitate', label: `Precipitado posible: ${precipitates.join(', ')}` })
  }

  return {
    type,
    pattern,
    effects,
    caveat:
      'Clasificación teórica por patrón y composición. No confirma la velocidad, espontaneidad ni condiciones experimentales de la reacción.',
  }
}

export function classifyBalancedReaction(reactants, products) {
  const equation = balanceEquation(reactants, products)
  return {
    equation,
    classification: classifyReaction(reactants, products),
    thermochemistry: getStandardThermochemistry(equation),
  }
}
