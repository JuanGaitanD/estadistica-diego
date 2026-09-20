# ADR-003 — Fórmulas estadísticas exactas

- **Estado:** aceptado (sujeto a confirmación del profesor en los puntos marcados con ❓, ver 01-requisitos §6)
- **Fecha:** 2026-09-19

Este documento fija, sin ambigüedad, qué fórmula implementa cada función de `src/core/statistics`. Es la referencia contra la que se escriben los tests. Notación: muestra ordenada `x(1) <= x(2) <= … <= x(n)`, datos crudos `x1..xn`.

---

## 1. Frecuencias

- Absoluta: `fi = #{ j : xj pertenece a la clase i }`
- Relativa: `hi = fi / n`
- Porcentual: `pi = 100 · hi`
- Acumuladas: `Fi = suma de f1..fi`, `Hi = Fi / n`
- `n` es el **n efectivo** de la variable tras excluir faltantes (RF-07).
- El dominio devuelve siempre `hi` como proporción; el porcentaje es una transformación de presentación. Nunca se muestran ambas a la vez (RF-15).

## 2. Agrupación en intervalos

### 2.1 Número de clases K

Por defecto **Sturges**:

```
K = techo(1 + log2(n))
```

Alternativas seleccionables:

| Regla             | Fórmula                                                   | Cuándo conviene                                                |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Raíz              | `K = techo(sqrt(n))`                                      | Muy usada en manuales; da más clases que Sturges para n grande |
| Rice              | `K = techo(2 · n^(1/3))`                                  | Menos conservadora que Sturges con n grande                    |
| Scott             | ancho `h = 3.49 · s · n^(-1/3)`, luego `K = techo(R / h)` | Datos aproximadamente normales                                 |
| Freedman–Diaconis | ancho `h = 2 · RIC · n^(-1/3)`, luego `K = techo(R / h)`  | Robusta ante atípicos y asimetría                              |
| Manual            | el usuario fija K                                         | Reproducir un ejercicio de clase                               |

Reglas de guarda: `K` se acota a `[2, 50]`. Si Scott o FD dan `h = 0` (s = 0 o RIC = 0), se cae a Sturges con aviso. La regla efectivamente usada se imprime junto a la tabla (RF-17).

### 2.2 Longitud de intervalo l

```
R = máximo − mínimo            (rango)
l_bruto = R / K
l = redondeoArriba(l_bruto, d)   con d = nº de decimales detectado en los datos
```

Se redondea **hacia arriba** a la precisión de los datos para que las K clases cubran todo el recorrido (`K · l >= R`). Si `R = 0` (todos los valores iguales) se genera una única clase degenerada con aviso.

### 2.3 Límites

- Límite inferior de la primera clase: `Li(1) = mínimo` ❓ (alternativa docente: redondear hacia abajo).
- `Li(i+1) = Ls(i)`, `Ls(i) = Li(i) + l`
- Convención de cierre: **`[Li, Ls)`**, con la última clase cerrada `[Li, Ls]` para no perder el máximo ❓ (conmutable a `(Li, Ls]`).
- Marca de clase: `xi = (Li + Ls) / 2`

## 3. Tendencia central

### 3.1 Media aritmética

```
x̄ = (1/n) · Σ xi
```

Implementada con suma compensada de Neumaier. Dominio: cualquier número real. Solo cuantitativas.

Sobre datos agrupados (cuando no se conservan los crudos): `x̄ = Σ (fi · xi) / n`, con `xi` la marca de clase. Se muestra etiquetada como _aproximación por datos agrupados_.

### 3.2 Media ponderada

```
x̄_w = Σ (wi · xi) / Σ wi
```

- Requiere `wi >= 0` y `Σ wi > 0`; con algún `wi < 0` o `Σ wi = 0` se devuelve `null` con `unavailableReason`.
- Los pesos **no se normalizan**: la fórmula ya divide por `Σ wi`.
- Fuentes de pesos: columna del dataset, lista manual de igual longitud, o las frecuencias (RF-20).

### 3.3 Media geométrica

```
G = (Π xi)^(1/n)   =   exp( (1/n) · Σ ln(xi) )
```

- **Dominio válido: todos los `xi > 0`.** Con algún valor <= 0 se devuelve `null` explicando que la media geométrica no está definida.
- Se calcula en el espacio logarítmico para evitar desbordamiento y pérdida de precisión del producto.
- Uso recomendado en el microtexto: tasas de crecimiento, índices, razones encadenadas.

### 3.4 Media armónica

```
H = n / Σ (1/xi)
```

- **Dominio válido: todos los `xi` distintos de 0**; además se exige el mismo signo (en la práctica, todos > 0) para que el resultado sea interpretable. En otro caso, `null` con motivo.
- Relación garantizada y verificada en tests para datos positivos no todos iguales: `H < G < x̄`.

### 3.5 Mediana

Datos crudos, muestra ordenada:

```
n impar:  Me = x((n+1)/2)
n par:    Me = ( x(n/2) + x(n/2 + 1) ) / 2
```

Equivale al percentil 50 por R-7, y así se implementa (una sola ruta de código).

Datos agrupados (mostrada en paralelo cuando hay intervalos):

```
Me = Li + ( (n/2 − F_{i−1}) / f_i ) · l
```

donde `i` es la primera clase cuyo `Fi >= n/2`, `Li` su límite inferior, `F_{i−1}` la acumulada previa, `f_i` su frecuencia y `l` la amplitud de esa clase.

Para variables **ordinales** se usa la mediana posicional sobre el orden declarado; con n par se devuelve la categoría en la posición `n/2 + 1` (no se promedian categorías) y se indica.

### 3.6 Moda

- Se calcula sobre el conteo de frecuencias. Sea `fmax` la frecuencia máxima.
- **Amodal:** todos los valores tienen la misma frecuencia (`fmax = fmin`) **y** hay más de un valor distinto. Caso especial: si hay un único valor distinto, es unimodal.
- **Unimodal:** exactamente un valor alcanza `fmax`.
- **Multimodal:** dos o más valores alcanzan `fmax`; se listan todos con su conteo y se etiqueta bimodal/trimodal/multimodal.
- En continuas sin agrupar, la igualdad de valores se evalúa con tolerancia relativa; se advierte de que la moda de datos continuos es poco informativa y se sugiere la clase modal.
- Clase modal (datos agrupados) y moda interpolada:

```
Mo = Li + ( D1 / (D1 + D2) ) · l        D1 = f_i − f_{i−1},  D2 = f_i − f_{i+1}
```

con `i` la clase de mayor frecuencia; `f_0 = f_{K+1} = 0`. Si `D1 + D2 = 0`, `Mo = xi` (marca de clase).

## 4. Posición: cuartiles, deciles, percentiles

### 4.1 Método por defecto: R-7 (inclusivo)

Para una proporción `p` en [0, 1] sobre la muestra ordenada de tamaño n:

```
h = (n − 1) · p + 1
Q(p) = x(piso(h)) + ( h − piso(h) ) · ( x(piso(h)+1) − x(piso(h)) )
```

Con `h = n` se toma `x(n)`. Es el método por defecto de R (`type = 7`), de NumPy (`linear`) y el equivalente a `PERCENTIL.INC` / `CUARTIL.INC` de Excel.

**Justificación:** es interpolación lineal de la función de distribución empírica, es el estándar de facto en el software que el profesor y sus estudiantes encontrarán (Excel, R, Python), produce resultados continuos en `p` y coincide exactamente con la definición clásica de mediana. Elegir un método distinto haría que StatLab discrepara de Excel en los ejercicios, lo que sería difícil de explicar a un estudiante.

### 4.2 Método alternativo: exclusivo (R-6)

```
h = (n + 1) · p
Q(p) = x(piso(h)) + ( h − piso(h) ) · ( x(piso(h)+1) − x(piso(h)) )
```

Definido solo para `1/(n+1) <= p <= n/(n+1)`; fuera de ese rango se devuelve `null` con explicación (igual que `CUARTIL.EXC` de Excel, que da error). Equivale al planteamiento de "excluir la mediana al partir la muestra en dos mitades".

El usuario elige entre inclusivo (por defecto) y exclusivo; la tabla imprime cuál se usó. ❓ Confirmar con el profesor si su curso usa la fórmula posicional clásica `k(n+1)/100` sin interpolación; en ese caso se añadiría como tercer método.

### 4.3 Derivados

- Cuartiles: `Q1 = Q(0.25)`, `Q2 = Q(0.50) = Me`, `Q3 = Q(0.75)`. Q2 se puede ocultar de la tabla.
- Deciles: `Dk = Q(k/10)`, k = 1..9.
- Percentiles: `Pk = Q(k/100)`, k pedido por el usuario o la serie completa 1..99.
- Todos comparten una única función `quantile(sorted, p, method)`; no hay implementaciones duplicadas.

## 5. Variabilidad

### 5.1 Rango

```
R = máximo − mínimo
```

### 5.2 Varianza

**Muestral (por defecto), divisor n − 1 (corrección de Bessel):**

```
s² = ( Σ (xi − x̄)² ) / (n − 1)        requiere n >= 2
```

**Poblacional (opcional), divisor n:**

```
σ² = ( Σ (xi − x̄)² ) / n              requiere n >= 1
```

Se implementa con el algoritmo **de Welford** en una pasada, acumulando `M2`:

```
para cada x:  n += 1 ; d = x − media ; media += d / n ; M2 += d · (x − media)
s² = M2 / (n − 1)   ;   σ² = M2 / n
```

Motivo: la fórmula `(Σx² − (Σx)²/n)/(n−1)` sufre cancelación catastrófica con datos de media grande y varianza pequeña. Nunca se usa.

Datos agrupados: `s² = Σ fi·(xi − x̄)² / (n − 1)`, con `xi` la marca de clase, etiquetada como aproximación.

**Decisión:** la varianza **muestral (n−1)** es la predeterminada, por ser la que corresponde a datos entendidos como muestra y la que devuelven Excel (`VAR.S`) y R (`var`). La poblacional está disponible con un interruptor y se muestra etiquetada sin ambigüedad. ❓ Confirmar si deben mostrarse ambas por defecto.

### 5.3 Desviación estándar

```
s = sqrt(s²)      σ = sqrt(σ²)
```

### 5.4 Coeficiente de variación

```
CV = 100 · s / |x̄|        (expresado en %)
```

- Se usa `|x̄|` para evitar CV negativos.
- Si `x̄ = 0`, o si `|x̄| < 1e-12`, o si la variable tiene valores de ambos signos, el CV **no es interpretable**: se devuelve `null` con la explicación correspondiente en lugar de un número engañoso.
- Se usa la desviación **muestral** para ser coherente con la varianza por defecto; la etiqueta indica cuál.
- Guía de lectura del microtexto: CV < 10 % dispersión baja, 10–30 % moderada, > 30 % alta (referencia orientativa, no regla).

### 5.5 Rango intercuartílico y atípicos

```
RIC = Q3 − Q1
límite inferior = Q1 − 1.5 · RIC
límite superior = Q3 + 1.5 · RIC
```

Los valores fuera de esos límites se listan como atípicos (criterio de Tukey). Se usa el mismo método de cuartiles elegido por el usuario, y se indica cuál.

## 6. Tabla de contingencia

- `n_ij` = nº de observaciones con categoría `i` en la variable fila y `j` en la columna, excluyendo las filas donde falte cualquiera de las dos.
- Marginales: `n_i. = Σ_j n_ij`, `n_.j = Σ_i n_ij`, `N = Σ n_ij`.
- Porcentajes: por fila `100·n_ij/n_i.`, por columna `100·n_ij/n_.j`, sobre el total `100·n_ij/N`. Solo uno visible a la vez.
- `rowExtremes` / `columnExtremes` precalculan el índice del máximo y del mínimo de cada fila y de cada columna para el resaltado en hover (RF-22). En caso de empate se resaltan todos los índices empatados.
- Fase 1 no calcula chi-cuadrado ni medidas de asociación (ver pregunta 12 de 01-requisitos §6).

## 7. Precisión y redondeo

- Todo el cálculo se hace en `number` (IEEE 754 doble) sin redondear.
- El **redondeo es exclusivamente de presentación** (`src/lib/format`): por defecto 4 cifras significativas para estadísticos y 2 decimales para porcentajes, configurable.
- Las tablas exportadas a CSV/XLSX pueden llevar el valor completo o el formateado, a elección del usuario; por defecto, el valor completo en XLSX (para que pueda seguir calculando) y el formateado en PDF.
- Los tests comparan con `toBeCloseTo(valor, 10)` frente a valores de referencia calculados con R y Excel, documentados en los fixtures.

## 8. Casos degenerados (contrato uniforme)

| Situación                                               | Comportamiento                                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `n = 0` tras excluir faltantes                          | Todos los estadísticos `null` + aviso "No quedan datos válidos en esta variable"                         |
| `n = 1`                                                 | Media = mediana = moda = el valor; varianza muestral `null` ("se necesitan al menos 2 datos"); rango = 0 |
| Todos los valores iguales                               | s = 0, CV = 0 (si la media no es 0), una sola clase, ojiva plana                                         |
| Valor no numérico en variable marcada como cuantitativa | Se cuenta como faltante y se avisa con el nº de fila                                                     |
| Categorías con la misma frecuencia                      | Moda amodal o multimodal según §3.6                                                                      |
| Empates en el máximo/mínimo de contingencia             | Se resaltan todos                                                                                        |
