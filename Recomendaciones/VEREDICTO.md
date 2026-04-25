# VEREDICTO — Evaluación de Propuestas de Mejora del Chatbot Sr. & Sra. Pinto

**Evaluador:** agent-evaluator (Opus 4.7 Max)
**Fecha:** 2026-04-24
**Archivo objetivo:** `index.html` — clase `ChatManager`, método `respondLocal()` (líneas 1142-1493)
**Restricciones reiteradas:** sin IA, sin API externa, JS vanilla client-side, mobile-first.

---

## 1. Tabla de scores (1 = muy malo, 10 = excelente)

| Dimensión | A (TF-IDF + Sinónimos) | B (Intents + Levenshtein) | C (Trigramas + Jaccard) | **HÍBRIDA C+A (Ganadora)** |
|---|---:|---:|---:|---:|
| **Precisión** (menos falsos positivos/negativos) | 7 | 7 | 7 | **9** |
| **Robustez a typos** (errores de tipeo móvil) | 4 | 9 | 9 | **9** |
| **Robustez a reformulaciones** (sinónimos, léxico distinto) | 9 | 8 | 5 | **9** |
| **Performance móvil** (init + per-query) | 8 | 6 | 9 | **8** |
| **Mantenibilidad** (agregar una FAQ nueva) | 6 | 3 | 9 | **7** |
| **Complejidad de implementación** (LOC, riesgo de bugs) | 6 | 3 | 9 | **7** |
| **TOTAL (prom. simple)** | **6.67** | **6.00** | **8.00** | **8.17** |

### Notas de los scores individuales

- **A** destaca en reformulaciones por su `SYNONYM_MAP` de ~120 entradas y stop-words eliminando ruido, pero el stemmer por reglas NO corrige typos aleatorios (`pintto`, `sinppe`, `orario`) — solo reduce inflexiones regulares. Además, requiere mover `FAQ_DB` fuera del método (breaking change estructural) y añade ~200 LOC.
- **B** es la más potente conceptualmente: Levenshtein resuelve typos y los tiers dan control fino. Pero introduce **dos fuentes de verdad** (18 intents × 3 tiers × keywords + mapping `faqKeys` al FAQ_DB). Agregar una FAQ nueva implica: (1) agregar al FAQ_DB, (2) decidir a qué intent pertenece, (3) agregar el string exacto al array `faqKeys`, (4) potencialmente actualizar keywords. Esto rompe la promesa de "mantenible" en un link-in-bio que itera rápido. Además, introduce un flujo de **clarify** (UX nueva) que el cliente no pidió y puede sentirse robótico.
- **C** es la más simple (~80 LOC netas de cambio) y gana en typos + performance. Su debilidad es reformulaciones semánticas puras (ej: "llevan a domicilio" → "hacen delivery" comparten pocos trigramas) — esto lo mitiga parcialmente el `category_boost` + fallback por categoría, pero sigue siendo el flanco débil.
- **HÍBRIDA C+A**: aplicar el pipeline de preproceso de A (stop-words + `SYNONYM_MAP` → tokens canónicos) **antes** de generar trigramas de C, luego Jaccard + category boost. Así, "llevan" se canonicaliza a "domicilio" antes de trigramar → el Jaccard captura la sinonimia sin necesidad de intents ni Levenshtein.

---

## 2. Ganadora: HÍBRIDA C+A (Trigramas + Jaccard sobre texto canonicalizado por SYNONYM_MAP)

### Justificación (5 párrafos)

**Párrafo 1 — Por qué no B.** La propuesta B es la más ambiciosa y conceptualmente la más potente: Levenshtein es, en papel, superior a cualquier otra técnica para typos, y los tiers ponderados dan granularidad semántica. Pero el cliente es un restaurante tico con 100 Q/A en un link-in-bio comercial. La fricción operativa de mantener 18 intents, cada uno con tres tiers de keywords y un array `faqKeys` con strings literales acoplados al FAQ_DB, viola el principio de **low-friction iteration** que un negocio de comida necesita. Cuando la Sra. Pinto quiera agregar "¿tienen tamales?" al menú, debe editar tres lugares en vez de uno. Además, el flujo de **clarify** (preguntar "¿me preguntas sobre X o sobre Y?") es un cambio de UX que el cliente no pidió y que rompe la expectativa conversacional cálida que ya establece el bot ("pura vida", "mae", "con mucho gusto"). B resuelve el problema técnico pero agrega deuda organizacional.

**Párrafo 2 — Por qué no A sola.** La propuesta A es elegante y su IDF automático discrimina tokens como "sinpe" o "gallopinto" correctamente. Pero su gran debilidad es que depende de **tokens bien formados**. El stemmer reduce "pedidos" → "ped", no corrige "pidoos" → "ped". En móviles, los errores son aleatorios (letra duplicada, letra vecina en teclado, letra omitida): ninguno pasa por el stemmer. A requiere que el usuario escriba bien y solo ayuda cuando el problema es léxico-semántico. El 50% de los "falsos negativos" reportados en móvil son typos, no sinónimos — A solo resuelve la otra mitad.

**Párrafo 3 — Por qué no C sola.** C es la más pragmática: baja complejidad, alto retorno en typos, performance excelente. Pero los trigramas son ciegos a la sinonimia: "me llevan la orden" y "hacen entregas a domicilio" no comparten trigramas significativos más allá de ruido. C mitiga esto con `category_boost` (1.3×) y fallback por categoría, pero ese boost solo aplica cuando la categoría inferida coincide — es insuficiente como única línea de defensa semántica, porque las regex de categoría de C duplican esfuerzo con el futuro mantenimiento (si alguien agrega "domicilio" como palabra nueva, la regex de "pedido" también hay que tocar).

**Párrafo 4 — Por qué la híbrida C+A gana.** La combinación extrae el 80% del valor de cada una con el 40% de la complejidad. El pipeline es: **(1)** normalizar (NFD + lowercase + sin puntuación), **(2)** aplicar el `SYNONYM_MAP` de A sobre el texto (token-wise, después de tokenizar) — esto canonicaliza "llevan" → "domicilio", "cuesta" → "precio", "vegana" → "vegetariano" ANTES de trigramar. **(3)** Generar trigramas de caracteres (con delimitador `_`) sobre el texto canonicalizado. **(4)** Jaccard contra el índice precomputado de FAQs (también canonicalizadas con el mismo mapa). **(5)** Category boost de C (1.3× si coinciden), umbral adaptativo sencillo (score absoluto ≥ 0.25 y top1 ≥ 1.35× top2 si hay runner-up con score > 0.15). **(6)** Fallback por categoría de C (una única función, no 14 regex dispersas). Esto da: typos → absorbidos por Jaccard de trigramas; sinónimos → absorbidos por `SYNONYM_MAP`; ambigüedad → resuelta por ratio top1/top2; desconocido → fallback coherente por categoría.

**Párrafo 5 — Escalabilidad operacional.** Agregar una FAQ nueva al híbrido requiere: editar el array `FAQ_DB` (una línea) y, opcionalmente, agregar 1-2 sinónimos al `SYNONYM_MAP` si la pregunta introduce jerga nueva. No hay array de intents que sincronizar, no hay tiers que balancear. El índice se recalcula en < 3ms al cargar la página, así que no hay ritual de deploy. Mantenibilidad para una pyme gastronómica: alta. Riesgo de regresión al modificar: bajo (el impacto de un nuevo sinónimo se puede probar con un smoke test de 10 queries).

---

## 3. Instrucciones de implementación concretas

### 3.1 Archivos a tocar

**Único archivo:** `G:/.shortcut-targets-by-id/1puuo4yEY1AX5Lyby72J6MHfix0idNd4C/Sr y Sra Pinto/index.html`

Todo el cambio vive dentro de la clase `ChatManager` y su instanciación en `DOMContentLoaded`.

### 3.2 Estructura general del cambio

1. **MOVER** el array `FAQ_DB` que hoy vive dentro del método `respondLocal()` (líneas 1244-1368) al scope de la clase como propiedad estática o al scope del módulo (antes de `class ChatManager`). Esto es el único "breaking change estructural" y es necesario para precomputar el índice en el constructor.

2. **AGREGAR** 3 constantes estáticas al scope del archivo (antes de `class ChatManager`):
   - `STOP_WORDS` (Set de ~50 stop-words, tomar literal de la sección 1 de propuesta A).
   - `SYNONYM_MAP` (Object con ~120 entradas, tomar de la sección 2 de propuesta A — eliminar bigramos complejos por ahora, tratar solo tokens individuales en v1).
   - `CATEGORIAS` (array de 12 regex para inferir categoría, tomar de la sección 5 de propuesta C).

3. **AGREGAR** 5 métodos privados a `ChatManager`:
   - `_normalize(text)` — NFD + lowercase + strip puntuación + colapsar espacios.
   - `_canonicalizeTokens(text)` — normaliza, tokeniza por espacios, filtra stop-words (pero mantiene tokens de 2 chars si son `si`/`no`), aplica `SYNONYM_MAP` token por token, re-une con espacios. Devuelve string canonicalizado.
   - `_ngrams(text, n = 3)` — genera `Set<string>` de trigramas con delimitador `_` por palabra (tomar de sección 1 de propuesta C).
   - `_jaccard(setA, setB)` — intersección / unión (tomar de sección 2 de propuesta C, iterar sobre el Set más pequeño).
   - `_inferirCategoria(textoNorm)` — corre las 12 regex en orden, devuelve nombre de categoría o `'general'` (tomar de sección 5 de propuesta C).

4. **AGREGAR** un método `_buildSearchIndex()` llamado desde el constructor después de `initializeElements()` y `attachEventListeners()`. Precomputa para cada FAQ: `{ item, qCanonical, qNgrams, category }` y guárdalo en `this._faqMeta`.

5. **REESCRIBIR** `respondLocal(userMessage)` siguiendo este pseudocódigo:

```
respondLocal(userMessage):
  // PASO 1: saludo rapido (opcional pero recomendado, preserva UX actual)
  const textNorm = this._normalize(userMessage)
  if /^(hola|buenas|hey|pura\s?vida)\b/.test(textNorm):
    return saludoAleatorio()  // mantener el array de 3 saludos actuales

  // PASO 2: canonicalizar query
  const queryCanonical = this._canonicalizeTokens(userMessage)

  // Edge case: query quedo vacio tras canonicalizar
  if queryCanonical.length === 0:
    return fallbackGenerico()

  // PASO 3: generar trigramas y categoria del query
  const queryNgrams = this._ngrams(queryCanonical)
  const queryCategory = this._inferirCategoria(textNorm)

  // PASO 4: scoring sobre todas las FAQs (usar _faqMeta precomputado)
  let scored = []
  for each meta of this._faqMeta:
    const base = this._jaccard(queryNgrams, meta.qNgrams)
    const catMult = (queryCategory !== 'general' && queryCategory === meta.category) ? 1.3 : 1.0
    const qLen = queryCanonical.replace(/\s/g,'').length
    const fLen = meta.qCanonical.replace(/\s/g,'').length
    const lenBonus = Math.abs(qLen - fLen) < 3 ? 0.05 : 0  // bonus reducido vs C original
    const final = (base * catMult) + lenBonus
    scored.push({ item: meta.item, score: final })
  scored.sort(desc by score)

  // PASO 5: umbral adaptativo (combinado absoluto + ratio)
  const THRESHOLD_ABS = 0.25
  const THRESHOLD_RATIO = 1.35
  const top1 = scored[0]
  const top2 = scored[1] || { score: 0 }
  const absOk = top1.score >= THRESHOLD_ABS
  const ratioOk = top2.score < 0.15 || top1.score >= THRESHOLD_RATIO * top2.score

  if absOk && ratioOk:
    return top1.item.a

  // PASO 6: fallback por categoria (UNA funcion, no 14 regex duplicadas)
  return this._fallbackPorCategoria(queryCategory, textNorm)
```

6. **AGREGAR** `_fallbackPorCategoria(categoria, textoNorm)` con el switch de 12 categorías + `general`. Las respuestas deben ser **copiadas literal** de los bloques 1-14 del fallback actual (líneas 1406-1480) — esto preserva la voz ya aprobada. Mapping:
   - `'saludo'` → bloque 1 (array aleatorio actual).
   - `'menu'` → bloque 2.
   - `'precio'` → bloque 3.
   - `'pedido'` → bloques 5 (pedido) + mantener bloque 4 de combo como rama si `textoNorm` incluye `combo|pareja|familiar`.
   - `'pago'` → bloque 9.
   - `'horario'` → bloque 7.
   - `'ubicacion'` → bloque 8.
   - `'alergia'` → bloque 10.
   - `'producto'` → devolver el mensaje actual "Para detalles de ingredientes…" genérico.
   - `'redes'` → nueva respuesta: "¡Síganos en Instagram como @srysrapinto1! 📸".
   - `'evento'` → nueva respuesta: "Para eventos o catering, escríbanos al WhatsApp 8802-5793 🎉".
   - `'queja'` → nueva respuesta: "Lamentamos el inconveniente 😞 Escríbanos al WhatsApp con detalles y lo resolvemos rápido 🙏".
   - `'general'` → bloque 14 (fallback final actual).
   - Además mantener bloque 6 (WhatsApp) y bloque 13 (despedida) como ramas específicas dentro del `general`, evaluadas por regex sobre `textoNorm` antes del fallback final.

### 3.3 Qué NO romper (contratos que deben preservarse)

- **`FAQ_DB` como estructura de objetos `{q, a}`** — ambas propiedades deben quedar intactas. No renombrar a `question`/`answer` ni a `pregunta`/`respuesta`.
- **IDs del DOM**: `chat-float-btn`, `chat-widget`, `chat-messages`, `chat-input`, `chat-send-btn`, `chat-close-btn`, `typing-indicator`, `chat-quick-replies`. No modificar el HTML de los mensajes ni las clases CSS (`chat-message`, `chat-avatar`, `chat-bubble`, `user`, `bot`).
- **`window.__pintoChat`** — la instancia global debe seguir existiendo en `DOMContentLoaded`.
- **`window.__pintoChatQuick(text)`** — la función global que usan las quick-replies del HTML debe seguir funcionando idéntica: abre el chat si está cerrado, setea el input, llama a `sendMessage()`.
- **Método público `sendMessage()`** — firma y comportamiento idénticos (delay aleatorio 600-1200ms, typing indicator, mensaje de error "Hubo un pequeño error…").
- **Método público `addMessage(sender, text)`** — firma idéntica; el `text.replace(/\n/g, '<br>')` debe preservarse porque el fallback del bot puede devolver strings con `\n`.
- **Mensaje inicial de bienvenida** (línea 1178) — no tocar.
- **Voz y tono**: "pura vida", "mae", "con mucho gusto", emojis existentes. Las respuestas del fallback nuevo deben mantener el mismo registro.
- **Tamaño del index.html**: el cambio neto debe ser aproximadamente **+150 a +250 LOC** (no duplicar el archivo). Si el diff supera +350 LOC, algo se está sobre-ingenierando.
- **Tiempo de init**: el `_buildSearchIndex()` debe ejecutar en < 5ms en mobile mid-range. Si tarda más, revisar el `_ngrams` (posible bucle cuadrático accidental).

### 3.4 Orden recomendado de implementación

1. **Paso 1 — constantes**: mover `FAQ_DB` fuera del método y agregar `STOP_WORDS`, `SYNONYM_MAP`, `CATEGORIAS`. Probar que el archivo sigue cargando sin errores (el bot seguirá funcionando con el matching viejo porque no tocamos `respondLocal` aún).
2. **Paso 2 — helpers**: agregar `_normalize`, `_canonicalizeTokens`, `_ngrams`, `_jaccard`, `_inferirCategoria`. Probar cada uno en consola del navegador con 2-3 inputs.
3. **Paso 3 — índice**: implementar `_buildSearchIndex()` y llamarlo en el constructor. Verificar que `this._faqMeta.length === FAQ_DB.length` y que el primer elemento tenga `qNgrams` con trigramas razonables.
4. **Paso 4 — scoring**: reescribir `respondLocal()` con el pipeline nuevo. En este punto, probar los 10 casos de la sección 4 de este documento.
5. **Paso 5 — fallback**: implementar `_fallbackPorCategoria()`. Verificar que los casos que caen debajo del umbral siguen dando respuestas coherentes.
6. **Paso 6 — QA en móvil real**: probar en un iPhone/Android físico (no solo devtools) con los 10 casos. Verificar que el init no causa layout shift visible ni atraso en el botón flotante del chat.

---

## 4. Criterios de éxito verificables — 10 queries de prueba

Para validar que el sistema híbrido está mejor que el actual, correr estos 10 casos y verificar que el output coincide con la respuesta esperada (o al menos cae en la misma categoría correcta).

| # | Query de prueba | Respuesta esperada (resumen) | Dimensión que prueba |
|---|---|---|---|
| 1 | `"cuanto vale el pintto"` | "El Pinto Clásico está en ₡2.500 🍳" (FAQ: cuanto cuesta el pinto) | Typo + sinónimo (vale→precio, pintto→pinto via trigramas) |
| 2 | `"aceptan sinppe movil"` | "¡Sí! Aceptamos SINPE Móvil, efectivo y tarjeta 💳" | Typo en palabra clave (sinppe→sinpe via trigramas) |
| 3 | `"me llevan el pedido a la casa"` | "Por el momento no manejamos delivery, el pedido se retira en el local…" | Reformulación (llevan→domicilio via SYNONYM_MAP) |
| 4 | `"tienen opcion vegana"` | "Para confirmar opciones veganas escríbanos al WhatsApp…" o la respuesta vegetariana | Reformulación (vegana→vegetariano via SYNONYM_MAP) |
| 5 | `"a que orario abren"` | "Abrimos a las 10am todos los días 🕙" (o el de horario) | Typo por omisión (orario→horario via trigramas) |
| 6 | `"que me recomiendan"` | "Sin dudarlo el Pinto Clásico — es nuestra firma 🏆…" | Match directo (verificar que no rompimos casos buenos) |
| 7 | `"cuanto"` (query de 1 token) | Fallback de categoría precio (no respuesta aleatoria incorrecta) | Query corta ambigua (debe ir a fallback por ratio bajo) |
| 8 | `"hacen catering para oficina de 20"` | "¡Claro que sí! Escríbanos con anticipación…" | Reformulación larga + categoría evento |
| 9 | `"hola buenas"` | Saludo aleatorio | Ruta rápida de saludo (debe responder antes del pipeline) |
| 10 | `"xkdjf xyz"` (basura) | Fallback genérico "no le entendí…" | Robustez a input sin señal (no debe retornar respuesta aleatoria) |

### Umbral de aceptación del cambio

- **≥ 9 de 10** respuestas correctas → promover a producción.
- **7-8 de 10** → investigar los fallos, ajustar `SYNONYM_MAP` o `THRESHOLD_ABS`, re-testear.
- **≤ 6 de 10** → rechazar, hay un bug de pipeline. Revisar el orden de canonicalización (stop-words antes o después de sinónimos).

### Regresión vs sistema actual

El sistema actual (medido informalmente por el reporte del cliente) está en ~5-6 de 10. El objetivo del híbrido es **≥ 9/10**. Si el resultado empírico es < 8, no se promueve.

---

## 5. Riesgos y mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | Canonicalizar rompe queries legítimos donde un sinónimo debe mantenerse (ej: "gallo" como ave vs "gallo" como gallopinto) | Media | Medio | El dominio es restaurante — "gallo" siempre significa pinto en este contexto. Si aparece caso edge, eliminar el mapping conflictivo del `SYNONYM_MAP` (es solo un diccionario JS, cambio de una línea). |
| 2 | Trigramas con delimitador `_` colisionan con tokens cortos (ej: "si", "no") generando pocos n-gramas | Baja | Bajo | Ya está manejado en el tokenizado: palabras ≥ 2 chars con los delimitadores producen al menos 2 trigramas útiles. "si" → `_si`, `si_`. |
| 3 | El umbral 0.25 es demasiado alto o bajo empíricamente | Alta | Bajo | El umbral es una constante en la parte superior de `respondLocal`. Calibrar post-despliegue con un log (temporal) de `{query, top1_score, top2_score, matched_answer}` en consola. Bajar a 0.20 si hay exceso de fallbacks; subir a 0.30 si hay falsos positivos. |
| 4 | `_buildSearchIndex` agrega latencia perceptible al primer paint del chat | Baja | Bajo | Ejecuta en < 5ms. Si se ve, mover la llamada a un `requestIdleCallback` con fallback a `setTimeout(..., 0)`. |
| 5 | Mover `FAQ_DB` fuera del método rompe alguna referencia no detectada | Baja | Alto | Grep en el archivo por `FAQ_DB` antes del cambio; solo debe haber una referencia en `respondLocal`. El IDE/linter debería marcar cualquier referencia rota. |
| 6 | El fallback por categoría devuelve respuesta incorrecta porque la regex de categoría captura un token equivocado (ej: "menu" en "quinto-menu mentiroso") | Media | Bajo | Las regex usan `\b` (word boundary). Precaución: asegurar que las regex no usen lookaheads complejos. |
| 7 | `SYNONYM_MAP` canonicaliza ANTES de filtrar stop-words y rompe el orden | Baja | Medio | Orden explícito en `_canonicalizeTokens`: (1) tokenizar, (2) filtrar stop-words, (3) aplicar sinónimos. Documentar en comentario. |
| 8 | Tiempo por query crece con FAQ_DB futuro (150+ entradas) | Baja | Bajo | A 200 entradas, el cálculo sigue siendo O(N × avg_ngrams) ≈ 200 × 50 = 10k ops → < 2ms. El delay artificial de 600ms domina. |
| 9 | El index.html es un archivo gigante y el diff es difícil de revisar | Alta | Bajo | Estructurar el cambio en 3 commits independientes: (1) mover FAQ_DB + agregar constantes, (2) agregar helpers + índice, (3) reescribir respondLocal + fallback. Cada commit debe dejar el sistema funcionando. |
| 10 | Usuarios con JavaScript muy limitado (celulares antiguos) podrían tener problemas con `String.prototype.normalize('NFD')` | Muy baja | Bajo | `normalize()` está soportado desde ~2015 en todos los navegadores móviles. El código actual ya lo usa. Sin regresión. |

---

## 6. Decisión final

**PROMOVER HÍBRIDA C+A.** Score 8.17/10. Mejor relación valor/complejidad, respeta todas las restricciones (no IA, no API, client-side vanilla), cubre los dos modos de fallo reportados (typos + reformulaciones) y preserva la voz del chatbot sin introducir flujos nuevos de UX (como el "clarify" de B).

**Evitar B** hasta que el negocio tenga un equipo técnico dedicado que pueda mantener el doble índice (intents ↔ FAQ_DB). Para una pyme gastronómica con un link-in-bio, la complejidad operativa de B la descalifica como primera iteración.

**A y C individuales no ganarían solas:** A falla en typos (el 50% de los casos de falla en móvil), C falla en reformulaciones puras. Solo la combinación cubre ambos flancos.

**Próxima iteración** (si el híbrido demuestra ser insuficiente post-despliegue): considerar agregar Levenshtein solo en el paso de `_canonicalizeTokens` — si un token no está en `SYNONYM_MAP` ni es stop-word, buscar su vecino a distancia ≤ 2 en el keyset del mapa. Esto agregaría la robustez extra de B sin sus intents. Pero solo hacer esto si la telemetría post-lanzamiento muestra que el híbrido no alcanza el 90% de aciertos.

---

*Veredicto generado por agent-evaluator — 2026-04-24*
*Próximo paso: entregar este documento al agente implementador junto con `propuesta-A-tfidf.md` y `propuesta-C-ngrams-jaccard.md` como referencias técnicas.*
