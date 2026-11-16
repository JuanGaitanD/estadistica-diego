# ADR-004 · La interpretación va primero y la redacta el dominio

Fecha: 2026-11-16. Estado: aceptado.

## Contexto

Juan fijó el principio rector de la plataforma: frente a la persona va primero **qué significa el resultado**, en lenguaje llano y con la conclusión práctica; el paso a paso y las fórmulas quedan ocultos por defecto («Ver cómo se calculó»). La misma frase tiene que salir en pantalla, en el PDF y en el Excel.

## Decisión

1. Todo resultado del motor lleva `interpretation: Interpretation` (`headline`, `details`, `caveats`) y, cuando hay cálculo que enseñar, `steps: CalculationStep[]` (título, texto, fórmula con los números sustituidos, tabla de trabajo, fórmula de Excel). Tipos en `src/core/statistics/types.ts`.
2. Las frases las genera `src/core/statistics/interpretation/*` con **reglas deterministas** y umbrales declarados en el código (sin IA): son testeables y no inventan.
3. **Excepción a «nada de redondeo en `core`»** (docs/02 §3): los valores de las métricas siguen sin redondear, pero los números que van **dentro de frases** y tablas de trabajo se formatean en el dominio con `interpretation/text.ts` (es-CO, coma decimal, mismos decimales que la pantalla). Sin esto, pantalla y PDF podrían redactar cifras distintas.
4. Presentación: la interpretación es lo primero de cada bloque; el paso a paso va en un `<details>` cerrado. En el informe, el paso a paso solo entra si la persona lo marca.

## Consecuencias

- Cada módulo nuevo (probabilidad, pruebas, regresiones) se acepta solo con su interpretación probada en tests.
- Los umbrales (sesgo 0,1 desviaciones; CV 15 % y 30 %; muestra pequeña n < 10) son opinables y se cambian en un solo sitio.
