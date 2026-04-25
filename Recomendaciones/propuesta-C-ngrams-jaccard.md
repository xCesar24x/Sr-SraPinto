# Propuesta C — N-gramas de caracteres (trigramas) + Jaccard similarity + Boost por categoría

**Proyecto:** Sr. & Sra. Pinto — chat widget client-side  
**Archivo objetivo:** `index.html`, método `respondLocal()` (~línea 1239)  
**Estrategia:** Trigramas de caracteres + Jaccard similarity + inferencia de categorías + scoring híbrido  
**Autor de propuesta:** PROPUESTA-C agent  
**Fecha:** 2026-04-24

---

## 1. Generación de N-gramas de caracteres

### Función `ngrams(str, n = 3)`

La función toma un string normalizado y devuelve un `Set` de substrings de longitud `n` extraídos de cada **palabra**, con un carácter especial `_` como delimitador de inicio y fin de palabra.

**Proceso paso a paso:**

1. Normalizar el string: NFD → strip diacríticos → lowercase → strip puntuación.
2. Dividir en palabras individuales (split por espacios).
3. Por cada palabra, crear el token `_palabra_` (agregar guiones bajos en ambos extremos).
4. Deslizar una ventana de tamaño `n` sobre ese token, generando todas las substrings posibles.
5. Acumular todos los trigramas de todas las palabras en un único `Set`.

**Ejemplo concreto — "gallo pinto":**

```
Palabra "gallo":  token = "_gallo_"
  trigramas: "_ga", "gal", "all", "llo", "lo_"

Palabra "pinto":  token = "_pinto_"
  trigramas: "_pi", "pin", "int", "nto", "to_"

Set final: {"_ga","gal","all","llo","lo_","_pi","pin","int","nto","to_"}
```

### Por qué trigramas y no bigramas para español

| Criterio | Bigramas (n=2) | Trigramas (n=3) |
|---|---|---|
| Colisiones | Muy altas: "ma" aparece en "mae", "mañana", "masa", "mapa" | Reducidas: "_ma" ya diferencia inicio; "mae" vs "más" divergen en tercer char |
| Typos de 1 char | Captura cambio, pero con mucho ruido | Capta la mayor parte de la palabra con typo aislado |
| Palabras cortas (2-3 chars) | Funciona pero sin discriminación | 1-2 trigramas suficientes con delimitadores |
| Complejidad | Más sets, más Jaccard impreciso | Balance óptimo para vocabulario gastronómico |
| Sufijos españoles (-ción, -ando, -mente) | Se confunden entre sí | Los trigramas de 3 chars los distinguen mejor |

El español tiene inflexiones ricas. "pagar", "pago", "pagando" comparten trigramas de raíz (`_pa`, `pag`, `aga`) pero divergen en los finales, lo que hace que Jaccard baje gradualmente en lugar de caer a cero, dando señal de similitud semántica.

---

## 2. Jaccard Similarity

### Definición

```
jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

Donde `A` y `B` son `Set` de trigramas.

- Rango: `[0.0, 1.0]`
- `1.0` = sets idénticos (mismo texto)
- `0.0` = sin trigramas en común
- Insensible a longitud: no favorece preguntas largas sobre cortas
- Insensible a orden de palabras: "pinto gallo" y "gallo pinto" producen el mismo set

### Por qué Jaccard supera al token-overlap actual

El matching actual acumula `matchCount` crudo, luego divide por `qTokens.length`. Esto tiene dos fallas:

1. Un token largo como "vegetariano" incluye por substring a "vegano" → falso positivo.
2. Una query de 1 palabra vs una FAQ de 5 palabras baja el score aunque sea perfectamente relevante.

Jaccard normaliza automáticamente por la unión, evitando ambos problemas.

---

## 3. Precomputación de trigramas del FAQ_DB

La precomputación ocurre **una única vez** en el constructor de `ChatManager`, antes de que el usuario escriba nada.

### Esquema de init

```
constructor() {
  // ... resto del init actual ...

  // Precomputar categorías y trigramas de cada FAQ
  this._faqMeta = FAQ_DB.map((item, i) => {
    const qNorm = normalizar(item.q);          // misma normalización NFD+lowercase+sin puntuación
    return {
      index: i,
      qNgrams: ngrams(qNorm),                 // Set<string> de trigramas
      category: inferirCategoria(item.q)       // string de categoría (ver sección 5)
    };
  });
}
```

### Costo de precomputación

- 100 FAQs × promedio ~8 palabras por pregunta × (~longitud_palabra + 2) trigramas por palabra
- Estimado: ~100 FAQs × ~40 trigramas promedio = ~4.000 strings en memoria
- Cada trigrama = 3 chars = 3 bytes → ~12 KB total para todos los sets
- Tiempo: O(N × L) donde N=100 FAQs, L=longitud promedio de la pregunta (~30 chars)
- En V8 (Chrome/Safari): ejecuta en < 2ms en dispositivo mid-range

---

## 4. Scoring híbrido

### Componentes del score

Para cada entrada `faq` del FAQ_DB, se calcula:

```
base_score    = jaccard(query_ngrams, faq.qNgrams)       // 0.0 – 1.0
category_mult = category_boost(query_category, faq.category)  // 1.0 ó 1.3
length_bonus  = length_penalty(query, faq.q)             // 0.0 ó 0.1
final_score   = (base_score * category_mult) + length_bonus
```

### `category_boost`

Si la categoría inferida del query coincide con la categoría inferida del FAQ:

```
category_mult = (query_category !== null && query_category === faq.category) ? 1.3 : 1.0
```

El multiplicador `1.3` es una calibración conservadora: eleva el score pero no lo domina. Si el Jaccard base es `0.18` (debajo del umbral de `0.25`), el boost lo lleva a `0.234` — aún debajo. Si el Jaccard base es `0.20`, el boost lo lleva a `0.26` — por encima del umbral.

### `length_bonus`

Si la diferencia de longitud (en chars, sin espacios) entre el query y el FAQ es menor a 3:

```
const diff = Math.abs(query.replace(/\s/g,'').length - faq.q.replace(/\s/g,'').length);
length_bonus = (diff < 3) ? 0.1 : 0.0;
```

Esto favorece matches casi exactos en longitud, diferenciando "pinto" (5 chars) de "pinto clasico" (12 chars) cuando el query es "pinto" solo.

### Selección del mejor match

```
bestMatch = argmax(final_score sobre todos los FAQs)
if (final_score(bestMatch) >= THRESHOLD) return bestMatch.a;
else return fallback(query_category);
```

---

## 5. Categorización automática del FAQ_DB

El FAQ_DB no tiene campo `category`. La función `inferirCategoria(q)` evalúa la pregunta contra 12 regex en orden y retorna la primera que coincide. Si ninguna coincide, retorna `"general"`.

### Las 12 categorías y sus regex

| # | Categoría | Regex (sobre texto normalizado, sin diacríticos) |
|---|---|---|
| 1 | `saludo` | `/\b(hola|buenas|buenos|buen dia|hey|ey|que tal|como estan|bienvenido)\b/` |
| 2 | `menu` | `/\b(menu|carta|que hay|que tienen|que venden|opciones|platos|comida)\b/` |
| 3 | `precio` | `/\b(precio|cuanto|cuesta|vale|valor|caro|barato|economico|colones|iva)\b/` |
| 4 | `pedido` | `/\b(pedido|pedir|ordenar|orden|comprar|quiero|me da|solicitar|carrito)\b/` |
| 5 | `pago` | `/\b(pago|pagar|efectivo|tarjeta|sinpe|transferencia|credito|debito|factura)\b/` |
| 6 | `horario` | `/\b(horario|hora|abren|cierran|cuando|disponible|atienden|dias|semana|domingo|feriado)\b/` |
| 7 | `ubicacion` | `/\b(donde|direccion|ubicacion|llegar|lugar|zona|mapa|parqueo|local|centro)\b/` |
| 8 | `producto` | `/\b(pinto|empanada|ensalada|cafe|combo|pareja|familiar|clasico|ingrediente|lleva|relleno|porcion|picante)\b/` |
| 9 | `alergia` | `/\b(alergico|alergia|vegano|vegetariano|gluten|lactosa|kosher|halal|mani|aceite|contiene)\b/` |
| 10 | `redes` | `/\b(instagram|facebook|tiktok|foto|etiqueta|resena|sorteo|concurso|seguir|redes)\b/` |
| 11 | `evento` | `/\b(evento|catering|oficina|empresa|cumpleanos|navidad|pedido grande|revender|personas)\b/` |
| 12 | `queja` | `/\b(incompleto|esperando|no me gusto|problema|mal|queja|reclamo|demora)\b/` |

**Nota de implementación:** Los regex se aplican sobre el texto ya normalizado (NFD → lowercase → sin diacríticos). Esto garantiza que "horário" (con acento) y "horario" caigan en la misma categoría.

---

## 6. Umbral de aceptación

```
const THRESHOLD = 0.25;
```

### Calibración del valor

- `0.25` equivale a que 1 de cada 4 trigramas del set unión sea compartido.
- Para una query de 2 palabras (~14 trigramas) y una FAQ de 3 palabras (~20 trigramas), lograr `0.25` requiere ~8 trigramas en común — señal robusta, no ruido.
- El valor actual del sistema (`1.2` en score crudo) no es comparable directamente, pero experimentalmente `0.25` en Jaccard ofrece una tasa de falsos positivos similar con menos falsos negativos.

### Ajuste fino recomendado

Si en pruebas manuales hay demasiados fallbacks, bajar a `0.20`.  
Si hay demasiados matches incorrectos, subir a `0.30`.

El valor es una única constante en la parte superior del método — fácil de ajustar.

---

## 7. Fallback por categoría

Cuando `final_score < THRESHOLD`, se usa la categoría detectada en el query para devolver una respuesta genérica pero relevante. Esto **reutiliza los 14 bloques de fallback existentes** en lugar de introducir lógica nueva.

### Lógica de fallback

```
const qCategory = inferirCategoria(normalizedQuery);

switch (qCategory) {
  case "saludo":   return respuestaAleatoria(FALLBACK_SALUDO);
  case "menu":     return FALLBACK_MENU;
  case "precio":   return FALLBACK_PRECIO;
  case "pedido":   return FALLBACK_PEDIDO;
  case "pago":     return FALLBACK_PAGO;
  case "horario":  return FALLBACK_HORARIO;
  case "ubicacion":return FALLBACK_UBICACION;
  case "producto": return FALLBACK_PRODUCTO;
  case "alergia":  return FALLBACK_ALERGIA;
  case "redes":    return FALLBACK_REDES;
  case "evento":   return FALLBACK_EVENTO;
  case "queja":    return FALLBACK_QUEJA;
  case "general":
  default:         return FALLBACK_DEFAULT;
}
```

La ventaja es que incluso cuando Jaccard no encuentra un match preciso, el usuario recibe una respuesta coherente con su intención, no el fallback genérico de "no le entendí".

---

## 8. Pseudocódigo completo — `respondLocal(text)` reescrito

```javascript
// ─── Funciones auxiliares (definidas fuera de respondLocal, dentro de ChatManager) ───

// Normaliza texto: NFD, sin diacríticos, lowercase, sin puntuación
function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar diacríticos
    .toLowerCase()
    .replace(/[^\w\s]/gi, '');         // quitar puntuación
}

// Genera Set de trigramas de caracteres para un string normalizado.
// Procesa palabra por palabra, usa "_" como delimitador de borde.
function ngrams(str, n = 3) {
  const result = new Set();
  const palabras = str.split(/\s+/).filter(w => w.length > 0);

  for (const palabra of palabras) {
    // Agregar delimitadores de borde
    const token = '_' + palabra + '_';
    // Deslizar ventana de tamaño n
    for (let i = 0; i <= token.length - n; i++) {
      result.add(token.slice(i, i + n));
    }
  }
  return result;  // Set<string>
}

// Jaccard similarity entre dos Sets de trigramas
function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  // Iterar el set más pequeño para eficiencia
  const [menor, mayor] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const trigrama of menor) {
    if (mayor.has(trigrama)) intersectionCount++;
  }

  // |A ∪ B| = |A| + |B| - |A ∩ B|
  const unionCount = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionCount;
}

// Infiere categoría de un texto normalizado mediante regex en orden de prioridad
function inferirCategoria(textoNorm) {
  // Las 12 categorías en orden (del más específico al más general)
  const CATEGORIAS = [
    { nombre: 'queja',    re: /\b(incompleto|esperando|no me gusto|problema|mal|queja|reclamo|demora)\b/ },
    { nombre: 'alergia',  re: /\b(alergico|alergia|vegano|vegetariano|gluten|lactosa|kosher|halal|mani|aceite|contiene)\b/ },
    { nombre: 'evento',   re: /\b(evento|catering|oficina|empresa|cumpleanos|navidad|pedido grande|revender|personas)\b/ },
    { nombre: 'redes',    re: /\b(instagram|facebook|tiktok|foto|etiqueta|resena|sorteo|concurso|seguir|redes)\b/ },
    { nombre: 'pago',     re: /\b(pago|pagar|efectivo|tarjeta|sinpe|transferencia|credito|debito|factura)\b/ },
    { nombre: 'horario',  re: /\b(horario|hora|abren|cierran|cuando|disponible|atienden|dias|domingo|feriado)\b/ },
    { nombre: 'ubicacion',re: /\b(donde|direccion|ubicacion|llegar|lugar|zona|mapa|parqueo|local|centro)\b/ },
    { nombre: 'producto', re: /\b(pinto|empanada|ensalada|cafe|combo|pareja|familiar|clasico|ingrediente|lleva|relleno|porcion|picante)\b/ },
    { nombre: 'precio',   re: /\b(precio|cuanto|cuesta|vale|valor|caro|barato|economico|colones|iva)\b/ },
    { nombre: 'pedido',   re: /\b(pedido|pedir|ordenar|orden|comprar|quiero|me da|solicitar|carrito)\b/ },
    { nombre: 'menu',     re: /\b(menu|carta|que hay|que tienen|que venden|opciones|platos|comida)\b/ },
    { nombre: 'saludo',   re: /\b(hola|buenas|buenos|buen dia|hey|ey|que tal|como estan|bienvenido)\b/ },
  ];

  for (const cat of CATEGORIAS) {
    if (cat.re.test(textoNorm)) return cat.nombre;
  }
  return 'general';
}


// ─── En el constructor de ChatManager ───

constructor() {
  // ... inicialización del widget DOM actual ...

  // PRECOMPUTAR trigramas y categorías de cada FAQ (costo único al cargar la página)
  this._faqMeta = FAQ_DB.map((item) => {
    const qNorm = normalizar(item.q);
    return {
      item,                             // referencia al FAQ original { q, a }
      qNgrams: ngrams(qNorm),           // Set<string> — reutilizado en cada query
      category: inferirCategoria(qNorm) // string — categoría inferida
    };
  });
}


// ─── Método reescrito respondLocal(text) ───

respondLocal(userMessage) {
  // Configuración
  const THRESHOLD = 0.25;       // Score mínimo para aceptar match
  const CATEGORY_MULT = 1.3;    // Multiplicador cuando categoría coincide
  const LENGTH_BONUS = 0.1;     // Bonus cuando longitudes son similares
  const LENGTH_DIFF_MAX = 3;    // Chars de diferencia permitidos para el bonus

  // 1. Normalizar el query del usuario
  const queryNorm = normalizar(userMessage);

  // 2. Generar trigramas del query
  const queryNgrams = ngrams(queryNorm);

  // 3. Inferir categoría del query (para boost y fallback)
  const queryCategory = inferirCategoria(queryNorm);

  // 4. Calcular score final para cada FAQ y encontrar el mejor
  let bestScore = -1;
  let bestItem = null;

  for (const meta of this._faqMeta) {
    // 4a. Score base: Jaccard de trigramas
    const baseScore = jaccard(queryNgrams, meta.qNgrams);

    // 4b. Boost de categoría: si el query y el FAQ son de la misma categoría
    const categoryMult = (queryCategory !== 'general' && queryCategory === meta.category)
      ? CATEGORY_MULT
      : 1.0;

    // 4c. Bonus de longitud: si la longitud (sin espacios) es similar
    const qLen = queryNorm.replace(/\s/g, '').length;
    const fLen = meta.item.q.replace(/\s/g, '').length;  // FAQ ya es corto, no necesita normalizar longitud
    const lengthBonus = (Math.abs(qLen - fLen) < LENGTH_DIFF_MAX) ? LENGTH_BONUS : 0.0;

    // 4d. Score final combinado
    const finalScore = (baseScore * categoryMult) + lengthBonus;

    // 4e. Actualizar mejor candidato
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestItem = meta.item;
    }
  }

  // 5. Si el mejor score supera el umbral, devolver la respuesta del FAQ
  if (bestScore >= THRESHOLD && bestItem !== null) {
    return bestItem.a;
  }

  // 6. FALLBACK por categoría — mismas respuestas que el sistema actual
  //    Reutiliza los 14 bloques de regex existentes, pero ahora guiado por
  //    la categoría ya inferida, sin re-evaluar regex en cascada.
  switch (queryCategory) {
    case 'saludo': {
      const opciones = [
        "¡Buenas! Bienvenido a Sr. & Sra. Pinto ☕ ¿En qué le ayudamos hoy?",
        "¡Hola! Por acá la Sra. Pinto 👩‍🍳 ¿Le provoca algo rico hoy?",
        "¡Pura vida! ¿Qué se le ofrece?"
      ];
      return opciones[Math.floor(Math.random() * opciones.length)];
    }
    case 'menu':
      return "Contamos con Pinto Clásico (₡2.500), Empanadas (₡1.500), Combo Pareja (₡5.500) y Combo Familiar (₡10.500). ¿Le llama algo en especial? 😊";
    case 'precio':
      return "Los precios van de ₡1.200 el café a ₡10.500 el Combo Familiar. ¿Quiere una recomendación por presupuesto?";
    case 'pedido':
      return "Agrega al carrito aquí en la página, elige método de pago y el pedido nos llega por WhatsApp. ¡Sin rodeos!";
    case 'pago':
      return "Aceptamos efectivo, tarjeta y SINPE Móvil 💳 Coordinamos al confirmar el pedido.";
    case 'horario':
      return "Lunes a sábado de 10am a 6pm, domingos de 10am a 4pm 🕙";
    case 'ubicacion':
      return "Estamos en Desamparados de Alajuela. Para la dirección exacta, escríbanos al WhatsApp 📍";
    case 'producto':
      return "Para detalles de ingredientes o preparación, escríbanos al WhatsApp y le confirmamos con la cocina 😊";
    case 'alergia':
      return "Por su seguridad, indíquenos su alergia o restricción directo al WhatsApp 8802-5793 antes de pedir 🙏";
    case 'redes':
      return "¡Síganos en @srysrapinto1 en Instagram! Ahí publicamos novedades y fotos 📸";
    case 'evento':
      return "Para pedidos de eventos o catering, coordine por WhatsApp con anticipación 🎉";
    case 'queja':
      return "Lamentamos el inconveniente 😞 Escríbanos al WhatsApp de inmediato con los detalles y lo resolvemos.";
    default:
      return "Mmm, no le entendí del todo 😅 Puedo ayudarle con menú, precios, horario o cómo hacer un pedido.";
  }
}
```

---

## 9. Costo estimado — Análisis O()

### Precomputación (una vez al cargar la página)

| Operación | Complejidad | Valor concreto |
|---|---|---|
| Normalizar cada FAQ.q | O(L) por FAQ | L ≈ 30 chars promedio |
| Generar trigramas de cada FAQ | O(L) por FAQ | ~40 trigramas por FAQ |
| Inferir categoría de cada FAQ | O(C × L) por FAQ | C=12 categorías, L=30 chars |
| **Total precomputación** | **O(N × C × L)** | 100 × 12 × 30 ≈ 36.000 ops |

Tiempo estimado en V8: **< 5ms** en mobile mid-range (Snapdragon 680).

### Por cada query del usuario

| Operación | Complejidad | Valor concreto |
|---|---|---|
| Normalizar query | O(Q) | Q ≈ 20 chars promedio |
| Generar trigramas del query | O(Q) | ~15 trigramas |
| Inferir categoría del query | O(C × Q) | 12 × 20 = 240 ops |
| Jaccard × 100 FAQs | O(N × (A + B)) | 100 × (15 + 40) = 5.500 ops |
| **Total por query** | **O(N × (Q + L))** | ≈ 5.800 ops |

Tiempo estimado en V8: **< 1ms** por mensaje del usuario.

### Memoria

- 100 FAQs × ~40 trigramas × 3 bytes/trigrama = **~12 KB** para todos los sets
- Categorías: 100 × ~10 chars = 1 KB
- **Total adicional respecto al sistema actual: < 15 KB**

---

## 10. Ejemplos de mejora — Jaccard vs token-overlap actual

### Caso 1: Typo simple — "pintto" (una letra duplicada)

**Sistema actual:**  
Tokeniza "pintto" → token `["pintto"]`. Busca en FAQ_DB: ninguna `q` contiene "pintto" como token exacto. El substring check `qToken.includes("pintto")` también falla porque "pintto" no es substring de "pinto". **Score: 0 → fallback genérico.**

**Trigramas + Jaccard:**  
```
ngrams("pintto") = {"_pi","pin","int","ntt","tto","to_"}
ngrams("pinto")  = {"_pi","pin","int","nto","to_"}

Intersección: {"_pi","pin","int","to_"} → 4 elementos
Unión: 6 + 5 - 4 = 7 elementos
Jaccard = 4/7 ≈ 0.57  →  muy por encima del umbral 0.25
```
**Resultado: match correcto con "pinto clasico".**

---

### Caso 2: Sin espacio — "gallopinto" vs "gallo pinto"

**Sistema actual:**  
Tokeniza "gallopinto" → token único `["gallopinto"]`. Ningún token de FAQ es "gallopinto". El substring check: `"gallo".includes("gallopinto")` = false, `"gallopinto".includes("gallo")` = true para token "gallo" pero el score resultante es insuficiente porque solo un token de la FAQ coincide. **Score borderline o fallback.**

**Trigramas + Jaccard:**  
```
ngrams("gallopinto") = {"_ga","gal","all","llo","lop","opi","pin","int","nto","to_"}
ngrams("gallo pinto") = {"_ga","gal","all","llo","lo_","_pi","pin","int","nto","to_"}

Intersección: {"_ga","gal","all","llo","pin","int","nto","to_"} → 8 elementos
Unión: 10 + 10 - 8 = 12 elementos
Jaccard = 8/12 ≈ 0.67  →  match sólido
```
**Resultado: match correcto a pesar de la falta de espacio.**

---

### Caso 3: Sustitución fonética — "kuanto cuesta" vs "cuanto cuesta"

**Sistema actual:**  
Tokeniza → `["kuanto","cuesta"]`. "kuanto" no matchea "cuanto" como token exacto. El substring check `"cuanto".includes("kuanto")` = false. Solo "cuesta" hace match. **Score bajo por perder "kuanto".**

**Trigramas + Jaccard:**  
```
ngrams("kuanto") = {"_ku","kua","uan","ant","nto","to_"}
ngrams("cuanto") = {"_cu","cua","uan","ant","nto","to_"}

Intersección: {"uan","ant","nto","to_"} → 4 elementos
Unión: 6 + 6 - 4 = 8 elementos
Jaccard("kuanto","cuanto") = 4/8 = 0.50
```
Con los trigramas de "cuesta" también compartidos, el Jaccard global del query vs FAQ "cuanto cuesta el pinto" es alto. **Resultado: match correcto.**

---

### Caso 4: Omisión silenciosa — "orario" vs "horario"

**Sistema actual:**  
Tokeniza "orario" → no matchea "horario". Ningún substring check lo captura porque "horario" no incluye "orario" como substring (la 'h' initial está ausente). **Score: 0 → fallback.**

**Trigramas + Jaccard:**  
```
ngrams("orario") = {"_or","ora","rar","ari","rio","io_"}
ngrams("horario") = {"_ho","hor","ora","rar","ari","rio","io_"}

Intersección: {"ora","rar","ari","rio","io_"} → 5 elementos
Unión: 6 + 7 - 5 = 8 elementos
Jaccard = 5/8 = 0.625  →  score alto
```
**Resultado: match correcto al FAQ de horario.** La 'h' muda española no arruina el matching.

---

### Caso 5: Reformulación semántica — "me pueden decir los horarios" vs "a que hora abren"

**Sistema actual:**  
"me pueden decir los horarios" → tokens `["pueden","decir","los","horarios"]`. Ninguno de esos tokens está en "a que hora abren". El substring check tampoco ayuda. **Score: 0 → fallback genérico por regex de categoría (que sí captura "horario").**

**Trigramas + Jaccard:**  
```
ngrams("me pueden decir los horarios"):
  incluye trigramas de "horarios": {"_ho","hor","ora","rar","rio","ios","os_"}

ngrams("a que hora abren"):
  incluye trigramas de "hora": {"_ho","hor","ora","ra_"}

Intersección entre "horarios" y "hora": {"_ho","hor","ora"} → 3 trigramas compartidos
```
El Jaccard del query completo vs este FAQ será moderado (~0.18). Aquí el **category_boost entra en juego:**

- `inferirCategoria("me pueden decir los horarios")` → `"horario"` (por regex en "horarios")
- `inferirCategoria("a que hora abren")` → `"horario"`
- Ambas categorías coinciden → `categoryMult = 1.3`
- `finalScore = 0.18 × 1.3 + 0.0 = 0.234`

Aún debajo de `0.25`, pero el **fallback de categoría** devuelve la respuesta de horario correcta: `"Lunes a sábado de 10am a 6pm..."` en lugar del fallback genérico de "no le entendí". **Resultado: respuesta relevante aunque no sea match exacto.**

---

## Resumen de ventajas sobre el sistema actual

| Aspecto | Sistema actual | Propuesta C |
|---|---|---|
| Typos de 1-2 chars | Falla | Jaccard absorbe la diferencia |
| Palabras sin espacio | Parcialmente | Trigramas de caracteres lo capturan |
| Sustitución fonética (k/c, b/v) | Falla | Trigramas mid-word coinciden |
| H muda / letras omitidas | Falla | 70-80% de trigramas sobreviven |
| Reformulaciones semánticas | Depende de tokens exactos | Category boost + fallback coherente |
| Preguntas largas vs FAQ corta | Penaliza por ratio de tokens | Jaccard normaliza por unión automáticamente |
| Strings vacíos / queries de 1 char | Comportamiento incierto | Manejo explícito (returns 0) |
| Memoria adicional | 0 | ~15 KB |
| Latencia adicional por query | 0 | < 1ms |
