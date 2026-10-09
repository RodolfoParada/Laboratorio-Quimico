import { molarMass, molarMassRational } from './formulas.js'
import { validateEquationAnswer } from './balance.js'
import {
  compareRationals,
  divideRationals,
  multiplyRationals,
  rational,
  rationalFromDecimal,
  rationalToNumber,
  subtractRationals,
} from './rational.js'

export function calculateStoichiometry(
  reactants,
  products,
  reactantMasses,
  actualProductMass = '',
) {
  if (
    !Array.isArray(reactants) ||
    !Array.isArray(products) ||
    !Array.isArray(reactantMasses) ||
    !reactants.length ||
    !products.length
  ) {
    throw new Error('La ecuación debe tener reactantes y productos.')
  }
  if (reactantMasses.length !== reactants.length) throw new Error('Ingresa la masa de cada reactante.')
  if (
    !validateEquationAnswer(
      reactants.map((item) => item.formula),
      products.map((item) => item.formula),
      reactants.map((item) => item.coefficient),
      products.map((item) => item.coefficient),
    )
  ) {
    throw new Error('La ecuación debe estar balanceada con coeficientes enteros positivos antes de calcular.')
  }

  const reactantAmounts = reactants.map((item, index) => {
    const coefficient = item.coefficient
    if (!Number.isSafeInteger(coefficient) || coefficient <= 0) {
      throw new Error(`El coeficiente de ${item.formula} debe ser un entero positivo seguro.`)
    }
    const mass = rationalFromDecimal(reactantMasses[index], `La masa de ${item.formula}`)
    if (mass.numerator <= 0n) {
      throw new Error(`La masa de ${item.formula} debe ser mayor que cero.`)
    }
    const massPerMoleExact = molarMassRational(item.formula)
    const moles = divideRationals(mass, massPerMoleExact)
    const availableReactionUnits = divideRationals(moles, rational(BigInt(coefficient)))
    return {
      formula: item.formula,
      coefficient,
      mass: rationalToNumber(mass, `La masa de ${item.formula}`),
      molarMass: molarMass(item.formula),
      moles: rationalToNumber(moles, `La cantidad de ${item.formula}`),
      availableReactionUnits: rationalToNumber(availableReactionUnits),
      exactMoles: moles,
      exactAvailableReactionUnits: availableReactionUnits,
    }
  })
  const reactionExtent = reactantAmounts.reduce(
    (minimum, item) =>
      compareRationals(item.exactAvailableReactionUnits, minimum) < 0
        ? item.exactAvailableReactionUnits
        : minimum,
    reactantAmounts[0].exactAvailableReactionUnits,
  )
  const limitingIndex = reactantAmounts.findIndex(
    (item) => compareRationals(item.exactAvailableReactionUnits, reactionExtent) === 0,
  )
  const leftovers = reactantAmounts.map((item) => {
    const consumedMoles = multiplyRationals(reactionExtent, rational(BigInt(item.coefficient)))
    const remainingMoles = subtractRationals(item.exactMoles, consumedMoles)
    if (remainingMoles.numerator < 0n) {
      throw new Error('La comprobación de reactivo sobrante produjo una cantidad negativa.')
    }
    return {
      formula: item.formula,
      remainingMoles: rationalToNumber(remainingMoles),
      remainingMass: rationalToNumber(
        multiplyRationals(remainingMoles, molarMassRational(item.formula)),
        `La masa sobrante de ${item.formula}`,
      ),
    }
  })
  const theoreticalProducts = products.map((item) => {
    if (!Number.isSafeInteger(item.coefficient) || item.coefficient <= 0) {
      throw new Error(`El coeficiente de ${item.formula} debe ser un entero positivo seguro.`)
    }
    const moles = multiplyRationals(reactionExtent, rational(BigInt(item.coefficient)))
    const mass = multiplyRationals(moles, molarMassRational(item.formula))
    return {
      formula: item.formula,
      moles: rationalToNumber(moles, `La cantidad teórica de ${item.formula}`),
      mass: rationalToNumber(mass, `La masa teórica de ${item.formula}`),
      exactMass: mass,
    }
  })

  let actualYieldPercent = null
  if (actualProductMass !== '' && actualProductMass !== undefined && actualProductMass !== null) {
    const actualMass = rationalFromDecimal(actualProductMass, 'La masa real del producto')
    if (actualMass.numerator < 0n) {
      throw new Error('La masa real del producto debe ser positiva o cero.')
    }
    if (theoreticalProducts.length > 0) {
      actualYieldPercent = rationalToNumber(
        multiplyRationals(
          divideRationals(actualMass, theoreticalProducts[0].exactMass),
          rational(100n),
        ),
        'El rendimiento porcentual',
      )
    }
  }

  const publicReactants = reactantAmounts.map((item) => ({
    formula: item.formula,
    coefficient: item.coefficient,
    mass: item.mass,
    molarMass: item.molarMass,
    moles: item.moles,
    availableReactionUnits: item.availableReactionUnits,
  }))
  return {
    limitingReactant: publicReactants[limitingIndex],
    reactants: publicReactants,
    leftovers,
    theoreticalProducts: theoreticalProducts.map((product) => ({
      formula: product.formula,
      moles: product.moles,
      mass: product.mass,
    })),
    actualYieldPercent,
  }
}
