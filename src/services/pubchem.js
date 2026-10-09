import { ELEMENTS } from '../data/elements.js'
import { SPANISH_COMPOUND_NAMES } from '../data/spanish-compound-names.js'

const PUG_REST_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const MAX_DISPLAYED_COMPOUNDS = 5

const ELEMENT_BY_SYMBOL = Object.fromEntries(
  ELEMENTS.map((element) => [element.symbol, element]),
)

export class PubChemApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PubChemApiError'
    this.status = status
  }
}

export function buildMolecularFormula(atomCounts) {
  const symbols = Object.keys(atomCounts)
  if (symbols.length === 0) {
    throw new Error('No hay átomos para consultar.')
  }

  const hasCarbon = Object.hasOwn(atomCounts, 'C')
  symbols.sort((left, right) => {
    if (hasCarbon) {
      if (left === 'C') return -1
      if (right === 'C') return 1
      if (left === 'H') return -1
      if (right === 'H') return 1
    }
    return left < right ? -1 : left > right ? 1 : 0
  })

  return symbols
    .map((symbol) => `${symbol}${atomCounts[symbol] > 1 ? atomCounts[symbol] : ''}`)
    .join('')
}

export function describeCompositionInSpanish(atomCounts) {
  const composition = Object.entries(atomCounts)
    .map(([symbol, count]) => {
      const element = ELEMENT_BY_SYMBOL[symbol]
      const atomLabel = count === 1 ? 'átomo' : 'átomos'
      return {
        name: element.name.toLocaleLowerCase('es'),
        description: `${count} ${atomLabel} de ${element.name.toLocaleLowerCase('es')}`,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
    .map((element) => element.description)

  if (composition.length < 2) return composition[0]
  return `${composition.slice(0, -1).join(', ')} y ${composition.at(-1)}`
}

async function fetchPubChemJson(path) {
  const response = await fetch(`${PUG_REST_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new PubChemApiError(`PubChem respondió con estado HTTP ${response.status}.`, response.status)
  }

  return response.json()
}

export async function findCompoundsByFormula(atomCounts) {
  const formula = buildMolecularFormula(atomCounts)
  const encodedFormula = encodeURIComponent(formula)
  const searchResponse = await fetch(`${PUG_REST_URL}/compound/fastformula/${encodedFormula}/cids/JSON`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })

  if (searchResponse.status === 404) {
    return { formula, total: 0, compounds: [] }
  }
  if (!searchResponse.ok) {
    throw new PubChemApiError(
      `PubChem respondió con estado HTTP ${searchResponse.status}.`,
      searchResponse.status,
    )
  }

  const searchData = await searchResponse.json()
  const cids = searchData?.IdentifierList?.CID
  if (!Array.isArray(cids)) {
    throw new Error('La respuesta de búsqueda de PubChem no contiene una lista de compuestos.')
  }

  const displayedCids = cids.slice(0, MAX_DISPLAYED_COMPOUNDS)
  if (displayedCids.length === 0) {
    return { formula, total: 0, compounds: [] }
  }

  const propertyData = await fetchPubChemJson(
    `/compound/cid/${displayedCids.join(',')}/property/Title,MolecularFormula,IUPACName/JSON`,
  )
  const properties = propertyData?.PropertyTable?.Properties
  if (!Array.isArray(properties)) {
    throw new Error('La respuesta de detalles de PubChem no contiene propiedades de compuestos.')
  }

  return {
    formula,
    total: cids.length,
    compounds: properties.map((compound) => ({
      cid: compound.CID,
      name: compound.Title || compound.IUPACName || `Compuesto CID ${compound.CID}`,
      spanishName: SPANISH_COMPOUND_NAMES[compound.CID] ?? null,
      iupacName: compound.IUPACName,
      formula: compound.MolecularFormula || formula,
      compositionEs: describeCompositionInSpanish(atomCounts),
    })),
  }
}

export function parsePubChemSdf(sdf) {
  const lines = String(sdf).split(/\r?\n/)
  const counts = lines[3]
  if (!counts?.includes('V2000')) {
    throw new Error('PubChem devolvió un modelo 3D en un formato no compatible.')
  }

  const atomCount = Number(counts.slice(0, 3).trim())
  const bondCount = Number(counts.slice(3, 6).trim())
  if (
    !Number.isInteger(atomCount) ||
    atomCount < 1 ||
    !Number.isInteger(bondCount) ||
    bondCount < 0 ||
    atomCount > 500
  ) {
    throw new Error('El registro 3D de PubChem contiene cantidades de átomos o enlaces no válidas.')
  }

  const atoms = lines.slice(4, 4 + atomCount).map((line) => {
    const coordinates = [line.slice(0, 10), line.slice(10, 20), line.slice(20, 30)].map(Number)
    const symbol = line.slice(31, 34).trim()
    if (!coordinates.every(Number.isFinite) || !ELEMENT_BY_SYMBOL[symbol]) {
      throw new Error('El registro 3D de PubChem contiene coordenadas o símbolos no válidos.')
    }
    return { symbol, x: coordinates[0], y: coordinates[1], z: coordinates[2] }
  })
  const bonds = lines.slice(4 + atomCount, 4 + atomCount + bondCount).map((line) => {
    const from = Number(line.slice(0, 3).trim()) - 1
    const to = Number(line.slice(3, 6).trim()) - 1
    const order = Number(line.slice(6, 9).trim())
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to < 0 ||
      from >= atomCount ||
      to >= atomCount ||
      ![1, 2, 3].includes(order)
    ) {
      throw new Error('El registro 3D de PubChem contiene enlaces no válidos.')
    }
    return { from, to, order }
  })

  return { atoms, bonds }
}

export async function fetchPubChem3DStructure(cid) {
  if (!Number.isSafeInteger(cid) || cid <= 0) {
    throw new Error('El identificador CID de PubChem no es válido.')
  }
  const response = await fetch(
    `${PUG_REST_URL}/compound/cid/${cid}/SDF?record_type=3d`,
    {
      headers: { Accept: 'chemical/x-mdl-sdfile, text/plain' },
      signal: AbortSignal.timeout(15000),
    },
  )
  if (!response.ok) {
    throw new PubChemApiError(
      response.status === 404
        ? `PubChem no tiene coordenadas 3D disponibles para el CID ${cid}.`
        : `PubChem respondió con estado HTTP ${response.status} al solicitar el modelo 3D.`,
      response.status,
    )
  }
  return parsePubChemSdf(await response.text())
}
