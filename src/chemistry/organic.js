import { countsFromAtoms, formulaFromCounts } from './formulas.js'
import { ELEMENTS } from '../data/elements.js'

export const MAX_ORGANIC_ATOMS = 24
const ELEMENTS_BY_SYMBOL = Object.fromEntries(ELEMENTS.map((element) => [element.symbol, element]))

const MAX_VALENCE = {
  H: 1,
  B: 3,
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  P: 5,
  S: 6,
  Cl: 1,
  Br: 1,
  I: 1,
}

const VALENCE_ELECTRONS_BY_GROUP = {
  1: 1,
  2: 2,
  13: 3,
  14: 4,
  15: 5,
  16: 6,
  17: 7,
  18: 8,
}

function adjacencyList(atoms, bonds) {
  const adjacency = atoms.map(() => [])
  for (const bond of bonds) {
    if (
      !Number.isInteger(bond.from) ||
      !Number.isInteger(bond.to) ||
      bond.from < 0 ||
      bond.to < 0 ||
      bond.from >= atoms.length ||
      bond.to >= atoms.length ||
      bond.from === bond.to ||
      ![1, 2, 3].includes(bond.order)
    ) {
      continue
    }
    adjacency[bond.from].push({ atom: bond.to, order: bond.order })
    adjacency[bond.to].push({ atom: bond.from, order: bond.order })
  }
  return adjacency
}

export function validateValences(atoms, bonds) {
  const adjacency = adjacencyList(atoms, bonds)
  return atoms.map((symbol, index) => {
    const maximum = MAX_VALENCE[symbol]
    const used = adjacency[index].reduce((sum, bond) => sum + bond.order, 0)
    return {
      index,
      symbol,
      used,
      maximum: maximum ?? null,
      valid: maximum !== undefined && used <= maximum,
    }
  })
}

export function identifyFunctionalGroups(atoms, bonds) {
  const adjacency = adjacencyList(atoms, bonds)
  const labels = new Set()
  const attached = (atomIndex, symbol) =>
    adjacency[atomIndex].some((bond) => atoms[bond.atom] === symbol)
  const carbonylCarbons = new Set()

  for (let index = 0; index < atoms.length; index += 1) {
    if (atoms[index] !== 'C') continue
    const doubleOxygen = adjacency[index].some(
      (bond) => bond.order === 2 && atoms[bond.atom] === 'O',
    )
    if (!doubleOxygen) continue
    carbonylCarbons.add(index)
    const neighbors = adjacency[index].filter((bond) => bond.order === 1)
    if (neighbors.some((bond) => atoms[bond.atom] === 'N')) labels.add('Amida')
    else if (neighbors.some((bond) => atoms[bond.atom] === 'O')) {
      const singleOxygen = neighbors.find((bond) => atoms[bond.atom] === 'O')
      if (attached(singleOxygen.atom, 'H')) labels.add('Ácido carboxílico')
      else labels.add('Éster')
    } else {
      const carbonNeighbors = neighbors.filter((bond) => atoms[bond.atom] === 'C').length
      if (carbonNeighbors >= 2) labels.add('Cetona')
      else if (carbonNeighbors === 1 && attached(index, 'H')) labels.add('Aldehído')
      else labels.add('Grupo carbonilo')
    }
  }

  for (let index = 0; index < atoms.length; index += 1) {
    if (atoms[index] === 'O') {
      const neighbors = adjacency[index]
      if (
        neighbors.some((bond) => atoms[bond.atom] === 'H') &&
        neighbors.some((bond) => atoms[bond.atom] === 'C' && bond.order === 1) &&
        neighbors.every(
          (bond) =>
            bond.order === 1 &&
            (atoms[bond.atom] === 'H' ||
              (atoms[bond.atom] === 'C' && !carbonylCarbons.has(bond.atom))),
        ) &&
        neighbors.length <= 2
      ) {
        labels.add('Alcohol')
      }
      if (
        neighbors.length === 2 &&
        neighbors.every((bond) => atoms[bond.atom] === 'C' && bond.order === 1)
      ) {
        labels.add('Éter')
      }
    }

    if (
      atoms[index] === 'N' &&
      adjacency[index].some((bond) => atoms[bond.atom] === 'C') &&
      !adjacency[index].some((bond) => carbonylCarbons.has(bond.atom))
    ) {
      labels.add('Amina')
    }
  }

  for (const bond of bonds) {
    if (bond.order === 2 && atoms[bond.from] === 'C' && atoms[bond.to] === 'C') {
      labels.add('Alqueno')
    }
    if (bond.order === 3 && atoms[bond.from] === 'C' && atoms[bond.to] === 'C') {
      labels.add('Alquino')
    }
  }
  return [...labels]
}

function nodeSignature(index, atoms, adjacency) {
  return `${atoms[index]}:${adjacency[index]
    .map((bond) => `${bond.order}-${atoms[bond.atom]}`)
    .sort()
    .join(',')}`
}

export function areGraphsIsomorphic(first, second, stepLimit = 100000) {
  const firstAdjacency = adjacencyList(first.atoms, first.bonds)
  const secondAdjacency = adjacencyList(second.atoms, second.bonds)
  if (first.atoms.length !== second.atoms.length) return false

  const firstCounts = countsFromAtoms(first.atoms)
  const secondCounts = countsFromAtoms(second.atoms)
  if (formulaFromCounts(firstCounts) !== formulaFromCounts(secondCounts)) return false

  const firstSignatures = first.atoms.map((_, index) =>
    nodeSignature(index, first.atoms, firstAdjacency),
  )
  const secondSignatures = second.atoms.map((_, index) =>
    nodeSignature(index, second.atoms, secondAdjacency),
  )
  const candidates = first.atoms.map((_, index) =>
    second.atoms
      .map((__, candidate) => candidate)
      .filter((candidate) => firstSignatures[index] === secondSignatures[candidate]),
  )
  if (candidates.some((matches) => matches.length === 0)) return false

  const order = first.atoms
    .map((_, index) => index)
    .sort((left, right) => candidates[left].length - candidates[right].length)
  const mapping = Array(first.atoms.length).fill(-1)
  const used = new Set()
  let steps = 0
  let exceededLimit = false

  function hasBond(adjacency, left, right) {
    return adjacency[left].find((bond) => bond.atom === right)?.order ?? 0
  }

  function search(depth) {
    steps += 1
    if (steps > stepLimit) {
      exceededLimit = true
      return false
    }
    if (depth === order.length) return true

    const source = order[depth]
    for (const target of candidates[source]) {
      if (used.has(target)) continue
      const compatible = order.slice(0, depth).every((mappedSource) => {
        const mappedTarget = mapping[mappedSource]
        return (
          hasBond(firstAdjacency, source, mappedSource) ===
          hasBond(secondAdjacency, target, mappedTarget)
        )
      })
      if (!compatible) continue

      mapping[source] = target
      used.add(target)
      if (search(depth + 1)) return true
      used.delete(target)
      mapping[source] = -1
    }
    return false
  }

  const isomorphic = search(0)
  return exceededLimit ? null : isomorphic
}

export function findStructuralIsomers(structure, savedStructures) {
  const formula = formulaFromCounts(countsFromAtoms(structure.atoms))
  return savedStructures.filter((candidate) => {
    if (candidate.formula !== formula) return false
    return areGraphsIsomorphic(structure, candidate) === false
  })
}

export function isGraphConnected(atoms, bonds) {
  if (atoms.length === 0) return false
  const adjacency = adjacencyList(atoms, bonds)
  const visited = new Set([0])
  const pending = [0]
  while (pending.length) {
    for (const bond of adjacency[pending.pop()]) {
      if (visited.has(bond.atom)) continue
      visited.add(bond.atom)
      pending.push(bond.atom)
    }
  }
  return visited.size === atoms.length
}

export function formatGraphFormula(atoms) {
  return formulaFromCounts(countsFromAtoms(atoms))
}

export function removeGraphAtom(atoms, bonds, removedIndex) {
  const nextAtoms = atoms.filter((_, index) => index !== removedIndex)
  const nextBonds = bonds
    .filter((bond) => bond.from !== removedIndex && bond.to !== removedIndex)
    .map((bond) => ({
      ...bond,
      from: bond.from > removedIndex ? bond.from - 1 : bond.from,
      to: bond.to > removedIndex ? bond.to - 1 : bond.to,
    }))
  return { atoms: nextAtoms, bonds: nextBonds }
}

export function analyzeLewisStructure(atoms, bonds) {
  const adjacency = adjacencyList(atoms, bonds)
  return atoms.map((symbol, index) => {
    const element = ELEMENTS_BY_SYMBOL[symbol]
    const valenceElectrons = element
      ? VALENCE_ELECTRONS_BY_GROUP[element.group] ?? null
      : null
    const bondOrderTotal = adjacency[index].reduce((sum, bond) => sum + bond.order, 0)
    const loneElectrons =
      valenceElectrons === null ? null : valenceElectrons - bondOrderTotal
    const targetElectrons = symbol === 'H' || symbol === 'He' ? 2 : 8
    const shownElectrons =
      loneElectrons === null || loneElectrons < 0
        ? null
        : loneElectrons + bondOrderTotal * 2

    return {
      index,
      symbol,
      valenceElectrons,
      bondOrderTotal,
      loneElectrons,
      targetElectrons,
      shownElectrons,
      valid:
        valenceElectrons !== null &&
        loneElectrons >= 0 &&
        shownElectrons === targetElectrons,
      supported: valenceElectrons !== null,
    }
  })
}
