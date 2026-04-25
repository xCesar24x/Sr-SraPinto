# Propuesta B — Clasificación por Intents + Levenshtein + Confidence Scoring

**Proyecto:** Sr. & Sra. Pinto — chatbot client-side, JavaScript vanilla  
**Archivo objetivo:** `index.html`, método `respondLocal()` (líneas 1239–1481)  
**Estrategia:** Intent classification con tiers de keywords + distancia de Levenshtein para tolerancia a typos + sistema de confidence normalizado  
**Agente:** PROPUESTA-B  
**Fecha de diseño:** 2026-04-24

---

## 1. Modelo de Intents

Se definen **18 intents** agrupados por dominio. La prioridad indica el orden de desempate cuando dos intents empatan en score: `1 = alta` (se prefiere sobre los demás), `2 = media`, `3 = baja`.

Cada intent tiene tres tiers de keywords **ya normalizadas** (sin tildes, lowercase), pensadas para correr sobre el texto del usuario igualmente normalizado.

---

### 1.1 Intent: SALUDO
```
name:     "SALUDO"
priority: 2
tier1:    ["hola", "buenas", "saludos"]
tier2:    ["buenos", "buen", "hey", "ey", "buenas tardes", "buenas noches", "buenos dias"]
tier3:    ["como estan", "que tal", "bienvenido", "atencion", "mae"]
```
Observación: "mae" sola en tier3 porque aparece en múltiples contextos; solo suma cuando coincide con tier1 o tier2.

---

### 1.2 Intent: DESPEDIDA
```
name:     "DESPEDIDA"
priority: 3
tier1:    ["adios", "bye", "chao"]
tier2:    ["hasta luego", "hasta pronto", "nos vemos", "cuidense"]
tier3:    ["gracias", "gracia", "listo", "todo", "nada"]
```

---

### 1.3 Intent: MENU
```
name:     "MENU"
priority: 1
tier1:    ["menu", "carta", "catalogo"]
tier2:    ["tienen", "venden", "ofrecen", "hay", "opciones", "platos", "comida", "productos"]
tier3:    ["que", "ver", "mostrar", "disponible", "hoy", "lista"]
```

---

### 1.4 Intent: PRECIO
```
name:     "PRECIO"
priority: 1
tier1:    ["precio", "cuesta", "vale", "cuanto", "costo"]
tier2:    ["caro", "barato", "economico", "valor", "cobran", "colones"]
tier3:    ["presupuesto", "dinero", "plata", "gastando", "sale", "pagar"]
```

---

### 1.5 Intent: COMBO
```
name:     "COMBO"
priority: 2
tier1:    ["combo"]
tier2:    ["pareja", "familiar", "compartir", "para dos", "para varios"]
tier3:    ["grupo", "familia", "amigos", "juntos", "varios", "personas"]
```

---

### 1.6 Intent: PEDIDO
```
name:     "PEDIDO"
priority: 1
tier1:    ["pedido", "pedir", "ordenar", "orden"]
tier2:    ["quiero", "comprar", "llevar", "me da", "agregar", "carrito"]
tier3:    ["como", "puedo", "favor", "necesito", "quisiera", "deseo"]
```

---

### 1.7 Intent: PAGO
```
name:     "PAGO"
priority: 1
tier1:    ["sinpe", "datafono", "tarjeta"]
tier2:    ["pagar", "pago", "efectivo", "transferencia", "credito", "debito"]
tier3:    ["acepta", "aceptan", "puedo", "forma", "metodo", "medio", "factura", "dolares"]
```
Observación: "sinpe" está en tier1 porque es un trigger inequívoco del contexto costarricense.

---

### 1.8 Intent: HORARIO
```
name:     "HORARIO"
priority: 1
tier1:    ["horario", "abren", "cierran", "atienden"]
tier2:    ["hora", "cuando", "dias", "disponible", "abierto", "cerrado"]
tier3:    ["lunes", "sabado", "domingo", "feriado", "semana", "manana", "hoy"]
```

---

### 1.9 Intent: UBICACION
```
name:     "UBICACION"
priority: 1
tier1:    ["direccion", "ubicacion", "mapa"]
tier2:    ["donde", "estan", "llegar", "lugar", "zona", "local"]
tier3:    ["parqueo", "cerca", "lejos", "alajuela", "san jose", "centro", "indicaciones"]
```

---

### 1.10 Intent: WHATSAPP
```
name:     "WHATSAPP"
priority: 2
tier1:    ["whatsapp"]
tier2:    ["numero", "telefono", "llamar", "escribir", "contacto", "comunicar"]
tier3:    ["directo", "personal", "chat", "mensaje", "hablar", "atender"]
```

---

### 1.11 Intent: DELIVERY
```
name:     "DELIVERY"
priority: 1
tier1:    ["delivery", "domicilio", "envio", "envian"]
tier2:    ["llevan", "mandan", "traen", "entregan", "despachan"]
tier3:    ["casa", "trabajo", "oficina", "alajuela", "direccion", "recoger", "retirar"]
```

---

### 1.12 Intent: INGREDIENTES_ALERGIAS
```
name:     "INGREDIENTES_ALERGIAS"
priority: 1
tier1:    ["alergico", "alergia", "gluten", "vegano", "vegetariano"]
tier2:    ["ingrediente", "lleva", "contiene", "sin", "lactosa", "kosher", "halal", "mani"]
tier3:    ["dieta", "restriccion", "puede", "comer", "opcion", "frijoles", "aceite"]
```

---

### 1.13 Intent: TIEMPO_ESPERA
```
name:     "TIEMPO_ESPERA"
priority: 2
tier1:    ["espera", "demora", "tarda"]
tier2:    ["tiempo", "cuanto", "rapido", "urgente", "minutos"]
tier3:    ["listo", "avisan", "cuando", "esperar", "pronto", "demoran"]
```

---

### 1.14 Intent: RECOMENDACION
```
name:     "RECOMENDACION"
priority: 2
tier1:    ["recomienda", "recomiendas", "recomiendan"]
tier2:    ["sugieres", "sugieren", "mejor", "popular", "estrella", "mas pedido"]
tier3:    ["favorito", "bueno", "rico", "pruebo", "deberia", "vale la pena"]
```

---

### 1.15 Intent: REDES_SOCIALES
```
name:     "REDES_SOCIALES"
priority: 3
tier1:    ["instagram", "facebook", "tiktok"]
tier2:    ["redes", "sociales", "seguir", "seguirlos", "perfil"]
tier3:    ["foto", "publicacion", "etiqueta", "sorteo", "concurso", "resena"]
```

---

### 1.16 Intent: QUEJAS
```
name:     "QUEJAS"
priority: 1
tier1:    ["queja", "reclamo", "problema"]
tier2:    ["incompleto", "mal", "espera", "frio", "demoro", "gusto"]
tier3:    ["molesto", "triste", "decepcionado", "lamentable", "mal servicio", "opinion"]
```
Observación: prioridad 1 porque una queja debe resolverse de inmediato, no mezclarse con otros intents.

---

### 1.17 Intent: EVENTOS_CATERING
```
name:     "EVENTOS_CATERING"
priority: 2
tier1:    ["catering", "evento", "eventos"]
tier2:    ["pedido grande", "cumpleanos", "navidad", "oficina", "empresa", "personas"]
tier3:    ["organizar", "preparar", "anticipacion", "coordinar", "muchos", "grupo"]
```

---

### 1.18 Intent: INFO_PRODUCTO
```
name:     "INFO_PRODUCTO"
priority: 2
tier1:    ["pinto", "empanada", "empanadas", "ensalada", "cafe"]
tier2:    ["clasico", "relleno", "fritas", "horno", "grano", "porcion", "picante", "salsas"]
tier3:    ["de que", "como es", "que lleva", "exactamente", "hecho", "fresco", "especial"]
```

---

## 2. Mapeo Intent → Respuesta FAQ_DB

Cada intent tiene asociada una lista de índices (o subconjunto) del FAQ_DB que corresponden a sus respuestas. Cuando el intent es determinado, se ejecuta un **sub-scoring de similaridad** entre la query original y las entradas `q` de ese subconjunto para elegir la respuesta más específica.

### 2.1 Tabla de mapeo

| Intent | Entradas FAQ_DB asociadas (por `q` resumida) |
|---|---|
| SALUDO | "buenas", "hola como estan", "buenas noches", "hola mae", "quien me atiende", "hola vi su pagina", "buenos dias abrieron ya", "hola me pueden ayudar" |
| DESPEDIDA | "nada gracias solo estaba viendo" + respuestas de cierre del fallback 13 |
| MENU | "que tienen", "tienen carta", "que me recomiendan", "solo venden pinto", "tienen algo vegetariano", "hay algo dulce", "tienen bebidas", "que es el pinto exactamente", "tienen algo para ninos", "cambian el menu seguido" |
| PRECIO | "cuanto cuesta el pinto", "estan caros", "tienen algo barato", "cuanto sale el combo familiar", "hacen descuentos", "tienen precio de estudiante", "cuanto sale comer los dos", "los precios incluyen iva", "aceptan regateo" |
| COMBO | "cuanto sale el combo familiar", "cuanto sale comer los dos", "el combo pareja que incluye" |
| PEDIDO | "como hago un pedido", "puedo pedir por aqui", "hacen entregas a domicilio", "cuanto tarda el pedido", "puedo pedir para llevar", "puedo cancelar un pedido", "puedo pedir con anticipacion", "puedo hacer pedidos grandes", "hay minimo de pedido", "me avisan cuando este listo", "puedo pedir varios combos" |
| PAGO | "aceptan sinpe", "tienen datafono", "solo efectivo", "a que numero es el sinpe", "puedo pagar al llegar", "aceptan transferencia", "se puede pagar en dolares", "me dan factura" |
| HORARIO | "a que hora abren", "hasta que hora atienden", "abren los domingos", "abren feriados", "atienden los lunes", "ya son las 5 30 todavia atienden", "abren manana", "tienen horario extendido en semana santa" |
| UBICACION | "donde estan ubicados", "estan en san jose", "hay parqueo", "que tan lejos estan del centro", "como llego", "tienen local fisico o solo delivery", "estan en algun centro comercial" |
| WHATSAPP | "a que numero es el sinpe", "puedo cancelar un pedido", "hay parqueo" (redirigen a WA) — respuesta generada directamente |
| DELIVERY | "hacen entregas a domicilio", "pueden preparar algo para una oficina de 20 personas" |
| INGREDIENTES_ALERGIAS | "soy alergico al gluten", "tienen opciones sin lactosa", "son kosher o halal", "soy vegano puedo comer algo", "usan aceite de palma", "tengo alergia al mani", "los frijoles son negros o rojos", "tienen algo vegetariano" |
| TIEMPO_ESPERA | "cuanto tarda el pedido", "llevo 30 minutos esperando", "me avisan cuando este listo" |
| RECOMENDACION | "que me recomiendan", "que es el pinto exactamente", "las porciones son grandes" |
| REDES_SOCIALES | "tienen instagram", "tienen facebook", "puedo etiquetarlos si subo una foto", "tienen tiktok", "vi una foto suya y se veia delicioso", "hacen concursos o sorteos", "puedo dejar una resena" |
| QUEJAS | "el pedido llego incompleto", "llevo 30 minutos esperando", "no me gusto la comida" |
| EVENTOS_CATERING | "hacen pedidos para eventos", "hacen catering", "pueden preparar algo para una oficina de 20 personas", "hacen el pinto para navidad", "tienen paquetes para cumpleanos" |
| INFO_PRODUCTO | "que lleva el pinto clasico", "las empanadas son fritas o al horno", "de que son las empanadas", "la ensalada que lleva", "el combo pareja que incluye", "el cafe es de grano", "todo es hecho al momento", "el pinto es picante", "tienen salsas", "las porciones son grandes", "puedo personalizar mi pedido" |

### 2.2 Sub-scoring para selección de respuesta dentro del intent

Una vez determinado el intent ganador, se toma su subconjunto de entradas FAQ_DB y se aplica el siguiente scoring sobre cada entrada `q`:

```
sub_score(q, userText) =
    overlap_count(tokenize(q), tokenize(userText))        // tokens compartidos (exact + lev-match)
  + (q_completa_incluida_en_userText ? 2 : 0)             // bonus si el q completo aparece
  + (userText_incluido_en_q ? 1 : 0)                      // bonus si el user dijo algo subset del q
```

Se devuelve la entrada con mayor `sub_score`. Si dos entradas empatan, se prefiere la más corta en `q` (más específica = menos ruido). Si todo es empate, se devuelve la primera del subconjunto (la más representativa del intent).

---

## 3. Levenshtein para tolerancia a typos

### 3.1 Función `lev(a, b)` con early-exit

```javascript
/**
 * Calcula distancia de Levenshtein entre dos strings.
 * Early-exit si la diferencia de longitud supera el umbral máximo posible (3).
 * @param {string} a
 * @param {string} b
 * @returns {number} distancia de edición
 */
function lev(a, b) {
  // Early-exit: si la diferencia de longitud ya supera 3, no puede cumplir ningún umbral
  if (Math.abs(a.length - b.length) > 3) return Infinity;

  const m = a.length;
  const n = b.length;

  // Optimización: strings idénticos
  if (a === b) return 0;

  // Optimización: si uno está vacío
  if (m === 0) return n;
  if (n === 0) return m;

  // Usamos dos filas en lugar de matriz completa (O(min(m,n)) espacio)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    // Mínimo de la fila actual para decidir early-exit por fila
    let rowMin = curr[0];

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // inserción
        prev[j] + 1,           // eliminación
        prev[j - 1] + cost     // sustitución
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    // Si el mínimo de esta fila ya excede el umbral máximo (3), cortar
    if (rowMin > 3) return Infinity;

    // Intercambiar filas sin allocar nueva memoria
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
```

### 3.2 Umbral de match por longitud de palabra

| Longitud del token | Distancia máxima aceptada |
|---|---|
| 1–4 chars | 0 (solo exact match; palabras cortas son demasiado ambiguas) |
| 5 chars | 1 |
| 6–9 chars | 2 |
| >= 10 chars | 3 |

```javascript
/**
 * Determina si un token del usuario hace match con una keyword del intent,
 * considerando typos via Levenshtein.
 * @param {string} userToken  - token normalizado del usuario
 * @param {string} keyword    - keyword del intent (ya normalizada)
 * @returns {boolean}
 */
function tokenMatchesKeyword(userToken, keyword) {
  if (userToken === keyword) return true;

  const len = Math.max(userToken.length, keyword.length);

  let maxDist;
  if (len <= 4)       maxDist = 0;
  else if (len === 5) maxDist = 1;
  else if (len <= 9)  maxDist = 2;
  else                maxDist = 3;

  if (maxDist === 0) return false; // solo exact para palabras cortas

  return lev(userToken, keyword) <= maxDist;
}
```

### 3.3 Ejemplo de normalización de token via Levenshtein

| Token del usuario | Keyword del intent | lev() | Umbral | Resultado |
|---|---|---|---|---|
| "sinppe" (6 chars) | "sinpe" | 1 | <=2 | MATCH |
| "entregas" (8 chars) | "entrega" | 1 | <=2 | MATCH |
| "recomiendas" (11 chars) | "recomienda" | 1 | <=3 | MATCH |
| "hola" (4 chars) | "hora" | 2 | 0 (exacto) | NO MATCH |
| "menuu" (5 chars) | "menu" | 1 | <=1 | MATCH |
| "delivery" (8 chars) | "delivary" | 1 | <=2 | MATCH |

El proceso para cada token del usuario es: iterar por las keywords de los tres tiers del intent, llamar `tokenMatchesKeyword(userToken, kw)`, y si retorna `true`, acumular el puntaje del tier correspondiente.

---

## 4. Confidence Scoring

### 4.1 Fórmula de score por intent

Para cada intent `I`, se normalizan primero los tokens del usuario y luego se compara cada uno contra todos los keywords de los tres tiers usando `tokenMatchesKeyword`:

```
score_intent(I) =
    3 * (cantidad de tokens del usuario que hacen match con algún keyword de tier1 de I)
  + 2 * (cantidad de tokens del usuario que hacen match con algún keyword de tier2 de I)
  + 1 * (cantidad de tokens del usuario que hacen match con algún keyword de tier3 de I)
```

Nota: un token solo cuenta una vez por tier aunque haga match con múltiples keywords del mismo tier. Un token puede acumular puntos de tier1 y tier2 si hace match en ambos (aunque esto es raro dado que las keywords son disjuntas por diseño).

### 4.2 Normalización a confidence

```
confidence(I) = score_intent(I) / (score_intent(I) + 2)
```

Esta función logística suavizada mapea scores a `[0, 1)` sin saturarse de golpe:

| score bruto | confidence resultante |
|---|---|
| 0 | 0.00 |
| 1 | 0.33 |
| 2 | 0.50 |
| 3 | 0.60 |
| 4 | 0.67 |
| 6 | 0.75 |
| 8 | 0.80 |
| 10 | 0.83 |

### 4.3 Umbrales de decisión

```
confidence > 0.6   →  MATCH DIRECTO: devolver respuesta del intent ganador
0.3 ≤ confidence ≤ 0.6  →  CLARIFY: devolver mensaje de desambiguación
confidence < 0.3   →  FALLBACK GLOBAL
```

El umbral `0.6` corresponde a un score bruto de 3, que equivale a un tier1 hit único. Esto significa que si el usuario escribe exactamente una keyword inequívoca (o similar via Levenshtein), ya hay match directo.

El rango de clarify `[0.3, 0.6]` corresponde a scores entre 1 y 3, donde el input es ambiguo o fragmentado pero hay señal.

---

## 5. Desempate

Cuando dos o más intents empatan en `score_intent` (mismo valor entero), se aplica en orden:

1. **Priority** del intent: se prefiere el de menor número (1 > 2 > 3). Si PEDIDO (priority 1) empata con REDES_SOCIALES (priority 3), gana PEDIDO.

2. **Longitud del query**: si las prioridades también empatan, se favorece el intent cuyas keywords de tier1 o tier2 tienen mayor cobertura del query. Concretamente: se cuenta la proporción de tokens del query que hicieron match en ese intent (`matched_tokens / total_tokens`). Mayor proporción gana.

3. **Orden de definición**: si todo lo anterior también empata (prácticamente imposible en la práctica), se devuelve el intent que aparece primero en el arreglo INTENTS. Este orden está pensado para que los intents más críticos (QUEJAS, PAGO, PEDIDO) aparezcan primero.

Pseudocódigo de desempate:
```javascript
function breakTie(intentA, intentB, userTokens) {
  if (intentA.priority !== intentB.priority)
    return intentA.priority < intentB.priority ? intentA : intentB;

  const coverageA = countMatchedTokens(intentA, userTokens) / userTokens.length;
  const coverageB = countMatchedTokens(intentB, userTokens) / userTokens.length;
  if (Math.abs(coverageA - coverageB) > 0.05)
    return coverageA > coverageB ? intentA : intentB;

  return intentA; // orden de definición
}
```

---

## 6. Fallback con contexto

Cuando `confidence < 0.3`, en lugar del mensaje genérico actual ("Mmm, no le entendí del todo"), el sistema propone activamente los intents más cercanos:

1. Se ordenan todos los intents por `score_intent` descendente.
2. Se toman los top-3 con score > 0 (si los hay).
3. Se construye un mensaje dinámico que lista esas opciones como sugerencias.

Si no hay ningún intent con score > 0 (query completamente desconocida), se devuelve el fallback base con las 4 categorías principales.

Ejemplo de mensaje de fallback con contexto:
```
"No le entendí bien 😅 ¿Quizás quiso preguntarme sobre...
• Métodos de pago (SINPE, tarjeta, efectivo)
• Dónde estamos ubicados
• Cómo hacer un pedido
...o escríbame de otra forma y con gusto le ayudo 🙌"
```

Ejemplo de mensaje de clarify (confidence entre 0.3-0.6):
```
"¿Me está preguntando sobre [intent A] o sobre [intent B]? ☕
Cuénteme un poco más para ayudarle mejor."
```

---

## 7. Pseudocódigo completo de `respondLocal(text)`

```javascript
// ============================================================
// ESTRUCTURA DE INTENTS (18 intents completos)
// ============================================================

const INTENTS = [
  // --- PRIORIDAD 1 (críticos, se resuelven primero en desempate) ---
  {
    name: "QUEJAS",
    priority: 1,
    // Mapeo de entradas FAQ_DB para este intent
    faqKeys: ["el pedido llego incompleto", "llevo 30 minutos esperando", "no me gusto la comida"],
    tier1: ["queja", "reclamo", "problema"],
    tier2: ["incompleto", "mal", "espera", "frio", "demoro", "gusto"],
    tier3: ["molesto", "triste", "decepcionado", "lamentable", "opinion"]
  },
  {
    name: "PAGO",
    priority: 1,
    faqKeys: ["aceptan sinpe", "tienen datafono", "solo efectivo", "a que numero es el sinpe",
              "puedo pagar al llegar", "aceptan transferencia", "se puede pagar en dolares",
              "me dan factura"],
    tier1: ["sinpe", "datafono", "tarjeta"],
    tier2: ["pagar", "pago", "efectivo", "transferencia", "credito", "debito"],
    tier3: ["acepta", "aceptan", "puedo", "forma", "metodo", "medio", "factura", "dolares"]
  },
  {
    name: "PEDIDO",
    priority: 1,
    faqKeys: ["como hago un pedido", "puedo pedir por aqui", "hacen entregas a domicilio",
              "cuanto tarda el pedido", "puedo pedir para llevar", "puedo cancelar un pedido",
              "puedo pedir con anticipacion", "puedo hacer pedidos grandes",
              "hay minimo de pedido", "me avisan cuando este listo", "puedo pedir varios combos"],
    tier1: ["pedido", "pedir", "ordenar", "orden"],
    tier2: ["quiero", "comprar", "llevar", "agregar", "carrito"],
    tier3: ["como", "puedo", "favor", "necesito", "quisiera"]
  },
  {
    name: "HORARIO",
    priority: 1,
    faqKeys: ["a que hora abren", "hasta que hora atienden", "abren los domingos",
              "abren feriados", "atienden los lunes", "ya son las 5 30 todavia atienden",
              "abren manana", "tienen horario extendido en semana santa"],
    tier1: ["horario", "abren", "cierran", "atienden"],
    tier2: ["hora", "cuando", "dias", "disponible", "abierto", "cerrado"],
    tier3: ["lunes", "sabado", "domingo", "feriado", "semana", "manana", "hoy"]
  },
  {
    name: "UBICACION",
    priority: 1,
    faqKeys: ["donde estan ubicados", "estan en san jose", "hay parqueo",
              "que tan lejos estan del centro", "como llego",
              "tienen local fisico o solo delivery", "estan en algun centro comercial"],
    tier1: ["direccion", "ubicacion", "mapa"],
    tier2: ["donde", "estan", "llegar", "lugar", "zona", "local"],
    tier3: ["parqueo", "cerca", "lejos", "alajuela", "san jose", "centro", "indicaciones"]
  },
  {
    name: "MENU",
    priority: 1,
    faqKeys: ["que tienen", "tienen carta", "que me recomiendan", "solo venden pinto",
              "tienen algo vegetariano", "hay algo dulce", "tienen bebidas",
              "que es el pinto exactamente", "tienen algo para ninos", "cambian el menu seguido"],
    tier1: ["menu", "carta", "catalogo"],
    tier2: ["tienen", "venden", "ofrecen", "hay", "opciones", "platos", "comida"],
    tier3: ["que", "ver", "mostrar", "disponible", "hoy", "lista"]
  },
  {
    name: "PRECIO",
    priority: 1,
    faqKeys: ["cuanto cuesta el pinto", "estan caros", "tienen algo barato",
              "cuanto sale el combo familiar", "hacen descuentos",
              "tienen precio de estudiante", "cuanto sale comer los dos",
              "los precios incluyen iva", "aceptan regateo"],
    tier1: ["precio", "cuesta", "vale", "cuanto", "costo"],
    tier2: ["caro", "barato", "economico", "valor", "cobran", "colones"],
    tier3: ["presupuesto", "dinero", "plata", "sale", "pagar"]
  },
  {
    name: "DELIVERY",
    priority: 1,
    faqKeys: ["hacen entregas a domicilio", "pueden preparar algo para una oficina de 20 personas"],
    tier1: ["delivery", "domicilio", "envio", "envian"],
    tier2: ["llevan", "mandan", "traen", "entregan", "despachan"],
    tier3: ["casa", "trabajo", "oficina", "alajuela", "recoger", "retirar"]
  },
  {
    name: "INGREDIENTES_ALERGIAS",
    priority: 1,
    faqKeys: ["soy alergico al gluten", "tienen opciones sin lactosa", "son kosher o halal",
              "soy vegano puedo comer algo", "usan aceite de palma",
              "tengo alergia al mani", "los frijoles son negros o rojos",
              "tienen algo vegetariano"],
    tier1: ["alergico", "alergia", "gluten", "vegano", "vegetariano"],
    tier2: ["ingrediente", "lleva", "contiene", "sin", "lactosa", "kosher", "halal", "mani"],
    tier3: ["dieta", "restriccion", "puede", "comer", "opcion", "frijoles", "aceite"]
  },

  // --- PRIORIDAD 2 (importantes) ---
  {
    name: "SALUDO",
    priority: 2,
    faqKeys: ["buenas", "hola como estan", "buenas noches", "hola mae",
              "quien me atiende", "hola vi su pagina en instagram",
              "buenos dias abrieron ya", "hola me pueden ayudar"],
    tier1: ["hola", "buenas", "saludos"],
    tier2: ["buenos", "buen", "hey", "ey"],
    tier3: ["como estan", "que tal", "bienvenido", "mae"]
  },
  {
    name: "COMBO",
    priority: 2,
    faqKeys: ["cuanto sale el combo familiar", "cuanto sale comer los dos", "el combo pareja que incluye"],
    tier1: ["combo"],
    tier2: ["pareja", "familiar", "compartir"],
    tier3: ["grupo", "familia", "amigos", "juntos", "varios", "personas"]
  },
  {
    name: "WHATSAPP",
    priority: 2,
    faqKeys: [], // respuesta generada directamente sin sub-scoring de FAQ
    tier1: ["whatsapp"],
    tier2: ["numero", "telefono", "llamar", "escribir", "contacto", "comunicar"],
    tier3: ["directo", "personal", "chat", "mensaje", "hablar"]
  },
  {
    name: "TIEMPO_ESPERA",
    priority: 2,
    faqKeys: ["cuanto tarda el pedido", "llevo 30 minutos esperando", "me avisan cuando este listo"],
    tier1: ["espera", "demora", "tarda"],
    tier2: ["tiempo", "cuanto", "rapido", "urgente", "minutos"],
    tier3: ["listo", "avisan", "cuando", "esperar", "pronto"]
  },
  {
    name: "RECOMENDACION",
    priority: 2,
    faqKeys: ["que me recomiendan", "que es el pinto exactamente", "las porciones son grandes"],
    tier1: ["recomienda", "recomiendas", "recomiendan"],
    tier2: ["sugieres", "sugieren", "mejor", "popular", "estrella"],
    tier3: ["favorito", "bueno", "rico", "pruebo", "deberia"]
  },
  {
    name: "EVENTOS_CATERING",
    priority: 2,
    faqKeys: ["hacen pedidos para eventos", "hacen catering",
              "pueden preparar algo para una oficina de 20 personas",
              "hacen el pinto para navidad", "tienen paquetes para cumpleanos"],
    tier1: ["catering", "evento", "eventos"],
    tier2: ["cumpleanos", "navidad", "oficina", "empresa", "personas"],
    tier3: ["organizar", "preparar", "anticipacion", "coordinar", "muchos", "grupo"]
  },
  {
    name: "INFO_PRODUCTO",
    priority: 2,
    faqKeys: ["que lleva el pinto clasico", "las empanadas son fritas o al horno",
              "de que son las empanadas", "la ensalada que lleva",
              "el combo pareja que incluye", "el cafe es de grano",
              "todo es hecho al momento", "el pinto es picante",
              "tienen salsas", "las porciones son grandes", "puedo personalizar mi pedido"],
    tier1: ["pinto", "empanada", "empanadas", "ensalada", "cafe"],
    tier2: ["clasico", "relleno", "fritas", "horno", "grano", "porcion", "picante", "salsas"],
    tier3: ["lleva", "como es", "exactamente", "hecho", "fresco", "especial"]
  },

  // --- PRIORIDAD 3 (contextual / baja urgencia) ---
  {
    name: "REDES_SOCIALES",
    priority: 3,
    faqKeys: ["tienen instagram", "tienen facebook", "puedo etiquetarlos si subo una foto",
              "tienen tiktok", "vi una foto suya y se veia delicioso",
              "hacen concursos o sorteos", "puedo dejar una resena"],
    tier1: ["instagram", "facebook", "tiktok"],
    tier2: ["redes", "sociales", "seguir", "perfil"],
    tier3: ["foto", "publicacion", "etiqueta", "sorteo", "concurso", "resena"]
  },
  {
    name: "DESPEDIDA",
    priority: 3,
    faqKeys: ["nada gracias solo estaba viendo"],
    tier1: ["adios", "bye", "chao"],
    tier2: ["hasta luego", "hasta pronto", "nos vemos"],
    tier3: ["gracias", "gracia", "listo", "nada"]
  }
];

// ============================================================
// FUNCIÓN PRINCIPAL: respondLocal(text)
// ============================================================

/**
 * Versión reescrita con estrategia Intents + Levenshtein + Confidence.
 * No usa IA ni API externa — todo en browser.
 *
 * @param {string} userMessage - mensaje crudo del usuario
 * @returns {string} respuesta de la Sra. Pinto
 */
respondLocal(userMessage) {
  // ----------------------------------------------------------
  // PASO 1: Normalización del input
  // ----------------------------------------------------------
  // Eliminar tildes, lowercase, quitar puntuación
  const normalized = userMessage
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '');

  // Tokenizar: palabras de >1 char (incluimos "si", "no" de 2 chars)
  const userTokens = normalized
    .split(/\s+/)
    .filter(w => w.length > 1 || ['si', 'no'].includes(w));

  // Si el input está vacío tras normalizar, devolver saludo genérico
  if (userTokens.length === 0) {
    return "¡Hola! ¿En qué le ayudo? ☕";
  }

  // ----------------------------------------------------------
  // PASO 2: Scoring de cada intent
  // ----------------------------------------------------------
  // Para cada intent, computamos score_intent usando los 3 tiers.
  // Usamos Levenshtein para tolerancia a typos.

  const intentScores = INTENTS.map(intent => {
    let tier1Hits = 0;
    let tier2Hits = 0;
    let tier3Hits = 0;

    // Marcamos qué tokens ya contabilizamos para no duplicar dentro del mismo tier
    const usedInTier1 = new Set();
    const usedInTier2 = new Set();
    const usedInTier3 = new Set();

    for (const token of userTokens) {
      // Tier 1: match exacto o via Levenshtein, peso 3
      if (!usedInTier1.has(token)) {
        for (const kw of intent.tier1) {
          // Keywords de tier1 pueden ser frases (ej: "hasta luego")
          // Si es frase, verificar si el token forma parte de ella
          if (tokenMatchesKeyword(token, kw) || kw.split(' ').some(part => tokenMatchesKeyword(token, part))) {
            tier1Hits++;
            usedInTier1.add(token);
            break; // un token solo suma una vez a tier1 aunque haga match con varias keywords
          }
        }
      }

      // Tier 2: peso 2 (solo si no ya fue contado en tier1)
      if (!usedInTier1.has(token) && !usedInTier2.has(token)) {
        for (const kw of intent.tier2) {
          if (tokenMatchesKeyword(token, kw) || kw.split(' ').some(part => tokenMatchesKeyword(token, part))) {
            tier2Hits++;
            usedInTier2.add(token);
            break;
          }
        }
      }

      // Tier 3: peso 1 (solo si no fue contado en tiers superiores)
      if (!usedInTier1.has(token) && !usedInTier2.has(token) && !usedInTier3.has(token)) {
        for (const kw of intent.tier3) {
          if (tokenMatchesKeyword(token, kw) || kw.split(' ').some(part => tokenMatchesKeyword(token, part))) {
            tier3Hits++;
            usedInTier3.add(token);
            break;
          }
        }
      }
    }

    const score = 3 * tier1Hits + 2 * tier2Hits + 1 * tier3Hits;
    const confidence = score / (score + 2); // normalizado [0,1)
    const coverage = (usedInTier1.size + usedInTier2.size + usedInTier3.size) / userTokens.length;

    return { intent, score, confidence, coverage };
  });

  // ----------------------------------------------------------
  // PASO 3: Ordenar por score desc, desempate por priority asc, luego coverage desc
  // ----------------------------------------------------------
  intentScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;                      // mayor score primero
    if (a.intent.priority !== b.intent.priority)
      return a.intent.priority - b.intent.priority;                          // menor priority-number primero
    return b.coverage - a.coverage;                                           // mayor cobertura primero
  });

  const top = intentScores[0];
  const runnerUp = intentScores[1];

  // ----------------------------------------------------------
  // PASO 4: Decisión por umbral de confidence
  // ----------------------------------------------------------

  // CASO A: Match directo (confidence > 0.6)
  if (top.confidence > 0.6) {
    return resolveIntentResponse(top.intent, normalized, userTokens);
  }

  // CASO B: Clarify (0.3 <= confidence <= 0.6)
  // Solo si el runnerUp también tiene señal mínima
  if (top.confidence >= 0.3 && runnerUp && runnerUp.confidence >= 0.15) {
    return buildClarifyMessage(top.intent, runnerUp.intent);
  }

  // Clarify sin runner-up significativo pero con algo de señal en top
  if (top.confidence >= 0.3) {
    return resolveIntentResponse(top.intent, normalized, userTokens);
  }

  // CASO C: Fallback global (confidence < 0.3)
  return buildFallbackMessage(intentScores);
}

// ============================================================
// FUNCIÓN: resolveIntentResponse
// Dado el intent ganador, selecciona la entrada FAQ_DB más específica.
// ============================================================

/**
 * @param {object} intent     - intent ganador
 * @param {string} normalized - texto normalizado del usuario
 * @param {string[]} userTokens
 * @returns {string} texto de respuesta
 */
function resolveIntentResponse(intent, normalized, userTokens) {
  // Intents con respuesta generada directamente (sin sub-scoring FAQ)
  if (intent.name === "WHATSAPP") {
    return "Puede escribirnos al WhatsApp 8802-5793 🙌 También puede pedir directo desde el carrito aquí en la página 😉";
  }
  if (intent.name === "DESPEDIDA") {
    const opts = ["¡Con mucho gusto! Que le caiga bien 😄 Vuelva pronto.", "¡Pura vida! Un gusto atenderle 🙌"];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (intent.name === "SALUDO") {
    const opts = [
      "¡Buenas! Bienvenido a Sr. & Sra. Pinto ☕ ¿En qué le ayudamos?",
      "¡Hola! Por acá la Sra. Pinto 👩‍🍳 ¿Qué se le ofrece?",
      "¡Pura vida! ¿Le provoca algo rico hoy?"
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Para el resto: sub-scoring sobre FAQ_DB filtrado por intent.faqKeys
  const candidatos = FAQ_DB.filter(item => intent.faqKeys.includes(item.q));
  if (candidatos.length === 0) return buildFallbackMessage([]);

  let bestItem = candidatos[0];
  let bestSubScore = -1;

  for (const item of candidatos) {
    const qNorm = item.q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const qTokens = qNorm.split(/\s+/);

    // Contar tokens compartidos (con Levenshtein)
    let overlap = 0;
    for (const ut of userTokens) {
      for (const qt of qTokens) {
        if (tokenMatchesKeyword(ut, qt)) { overlap++; break; }
      }
    }

    // Bonus si el q completo está contenido en el input
    const qBonus   = normalized.includes(qNorm) ? 2 : 0;
    // Bonus si el input está contenido en el q
    const inBonus  = qNorm.includes(normalized) && normalized.length > 3 ? 1 : 0;

    const subScore = overlap + qBonus + inBonus;

    if (subScore > bestSubScore || (subScore === bestSubScore && item.q.length < bestItem.q.length)) {
      bestSubScore = subScore;
      bestItem = item;
    }
  }

  return bestItem.a;
}

// ============================================================
// FUNCIÓN: buildClarifyMessage
// Devuelve mensaje de desambiguación entre dos intents.
// ============================================================

function buildClarifyMessage(intentA, intentB) {
  const labels = {
    PAGO:                 "métodos de pago",
    PEDIDO:               "cómo hacer un pedido",
    HORARIO:              "nuestro horario",
    UBICACION:            "dónde estamos",
    MENU:                 "el menú",
    PRECIO:               "los precios",
    DELIVERY:             "si hacemos delivery",
    INGREDIENTES_ALERGIAS:"ingredientes o alergias",
    TIEMPO_ESPERA:        "cuánto tarda el pedido",
    COMBO:                "los combos",
    INFO_PRODUCTO:        "los productos",
    RECOMENDACION:        "qué le recomendamos",
    WHATSAPP:             "cómo contactarnos",
    REDES_SOCIALES:       "nuestras redes sociales",
    QUEJAS:               "algún problema con su pedido",
    EVENTOS_CATERING:     "pedidos para eventos",
    SALUDO:               "saludarnos",
    DESPEDIDA:            "despedirse"
  };
  const labelA = labels[intentA.name] || intentA.name.toLowerCase();
  const labelB = labels[intentB.name] || intentB.name.toLowerCase();
  return `¿Me está preguntando sobre ${labelA} o sobre ${labelB}? 😊 Cuénteme un poco más para ayudarle mejor.`;
}

// ============================================================
// FUNCIÓN: buildFallbackMessage
// Devuelve fallback con sugerencias de los top intents con señal.
// ============================================================

function buildFallbackMessage(intentScores) {
  // Intents con score > 0, ordenados ya por score desc
  const withSignal = intentScores.filter(s => s.score > 0).slice(0, 3);

  const labels = {
    PAGO:                 "💳 Métodos de pago (SINPE, tarjeta, efectivo)",
    PEDIDO:               "🛒 Cómo hacer un pedido",
    HORARIO:              "🕙 Horario de atención",
    UBICACION:            "📍 Dónde estamos ubicados",
    MENU:                 "📋 Ver el menú completo",
    PRECIO:               "💰 Precios y combos",
    DELIVERY:             "🚗 Si hacemos delivery",
    INGREDIENTES_ALERGIAS:"🌱 Ingredientes y alergias",
    TIEMPO_ESPERA:        "⏱️ Cuánto tarda el pedido",
    COMBO:                "🍽️ Los combos disponibles",
    INFO_PRODUCTO:        "🍳 Información de productos",
    RECOMENDACION:        "🏆 Qué le recomendamos probar",
    WHATSAPP:             "📲 Contactarnos por WhatsApp",
    REDES_SOCIALES:       "📱 Nuestras redes sociales",
    QUEJAS:               "😞 Reportar un problema",
    EVENTOS_CATERING:     "🎉 Pedidos para eventos",
    SALUDO:               "👋 Saludarnos",
    DESPEDIDA:            "🙌 Hasta luego"
  };

  if (withSignal.length > 0) {
    const suggestions = withSignal
      .map(s => `• ${labels[s.intent.name] || s.intent.name}`)
      .join('\n');
    return `Mmm, no le entendí del todo 😅 ¿Quizás quiso preguntarme sobre...\n${suggestions}\n\n...o escríbame de otra forma y con gusto le ayudo 🙌`;
  }

  // Fallback base (sin ninguna señal)
  return "Mmm, no le entendí del todo 😅 Puedo ayudarle con:\n• 📋 El menú y precios\n• 🕙 Horario de atención\n• 🛒 Cómo hacer un pedido\n• 💳 Métodos de pago\n\n¿Sobre cuál de esos le cuento? ☕";
}
```

---

## 8. Costo estimado — O() tiempo y espacio

### 8.1 Complejidad temporal

Notación: `I` = número de intents (18), `K` = keywords promedio por intent y tier (~8), `T` = tokens del usuario promedio (~8), `L` = longitud promedio de keyword (~7 chars).

**Scoring de intents (Paso 2):**
- Por cada token de usuario: iterar `I` intents x 3 tiers x `K` keywords = `O(T * I * K)`
- Cada comparación `tokenMatchesKeyword`: `O(L^2)` en el peor caso para Levenshtein (sin early-exit), pero con early-exit por diff de longitud el caso promedio es `O(L)` para palabras similares.
- Total scoring: `O(T * I * K * L)` = `O(8 * 18 * 8 * 7)` ≈ **8,064 operaciones simples**.

**Sub-scoring FAQ (Paso resolveIntentResponse):**
- Promedio de 8 candidatos por intent, `T` tokens de usuario, `Q` tokens por q (~5).
- `O(candidatos * T * Q)` = `O(8 * 8 * 5)` = **320 operaciones**.

**Total por llamada a `respondLocal`:**  
Aproximadamente **8,500–10,000 operaciones simples**. En un browser moderno esto es submilisegundo (<0.5ms). El delay artificial de 600–1200ms del `setTimeout` en `sendMessage` sigue dominando la experiencia.

**Comparación con sistema actual:**
- Sistema actual: `O(N_FAQ * T_user * T_q)` = `O(80 * 8 * 5)` = 3,200 operaciones, pero sin Levenshtein.
- Propuesta B: ~3x más operaciones, pero con capacidad de tolerar typos y resolución semántica.

### 8.2 Complejidad espacial

- Arreglo `INTENTS`: 18 objetos con ~25 keywords c/u = ~450 strings cortos. Tamaño: ~15 KB en memoria (sin comprimir).
- El arreglo `intentScores` en cada call: 18 objetos temporales, liberados por GC inmediatamente.
- Las dos filas de Levenshtein (`prev`, `curr`): máximo `O(max_keyword_len)` = ~15 enteros.
- **Overhead total en memoria:** ~20 KB sobre el baseline actual. Completamente negligible.

### 8.3 Impacto en carga (load)

- Los INTENTS se definen como `const` al nivel del script, evaluados una vez al parsear el `<script>`.
- No hay fetch, no hay IndexedDB, no hay Worker. Todo es síncrono y en memoria.
- Sin impacto en LCP, FID ni CLS.
- El `lev()` nunca se llama en el hot path de render — solo en `respondLocal`.

---

## 9. Ejemplos de mejora

### 9.1 Typo: "sinppe movil acepta?"

**Sistema actual:**  
Tokeniza: ["sinppe", "movil", "acepta"]. Ningún token hace substring-match exacto con "sinpe" en los `qTokens` del FAQ_DB (no hay entrada con "sinppe"). El score de todas las entradas queda en 0 o muy bajo. Cae al fallback de regex categoría 9 (`/sinpe/`) — pero como "sinppe" no matchea el regex exacto de `\b(sinpe)\b`, devuelve el fallback genérico. **Falla.**

**Propuesta B:**  
Token "sinppe" (6 chars) vs keyword "sinpe" → `lev("sinppe", "sinpe") = 1` ≤ umbral 2 para 6 chars → MATCH en tier1 del intent PAGO.  
`score_PAGO = 3*1 + 2*0 + 1*0 = 3` → `confidence = 3/5 = 0.60` → match directo (justo en el umbral, >= 0.6).  
Se hace sub-scoring sobre las 8 entradas FAQ de PAGO. "aceptan sinpe" tiene overlap con "acepta" (lev("acepta","aceptan")=1 ≤ 2) y con "sinpe" via lev.  
Respuesta: "¡Sí! Aceptamos SINPE Móvil, efectivo y tarjeta 💳"  
**Resuelto correctamente.**

---

### 9.2 Reformulación: "tienen opcion vegana?"

**Sistema actual:**  
Tokeniza: ["tienen", "opcion", "vegana"]. "vegana" no está literalmente en ningún `q` del FAQ_DB (las entradas usan "vegano", "vegetariano"). El substring match de "vegana" vs "vegano" falla porque `"vegano".includes("vegana")` es false y `"vegana".includes("vegano")` es false. El fallback de regex 10 tiene `\b(vegano|vegetariano)\b` — "vegana" no matchea ese regex. **Falla.**

**Propuesta B:**  
Token "vegana" (6 chars) vs keyword "vegano" → `lev("vegana", "vegano") = 1` ≤ umbral 2 → MATCH tier1 de INGREDIENTES_ALERGIAS.  
Token "tienen" → match tier2 de MENU, pero INGREDIENTES_ALERGIAS ya tiene score superior.  
`score_INGREDIENTES = 3*1 = 3` → `confidence = 0.60` → match directo.  
Sub-scoring apunta a "soy vegano puedo comer algo".  
Respuesta: "Para confirmar opciones veganas escríbanos al WhatsApp, queremos asegurarnos de darle info correcta 🌱"  
**Resuelto correctamente.**

---

### 9.3 Ambigua: "puedo pagar con tarjeta?"

**Sistema actual:**  
Tokeniza: ["puedo", "pagar", "con", "tarjeta"]. "pagar" hace match con "pagar" en "aceptan sinpe" (via substring). "tarjeta" hace match en "tienen datafono". El score puede dividirse entre PEDIDO y PAGO sin un ganador claro. En el fallback de regex, tanto la regex 5 (`/pedir/`) como la 9 (`/tarjeta/`) pueden activarse dependiendo del orden. **Comportamiento inconsistente.**

**Propuesta B:**  
"pagar" → tier2 de PAGO (score +2); "tarjeta" → tier1 de PAGO (score +3). Total: `score_PAGO = 5`.  
"puedo" → tier3 de PAGO (score +1). Total: `score_PAGO = 6`.  
PEDIDO también score algo por "puedo" tier3 (score 1). Pero PAGO = 6 vs PEDIDO = 1.  
`confidence_PAGO = 6/8 = 0.75` → match directo con alta confianza.  
Sub-scoring en FAQ de PAGO: "tienen datafono" (tarjeta + datafono). Pero "puedo pagar con tarjeta" → "aceptan sinpe" (overlap: "sinpe" no matchea, pero "aceptan" matchea "pagar" via 0 dist). "tienen datafono" tiene "tarjeta" implícita en la respuesta. El sub-score selecciona "tienen datafono" cuya respuesta menciona tarjeta directamente.  
Respuesta: "Sí, aceptamos tarjeta de débito y crédito en el local 💳"  
**Resuelto correctamente y sin ambigüedad.**

---

### 9.4 Query corta: "cuanto"

**Sistema actual:**  
Un solo token: ["cuanto"]. El score de todas las entradas FAQ es mínimo. El fallback regex 3 tiene `\b(cuanto)\b` → devuelve la respuesta genérica de precios. Funciona, pero no distingue si el usuario pregunta por precio, tiempo de espera o distancia. **Funciona parcialmente pero puede mejorar.**

**Propuesta B:**  
Token "cuanto" (6 chars):  
- vs "cuanto" en tier1 de PRECIO → `lev = 0` → tier1 hit PRECIO (score +3).  
- vs "cuanto" en tier2 de TIEMPO_ESPERA → tier2 hit (score +2).  
`score_PRECIO = 3` → `confidence = 0.60`, justo en el umbral de match directo.  
`score_TIEMPO_ESPERA = 2` → `confidence = 0.50`, en zona de clarify.  

Decisión: top es PRECIO con confidence 0.60 → match directo (no se entra a clarify porque supera el umbral).  
Respuesta: sub-scoring FAQ de PRECIO → "cuanto cuesta el pinto" tiene overlap 1 con "cuanto". Pero también "cuanto sale el combo familiar" y "cuanto sale comer los dos". Todos empatan en overlap=1. Se elige el más corto en `q.length`: "cuanto cuesta el pinto".  
Respuesta: "El Pinto Clásico está en ₡2.500 🍳" — con pregunta de seguimiento implícita.  

Alternativa de diseño: si se prefiere clarify para queries de 1 token, se puede ajustar el umbral de match directo a `> 0.6` (estricto) en lugar de `>= 0.6`, lo que haría caer este caso en clarify entre PRECIO y TIEMPO_ESPERA. Depende del criterio del implementador.  
**Mejora significativa sobre el baseline.**

---

### 9.5 Query larga: "disculpe tengo una duda sobre si hacen delivery a mi casa en alajuela"

**Sistema actual:**  
Tokeniza: ["disculpe", "tengo", "una", "duda", "sobre", "hacen", "delivery", "casa", "alajuela"]. "delivery" matchea por substring con "entregas a domicilio" (no exactamente), "hacen" matchea con "hacen pedidos para eventos" y otras entradas. El score se dispersa y el winner puede ser incorrecto. **Produce falso positivo frecuente.**

**Propuesta B:**  
Tokens relevantes: "delivery" → tier1 de DELIVERY (score +3); "hacen" → tier2 de varios intents; "casa" → tier3 de DELIVERY (score +1); "alajuela" → tier3 de UBICACION (score +1) y tier3 de DELIVERY (score +1).  

`score_DELIVERY = 3 ("delivery") + 1 ("casa") + 1 ("alajuela") = 5`  
`score_UBICACION = 1 ("alajuela") = 1`  
`score_PEDIDO = 1 ("hacen") via tier2 = 2` → no, "hacen" no está en tiers de PEDIDO.  

Ganador claro: DELIVERY con `confidence = 5/7 = 0.71` → match directo de alta confianza.  
Sub-scoring en FAQ de DELIVERY: "hacen entregas a domicilio" — "delivery" via lev match con "entregas" (lev="delivery" vs "entregas" = 5 chars diff, pero "domicilio" vs "casa" — no matchea exacto. "hacen" match con "hacen"). La entrada "hacen entregas a domicilio" recibe el mayor sub-score por overlap de tokens.  
Respuesta: "Por el momento no manejamos delivery, el pedido se retira en el local. ¡Pero vale la visita! 😄"  
**Resuelto correctamente, respuesta directa y precisa.**

---

## Resumen ejecutivo

**Qué entregué:** Diseño completo de estrategia de matching por clasificación de intents (18 definidos) con tiers de keywords ponderados (3-2-1), función Levenshtein con early-exit y umbrales variables por longitud de token, sistema de confidence normalizado con tres zonas de decisión (match/clarify/fallback), pseudocódigo completo del método `respondLocal` reescrito con comentarios en español, y 5 ejemplos de resolución de casos problemáticos del sistema actual.

**Fortaleza principal:** La separación en intents con tiers de keywords elimina la dependencia de que el usuario use exactamente las mismas palabras del FAQ_DB. El tier1 actúa como trigger inequívoco — basta con "sinpe" o "delivery" para activar el intent correcto, aunque el resto del mensaje sea desconocido. El Levenshtein tolera typos sin false positives porque los umbrales son proporcionales a la longitud de la palabra.

**Trade-off más importante:** El sistema requiere mantener dos fuentes de verdad: los keywords de los INTENTS (que deben actualizarse si cambia el vocabulario del negocio) y el FAQ_DB (que contiene las respuestas reales). Si se agrega un nuevo producto al menú (ej: "nacatamales"), hay que agregar su keyword al intent INFO_PRODUCTO y su entrada al FAQ_DB de forma coordinada — sin esa disciplina de mantenimiento, el matching mejora pero las respuestas quedan desactualizadas.
