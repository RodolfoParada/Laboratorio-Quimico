function bigintGcd(left, right) {
  let a = left < 0n ? -left : left
  let b = right < 0n ? -right : right
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

export function rational(numerator, denominator = 1n) {
  if (denominator === 0n) throw new Error('No se puede dividir por cero.')
  const sign = denominator < 0n ? -1n : 1n
  const divisor = bigintGcd(numerator, denominator)
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign,
  }
}

export function rationalFromDecimal(value, label = 'El valor') {
  if (
    value &&
    typeof value === 'object' &&
    typeof value.numerator === 'bigint' &&
    typeof value.denominator === 'bigint'
  ) {
    return rational(value.numerator, value.denominator)
  }
  if (typeof value === 'bigint') return rational(value)
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${label} debe ser un número finito.`)
  }

  const input = String(value).trim()
  const match = input.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/)
  if (!match) throw new Error(`${label} debe ser un número decimal válido.`)
  if (input.length > 128) throw new Error(`${label} supera la precisión de entrada admitida.`)

  const exponent = Number(match[4] ?? 0)
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 300) {
    throw new Error(`${label} está fuera del rango numérico admitido.`)
  }

  const fractionDigits = match[3] ?? ''
  const digits = BigInt(`${match[2]}${fractionDigits}`)
  const signed = match[1] === '-' ? -digits : digits
  const scale = fractionDigits.length - exponent
  return scale >= 0
    ? rational(signed, 10n ** BigInt(scale))
    : rational(signed * 10n ** BigInt(-scale))
}

export function addRationals(left, right) {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  )
}

export function subtractRationals(left, right) {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  )
}

export function multiplyRationals(left, right) {
  return rational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  )
}

export function divideRationals(left, right) {
  if (right.numerator === 0n) throw new Error('No se puede dividir por cero.')
  return rational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  )
}

export function compareRationals(left, right) {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

export function rationalToNumber(value, label = 'El resultado') {
  if (value.numerator === 0n) return 0
  const negative = value.numerator < 0n
  const numerator = negative ? -value.numerator : value.numerator
  const denominator = value.denominator

  let exponent = numerator.toString().length - denominator.toString().length
  if (
    exponent >= 0
      ? numerator < denominator * 10n ** BigInt(exponent)
      : numerator * 10n ** BigInt(-exponent) < denominator
  ) {
    exponent -= 1
  }

  const scale = 16 - exponent
  const rounded =
    scale >= 0
      ? (numerator * 10n ** BigInt(scale) + denominator / 2n) / denominator
      : (numerator + (denominator * 10n ** BigInt(-scale)) / 2n) /
        (denominator * 10n ** BigInt(-scale))
  const digits = rounded.toString()
  const significand = digits.length > 1 ? `${digits[0]}.${digits.slice(1, 17)}` : digits
  const adjustedExponent = exponent + digits.length - 17
  const result = Number(`${significand}e${adjustedExponent}`) * (negative ? -1 : 1)
  if (!Number.isFinite(result) || result === 0) {
    throw new Error(`${label} está fuera del rango numérico que se puede mostrar.`)
  }
  return result
}
