import {
  addRationals,
  compareRationals,
  divideRationals,
  multiplyRationals,
  rational,
  rationalFromDecimal,
  rationalToNumber,
  subtractRationals,
} from './rational.js'

function positiveValue(value, label) {
  const parsed = rationalFromDecimal(value, label)
  if (parsed.numerator <= 0n) throw new Error(`${label} debe ser mayor que cero.`)
  return parsed
}

function percent(numerator, denominator, label) {
  return rationalToNumber(
    multiplyRationals(
      divideRationals(numerator, denominator),
      rational(100n),
    ),
    label,
  )
}

export function calculateSolution({
  soluteMassG,
  solventMassG,
  solutionVolumeMl,
  soluteVolumeMl,
  solventVolumeMl,
  soluteMolarMass,
  vanthoffFactor = 1,
  freezingPointC = 0,
  boilingPointC = 100,
  freezingPointConstant = 1.86,
  boilingPointConstant = 0.512,
  solubilityLimitGPer100GSolvent = '',
}) {
  const soluteMass = positiveValue(soluteMassG, 'La masa de soluto')
  const solventMass = positiveValue(solventMassG, 'La masa de solvente')
  const solutionVolume = positiveValue(solutionVolumeMl, 'El volumen de solución')
  const molarMass = positiveValue(soluteMolarMass, 'La masa molar del soluto')
  const vanthoff = positiveValue(vanthoffFactor, 'El factor de Van ’t Hoff')
  const initialFreezingPoint = rationalFromDecimal(freezingPointC, 'El punto de congelación')
  const initialBoilingPoint = rationalFromDecimal(boilingPointC, 'El punto de ebullición')
  const freezingConstant = rationalFromDecimal(freezingPointConstant, 'La constante crioscópica')
  const boilingConstant = rationalFromDecimal(boilingPointConstant, 'La constante ebulloscópica')
  if (freezingConstant.numerator < 0n || boilingConstant.numerator < 0n) {
    throw new Error('Las constantes coligativas no pueden ser negativas.')
  }

  const hasSoluteVolume = soluteVolumeMl !== '' && soluteVolumeMl !== undefined && soluteVolumeMl !== null
  const hasSolventVolume =
    solventVolumeMl !== '' && solventVolumeMl !== undefined && solventVolumeMl !== null
  const soluteVolume = hasSoluteVolume
    ? rationalFromDecimal(soluteVolumeMl, 'El volumen de soluto')
    : null
  const solventVolume = hasSolventVolume
    ? rationalFromDecimal(solventVolumeMl, 'El volumen de solvente')
    : null
  if (soluteVolume?.numerator < 0n || solventVolume?.numerator < 0n) {
    throw new Error('Los volúmenes no pueden ser negativos.')
  }

  const moles = divideRationals(soluteMass, molarMass)
  const molality = divideRationals(moles, divideRationals(solventMass, rational(1000n)))
  const molarity = divideRationals(
    moles,
    divideRationals(solutionVolume, rational(1000n)),
  )
  const massPercent = percent(
    soluteMass,
    addRationals(soluteMass, solventMass),
    'El porcentaje m/m',
  )
  const massVolumePercent = percent(soluteMass, solutionVolume, 'El porcentaje m/V')
  let volumePercent = null
  if (hasSoluteVolume && hasSolventVolume) {
    const combinedVolume = addRationals(soluteVolume, solventVolume)
    if (combinedVolume.numerator <= 0n) {
      throw new Error('Los volúmenes para % V/V deben sumar más que cero.')
    }
    volumePercent = percent(soluteVolume, combinedVolume, 'El porcentaje V/V')
  }

  let saturation = null
  if (
    solubilityLimitGPer100GSolvent !== '' &&
    solubilityLimitGPer100GSolvent !== undefined &&
    solubilityLimitGPer100GSolvent !== null
  ) {
    const solubility = rationalFromDecimal(
      solubilityLimitGPer100GSolvent,
      'La solubilidad ingresada',
    )
    if (solubility.numerator < 0n) {
      throw new Error('La solubilidad debe ser un valor positivo o cero.')
    }
    const maximumMass = divideRationals(
      multiplyRationals(solubility, solventMass),
      rational(100n),
    )
    const comparison = compareRationals(soluteMass, maximumMass)
    saturation =
      comparison > 0
        ? 'Se supera el límite ingresado; puede quedar soluto sin disolver.'
        : comparison === 0
          ? 'Saturada según el límite ingresado.'
          : 'Insaturada según el límite ingresado.'
  }

  const freezingDelta = multiplyRationals(
    multiplyRationals(freezingConstant, molality),
    vanthoff,
  )
  const boilingDelta = multiplyRationals(
    multiplyRationals(boilingConstant, molality),
    vanthoff,
  )

  return {
    moles: rationalToNumber(moles, 'La cantidad de sustancia'),
    molarity: rationalToNumber(molarity, 'La molaridad'),
    massPercent,
    massVolumePercent,
    volumePercent,
    molality: rationalToNumber(molality, 'La molalidad'),
    freezingPointC: rationalToNumber(
      subtractRationals(initialFreezingPoint, freezingDelta),
      'El punto de congelación calculado',
    ),
    boilingPointC: rationalToNumber(
      addRationals(initialBoilingPoint, boilingDelta),
      'El punto de ebullición calculado',
    ),
    saturation,
    caveat:
      'Los cálculos aritméticos usan las entradas decimales tal como se escribieron. El % V/V supone que los volúmenes de soluto y solvente son aditivos. Las propiedades coligativas son aproximaciones para soluciones diluidas ideales; la solubilidad se compara solo con el valor ingresado para la temperatura de trabajo y no predice cuánto soluto se disuelve en equilibrio.',
  }
}
