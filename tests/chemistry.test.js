import test from 'node:test'
import assert from 'node:assert/strict'
import { ATOMIC_MASS_REFERENCE, ATOMIC_PROPERTIES } from '../src/data/atomic-properties.js'
import { ELEMENTS } from '../src/data/elements.js'
import elementFacts from '../src/data/element-facts.json' with { type: 'json' }
import { balanceEquation, validateEquationAnswer } from '../src/chemistry/balance.js'
import {
  countsFromAtoms,
  formulaFromCounts,
  molarMass,
  molarMassRational,
  parseFormula,
} from '../src/chemistry/formulas.js'
import {
  areGraphsIsomorphic,
  analyzeLewisStructure,
  findStructuralIsomers,
  identifyFunctionalGroups,
  isGraphConnected,
  validateValences,
} from '../src/chemistry/organic.js'
import { analyzeInorganicFormula } from '../src/chemistry/nomenclature.js'
import { classifyBalancedReaction } from '../src/chemistry/reactions.js'
import { calculateSolution } from '../src/chemistry/solutions.js'
import { calculateStoichiometry } from '../src/chemistry/stoichiometry.js'
import { parsePubChemSdf } from '../src/services/pubchem.js'
import {
  addRationals,
  rationalFromDecimal,
  rationalToNumber,
} from '../src/chemistry/rational.js'

test('parses nested groups, normalizes atom counts, and calculates molar mass', () => {
  assert.deepEqual(parseFormula('Fe2(SO4)3'), { Fe: 2, S: 3, O: 12 })
  assert.equal(formulaFromCounts(countsFromAtoms(['O', 'H', 'H'])), 'H2O')
  assert.equal(molarMass('H2O'), 18.015)
  assert.throws(() => parseFormula('Xx2'), /no es un símbolo/)
  assert.throws(() => parseFormula('()'), /deben contener/)
  assert.throws(() => parseFormula('(H9007199254740991)2'), /rango entero seguro/)
})

test('performs decimal arithmetic exactly before converting display values to numbers', () => {
  const sum = addRationals(rationalFromDecimal('0.1'), rationalFromDecimal('0.2'))
  assert.deepEqual(sum, { numerator: 3n, denominator: 10n })
  assert.equal(rationalToNumber(sum), 0.3)
  assert.equal(rationalToNumber(rationalFromDecimal('1.25e2')), 125)
  assert.throws(() => rationalFromDecimal('1.2.3'), /decimal válido/)
})

test('uses traceable reference atomic weights and isotope mass-number labels', () => {
  assert.equal(ATOMIC_MASS_REFERENCE.organization, 'CIAAW / IUPAC')
  assert.equal(ATOMIC_PROPERTIES.Zr.atomicMass, 91.222)
  assert.equal(ATOMIC_PROPERTIES.Gd.atomicMass, 157.249)
  assert.equal(ATOMIC_PROPERTIES.Lu.atomicMass, 174.96669)
  assert.equal(ATOMIC_PROPERTIES.Tc.atomicMassKind, 'representative-isotope-mass-number')
  assert.equal(ATOMIC_PROPERTIES.Fe.atomicMassKind, 'standard-atomic-weight')
})

test('provides sourced element facts for all 118 elements and preserves missing values', () => {
  assert.equal(Object.keys(elementFacts).length, 118)
  assert.equal(elementFacts.O.electronConfiguration, '1s2 2s2 2p4')
  assert.equal(elementFacts.O.electronegativityPauling, 3.44)
  assert.ok(elementFacts.O.meltingPointKelvin > 0)
  assert.equal(elementFacts.He.electronegativityPauling, null)
  for (const { symbol, atomicNumber } of ELEMENTS) {
    const electrons = [...elementFacts[symbol].electronConfiguration.matchAll(/(\d+)[spdfghik](\d+)/g)]
      .reduce((sum, [, , count]) => sum + Number(count), 0)
    assert.equal(electrons, atomicNumber, `${symbol} configuration should match its atomic number`)
  }
})

test('balances common equations with positive integer coefficients', () => {
  const water = balanceEquation(['H2', 'O2'], ['H2O'])
  assert.deepEqual(water.reactants.map(({ coefficient }) => coefficient), [2, 1])
  assert.deepEqual(water.products.map(({ coefficient }) => coefficient), [2])
  assert.equal(validateEquationAnswer(['H2', 'O2'], ['H2O'], [2, 1], [2]), true)

  const ironOxide = balanceEquation(['Fe', 'O2'], ['Fe2O3'])
  assert.deepEqual(ironOxide.reactants.map(({ coefficient }) => coefficient), [4, 3])
  assert.deepEqual(ironOxide.products.map(({ coefficient }) => coefficient), [2])
})

test('balances equations with larger coefficients and verifies every atom count exactly', () => {
  const result = balanceEquation(
    ['K2Cr2O7', 'HCl'],
    ['KCl', 'CrCl3', 'H2O', 'Cl2'],
  )
  assert.deepEqual(result.reactants.map(({ coefficient }) => coefficient), [1, 14])
  assert.deepEqual(result.products.map(({ coefficient }) => coefficient), [2, 2, 7, 3])
  assert.equal(
    validateEquationAnswer(
      result.reactants.map(({ formula }) => formula),
      result.products.map(({ formula }) => formula),
      result.reactants.map(({ coefficient }) => coefficient),
      result.products.map(({ coefficient }) => coefficient),
    ),
    true,
  )
  assert.throws(
    () =>
      balanceEquation(
        ['H2', 'O2', 'N2', 'Cl2', 'F2', 'Br2', 'I2'],
        ['H2', 'O2', 'N2', 'Cl2', 'F2', 'Br2', 'I2'],
      ),
    /demasiadas variables libres/,
  )
})

test('returns a supported Stock name and oxidation states for iron chloride', () => {
  const result = analyzeInorganicFormula('FeCl3')
  assert.equal(result.supported, true)
  assert.equal(result.name, 'cloruro de hierro(III)')
  assert.deepEqual(result.oxidationStates, { Fe: 3, Cl: -1 })
})

test('calculates limiting reactant, excess reagent, and theoretical product mass', () => {
  const balanced = balanceEquation(['H2', 'O2'], ['H2O'])
  const result = calculateStoichiometry(balanced.reactants, balanced.products, [4.032, 64])
  assert.equal(result.limitingReactant.formula, 'H2')
  assert.ok(Math.abs(result.leftovers[1].remainingMass - 32.002) < 1e-9)
  assert.ok(Math.abs(result.theoreticalProducts[0].mass - 36.03) < 1e-9)
  assert.equal(result.actualYieldPercent, null)
  const exactTie = calculateStoichiometry(
    balanced.reactants,
    balanced.products,
    ['4.03200000000000001', '31.998'],
    '18.015',
  )
  assert.equal(exactTie.limitingReactant.formula, 'O2')
  assert.equal(exactTie.actualYieldPercent, 50)
  assert.throws(
    () =>
      calculateStoichiometry(
        [{ formula: 'H2', coefficient: 1 }],
        [{ formula: 'H2O', coefficient: 1 }],
        ['1'],
      ),
    /debe estar balanceada/,
  )
})

test('calculates concentration and only returns volume percentage for complete inputs', () => {
  const base = {
    soluteMassG: 10,
    solventMassG: 100,
    solutionVolumeMl: 250,
    soluteMolarMass: 58.44,
  }
  assert.equal(calculateSolution(base).volumePercent, null)
  const withVolumes = calculateSolution({
    ...base,
    soluteVolumeMl: '20',
    solventVolumeMl: '80',
  })
  assert.equal(withVolumes.volumePercent, 20)
  assert.ok(Math.abs(withVolumes.massVolumePercent - 4) < 1e-9)
  assert.throws(() => calculateSolution({ ...base, soluteVolumeMl: '0', solventVolumeMl: '0' }))
  const justAboveLimit = calculateSolution({
    ...base,
    soluteMassG: '10.000000000001',
    solventMassG: '100',
    soluteMolarMass: molarMassRational('NaCl'),
    solubilityLimitGPer100GSolvent: '10',
  })
  assert.match(justAboveLimit.saturation, /supera el límite/)
  assert.throws(() => calculateSolution({ ...base, soluteMassG: 'NaN' }), /decimal válido/)
})

test('classifies a balanced substitution and labels a possible gas product', () => {
  const result = classifyBalancedReaction(['Zn', 'HCl'], ['ZnCl2', 'H2'])
  assert.equal(result.classification.type, 'Sustitución simple')
  assert.deepEqual(result.classification.effects, [
    { type: 'gas', label: 'Producto gaseoso posible: H2' },
  ])
})

test('returns referenced standard enthalpy only for supported balanced reactions', () => {
  const waterFormation = classifyBalancedReaction(['H2', 'O2'], ['H2O'])
  assert.equal(waterFormation.thermochemistry.deltaH, -483.6528)
  assert.equal(waterFormation.thermochemistry.unit, 'kJ por ecuación balanceada')
  assert.equal(classifyBalancedReaction(['Zn', 'HCl'], ['ZnCl2', 'H2']).thermochemistry, null)
})

test('validates Lewis duet/octet counts for water and marks transition metals unsupported', () => {
  const water = analyzeLewisStructure(
    ['O', 'H', 'H'],
    [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }],
  )
  assert.ok(water.every(({ valid }) => valid))
  assert.equal(analyzeLewisStructure(['Fe'], [])[0].supported, false)
  assert.equal(
    analyzeLewisStructure(['H', 'H'], [{ from: 0, to: 1, order: 1 }]).every(({ valid }) => valid),
    true,
  )
  const overOctet = analyzeLewisStructure(['He', 'H'], [{ from: 0, to: 1, order: 1 }])
  assert.equal(overOctet[0].shownElectrons, 9)
  assert.equal(overOctet[0].valid, false)
})

test('parses verified PubChem V2000 3D coordinates and rejects malformed records', () => {
  const waterSdf = [
    '962',
    '  -OEChem-10092614523D',
    '',
    '  3  2  0     0  0  0  0  0  0999 V2000',
    '    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
    '    0.2774    0.8929    0.2544 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '    0.6068   -0.2383   -0.7169 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '  1  2  1  0  0  0  0',
    '  1  3  1  0  0  0  0',
  ].join('\n')
  const structure = parsePubChemSdf(waterSdf)
  assert.deepEqual(structure.atoms.map(({ symbol }) => symbol), ['O', 'H', 'H'])
  assert.deepEqual(structure.bonds, [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }])
  assert.throws(() => parsePubChemSdf('invalid'))
})

test('validates connected organic structures and detects an alcohol/ether isomer pair', () => {
  const ethanolAtoms = ['C', 'C', 'O', 'H', 'H', 'H', 'H', 'H', 'H']
  const ethanolBonds = [
    { from: 0, to: 1, order: 1 },
    { from: 1, to: 2, order: 1 },
    { from: 2, to: 3, order: 1 },
    { from: 0, to: 4, order: 1 },
    { from: 0, to: 5, order: 1 },
    { from: 0, to: 6, order: 1 },
    { from: 1, to: 7, order: 1 },
    { from: 1, to: 8, order: 1 },
  ]
  const etherAtoms = ['C', 'O', 'C', 'H', 'H', 'H', 'H', 'H', 'H']
  const etherBonds = [
    { from: 0, to: 1, order: 1 },
    { from: 1, to: 2, order: 1 },
    { from: 0, to: 3, order: 1 },
    { from: 0, to: 4, order: 1 },
    { from: 0, to: 5, order: 1 },
    { from: 2, to: 6, order: 1 },
    { from: 2, to: 7, order: 1 },
    { from: 2, to: 8, order: 1 },
  ]
  const ethanol = { atoms: ethanolAtoms, bonds: ethanolBonds, formula: 'C2H6O' }
  const ether = { atoms: etherAtoms, bonds: etherBonds, formula: 'C2H6O' }

  assert.equal(isGraphConnected(ethanolAtoms, ethanolBonds), true)
  assert.ok(validateValences(ethanolAtoms, ethanolBonds).every(({ valid }) => valid))
  assert.ok(identifyFunctionalGroups(ethanolAtoms, ethanolBonds).includes('Alcohol'))
  assert.ok(identifyFunctionalGroups(etherAtoms, etherBonds).includes('Éter'))
  assert.equal(areGraphsIsomorphic(ethanol, ether), false)
  assert.equal(findStructuralIsomers(ethanol, [ether]).length, 1)
  assert.equal(isGraphConnected(['C', 'O'], []), false)
})
