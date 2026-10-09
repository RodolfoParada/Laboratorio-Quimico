import { ELEMENTS } from './elements.js'

export const ATOMIC_MASS_REFERENCE = {
  organization: 'CIAAW / IUPAC',
  name: 'Standard Atomic Weights',
  url: 'https://ciaaw.org/atomic-weights.htm',
  edition: '2021 report; revisions for Gd, Lu and Zr published in 2024',
  note:
    'Values are reference atomic weights, not exact masses for every sample. For radioactive elements without a standard atomic weight, the table uses a representative isotope mass number.',
}

const atomicMasses = [
  1.008, 4.002602, 6.94, 9.0121831, 10.81, 12.011, 14.007, 15.999, 18.998403, 20.1797,
  22.989769, 24.305, 26.981538, 28.085, 30.973762, 32.06, 35.45, 39.948, 39.0983, 40.078,
  44.955908, 47.867, 50.9415, 51.9961, 54.938044, 55.845, 58.933194, 58.6934, 63.546, 65.38,
  69.723, 72.63, 74.921595, 78.971, 79.904, 83.798, 85.4678, 87.62, 88.90584, 91.222,
  92.90637, 95.95, 98, 101.07, 102.9055, 106.42, 107.8682, 112.414, 114.818, 118.71,
  121.76, 127.6, 126.90447, 131.293, 132.90545, 137.327, 138.90547, 140.116, 140.90766, 144.242,
  145, 150.36, 151.964, 157.249, 158.92535, 162.5, 164.93033, 167.259, 168.93422, 173.045,
  174.96669, 178.49, 180.94788, 183.84, 186.207, 190.23, 192.217, 195.084, 196.96657, 200.592,
  204.38, 207.2, 208.9804, 209, 210, 222, 223, 226, 227, 232.0377,
  231.03588, 238.02891, 237, 244, 243, 247, 247, 251, 252, 257,
  258, 259, 266, 267, 268, 269, 270, 277, 278, 281,
  282, 285, 286, 289, 290, 293, 294, 294,
]

const commonOxidationStates = {
  H: [1, -1], He: [0], Li: [1], Be: [2], B: [3, -3], C: [-4, 4, 2],
  N: [-3, 3, 5, 1, 2, 4], O: [-2, -1, 1, 2], F: [-1], Ne: [0],
  Na: [1], Mg: [2], Al: [3], Si: [4, -4, 2], P: [-3, 3, 5],
  S: [6, 4, -2, 2], Cl: [-1, 1, 3, 5, 7], Ar: [0],
  K: [1], Ca: [2], Sc: [3], Ti: [4, 3, 2], V: [5, 4, 3, 2],
  Cr: [3, 6, 2], Mn: [2, 4, 7, 3, 6], Fe: [2, 3], Co: [2, 3],
  Ni: [2, 3], Cu: [2, 1], Zn: [2], Ga: [3], Ge: [4, 2],
  As: [-3, 3, 5], Se: [-2, 4, 6], Br: [-1, 1, 3, 5, 7], Kr: [0, 2],
  Rb: [1], Sr: [2], Y: [3], Zr: [4], Nb: [5, 3],
  Mo: [6, 4, 2], Tc: [7, 4], Ru: [3, 4, 8], Rh: [3], Pd: [2, 4],
  Ag: [1], Cd: [2], In: [3, 1], Sn: [2, 4], Sb: [-3, 3, 5],
  Te: [-2, 4, 6], I: [-1, 1, 5, 7], Xe: [0, 2, 4, 6, 8],
  Cs: [1], Ba: [2], La: [3], Ce: [3, 4], Pr: [3, 4],
  Nd: [3], Pm: [3], Sm: [3, 2], Eu: [3, 2], Gd: [3],
  Tb: [3, 4], Dy: [3], Ho: [3], Er: [3], Tm: [3, 2],
  Yb: [3, 2], Lu: [3], Hf: [4], Ta: [5], W: [6, 4],
  Re: [7, 6, 4], Os: [4, 8, 2, 3], Ir: [3, 4], Pt: [2, 4],
  Au: [3, 1], Hg: [2, 1], Tl: [1, 3], Pb: [2, 4], Bi: [3, 5],
  Po: [2, 4, 6], At: [-1, 1, 3, 5, 7], Rn: [0],
  Fr: [1], Ra: [2], Ac: [3], Th: [4], Pa: [5, 4],
  U: [6, 4, 3, 5], Np: [5, 4, 6, 3], Pu: [4, 3, 6, 5],
  Am: [3, 4, 5, 6], Cm: [3, 4], Bk: [3, 4], Cf: [3, 2, 4],
  Es: [3], Fm: [3], Md: [3, 2], No: [2, 3], Lr: [3],
  Rf: [4], Db: [5], Sg: [6], Bh: [7], Hs: [8],
  Mt: [1, 3], Ds: [2, 4], Rg: [1, 3], Cn: [2],
  Nh: [1, 3], Fl: [2, 4], Mc: [1, 3], Lv: [2, 4],
  Ts: [-1, 1, 3, 5], Og: [0],
}

if (atomicMasses.length !== ELEMENTS.length) {
  throw new Error('La tabla de masas atómicas no coincide con la tabla periódica.')
}

const representativeIsotopeMassNumbers = new Set([
  43, 61, 84, 85, 86, 87, 88, 89, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103,
  104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
])

export const ATOMIC_PROPERTIES = Object.fromEntries(
  ELEMENTS.map((element, index) => [
    element.symbol,
    {
      atomicMass: atomicMasses[index],
      atomicMassKind: representativeIsotopeMassNumbers.has(element.atomicNumber)
        ? 'representative-isotope-mass-number'
        : 'standard-atomic-weight',
      oxidationStates: commonOxidationStates[element.symbol] ?? [],
    },
  ]),
)
