# Simulador Químico

Aplicación web educativa para explorar elementos, fórmulas, compuestos y cálculos químicos. La tabla periódica interactiva permanece visible mientras se trabaja en los distintos módulos. El proyecto está construido con React y Vite.

## Funcionalidades

- **Tabla periódica interactiva:** incluye los 118 elementos. Se pueden añadir átomos al módulo activo y consultar datos como configuración electrónica, electronegatividad y punto de fusión cuando están disponibles.
- **Matraz y síntesis:** busca en PubChem registros que coincidan con la fórmula exacta y muestra nombres, fórmulas e identificadores. Cada resultado puede ofrecer un visualizador molecular 3D si PubChem dispone de coordenadas para ese compuesto.
- **Nomenclatura inorgánica:** asigna nombres y estados de oxidación para las familias químicas implementadas.
- **Balanceo de ecuaciones:** calcula y permite practicar coeficientes estequiométricos, verificando la conservación de los átomos.
- **Clasificación de reacciones:** clasifica los tipos de reacción cubiertos por las reglas locales.
- **Estequiometría:** calcula masas molares, reactivo limitante, exceso y rendimiento teórico.
- **Soluciones:** calcula concentraciones y estimaciones de propiedades coligativas con los datos y supuestos ingresados.
- **Química orgánica:** permite construir algunas estructuras moleculares y reconocer grupos funcionales e isómeros dentro del alcance implementado.
- **Retos:** propone fórmulas objetivo y muestra el progreso durante la sesión.
- **Estructuras de Lewis:** permite crear enlaces y revisar el dueto/octeto en el modelo didáctico soportado.
- **Termoquímica:** consulta entalpías únicamente para las reacciones incluidas en el catálogo de referencia.
- **Cuaderno de laboratorio:** reúne resultados añadidos durante la sesión y permite imprimirlos o elegir “Guardar como PDF” en el diálogo del navegador.

## Ejecutar localmente

Se requiere Node.js y pnpm.

```bash
pnpm install
pnpm run dev
```

Vite mostrará la dirección local para abrir la aplicación. Otros comandos disponibles:

```bash
pnpm test
pnpm run lint
pnpm run build
pnpm run preview
```

## Persistencia de datos

La aplicación guarda en `localStorage` el trabajo de cada módulo, los átomos de cada matraz, los resultados y el progreso de los retos, además de las entradas del cuaderno y la última pestaña abierta. Los datos se restauran automáticamente al volver a abrir la aplicación en el mismo navegador y perfil. No se sincronizan entre dispositivos ni entre navegadores. Si el navegador bloquea el almacenamiento o se queda sin espacio, la aplicación muestra un aviso; en ese caso los cambios solo duran hasta cerrar o recargar la página.

## Alcance y consideraciones

El simulador es una herramienta educativa, no un predictor químico universal. Los módulos cubren familias y reglas específicas; una fórmula encontrada en PubChem no demuestra que una reacción ocurra. Las búsquedas en PubChem requieren conexión a internet. El visualizador 3D usa datos del conformero publicado, si está disponible; no inventa geometrías cuando faltan coordenadas.

El balanceador verifica la conservación de los átomos, pero su búsqueda automática está acotada. Las masas atómicas son valores de referencia, las cantidades presentadas pueden estar redondeadas y los resultados estequiométricos y de soluciones dependen de los datos y supuestos introducidos. Lewis aplica una comprobación didáctica limitada y la consulta termoquímica solo cubre las reacciones tabuladas en la aplicación. Consulta [SPEC.md](./SPEC.md) para más detalles sobre métodos, referencias y límites.
