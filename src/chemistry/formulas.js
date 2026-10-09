import { ATOMIC_PROPERTIES } from '../data/atomic-properties.js'
import {
  addRationals,
  multiplyRationals,
  rational,
  rationalFromDecimal,
  rationalToNumber,
} from './rational.js'

function addCount(counts, symbol, amount) {
  const total = (counts[symbol] ?? 0) + amount
  if (!Number.isSafeInteger(total)) {
    throw new Error(`La cantidad de átomos de ${symbol} supera el rango entero seguro.`)
  }
  counts[symbol] = total
}

export function parseFormula(formula) {
  const input = formula.trim()
  if (!input) throw new Error('Escribe una fórmula química.')

  let index = 0

  function parseGroup(nested = false) {
    const counts = {}
    let hasContent = false

    while (index < input.length) {
      if (input[index] === ')') {
        if (!nested) throw new Error('La fórmula tiene un paréntesis de cierre inesperado.')
        if (!hasContent) throw new Error('Los paréntesis deben contener al menos un elemento.')
        index += 1
        return counts
      }

      if (input[index] === '(') {
        index += 1
        const nestedCounts = parseGroup(true)
        if (index === 0 || input[index - 1] !== ')') {
          throw new Error('Falta cerrar un paréntesis en la fórmula.')
        }
        const multiplier = readMultiplier()
        for (const [symbol, count] of Object.entries(nestedCounts)) {
          const multipliedCount = count * multiplier
          if (!Number.isSafeInteger(multipliedCount)) {
            throw new Error(`La cantidad de átomos de ${symbol} supera el rango entero seguro.`)
          }
          addCount(counts, symbol, multipliedCount)
        }
        hasContent = true
        continue
      }

      const match = input.slice(index).match(/^([A-Z][a-z]?)/)
      if (!match) {
        throw new Error(`No se reconoce el símbolo cerca de «${input.slice(index)}».`)
      }
      const symbol = match[1]
      if (!Object.hasOwn(ATOMIC_PROPERTIES, symbol)) {
        throw new Error(`«${symbol}» no es un símbolo de elemento válido.`)
      }
      index += symbol.length
      addCount(counts, symbol, readMultiplier())
      hasContent = true
    }

    if (nested) throw new Error('Falta cerrar un paréntesis en la fórmula.')
    if (!hasContent) throw new Error('La fórmula no contiene elementos.')
    return counts
  }

  function readMultiplier() {
    const match = input.slice(index).match(/^\d+/)
    if (!match) return 1
    index += match[0].length
    const multiplier = Number(match[0])
    if (!Number.isSafeInteger(multiplier) || multiplier < 1) {
      throw new Error('Los subíndices deben ser enteros positivos.')
    }
    return multiplier
  }

  const counts = parseGroup()
  if (index !== input.length) throw new Error('La fórmula contiene caracteres no válidos.')
  return counts
}

export function formulaFromCounts(counts) {
  for (const [symbol, count] of Object.entries(counts)) {
    if (!Object.hasOwn(ATOMIC_PROPERTIES, symbol)) {
      throw new Error(`«${symbol}» no es un símbolo de elemento válido.`)
    }
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`La cantidad de átomos de ${symbol} debe ser un entero no negativo seguro.`)
    }
  }
  const symbols = Object.keys(counts).filter((symbol) => counts[symbol] > 0)
  if (symbols.length === 0) throw new Error('Selecciona al menos un átomo.')

  const hasCarbon = Object.hasOwn(counts, 'C')
  symbols.sort((left, right) => {
    if (hasCarbon) {
      if (left === 'C') return -1
      if (right === 'C') return 1
      if (left === 'H') return -1
      if (right === 'H') return 1
    }
    return left.localeCompare(right)
  })

  return symbols.map((symbol) => `${symbol}${counts[symbol] > 1 ? counts[symbol] : ''}`).join('')
}

export function countsFromAtoms(atoms) {
  return atoms.reduce((counts, symbol) => {
    if (!Object.hasOwn(ATOMIC_PROPERTIES, symbol)) {
      throw new Error(`«${symbol}» no es un símbolo de elemento válido.`)
    }
    addCount(counts, symbol, 1)
    return counts
  }, {})
}

export function parseFormulaList(input) {
  const formulas = input
    .split('+')
    .map((formula) => formula.trim())
    .filter(Boolean)
  if (!formulas.length) throw new Error('Escribe al menos una fórmula.')
  formulas.forEach(parseFormula)
  return formulas
}

export function molarMassRational(formulaOrCounts) {
  const counts =
    typeof formulaOrCounts === 'string' ? parseFormula(formulaOrCounts) : formulaOrCounts
  if (
    !counts ||
    typeof counts !== 'object' ||
    Array.isArray(counts) ||
    Object.keys(counts).length === 0
  ) {
    throw new Error('Se requiere una fórmula con al menos un elemento para calcular la masa molar.')
  }
  if (!Object.values(counts).some((count) => Number.isSafeInteger(count) && count > 0)) {
    throw new Error('La fórmula debe contener al menos un átomo.')
  }
  return Object.entries(counts).reduce((total, [symbol, count]) => {
    const property = ATOMIC_PROPERTIES[symbol]
    if (!property) throw new Error(`No hay datos de masa atómica para ${symbol}.`)
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`La cantidad de átomos de ${symbol} debe ser un entero no negativo seguro.`)
    }
    const elementMass = rationalFromDecimal(property.atomicMass, `La masa atómica de ${symbol}`)
    return addRationals(
      total,
      multiplyRationals(elementMass, rational(BigInt(count))),
    )
  }, rational(0n))
}

export function molarMass(formulaOrCounts) {
  return rationalToNumber(molarMassRational(formulaOrCounts), 'La masa molar')
}

export function formatMolarMass(value) {
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(value)} g/mol`
}
