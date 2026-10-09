# Plan general del simulador químico

## Objetivo

Mantener confiables y explícitos los cálculos existentes e implementar las seis nuevas funcionalidades de `SPEC.md` con límites científicos claros. La implementación inicial y sus pruebas ya están realizadas; se enumeran también los límites que permanecen.

## Trabajo realizado

- **Balanceo:** reemplazar la reducción con coma flotante por operaciones con fracciones racionales enteras. Comprobar exactamente que cada elemento se conserva y rechazar coeficientes fuera del rango entero seguro.
- **Alcance del balanceador:** limitar la búsqueda automática a cinco variables libres con valores de búsqueda entre 1 y 8. Un fallo de búsqueda no prueba que una ecuación sea imposible y, con varias soluciones, no se garantiza el mínimo global. Informar este límite en la interfaz.
- **Estequiometría:** interpretar las masas decimales como fracciones exactas; comparar reactivos limitantes sin tolerancias flotantes y calcular exceso, producto teórico y rendimiento porcentual desde esas fracciones.
- **Soluciones:** calcular concentraciones y propiedades coligativas con aritmética racional sobre las entradas decimales. Comparar solubilidad sin tolerancias arbitrarias y no presentar el exceso del límite como prueba de supersaturación o de una cantidad disuelta en equilibrio.
- **Fórmulas:** rechazar paréntesis vacíos, cantidades de átomos no seguras y entradas que excedan los límites numéricos.
- **Datos de masa:** documentar la referencia [CIAAW/IUPAC](https://ciaaw.org/atomic-weights.htm) y diferenciar pesos atómicos estándar de números másicos de isótopos representativos.
- **Presentación:** convertir los resultados racionales a números para la UI y mostrar hasta seis decimales; señalar que ese redondeo es de presentación y que los datos químicos son referencias.
- **Pruebas:** añadir regresiones para decimales cercanos, límites de búsqueda, coeficientes grandes, parser, masas y comparación de solubilidad.

## Funcionalidades nuevas implementadas (alcance inicial)

### Fase 1: datos y consulta del elemento

- **Tarjetas dinámicas de elementos:** hay un panel por elemento con configuración electrónica, electronegatividad de Pauling, punto de fusión y distribución de electrones por capas en un modelo de Bohr animado y simplificado. Los datos para los 118 elementos proceden de [Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON); los campos ausentes se muestran como no disponibles. Hay botón accesible y apertura por menú contextual.

### Fase 2: aprendizaje y representación química

- **Modo Retos:** una pestaña asigna aleatoriamente siete composiciones objetivo y muestra coincidencia inmediata; el progreso se mantiene durante la sesión. Completar la fórmula es un reto educativo y no prueba una reacción.
- **Pizarra de Lewis:** lienzo SVG para arrastrar o mover átomos con flechas, añadir enlaces simples/dobles/triples mediante controles y validar dueto/octeto para átomos neutros de grupos principales. Los enlaces que exceden el modelo se rechazan con explicación.

### Fase 3: evidencias físicas y geometría

- **Termodinámica:** el matraz y el clasificador permiten consultar ecuaciones; el catálogo inicial cubre la formación de vapor de agua, ΔH = −483,6528 kJ por ecuación balanceada a 298,15 K y 1 bar, con fuente NIST. El termómetro comunica el signo y no predice una temperatura final. Las reacciones no cubiertas no reciben una estimación.
- **Visor molecular 3D:** cada registro de PubChem permite solicitar su conformero 3D por CID. Un visor SVG de esferas y varillas ofrece rotación y zoom con ratón/teclado. Si PubChem no dispone de coordenadas, se explica la ausencia; no se construye geometría inventada. No se añadió una dependencia 3D.

### Fase 4: exportación

- **Cuaderno de laboratorio:** los módulos registran explícitamente resultados computados en la sesión y una hoja de impresión compila esos registros con advertencias. El usuario puede elegir “Guardar como PDF” desde el diálogo del navegador; exportar no modifica los resultados.

### Orden ejecutado y validación

1. Agregar datos de elementos con fuente y valores ausentes explícitos.
2. Implementar el panel de información, las misiones y la pizarra SVG.
3. Implementar la búsqueda de conformeros 3D PubChem y el catálogo termoquímico acotado.
4. Conectar resultados de módulos al cuaderno de impresión/PDF del navegador.
5. Agregar pruebas del núcleo y verificar las interacciones principales en navegador.
6. Validar con `pnpm test`, `pnpm run lint` y `pnpm run build`.

**Criterio de alcance:** las seis propuestas tienen una versión inicial funcional, no una cobertura química universal. La tabla periódica permanece visible durante el uso de cada pestaña.

## Archivos principales

- `src/chemistry/rational.js`
- `src/chemistry/balance.js`
- `src/chemistry/formulas.js`
- `src/chemistry/stoichiometry.js`
- `src/chemistry/solutions.js`
- `src/data/atomic-properties.js`
- `src/data/element-facts.json`
- `src/chemistry/reactions.js`
- `src/chemistry/organic.js`
- `src/services/pubchem.js`
- `src/components/MolecularViewer3D.jsx`
- `src/components/ThermochemistryResult.jsx`
- `src/components/modules/ChallengesModule.jsx`
- `src/components/modules/LewisModule.jsx`
- `src/components/PeriodicTable.jsx`
- `src/App.jsx`
- `src/components/modules/EquationBalancerModule.jsx`
- `src/components/modules/StoichiometryModule.jsx`
- `src/components/modules/SolutionsModule.jsx`
- `tests/chemistry.test.js`
- `SPEC.md`

## Límites que permanecen

- Los pesos atómicos de referencia no determinan la masa isotópica exacta de una muestra.
- El rendimiento estequiométrico es teórico y no considera pérdidas, impurezas ni condiciones experimentales.
- Las propiedades coligativas son aproximaciones para soluciones ideales diluidas.
- Una solubilidad aislada ingresada por el usuario no representa una curva dependiente de temperatura ni un cálculo de equilibrio.
- El balanceador es exacto al verificar candidatos, pero su búsqueda está acotada y no certifica que encontró una solución para toda ecuación o el mínimo global entre múltiples soluciones.
- La aritmética racional evita errores binarios intermedios; la conversión final a `Number` y el formato de hasta seis decimales son necesariamente aproximaciones de presentación.

## Validación

- `pnpm test`
- `pnpm run lint`
- `pnpm run build`
