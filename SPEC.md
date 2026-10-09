#reglas

#Consulta de Compuestos con PubChem: La aplicación consulta la API pública PUG REST usando la fórmula molecular exacta del matraz (`/compound/fastformula/{formula}/cids/JSON`) y obtiene los nombres, fórmulas e identificadores CID de los resultados. Los nombres españoles conocidos se presentan desde un catálogo local asociado a CID; para los demás, se muestra la composición elemental en español y el nombre original de PubChem como referencia. No requiere clave, pero sí conexión a internet y debe respetar los límites de uso recomendados por PubChem. Es un catálogo muy amplio, no una garantía de que incluya todos los compuestos existentes. Una coincidencia de fórmula solo confirma que hay registros con esa composición: no demuestra que la reacción ocurra ni distingue necesariamente isómeros. La interfaz muestra hasta cinco registros por consulta y enlaza a sus fichas en PubChem.

#Algoritmo de Balanceo Estequiométrico: Puedes programar un solucionador algebraico (utilizando métodos como la eliminación de Gauss-Jordan) directamente en una función utilitaria de JavaScript que iguale las matrices de los reactantes y productos cada vez que el usuario modifique el matraz.

#Reconocimiento de Estructuras (Grafos): Para el módulo de química orgánica y las isometrías, puedes representar las moléculas construidas por el usuario como grafos, donde los nodos son los átomos y las aristas son los enlaces. Un algoritmo de búsqueda transversal en el cliente puede recorrer estas estructuras para identificar grupos funcionales (como alcoholes o cetonas) y alertar si dos configuraciones distintas son isómeros.

#Cálculos Físico-Químicos: Las determinaciones de masas molares, reactivo limitante, molaridad y propiedades coligativas son operaciones matemáticas directas. Se procesan instantáneamente en el cliente tomando los inputs del usuario y actualizando el estado de los componentes.

#Evidencias Visuales de Reacción: Las animaciones del matraz (cambios de color, formación de precipitados o burbujeo) deben activarse solo cuando el motor de reacción verifique un producto y sus condiciones. Una coincidencia de fórmula devuelta por PubChem, por sí sola, no demuestra que una reacción haya ocurrido.


*funciones
Módulo de Nomenclatura Inorgánica: El simulador puede asignar automáticamente nombres según la nomenclatura de Stock y sistemática a los compuestos binarios y ternarios que el usuario genere al combinar átomos. Para lograr esto, el sistema debe calcular y mostrar de manera gráfica el número de oxidación con el que actúa cada elemento en el compuesto formado.

Motor de Balanceo de Ecuaciones: Puedes incorporar una función interactiva basada en la ley de conservación de la materia, donde el usuario deba agregar coeficientes estequiométricos para equilibrar las reacciones que genere. El simulador validará el ejercicio solo cuando la masa y la cantidad total de átomos de los reactantes sean exactamente iguales a las de los productos.


Clasificador de Reacciones y Evidencias Visuales: El sistema puede clasificar automáticamente las reacciones simuladas como procesos de síntesis, descomposición, sustitución o doble sustitución. Como respuesta visual, puedes incluir animaciones gráficas en el matraz que representen evidencias de que ocurrió una reacción, tales como el desprendimiento de gases, cambios de color o la formación de sólidos insolubles (precipitados).

Calculadora Estequiométrica: Puedes añadir un panel para que el usuario ingrese una cantidad de masa inicial (en gramos) para sus reactantes, logrando que el sistema calcule automáticamente las masas molares utilizando los pesos de la tabla periódica. A partir de estos datos, el simulador puede determinar de forma matemática cuál es el reactivo limitante, calcular la masa sobrante del reactivo en exceso y proyectar el rendimiento teórico de la síntesis.

Laboratorio de Soluciones Químicas: Apoyándote en los contenidos de "quimica.pdf", puedes agregar un modo donde el matraz funcione para disolver solutos en solventes líquidos, calculando su concentración en tiempo real utilizando unidades físicas y químicas como Molaridad, % m/m, % m/V y % V/V. El simulador podría indicar el estado de saturación de la mezcla (insaturada, saturada o sobresaturada) dependiendo de la cantidad de soluto y la temperatura. También podrías simular propiedades coligativas, mostrando gráficamente cómo disminuye el punto de congelación o aumenta el punto de ebullición del solvente al añadir más átomos.

Constructor de Química Orgánica: Puedes expandir el motor del simulador para permitir la formación de cadenas carbonadas complejas e hidrocarburos (alifáticos, alicíclicos y aromáticos). El motor de síntesis podría programarse para identificar grupos funcionales oxigenados y nitrogenados (como alcoholes, cetonas, ésteres o aminas) y alertar al usuario cuando dos de sus creaciones presenten isomería estructural o espacial, es decir, cuando tengan la misma fórmula molecular pero distinta distribución geométrica.

#Estado de implementación

Las funciones interactivas se organizan en pestañas: Matraz/Síntesis, Nomenclatura, Balanceo, Clasificación, Estequiometría, Soluciones, Química Orgánica, Retos y Lewis. La pestaña de Matraz/Síntesis incluye consultas termoquímicas. La tabla periódica completa permanece junto al módulo activo en pantallas amplias y encima de los módulos en pantallas estrechas; cada elemento tiene una acción de información además de la acción para añadirlo. Cada pestaña conserva su composición y los datos de trabajo mientras se navega entre ellas. Los resultados de operaciones exitosas se pueden agregar al cuaderno de sesión e imprimir/guardar como PDF desde el navegador.

Los motores locales cubren las familias de fórmulas, ecuaciones y estructuras indicadas por la interfaz; no constituyen predictores químicos universales. La nomenclatura solo asigna nombres a reglas y familias expresamente implementadas. La clasificación y las evidencias posibles usan catálogos limitados y no certifican que una reacción ocurra. Las propiedades coligativas son aproximaciones para soluciones ideales diluidas; la comparación de saturación requiere que el usuario ingrese una solubilidad aplicable a su temperatura. El constructor orgánico compara grafos explícitos y detecta algunos grupos funcionales, pero no modela aromaticidad, cargas ni estereoquímica. La búsqueda de isómeros compara estructuras guardadas en la pestaña actual. Retos valida la fórmula objetivo, no una reacción. Lewis verifica solo dueto/octeto de átomos neutros de grupos principales. La consulta termoquímica solo contiene datos para una reacción documentada y no calcula la temperatura final. El modelo 3D muestra coordenadas de PubChem cuando están disponibles. La información periódica puede tener campos no disponibles; el modelo de Bohr es didáctico.

Las pruebas de regresión del núcleo químico se ejecutan con `pnpm test`.

#Precisión numérica y límites

El balanceo convierte la matriz de composición a fracciones racionales con enteros grandes, y comprueba exactamente la conservación de los átomos. La búsqueda automática está limitada a cinco variables libres y prueba valores de 1 a 8 para cada variable; si no encuentra una solución, informa que el resultado está fuera del alcance buscado, no que la reacción sea imposible. Cuando hay varias soluciones, el algoritmo no garantiza el mínimo global. La validación manual compara coeficientes enteros seguros exactamente.

Las entradas decimales de estequiometría y soluciones se procesan como fracciones decimales exactas mientras se calcula. La interfaz convierte los resultados a números de JavaScript y muestra hasta seis decimales; por tanto, la presentación está redondeada. Los coeficientes y cantidades que exceden el rango seguro o representable se rechazan explícitamente.

Las masas atómicas son valores de referencia [CIAAW/IUPAC](https://ciaaw.org/atomic-weights.htm) —tabla de pesos atómicos estándar basada en el informe de 2021 y revisiones de 2024 para Zr, Gd y Lu—, no masas exactas de una muestra. Para elementos sin peso atómico estándar disponible se usa un número másico isotópico representativo. La composición isotópica real puede cambiar las masas molares.

La estequiometría calcula rendimientos teóricos bajo conversión completa del reactivo limitante y no incluye pérdidas experimentales. Las propiedades coligativas siguen siendo aproximaciones de soluciones ideales diluidas. La solubilidad ingresada permite comparar una cantidad con un límite de referencia, pero no determina cuánto soluto se disuelve realmente ni permite inferir supersaturación sin datos adicionales de equilibrio y temperatura.



## Estado de nuevas funcionalidades

Las seis propuestas cuentan ahora con una implementación inicial accesible desde la interfaz; sus alcances científicos y funcionales están acotados:

1. **Visualizador molecular 3D:** cada resultado de PubChem ofrece un botón para cargar el conformero 3D del CID elegido. Se puede rotar con arrastre o flechas del teclado y acercar con rueda o teclas +/−. Las coordenadas y enlaces provienen del SDF 3D de PubChem; si no existe un conformero, se muestra el error de disponibilidad en vez de inventar una geometría. Al haber varios compuestos con la misma fórmula, el usuario elige el CID.
2. **Modo Retos:** la pestaña `Retos` asigna aleatoriamente una de siete composiciones objetivo y verifica la fórmula al instante. El avance se conserva durante la sesión. La coincidencia de composición es una actividad educativa y no demuestra que una reacción ocurra.
3. **Termodinámica:** la pestaña `Matraz / Síntesis` y la de clasificación permiten consultar una ecuación. Solo está tabulada la formación de vapor de agua `2 H2 + O2 → 2 H2O`, con ΔH = −483,6528 kJ por ecuación balanceada, a 298,15 K y 1 bar; el termómetro animado comunica el signo, no calcula una temperatura final. Las reacciones sin datos muestran que no hay estimación.
4. **Pizarra de Lewis:** la pestaña `Lewis` muestra electrones de valencia en un lienzo SVG. Los átomos se pueden arrastrar o mover con flechas; controles accesibles conectan enlaces simples, dobles o triples. La validación de dueto/octeto cubre átomos neutros de grupos principales; no modela cargas formales, resonancia ni todas las excepciones.
5. **Información de elementos:** el botón de información de cada elemento, y el menú contextual, abren configuración electrónica, electronegatividad de Pauling, punto de fusión y un modelo de Bohr animado y simplificado. Los datos disponibles para los 118 elementos se atribuyen a [Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON); valores ausentes se muestran como no disponibles. La animación de Bohr no representa orbitales reales.
6. **Cuaderno de laboratorio:** los resultados registrados por los módulos aparecen en un informe de sesión. `Imprimir / guardar PDF` abre el diálogo de impresión del navegador; el usuario puede elegir “Guardar como PDF”. El informe solo incluye operaciones registradas durante la sesión actual, no es almacenamiento persistente ni una exportación silenciosa.

La tabla periódica permanece visible junto al módulo activo. Las implementaciones no agregan dependencias: los visores y el lienzo usan SVG y el PDF se obtiene mediante la función de impresión del navegador.