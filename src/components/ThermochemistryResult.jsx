export default function ThermochemistryResult({ thermochemistry }) {
  if (!thermochemistry) return null
  const enthalpy = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 })
    .format(thermochemistry.deltaH)
  return (
    <div className={`thermo-result ${thermochemistry.deltaH < 0 ? 'thermo-exothermic' : 'thermo-endothermic'}`}>
      <svg aria-hidden="true" viewBox="0 0 34 76">
        <rect height="52" rx="9" width="14" x="10" y="5" />
        <circle cx="17" cy="60" r="12" />
        <rect height="30" rx="5" width="6" x="14" y="27" />
        <circle className="thermo-fluid" cx="17" cy="60" r="8" />
        <rect className="thermo-column" height="27" rx="3" width="4" x="15" y="31" />
      </svg>
      <div>
        <strong>{thermochemistry.deltaH < 0 ? 'Exotérmica' : 'Endotérmica'} según datos estándar</strong>
        <p>ΔH = {enthalpy} {thermochemistry.unit}</p>
        <p>{thermochemistry.note} {thermochemistry.conditions}.</p>
        <a href={thermochemistry.source} rel="noreferrer" target="_blank">Fuente termoquímica: NIST Chemistry WebBook</a>
        <p className="tool-result-caption">El indicador visual muestra el signo de ΔH; no predice la temperatura final ni confirma que la reacción ocurra.</p>
      </div>
    </div>
  )
}
