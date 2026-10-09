import { parseFormula } from './formulas.js'
import {
  addRationals,
  compareRationals,
  divideRationals,
  multiplyRationals,
  rational,
  subtractRationals,
} from './rational.js'

const MAX_FREE_COLUMNS = 5
const FREE_COEFFICIENT_SEARCH_LIMIT = 8

function bigintGcd(left, right) {
  let a = left < 0n ? -left : left
  let b = right < 0n ? -right : right
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

function bigintLcm(left, right) {
  return (left / bigintGcd(left, right)) * right
}

function isZero(value) {
  return value.numerator === 0n
}

function toSmallestPositiveIntegers(values) {
  const commonDenominator = values.reduce(
    (common, value) => bigintLcm(common, value.denominator),
    1n,
  )
  const scaled = values.map(
    (value) => value.numerator * (commonDenominator / value.denominator),
  )
  const commonFactor = scaled.reduce(bigintGcd)
  if (commonFactor === 0n) return null
  const integers = scaled.map((value) => value / commonFactor)
  if (integers.every((value) => value < 0n)) {
    return integers.map((value) => -value)
  }
  if (integers.some((value) => value <= 0n)) return null
  return integers
}

function solveForFreeValues(matrix, pivotColumns, freeColumns, freeValues) {
  const values = Array(matrix[0].length).fill(null).map(() => rational(0n))
  freeColumns.forEach((column, index) => {
    values[column] = rational(freeValues[index])
  })
  pivotColumns.forEach((column, row) => {
    const sum = freeColumns.reduce(
      (total, freeColumn) =>
        addRationals(
          total,
          multiplyRationals(matrix[row][freeColumn], values[freeColumn]),
        ),
      rational(0n),
    )
    values[column] = rational(-sum.numerator, sum.denominator)
  })
  return values
}

function toSafeCoefficient(value) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('El coeficiente excede el rango entero seguro que admite la interfaz.')
  }
  return Number(value)
}

export function balanceEquation(reactants, products) {
  if (!Array.isArray(reactants) || !Array.isArray(products) || !reactants.length || !products.length) {
    throw new Error('Añade al menos un reactante y un producto.')
  }
  const formulas = [...reactants, ...products]
  const parsed = formulas.map(parseFormula)
  const elements = [...new Set(parsed.flatMap((counts) => Object.keys(counts)))].sort()
  const rows = elements.map((element) =>
    parsed.map((counts, index) => {
      const count = BigInt(counts[element] ?? 0)
      return index < reactants.length ? count : -count
    }),
  )

  const matrix = rows.map((row) => row.map((value) => rational(value)))
  const pivotColumns = []
  let pivotRow = 0
  for (let column = 0; column < formulas.length && pivotRow < matrix.length; column += 1) {
    let selected = pivotRow
    for (let row = pivotRow + 1; row < matrix.length; row += 1) {
      const rowPivot = matrix[row][column]
      const selectedPivot = matrix[selected][column]
      const absoluteRowPivot = rational(
        rowPivot.numerator < 0n ? -rowPivot.numerator : rowPivot.numerator,
        rowPivot.denominator,
      )
      const absoluteSelectedPivot = rational(
        selectedPivot.numerator < 0n ? -selectedPivot.numerator : selectedPivot.numerator,
        selectedPivot.denominator,
      )
      if (compareRationals(absoluteRowPivot, absoluteSelectedPivot) > 0) {
        selected = row
      }
    }
    if (isZero(matrix[selected][column])) continue
    ;[matrix[pivotRow], matrix[selected]] = [matrix[selected], matrix[pivotRow]]

    const pivot = matrix[pivotRow][column]
    matrix[pivotRow] = matrix[pivotRow].map((value) => divideRationals(value, pivot))
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === pivotRow) continue
      const factor = matrix[row][column]
      if (isZero(factor)) continue
      matrix[row] = matrix[row].map((value, index) =>
        subtractRationals(value, multiplyRationals(factor, matrix[pivotRow][index])),
      )
    }
    pivotColumns.push(column)
    pivotRow += 1
  }

  const pivotSet = new Set(pivotColumns)
  const freeColumns = formulas.map((_, index) => index).filter((column) => !pivotSet.has(column))
  if (freeColumns.length === 0) throw new Error('Esta ecuación no tiene una solución no trivial.')
  if (freeColumns.length > MAX_FREE_COLUMNS) {
    throw new Error('La ecuación tiene demasiadas variables libres para el alcance admitido.')
  }

  let best = null
  function search(index, freeValues) {
    if (index === freeColumns.length) {
      const candidate = solveForFreeValues(matrix, pivotColumns, freeColumns, freeValues)
      const integers = toSmallestPositiveIntegers(candidate)
      if (!integers) return
      const score = integers.reduce((sum, value) => sum + value, 0n)
      if (best === null || score < best.score) best = { integers, score }
      return
    }
    for (let value = 1n; value <= BigInt(FREE_COEFFICIENT_SEARCH_LIMIT); value += 1n) {
      search(index + 1, [...freeValues, value])
    }
  }
  search(0, [])

  if (!best) {
    throw new Error(
      `No se encontró una solución positiva dentro de la búsqueda admitida (variables libres entre 1 y ${FREE_COEFFICIENT_SEARCH_LIMIT}). Esto no demuestra que la ecuación no pueda balancearse.`,
    )
  }

  const coefficients = best.integers.map(toSafeCoefficient)
  const balanced = {
    reactants: reactants.map((formula, index) => ({ formula, coefficient: coefficients[index] })),
    products: products.map((formula, index) => ({
      formula,
      coefficient: coefficients[reactants.length + index],
    })),
  }
  if (
    !validateEquationAnswer(
      reactants,
      products,
      balanced.reactants.map((item) => item.coefficient),
      balanced.products.map((item) => item.coefficient),
    )
  ) {
    throw new Error('El resultado no superó la verificación exacta de conservación de átomos.')
  }
  return balanced
}

export function validateEquationAnswer(reactants, products, reactantCoefficients, productCoefficients) {
  if (
    !Array.isArray(reactants) ||
    !Array.isArray(products) ||
    !Array.isArray(reactantCoefficients) ||
    !Array.isArray(productCoefficients) ||
    !reactants.length ||
    !products.length ||
    reactantCoefficients.length !== reactants.length ||
    productCoefficients.length !== products.length
  ) {
    return false
  }

  const coefficients = [...reactantCoefficients, ...productCoefficients]
  if (
    coefficients.some(
      (coefficient) =>
        !(typeof coefficient === 'bigint' && coefficient > 0n) &&
        !(Number.isSafeInteger(coefficient) && coefficient > 0),
    )
  ) {
    return false
  }

  const atomsBySide = (formulas, coefficients) => {
    const total = {}
    formulas.forEach((formula, index) => {
      const multiplier = BigInt(coefficients[index])
      for (const [symbol, count] of Object.entries(parseFormula(formula))) {
        total[symbol] = (total[symbol] ?? 0n) + BigInt(count) * multiplier
      }
    })
    return total
  }
  const left = atomsBySide(reactants, reactantCoefficients)
  const right = atomsBySide(products, productCoefficients)
  const symbols = new Set([...Object.keys(left), ...Object.keys(right)])
  return [...symbols].every((symbol) => (left[symbol] ?? 0n) === (right[symbol] ?? 0n))
}
