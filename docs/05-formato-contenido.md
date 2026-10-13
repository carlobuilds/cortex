# 05 · Formato de contenido

Todo el contenido vive en `content/`. Se valida en dos capas: **Zod** al cargar la app y **`scripts/verify_content.py`** (que además comprueba que las respuestas sean correctas).

## Estructura

```
content/
  <materia>/                  # id de materia = el de curriculum/plan-2020.json
    conceptos.yaml            # grafo de conceptos
    NN-nombre-unidad/
      leccion.mdx
      ejercicios.yaml
      jefe.yaml
```

Las plantillas están en `content/_plantillas/`. Ejemplos reales verificados: `content/calculo/01-limites/` y `content/programacion/01-variables-y-tipos/`.

## `conceptos.yaml`

```yaml
materia: calculo
notacion: "Usamos f'(x) para la derivada; lim sin límites laterales a menos que se indique."
conceptos:
  - id: limite-intuitivo
    nombre: "Límite (idea intuitiva)"
    prerequisitos: []
  - id: limite-polinomio
    nombre: "Límites por sustitución directa"
    prerequisitos: [limite-intuitivo]
```

Reglas: ids en kebab-case y únicos por materia; sin ciclos; prerrequisitos deben existir (pueden apuntar a otra materia con `materia:concepto`).

## `leccion.mdx`

Front matter obligatorio:

```yaml
---
titulo: "Límites: acercarse sin llegar"
materia: calculo
unidad: 01-limites
duracion_min: 25
prerrequisitos: []              # conceptos de otras unidades que conviene dominar
conceptos: [limite-intuitivo]   # conceptos que esta lección introduce
programa_ref: "Cálculo, Unidad I"  # sección del programa oficial; "pendiente" si aún no se tiene
---
```

Componentes MDX disponibles. Desde la Fase 1, `<Predice>` (escribes tu predicción antes de ver la idea) y `<Desvanecido>` (un campo por hueco, con "Comprobar") son interactivos; los demás muestran su contenido. Usar un componente que no esté en esta tabla rompe `pnpm content:check` y el build:

| Componente | Uso |
|---|---|
| `<Predice pregunta="..." revela="...">` | Pregunta antes de la teoría; el usuario escribe/elige y luego ve la idea |
| `<Concepto titulo="...">` | Definición o idea central |
| `<Ejemplo titulo="...">` | Ejemplo resuelto completo |
| `<Desvanecido titulo="..." pasos={[...]} respuestas={[...]}>` | Ejemplo con pasos a completar; `respuestas` lleva lo que va en cada `___`, en orden |
| `<Ojo>` | Error común |
| `<Conexion materia="...">` | Vínculo con otra materia o con IA |
| `<Resumen>` | Tres líneas finales |
| `<Feynman>` | Reto de explicar con tus palabras |
| `<Visual id="..." ...>` | Visual interactivo. El `id` elige cuál y los demás atributos son sus parámetros (ver "Visuales") |

Matemáticas con `$...$` y `$$...$$` (KaTeX). Una fórmula que KaTeX no puede dibujar es error (no se muestra roja en silencio).

### Visuales

Desde la Fase 3 `<Visual>` dibuja un visual interactivo: gráficas de funciones (con Mafs, ADR-021), tablas de verdad y grafos. Todos los parámetros son **texto**:

```mdx
<Visual id="limite" f="(x^2-9)/(x-3)" a="3" dominio="0, 6" />
```

| `id` | Obligatorios | Opcionales | Qué hace |
|---|---|---|---|
| `grafica` | `f`, `dominio` | `rango`, `titulo` | La gráfica de `f`, con huecos, saltos y asíntotas marcados |
| `limite` | `f`, `a`, `dominio` | `rango`, `titulo` | Dos puntos se acercan a `a` por cada lado; al llegar cerca dice a qué valor tiende cada uno |
| `secante-tangente` | `f`, `a`, `dominio` | `rango`, `titulo` | La secante entre `a` y `a + h`; al encoger `h` aparece la tangente y su pendiente |
| `riemann` | `f`, `dominio` | `n`, `rango`, `titulo` | Rectángulos bajo la curva; se elige `n` y dónde se toma la altura, y compara la suma con la integral |
| `tabla-verdad` | `formula` | `titulo` | La tabla de verdad de la fórmula, con columnas intermedias; la fórmula se puede editar y dice si es tautología, contradicción o contingencia |
| `grafo` | `vertices`, `aristas` | `dirigido`, `titulo` | El grafo dibujado en círculo; al elegir un vértice resalta sus aristas y lee su grado y sus vecinos |

- **`f`**: la función, con `x` como única variable y la misma sintaxis que las respuestas simbólicas (`x^2`, `sqrt(x)`, `sin(x)`, `ln(x)`, `abs(x)`, `floor(x)`, `pi`, `e`).
- **`dominio`** y **`rango`**: `"min, max"` con `min < max`. La coma separa, así que los decimales van con punto (`"-1.5, 1.5"`); se aceptan expresiones (`"0, 2*pi"`). Sin `rango`, la vista vertical se ajusta a la curva, incluye el eje x y recorta lo que se dispara junto a una asíntota.
- **`a`**: un número dentro del dominio, sin tocar los extremos. En `limite` la función puede no existir en `a` (es el caso interesante); en `secante-tangente` debe existir.
- **`n`** (solo `riemann`): entero de 1 a 100; por defecto 4. `f` debe estar definida en todo el dominio.
- **`formula`** (solo `tabla-verdad`): variables de una letra minúscula y los conectores `¬ ∧ ∨ ⊕ → ↔`. También se aceptan `~ & | -> <->` y las palabras `no`, `y`, `o`. Precedencia: `¬`, luego `∧`, luego `∨` y `⊕`, luego `→`, luego `↔`; `→` asocia a la derecha. Máximo 6 variables. Las constantes son `V` y `F`. La app la muestra con paréntesis donde se mezclan conectores: `(p → q) ∧ ¬q`.
- **`vertices`** y **`aristas`** (solo `grafo`): `vertices="a, b, c"` (de 2 a 12 nombres de 1 a 3 letras o cifras) y `aristas="a-b, b-c"`. Sin lazos ni aristas repetidas. Con `dirigido="si"`, `a-b` va de `a` a `b` y `b-a` es otra arista.
- **`titulo`**: título opcional del bloque. La frase que describe el visual se escribe sola (función y dominio) y es lo que lee un lector de pantalla.

Reglas de uso:
- Un visual va donde **enseña algo** (docs/04: doble codificación, no decoración) y siempre **antes** del cierre (`<Conexion>`, `<Resumen>`, `<Feynman>`).
- `limite` y `secante-tangente` muestran una conclusión numérica con "≈" (a qué valor se acerca, cuál es la pendiente). Sale de evaluar `f`, no de un texto escrito a mano: al agregar uno, ábrelo en la app y comprueba que la conclusión coincide con lo que afirma la lección.
- En una tabla de verdad, el orden de las filas y los símbolos (V/F o 1/0) salen de `src/engine/logic/convention.ts`, no de la lección.
- `pnpm content:check` rechaza, con la línea: un `id` que no existe, parámetros que faltan o que ese visual no usa, una `f` que no se puede interpretar o que usa otra variable, números fuera de rango, una fórmula mal escrita y un grafo con vértices o aristas inválidos.

### Cómo escribir dentro de MDX (escapes)

MDX es código: estas reglas evitan errores que no se ven a simple vista.

| Dónde | Regla | Ejemplo |
|---|---|---|
| Atributo entre comillas (`pregunta="..."`, `revela="..."`, `titulo="..."`) | El texto va tal cual: LaTeX con **una** barra | `pregunta="¿Cuánto vale $\dfrac{1}{2}$?"` |
| Expresión entre llaves (`pasos={[...]}`, `respuestas={[...]}`) | Son strings de JavaScript: cada barra va **doble** | `pasos={["Calcula $\\lim_{x\\to 1} f(x)$."]}` |
| Texto normal, fuera de `$...$` | `{` y `<` sueltos se leen como código: escríbelos `\{` y `\<` | `el conjunto \{1, 2\}` |
| Signo de pesos (dinero) | Escríbelo `\$` para que no abra una fórmula | `cuesta \$150` |

Una barra sola dentro de `{[...]}` no da error por sí misma: `\to` se convierte en un tabulador seguido de "o", `\{` en `{` y `\,` en `,`, y la fórmula sale mal. Por eso `pnpm content:check` la rechaza (solo se aceptan `\\` y las comillas escapadas).

Además, `pnpm content:check` (y `next build`) rechazan:
- Props que el componente no tiene, props obligatorias que faltan (`pregunta` en `<Predice>`, `pasos` en `<Desvanecido>`, `id` en `<Visual>`), contenido dentro de `<Predice>`, `<Desvanecido>` o `<Visual>`, y un `<Desvanecido>` cuyo número de huecos `___` en `pasos` no coincide con `respuestas`.
- Código en atributos: solo valores literales (`"texto"` o `{["a", "b"]}`); en `<abbr title>`, solo `"texto"`.
- Un `$` sin cerrar (la fórmula quedaría como texto crudo).
- HTML dentro de un atributo (`vector<int>` se perdería): escríbelo entre backticks.
- Comandos de KaTeX que cargan cosas externas (`\href`, `\url`, `\includegraphics`).
- Imágenes Markdown (`![alt](url)` o `![alt][ref]`), en el texto o en un atributo: el navegador las pediría a la red. Los visuales van con `<Visual id>` (ver "Visuales"). Los enlaces `[texto](url)` sí se permiten (no cargan nada solos).
- Etiquetas HTML con atributos; solo se permiten `<br> <sub> <sup> <kbd> <mark> <small> <abbr title> <u> <s>`.
- Archivos `.mdx` guardados con BOM (guárdalos como UTF-8 sin BOM).

## `ejercicios.yaml`

```yaml
unidad: calculo/01-limites
ejercicios:
  - id: calc-01-001          # <prefijo-materia>-<NN unidad>-<NNN>, único en todo el repo
    tipo: numerico
    dificultad: 1            # 1 a 5
    conceptos: [limite-polinomio]
    enunciado: "Calcula $\\lim_{x\\to 2}(3x^2-5x+1)$."
    respuesta: 3
    tolerancia: 0
    verificar: { sympy: "limit(3*x**2-5*x+1, x, 2)" }
    pistas: ["¿Qué pasa si sustituyes directamente?"]
    explicacion: "La función es polinomial, así que basta sustituir: $3(4)-10+1=3$."
    tarjeta: true            # si entra al repaso espaciado (default true)
```

### Tipos de ejercicio

| tipo | Campos específicos | Cómo lo verifica `verify_content.py` |
|---|---|---|
| `opcion_multiple` | `opciones` (lista), `correcta` (índice), `valores` (opcional, lista paralela a `opciones` con números o textos que sympy evalúe, como `"1/3"`) | Si hay `verificar.sympy` y `valores`, comprueba que `valores[correcta]` coincida con el resultado |
| `numerico` | `respuesta`, `tolerancia` | Evalúa `verificar.sympy` o `verificar.python` y compara |
| `simbolico` | `respuesta` (expresión), `variables` (opcional) | Comprueba equivalencia con sympy entre `respuesta` y `verificar.sympy` |
| `completar` | `texto` con `___` por hueco, `respuestas` (lista) | Número de huecos = número de respuestas |
| `ordenar` | `elementos` (en orden correcto) | Verifica que haya ≥ 3 elementos únicos; la app los baraja |
| `codigo` | `lenguaje` (`python` o `c`), `plantilla`, `solucion`, `tests` | Ejecuta `solucion` contra `tests`; exige que la `plantilla` **no** los pase |
| `predecir_salida` | `lenguaje` (`python`), `codigo`, `respuesta` (texto) | Ejecuta `codigo` y compara la salida |
| `autoevaluacion` | `rubrica` (lista de criterios), `respuesta_modelo` | Exige rúbrica y respuesta modelo |
| `depurar` (Debug Dojo) | `lenguaje` (`python` o `c`), `codigo` (con el error), `linea_bug` (número o lista, 1-based), `solucion`, `tests` | La `solucion` pasa los tests; el `codigo` NO los pasa; la solución cambia exactamente las líneas de `linea_bug` (sin agregar líneas) |
| `parsons` | `lenguaje`, `lineas` (orden correcto; en Python con sangría de 4 espacios), `distractores` (opcional), `tests` (opcional) | ≥ 3 líneas; ningún distractor igual a una línea; si hay `tests`, las líneas unidas en orden los pasan |
| `rastreo_memoria` (solo C) | `lenguaje: c`, `codigo` (programa completo), `pasos`: lista de `{ linea, pila, heap?, nota?, pregunta?, respuesta?, expr?, formato?, vez? }`; cada celda `{ nombre, valor, expr?, formato? }` | Al menos una pregunta. Inserta `printf(formato, expr)` justo después de `linea` (en su `vez`-ésima ejecución), compila, ejecuta y compara con `respuesta`/`valor` |

**Tests de `codigo` en Python:** lista de `{ expr: "f(2)", esperado: 4, tolerancia: 0 }`. `expr` se evalúa después de ejecutar la solución.
**Tests de `codigo` en C:** lista de `{ entrada: "3 4\n", salida: "7\n" }`; `solucion` es un programa completo con `main`. Se compila con `gcc -Wall -O0` y se compara salida (sin espacios finales).

**Tests ocultos:** cualquier test (Python o C, en `codigo`, `depurar` y `parsons`) acepta `oculto: true`: la app no muestra su expresión ni su resultado esperado, solo si pasó. Úsalos para casos borde que no deben poder "adivinarse" leyendo las pruebas. Los programas se ejecutan en una carpeta temporal (pueden crear archivos sin ensuciar el repo).

**Rastreo de memoria:** `linea` es la línea (1-based) que se acaba de ejecutar en ese paso. Las direcciones no se muestran: un apuntador se dibuja como `→ nombre`; un valor sin inicializar, como `basura`. Solo se permiten formatos deterministas (`%d %i %u %c %s %f %.2f %g %x %ld %lu %lf %zu`; nunca `%p`). Si la línea está dentro de un ciclo, `vez` dice cuál de sus ejecuciones se mira. No pongas `linea` en una línea `if`/`for` sin llaves (el `printf` quedaría como su cuerpo).

**Texto de los ejercicios.** `enunciado`, `explicacion`, `pistas`, `opciones`, `elementos`, `rubrica`, `respuesta_modelo` y los tramos de `texto` (en `completar`) son Markdown con fórmulas `$...$`, sin HTML ni imágenes; `pnpm content:check` los dibuja con el mismo KaTeX estricto de las lecciones (capa 2). Un hueco `___` puede ir dentro de código (`` `7 ___ 2` ``) o de una fórmula.

**Textos exactos van entre comillas.** `opciones`, `elementos`, `respuestas` (de `completar`), la `respuesta` de `predecir_salida` y la `salida` de los tests de C se muestran o se comparan tal cual: escríbelos entre comillas (`respuesta: "3.0"`). Sin comillas, YAML los lee como número y se pierde la forma (`3.0` → 3). Los enteros (`dificultad`, `correcta`, `vidas`, `tiempo_segundos`, `xp`, `duracion_min`) van sin decimales (`4`, no `4.0`).

Campos comunes: `id`, `tipo`, `dificultad`, `conceptos` (al menos uno), `enunciado`, `explicacion` (obligatoria), `pistas` (opcional, máx. 3), `tarjeta` (opcional), `tiempo_estimado_s` (opcional), `verificar` (opcional en general; obligatorio en `numerico` y `simbolico`), `retirado` (opcional). Un campo que no esté en esta lista ni en la de su tipo es error (atrapa errores de dedo como `tolerancai`).

### Sobre `verificar`
- `sympy`: expresión que se evalúa con `from sympy import *` y símbolos `x, y, z, t, n, k` predefinidos. Debe producir el valor correcto **por una vía independiente** a la que usaste para escribir la respuesta (no copies el valor: calcúlalo con la función de sympy).
- `python`: expresión de Python puro que produce el valor (para estadística, finanzas, etc.).
- Si un ejercicio no se puede verificar por código (conceptual), se marca `verificar: { revision: "manual" }` y entra a la lista de revisión humana/adversarial (ver `07-calidad-y-verificacion.md`).

### YAML: cómo se lee
Los `.yaml` se leen como **YAML 1.1** (igual que PyYAML, que usa `verify_content.py`), tanto en Python como en la app. Pon entre comillas cualquier texto que YAML pueda confundir con otra cosa:
- `yes`, `no`, `on`, `off`, `true`, `false` → booleanos. Escribe `"no"` si quieres el texto.
- `010` (octal), `1:30` (sexagesimal) → números raros. Escribe `"010"`, `"1:30"`.
- Notación científica (`1e3`) y decimales sin cifra entera con signo (`-.5`) son texto en PyYAML: escribe `1000` o `-0.5`.
- Fechas sin hora: `2026-01-05` (con ceros); `2026-1-5` es texto.

Las letras sueltas `y` y `n` se leen como texto (como en PyYAML), así que `variables: [x, y, n]` funciona.

## `jefe.yaml`

```yaml
unidad: calculo/01-limites
nombre: "El Guardián del Infinito"
vidas: 3
tiempo_segundos: 480
aprobado_minimo: 0.8
preguntas:
  propias: [calc-01-003, calc-01-004, calc-01-005, calc-01-006]
  repaso_de: []          # ids de ejercicios de unidades anteriores (entrelazado)
recompensa: { xp: 300, insignia: "domador-de-limites" }
```

Reglas: todos los ids referenciados existen (`propias` en la misma unidad, `repaso_de` en unidades previas); mínimo 6 preguntas propias por jefe (menos genera advertencia); al menos 1 pregunta de dificultad ≥ 4 (si no, advertencia). Las preguntas de tipo `autoevaluacion` no se usan en jefes cronometrados.

## Identificadores

- Prefijo de materia para ids de ejercicio: `calc`, `prog`, `disc`, `econ`, `alg`, `cmv`, `edo`, `prob`, `mav`, etc. Se registra en la sección "Prefijos" de `ESTADO.md` al crear una materia.
- Los ids nunca se reutilizan ni se renumeran (las tarjetas FSRS y los intentos dependen de ellos). Un ejercicio retirado se marca `retirado: true`.
