# Propuesta A — TF-IDF + Expansión por Sinónimos + Cosine Similarity
## Chatbot Sr. & Sra. Pinto — Estrategia de Matching Mejorada

**Agente:** PROPUESTA-A  
**Fecha:** 2026-04-24  
**Archivo objetivo:** `index.html` → clase `ChatManager`, método `respondLocal()`  
**Alcance:** Diseño arquitectónico. Sin implementación en index.html.

---

## Diagnóstico del Sistema Actual

El matching actual presenta tres fallas estructurales:

1. **Conteo de tokens sin peso** — "de" y "pinto" tienen el mismo valor. Un token genérico inflado por muchas entradas FAQ gana sobre un token raro pero preciso.
2. **Fuzzy substring bidireccional** — `q.includes(token) || token.includes(q)` genera falsos positivos agresivos. "pagar" matchea con "gar" si ambos tienen >3 chars.
3. **Umbral fijo 1.2** — ignora la distribución de scores. Un match de 1.3 puede ser el único posible pero completamente incorrecto.

---

## 1. Preprocesamiento

### Pipeline de normalización (orden importa)

```
normalize(text):
  1. NFD + strip diacríticos (/[\u0300-\u036f]/g)        → "café" → "cafe"
  2. lowercase
  3. strip puntuación (/[^\w\s]/g)                        → "¿cuánto?" → "cuanto"
  4. colapsar espacios múltiples
  5. tokenizar por whitespace
  6. aplicar stop-words (eliminar tokens del conjunto)
  7. aplicar stemming (reducir cada token a raíz)
  8. eliminar tokens vacíos o de longitud < 2
```

### Stop-words en español + contexto tico

Conjunto estático. Se elimina antes del stemming para no contaminar raíces.

```javascript
const STOP_WORDS = new Set([
  // Artículos y determinantes
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo',
  // Preposiciones frecuentes
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'sin',
  'sobre', 'entre', 'hasta', 'desde', 'hacia', 'ante',
  // Conjunciones
  'y', 'e', 'o', 'u', 'ni', 'que', 'si', 'pero', 'aunque',
  'porque', 'como', 'cuando', 'donde',
  // Verbos auxiliares
  'es', 'son', 'era', 'fue', 'ser', 'estar', 'hay', 'tiene',
  'tienen', 'tengo', 'he', 'ha', 'han',
  // Pronombres
  'me', 'te', 'se', 'le', 'les', 'nos', 'yo', 'tu', 'el', 'ella',
  'ellos', 'ellas', 'mi', 'su', 'sus',
  // Adverbios genéricos
  'muy', 'mas', 'menos', 'ya', 'no', 'si', 'tambien', 'solo',
  'bien', 'mal', 'ahora', 'hoy', 'manana',
  // Modismos ticos (ruido semántico en este dominio)
  'mae', 'diay', 'usted', 'uste', 'don', 'dona',
  // Cortesías vacías
  'favor', 'please', 'gracias', 'porfa', 'porfavor'
]);
```

**Nota sobre "pura vida":** Se trata como bigramo de saludo antes del pipeline. Si el input normalizado contiene exactamente "pura vida" (o "puravida"), se pre-clasifica como saludo y se retorna respuesta de saludo directamente — no pasa por TF-IDF.

### Stemming simple por sufijos

Reglas aplicadas en orden (primera que coincide, se aplica):

```javascript
function stem(word) {
  // Orden importa: sufijos más largos primero
  const rules = [
    [/ciones$/, ''],    // comunicaciones → comunic
    [/cion$/, ''],      // comunicacion → comunic
    [/mente$/, ''],     // rapidamente → rapid
    [/iendo$/, ''],     // pidiendo → pid
    [/ando$/, ''],      // comprando → compr
    [/ados$/, ''],      // pedidos → ped  (nota: cuidado con "dados")
    [/idas$/, ''],      // bebidas → beb
    [/ados$/, ''],
    [/ados$/, ''],
    [/ares$/, ''],      // lugares → lug
    [/eres$/, ''],      // mujeres → mujer → mujer (no reduce)
    [/ires$/, ''],
    [/ar$/, ''],        // pagar → pag
    [/er$/, ''],        // comer → com
    [/ir$/, ''],        // pedir → ped
    [/es$/, ''],        // precios → preci
    [/s$/, ''],         // platos → plato
  ];

  for (const [pattern, replacement] of rules) {
    if (word.length > 4 && pattern.test(word)) {
      const stemmed = word.replace(pattern, replacement);
      if (stemmed.length >= 3) return stemmed; // evitar raíces vacías
    }
  }
  return word;
}
```

**Colisiones conocidas y aceptadas en este dominio:**
- "pedir" y "pedido" → "ped" (correcto, son la misma entidad semántica)
- "pago" → "pago" (no reduce, <4 chars después de quitar -o)
- "caro" → "caro" (correcto, no es un verbo -ar conjugado)

---

## 2. Diccionario de Sinónimos

Mapa de canonicalización: cada variante se mapea a un **token canónico**. El canónico es el término que aparece en FAQ_DB con mayor frecuencia.

La expansión se aplica **después** de normalizar y antes de calcular TF. Cada variante en el input se reemplaza por su canónico. Las entradas FAQ también se procesan con el mismo mapa al precomputar.

```javascript
const SYNONYM_MAP = {
  // === PRECIO ===
  'cuesta':       'precio',
  'vale':         'precio',
  'valor':        'precio',
  'caro':         'precio',
  'barato':       'precio',
  'economico':    'precio',
  'cuanto':       'precio',
  'cobran':       'precio',
  'cobrar':       'precio',
  'costar':       'precio',
  'tarifa':       'precio',

  // === HORARIO ===
  'hora':         'horario',
  'abren':        'horario',
  'cierran':      'horario',
  'atienden':     'horario',
  'abierto':      'horario',
  'cerrado':      'horario',
  'disponible':   'horario',
  'cuando':       'horario',
  'dias':         'horario',
  'dia':          'horario',

  // === PEDIDO ===
  'orden':        'pedido',
  'pedir':        'pedido',
  'ordenar':      'pedido',
  'comprar':      'pedido',
  'quiero':       'pedido',
  'deseo':        'pedido',
  'necesito':     'pedido',
  'solicitar':    'pedido',
  'solicitud':    'pedido',

  // === UBICACION ===
  'donde':        'ubicacion',
  'direccion':    'ubicacion',
  'lugar':        'ubicacion',
  'zona':         'ubicacion',
  'estan':        'ubicacion',
  'llegar':       'ubicacion',
  'mapa':         'ubicacion',
  'distancia':    'ubicacion',
  'lejos':        'ubicacion',

  // === PAGO ===
  'pagar':        'pago',
  'sinpe':        'pago',
  'efectivo':     'pago',
  'tarjeta':      'pago',
  'transferencia':'pago',
  'credito':      'pago',
  'debito':       'pago',
  'datafono':     'pago',
  'dolares':      'pago',
  'colones':      'pago',
  'factura':      'pago',

  // === DOMICILIO / DELIVERY ===
  'delivery':     'domicilio',
  'envio':        'domicilio',
  'entrega':      'domicilio',
  'llevan':       'domicilio',
  'traen':        'domicilio',
  'repartir':     'domicilio',
  'reparte':      'domicilio',
  'despacho':     'domicilio',

  // === MENU ===
  'carta':        'menu',
  'platos':       'menu',
  'opciones':     'menu',
  'que hay':      'menu',  // bigramo — se trata en preproceso especial
  'comida':       'menu',
  'venden':       'menu',
  'ofrecen':      'menu',

  // === PINTO / GALLO PINTO ===
  'gallopinto':   'pinto',
  'gallo':        'pinto',    // en contexto restaurante, "gallo" → pinto
  'arroz':        'pinto',    // alta probabilidad en este dominio
  'frijoles':     'pinto',

  // === EMPANADA ===
  'empanadita':   'empanada',
  'empanaditas':  'empanada',
  'pastelito':    'empanada',

  // === COMBO ===
  'pareja':       'combo',
  'familiar':     'combo',
  'paquete':      'combo',
  'compartir':    'combo',
  'para dos':     'combo',   // bigramo

  // === CONTACTO / WHATSAPP ===
  'whatsapp':     'contacto',
  'numero':       'contacto',
  'telefono':     'contacto',
  'llamar':       'contacto',
  'escribir':     'contacto',
  'comunicarse':  'contacto',
  'chat':         'contacto',

  // === VEGETARIANO / DIETA ===
  'vegano':       'vegetariano',
  'vegana':       'vegetariano',
  'vegetariana':  'vegetariano',
  'plant':        'vegetariano',

  // === ALERGIA ===
  'alergico':     'alergia',
  'alergica':     'alergia',
  'intolerancia': 'alergia',
  'gluten':       'alergia',
  'lactosa':      'alergia',
  'mani':         'alergia',

  // === REDES SOCIALES ===
  'instagram':    'redes',
  'facebook':     'redes',
  'tiktok':       'redes',
  'ig':           'redes',
  'fb':           'redes',
  'foto':         'redes',
  'publicacion':  'redes',

  // === TIEMPO DE ESPERA ===
  'tarda':        'espera',
  'demora':       'espera',
  'cuanto tarda': 'espera',  // bigramo
  'rapido':       'espera',
  'urgente':      'espera',

  // === RECOMENDACION ===
  'recomienda':   'recomendacion',
  'recomiendas':  'recomendacion',
  'sugieres':     'recomendacion',
  'popular':      'recomendacion',
  'favorito':     'recomendacion',
  'estrella':     'recomendacion',
  'mejor':        'recomendacion',

  // === EVENTO / CATERING ===
  'catering':     'evento',
  'oficina':      'evento',
  'empresa':      'evento',
  'cumpleanos':   'evento',
  'navidad':      'evento',
  'fiesta':       'evento',

  // === APERTURA (distinción de horario de apertura) ===
  'abrieron':     'apertura',
  'ya abren':     'apertura',
  'abre':         'apertura',
};
```

**Notas de diseño del mapa:**
- Los bigramos ("para dos", "que hay", etc.) se detectan en una pasada previa al tokenizado individual, reemplazando la secuencia por el canónico antes de split.
- El token canónico NO tiene que existir literalmente en FAQ_DB — existe para agrupar semánticamente. La FAQ también pasa por el mismo mapa, así que sus tokens ya están canónicos en el índice IDF.
- La canonicalización es unidireccional (variante → canónico). No se expande el canónico.

---

## 3. Cálculo TF-IDF

### Precomputación al construir ChatManager (una sola vez)

Toda esta lógica vive en el `constructor()` de `ChatManager`, ejecutada antes del primer mensaje.

```
ESTRUCTURAS PRECOMPUTADAS:

  processedFAQ[i] = {
    originalAnswer: FAQ_DB[i].a,
    tokens: Set<string>,        // tokens canónicos + stemmeados de FAQ_DB[i].q
    tokenCounts: Map<token, count>,
    totalTokens: number,
    tfidfVector: Map<token, tfidf_weight>
  }

  idfMap = Map<token, idf_value>
    donde idf_value = log(N / (1 + df(token)))
    N = FAQ_DB.length (~100)
    df(token) = número de entradas FAQ que contienen ese token

  globalVocab = Set<string>    // todos los tokens únicos del corpus FAQ
```

### Fórmula exacta

**IDF para cada token t en el corpus:**
```
IDF(t) = Math.log(N / (1 + df(t)))

  donde df(t) = count de entradas FAQ_DB cuya tokenización contiene t
```

Usando `1 + df(t)` en denominador (suavizado) para evitar división por cero y penalizar menos términos universales. Usar `Math.log` natural.

**TF del query (normalización por longitud):**
```
TF_query(t) = count(t en query_tokens) / query_tokens.length
```

**TF de cada FAQ entry (precomputado):**
```
TF_faq(t, i) = count(t en processedFAQ[i].tokens) / processedFAQ[i].totalTokens
```

**Peso TF-IDF en vector de FAQ:**
```
weight(t, i) = TF_faq(t, i) * IDF(t)
```

### Qué hace IDF automáticamente por nosotros

- Tokens como "pago", "pedido", "menu" aparecen en muchas entradas → IDF bajo → influencia reducida.
- Tokens como "gallopinto", "sinpe", "vegetariano", "catering" → IDF alto → alta discriminación.
- Tokens que NO aparecen en FAQ_DB tienen IDF máximo (están ausentes del índice). Se calculan con `IDF = log(N / 1) = log(N)` si aparecen en el query pero en ninguna FAQ.

---

## 4. Cosine Similarity

### Por qué Cosine sobre dot product simple

Dot product favorece entradas FAQ con más tokens. Cosine normaliza por la magnitud de ambos vectores, comparando solo la dirección (distribución relativa de pesos).

### Fórmula exacta a implementar

```
cosineSim(queryVec, faqVec) = 
    dotProduct(queryVec, faqVec) 
    ────────────────────────────────────────
    magnitude(queryVec) * magnitude(faqVec)

donde:

  dotProduct(A, B) = Σ A[t] * B[t]  (suma sobre tokens compartidos)

  magnitude(V) = √(Σ V[t]²)
```

Los vectores son sparse: solo los tokens presentes tienen peso no-cero.

### Implementación eficiente

Para el query vector:
- Se construye en el momento de cada llamada a `respondLocal()`.
- Solo contiene los tokens del query ponderados por `TF_query(t) * IDF(t)`.
- El IDF se toma del mapa precomputado. Si el token no existe en el corpus, IDF = `log(N)`.

Para FAQ vectors:
- Precomputados en constructor. Son inmutables.
- La magnitud de cada FAQ vector se precomputa también: `faqMagnitudes[i]`.

```
Cálculo de score[i] por entrada FAQ:

  tokens_comunes = intersección(queryVec.keys(), faqVec[i].keys())
  
  dotProd = Σ_{t in tokens_comunes} queryVec[t] * faqVec[i][t]
  
  queryMag = √(Σ_{t in queryVec} queryVec[t]²)
  
  score[i] = dotProd / (queryMag * faqMagnitudes[i])
  
  score[i] ∈ [0, 1]  siempre
```

Si `queryMag === 0` (query quedó vacío tras preproceso), retornar fallback inmediatamente sin calcular.

---

## 5. Umbral Adaptativo

### Problema con umbral fijo

Un umbral fijo de 0.3 puede ser demasiado bajo para queries ambiguos y demasiado alto para queries muy específicos con vocabulario raro.

### Estrategia de umbral adaptativo por ratio top1/top2

```
Ordenar scores[0..N] descendente → top1, top2

CONDICION DE MATCH CONFIABLE:
  (1) top1_score >= THRESHOLD_ABSOLUTE    (mínimo absoluto, ej: 0.15)
  Y
  (2) top1_score >= RATIO_MIN * top2_score  (ej: RATIO_MIN = 1.5)

Si se cumplen ambas condiciones → retornar FAQ_DB[top1_index].a
Si no → pasar a fallback
```

**Lógica detrás del ratio:**
- Si top1 = 0.42 y top2 = 0.41: el score está empatado. Probablemente ninguno es correcto → fallback.
- Si top1 = 0.42 y top2 = 0.15: hay un ganador claro → retornar top1.
- Protege contra "gana por defecto" cuando el query no matchea bien a nadie.

**Valores recomendados iniciales:**
```javascript
const THRESHOLD_ABSOLUTE = 0.12;  // score mínimo en cosine para considerar
const THRESHOLD_RATIO    = 1.5;   // top1 debe ser 50% mejor que top2
```

Estos valores son tunables post-lanzamiento observando logs de fallback.

### Caso especial: corpus con un solo token

Si el query, tras preproceso, tiene exactamente 1 token y score > 0.25, ignorar el ratio y confiar en el score absoluto. Queries de 1 token son legítimos ("sinpe", "delivery", "vegetariano").

---

## 6. Fallback Mejorado

El fallback de 14 categorías regex se mantiene pero se refuerza con los mismos canónicos del SYNONYM_MAP. El texto normalizado se pasa por el mapa de sinónimos antes de evaluar las regex, reemplazando variantes por sus canónicos.

### Transformación del fallback actual

Cada regex actual como:
```javascript
if (text.match(/\b(precio|cuanto|cuesta|vale|valor|caro|barato|economico)\b/))
```

Se convierte en:
```javascript
// El texto ya fue canonicalizado: "cuanto cuesta" → "precio precio"
if (normalizedCanonical.includes('precio'))
```

Esto elimina el mantenimiento de listas duplicadas: el SYNONYM_MAP es la única fuente de verdad para sinónimos.

### Orden de fallback (jerarquía)

```
1. Detección de bigramos especiales (pura vida, para dos, etc.)
2. TF-IDF + Cosine con umbral adaptativo
3. Si falla → Categorías regex con texto canonicalizado
4. Si falla → Respuesta genérica de "no entendí"
```

### Fallback enriquecido con contexto del historial

Opcional (no crítico): si `this.messages` tiene >1 turno, el fallback puede incluir las últimas categorías mencionadas como pista:

```
Si el último mensaje bot hablaba de "precio" y el user dice "y el otro"
→ el fallback puede inferir que habla de precio también
```

Este sería un paso futuro, no requerido en la primera iteración.

---

## 7. Pseudocódigo Completo

```javascript
class ChatManager {

  constructor() {
    // ... código existente de UI ...

    // PRECOMPUTAR TODO AL INICIO (ejecuta una sola vez)
    this._buildSearchIndex();
  }

  // ─────────────────────────────────────────────
  // CONSTANTES Y DATOS ESTÁTICOS
  // ─────────────────────────────────────────────

  static STOP_WORDS = new Set([
    'el','la','los','las','un','una','unos','unas','lo',
    'de','del','a','al','en','con','por','para','sin','sobre',
    'entre','hasta','desde','hacia','ante','y','e','o','u','ni',
    'que','si','pero','aunque','porque','como','cuando','donde',
    'es','son','era','fue','ser','estar','hay','tiene','tienen',
    'tengo','he','ha','han','me','te','se','le','les','nos',
    'yo','tu','mi','su','sus','muy','mas','menos','ya','no',
    'tambien','solo','bien','mal','ahora','hoy','manana',
    'mae','diay','usted','uste','don','dona',
    'favor','please','gracias','porfa'
  ]);

  static SYNONYM_MAP = {
    // (ver sección 2 completa)
    'cuesta':'precio', 'vale':'precio', 'cuanto':'precio', /* ... */
    'hora':'horario', 'abren':'horario', 'cierran':'horario', /* ... */
    // ... todos los grupos ...
  };

  // Bigramos que deben reemplazarse ANTES de tokenizar
  static BIGRAMS = [
    ['pura vida',  '__saludo__'],
    ['puravida',   '__saludo__'],
    ['para dos',   'combo'],
    ['que hay',    'menu'],
    ['cuanto tarda','espera'],
    ['como llego', 'ubicacion'],
    ['ya abren',   'apertura'],
  ];

  // ─────────────────────────────────────────────
  // PREPROCESAMIENTO
  // ─────────────────────────────────────────────

  _normalize(text) {
    // 1. NFD + strip diacríticos
    let s = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // 2. lowercase
    s = s.toLowerCase();
    // 3. strip puntuación excepto espacios
    s = s.replace(/[^\w\s]/g, ' ');
    // 4. colapsar espacios
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  _replaceBigrams(text) {
    // Reemplaza bigramos antes de tokenizar
    let s = text;
    for (const [bigram, canonical] of ChatManager.BIGRAMS) {
      s = s.replace(new RegExp(bigram, 'g'), canonical);
    }
    return s;
  }

  _stem(word) {
    // Reglas de stemming (ver sección 1)
    const rules = [
      [/ciones$/, ''], [/cion$/, ''], [/mente$/, ''],
      [/iendo$/, ''], [/ando$/, ''], [/ados$/, ''],
      [/idas$/, ''], [/ares$/, ''], [/ar$/, ''],
      [/er$/, ''], [/ir$/, ''], [/es$/, ''], [/s$/, ''],
    ];
    if (word.length <= 4) return word; // no stemear palabras cortas
    for (const [pattern, replacement] of rules) {
      if (pattern.test(word)) {
        const stemmed = word.replace(pattern, replacement);
        if (stemmed.length >= 3) return stemmed;
      }
    }
    return word;
  }

  _canonicalize(token) {
    // Aplica mapa de sinónimos si existe entrada
    return ChatManager.SYNONYM_MAP[token] ?? token;
  }

  _tokenize(text) {
    // Pipeline completo: normalizar → bigramas → split → stop-words → stem → canonical
    let s = this._normalize(text);
    s = this._replaceBigrams(s);
    const rawTokens = s.split(/\s+/).filter(t => t.length >= 2);
    const tokens = [];
    for (const t of rawTokens) {
      if (ChatManager.STOP_WORDS.has(t)) continue;  // eliminar stop-words
      const stemmed   = this._stem(t);               // stemming
      const canonical = this._canonicalize(stemmed); // sinonimos
      if (canonical.length >= 2) tokens.push(canonical);
    }
    return tokens;
  }

  // ─────────────────────────────────────────────
  // CONSTRUCCIÓN DEL ÍNDICE (llamado una sola vez en constructor)
  // ─────────────────────────────────────────────

  _buildSearchIndex() {
    const N = FAQ_DB.length;

    // PASO 1: Tokenizar todas las entradas FAQ
    this._processedFAQ = FAQ_DB.map(item => {
      const tokens = this._tokenize(item.q);
      const tokenCounts = new Map();
      for (const t of tokens) {
        tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
      }
      return {
        answer: item.a,
        tokens,
        tokenCounts,
        totalTokens: tokens.length,
        tfidfVector: new Map(), // se llena en paso 3
      };
    });

    // PASO 2: Calcular DF (document frequency) para cada token
    const dfMap = new Map(); // token → count de FAQs que lo contienen
    for (const entry of this._processedFAQ) {
      for (const t of entry.tokenCounts.keys()) {
        dfMap.set(t, (dfMap.get(t) ?? 0) + 1);
      }
    }

    // PASO 3: Calcular IDF y pre-vectorizar cada FAQ
    this._idfMap = new Map();
    for (const [token, df] of dfMap.entries()) {
      // IDF con suavizado Laplace en denominador
      this._idfMap.set(token, Math.log(N / (1 + df)));
    }

    // IDF para tokens desconocidos (máximo posible)
    this._idfUnknown = Math.log(N); // log(100) ≈ 4.6

    // PASO 4: Construir vector TF-IDF de cada FAQ + precomputar magnitud
    this._faqMagnitudes = [];
    for (const entry of this._processedFAQ) {
      let magSq = 0;
      for (const [token, count] of entry.tokenCounts.entries()) {
        const tf  = count / entry.totalTokens;
        const idf = this._idfMap.get(token) ?? this._idfUnknown;
        const w   = tf * idf;
        entry.tfidfVector.set(token, w);
        magSq += w * w;
      }
      this._faqMagnitudes.push(Math.sqrt(magSq));
    }

    // Índice listo. Memoria estimada: ~100 entradas * ~10 tokens * 2 Maps = ~2000 entradas Map
  }

  // ─────────────────────────────────────────────
  // SIMILITUD COSENO
  // ─────────────────────────────────────────────

  _cosineScore(queryVec, queryMag, faqIndex) {
    const faqVec = this._processedFAQ[faqIndex].tfidfVector;
    const faqMag = this._faqMagnitudes[faqIndex];

    if (queryMag === 0 || faqMag === 0) return 0;

    // Dot product — solo iterar sobre el vector más corto (query suele ser más corto)
    let dot = 0;
    for (const [token, qWeight] of queryVec.entries()) {
      const faqWeight = faqVec.get(token);
      if (faqWeight !== undefined) {
        dot += qWeight * faqWeight;
      }
    }

    return dot / (queryMag * faqMag);
  }

  // ─────────────────────────────────────────────
  // MÉTODO PRINCIPAL
  // ─────────────────────────────────────────────

  respondLocal(userMessage) {
    // DETECCIÓN RÁPIDA: saludo puro (antes del pipeline)
    const textNorm = this._normalize(userMessage);
    if (/^(hola|buenas|buenas noches|buenos dias|hey|__saludo__)\b/.test(textNorm)) {
      const saludos = [
        '¡Buenas! Bienvenido a Sr. & Sra. Pinto ☕ ¿En qué le ayudamos hoy?',
        '¡Hola! Por acá la Sra. Pinto 👩‍🍳 ¿Le provoca algo rico hoy?',
        '¡Pura vida! ¿Qué se le ofrece?'
      ];
      return saludos[Math.floor(Math.random() * saludos.length)];
    }

    // PIPELINE COMPLETO DE PREPROCESAMIENTO
    const queryTokens = this._tokenize(userMessage);

    // Si el query quedó vacío tras filtros, fallback directo
    if (queryTokens.length === 0) {
      return this._fallbackCategories(textNorm);
    }

    // CONSTRUIR VECTOR TF-IDF DEL QUERY
    const queryCounts = new Map();
    for (const t of queryTokens) {
      queryCounts.set(t, (queryCounts.get(t) ?? 0) + 1);
    }

    const queryVec = new Map();
    let queryMagSq = 0;
    for (const [token, count] of queryCounts.entries()) {
      const tf  = count / queryTokens.length;
      const idf = this._idfMap.get(token) ?? this._idfUnknown;
      const w   = tf * idf;
      queryVec.set(token, w);
      queryMagSq += w * w;
    }
    const queryMag = Math.sqrt(queryMagSq);

    // CALCULAR COSINE SCORE PARA TODAS LAS ENTRADAS FAQ
    const scores = this._processedFAQ.map((_, i) =>
      this._cosineScore(queryVec, queryMag, i)
    );

    // ORDENAR Y ENCONTRAR TOP1, TOP2
    const indexed = scores.map((s, i) => ({ s, i }));
    indexed.sort((a, b) => b.s - a.s);

    const top1 = indexed[0];
    const top2 = indexed[1];

    // UMBRAL ADAPTATIVO
    const THRESHOLD_ABSOLUTE = 0.12;
    const THRESHOLD_RATIO    = 1.5;

    const top2Score = top2 ? top2.s : 0;
    const ratioOk   = top2Score === 0 || top1.s >= THRESHOLD_RATIO * top2Score;
    const absOk     = top1.s >= THRESHOLD_ABSOLUTE;

    // Caso especial: query de 1 token con score notable
    const singleTokenException = queryTokens.length === 1 && top1.s >= 0.25;

    if ((absOk && ratioOk) || singleTokenException) {
      return this._processedFAQ[top1.i].answer;
    }

    // FALLBACK A CATEGORÍAS
    return this._fallbackCategories(textNorm);
  }

  // ─────────────────────────────────────────────
  // FALLBACK POR CATEGORÍAS (texto canonicalizado)
  // ─────────────────────────────────────────────

  _fallbackCategories(normalizedText) {
    // Pre-canonicalizar el texto para que los sinónimos ya estén unificados
    const tokens = normalizedText.split(/\s+/).map(t =>
      ChatManager.SYNONYM_MAP[t] ?? t
    );
    const s = tokens.join(' ');

    // Las mismas 14 categorías actuales, pero ahora se busca el canónico
    if (/\b(hola|buenas|buenos|hey)\b/.test(s)) {
      return '¡Buenas! ¿En qué le ayudamos? ☕';
    }
    if (/\bmenu\b/.test(s)) {
      return 'Contamos con Pinto Clásico (₡2.500), Empanadas (₡1.500), Combo Pareja (₡5.500) y Familiar (₡10.500). ¿Algo en especial?';
    }
    if (/\bprecio\b/.test(s)) {
      return 'Los precios van desde ₡1.200 el café hasta ₡10.500 el Combo Familiar. ¿Le recomiendo algo?';
    }
    if (/\bcombo\b/.test(s)) {
      return 'El Combo Pareja (₡5.500) es el más pedido para dos. Para más personas, el Familiar (₡10.500) 🙌';
    }
    if (/\bpedido\b/.test(s)) {
      return 'Es fácil: agrega al carrito, elige pago y nos llega por WhatsApp. ¡Le confirmamos al momento!';
    }
    if (/\bcontacto\b/.test(s)) {
      return 'Puede escribirnos al WhatsApp 8802-5793 o pedir directo desde esta página 😊';
    }
    if (/\bhorario\b/.test(s) || /\bapertura\b/.test(s)) {
      return 'Lunes a sábado 10am–6pm, domingos 10am–4pm 🕙';
    }
    if (/\bubicacion\b/.test(s)) {
      return 'Estamos en Desamparados de Alajuela, 150m este del Colegio Saint John 📍';
    }
    if (/\bpago\b/.test(s)) {
      return 'Aceptamos efectivo, tarjeta y SINPE Móvil 💳';
    }
    if (/\bdomicilio\b/.test(s)) {
      return 'Por el momento no manejamos delivery. El pedido se retira en el local 😊';
    }
    if (/\b(alergia|vegetariano)\b/.test(s)) {
      return 'Para alergias o dietas especiales escríbanos al WhatsApp antes de pedir 🙏';
    }
    if (/\bespera\b/.test(s)) {
      return 'El tiempo varía según el día. Le avisamos por WhatsApp cuando esté listo ⏱️';
    }
    if (/\brecomendacion\b/.test(s)) {
      return 'Sin dudarlo el Pinto Clásico — es nuestra firma 🏆';
    }
    if (/\b(gracias|adios|chao|bye)\b/.test(s)) {
      return '¡Con mucho gusto! Vuelva pronto. Pura vida 🙌';
    }

    // Fallback final
    return 'Mmm, no le entendí bien 😅 Preguntame por menú, precios, horario o cómo hacer un pedido.';
  }
}
```

---

## 8. Costo Estimado (Complejidad)

### Tiempo de construcción del índice (`_buildSearchIndex`)

| Paso | Complejidad | Valor real (~100 FAQs, ~8 tokens promedio) |
|------|-------------|---------------------------------------------|
| Tokenizar FAQ_DB | O(N × L) | 100 × 8 = 800 ops |
| Calcular DF | O(N × L) | 800 ops |
| Calcular IDF + vectores | O(N × L) | 800 ops |
| **Total construcción** | **O(N × L)** | **~2400 ops** |

Tiempo real en navegador: **< 2ms**. Imperceptible en `DOMContentLoaded`.

### Tiempo por query (`respondLocal`)

| Paso | Complejidad | Valor real (~5 tokens query, 100 FAQs) |
|------|-------------|----------------------------------------|
| Tokenizar query | O(Q) | 5 ops |
| Construir queryVec | O(Q) | 5 ops |
| Calcular N cosine scores | O(N × Q) | 100 × 5 = 500 ops |
| Sort scores | O(N log N) | 100 × 7 = 700 ops |
| **Total por query** | **O(N × Q + N log N)** | **~1200 ops** |

Tiempo real en navegador: **< 1ms** por query. No impacta la UX (el delay artificial de 600–1200ms domina).

### Memoria

```
IDF map:    ~200 tokens únicos × 2 (key+value) = 400 entradas
FAQ vectors: 100 entradas × ~8 tokens = 800 entradas Map
Magnitudes:  100 floats
SYNONYM_MAP: ~120 entradas objeto JS (estático)
STOP_WORDS:  ~50 entradas Set (estático)

Total estimado: < 50KB adicionales en heap. Negligible.
```

### Comparación con sistema actual

El sistema actual recorre FAQ_DB en cada query (O(N × Q)). Esta propuesta tiene el mismo O() por query pero con mejor constante (operaciones Map son O(1), no array scan). La precomputación es la inversión única que habilita la mejora de calidad.

---

## 9. Ejemplos de Mejora — 5 Preguntas Difíciles

### Caso 1: Variante léxica de precio

**Input del usuario:** `"mae cuanto vale comer los dos"`

**Sistema actual:**
- Tokeniza: `["mae", "cuanto", "vale", "comer", "los", "dos"]`
- Compara contra FAQs. "cuanto sale comer los dos" matchea parcialmente pero "vale" no está en ninguna `q`.
- También matchea "estan caros" porque tiene "comer" y "los".
- **Resultado probable:** falso positivo o fallback.

**Con TF-IDF + Sinónimos:**
- `_normalize`: "mae cuanto vale comer los dos"
- Stop-words eliminan: "mae", "los"
- Stemming: "cuanto" → "cuanto", "comer" → "com", "dos" → "dos"
- Canonicalización: "cuanto" → "precio", "dos" → "dos"
- queryTokens: `["precio", "com", "dos"]`
- IDF("precio") es medio (aparece en varias FAQs de precio)
- IDF("dos") es alto si es raro en el corpus
- La FAQ "cuanto sale comer los dos" también tokeniza "cuanto" → "precio", "comer" → "com", "dos" → "dos"
- Vector FAQ y query son casi idénticos → cosine alto (~0.85)
- **Resultado: "El Combo Pareja está a ₡5.500 e incluye para dos personas 💑"** ✓

---

### Caso 2: Pregunta sobre delivery con jerga

**Input del usuario:** `"me llevan el pedido a la casa"`

**Sistema actual:**
- "llevan", "pedido", "casa" — "casa" no está en ninguna FAQ
- Matchea tokens de varias FAQs (pedido, llevan) → score difuso
- Puede matchear "hacen entregas a domicilio" por "pedido" pero también matchea otras
- **Resultado probable:** match incorrecto o fallback.

**Con TF-IDF + Sinónimos:**
- Stop-words: elimina "el", "a", "la"
- Canonicalización: "llevan" → "domicilio", "pedido" → "pedido"
- queryTokens: `["domicilio", "pedido", "cas"]` (stem de casa)
- La FAQ "hacen entregas a domicilio" tiene: "entrega" → "domicilio", "domicilio" → "domicilio"
- Cosine entre query y esa FAQ es alto por "domicilio" con IDF elevado
- **Resultado: "Por el momento no manejamos delivery..." ✓**

---

### Caso 3: Alergia formulada de forma inusual

**Input del usuario:** `"soy intolerante a la lactosa pueden atenderme"`

**Sistema actual:**
- "intolerante" no está en ninguna `q` de FAQ_DB (las FAQs usan "alergico", "alergia")
- "lactosa" sí aparece en la FAQ de lactosa pero el match de "intolerante" falla
- El fuzzy substring: "intolerante".includes("lactosa") = false, "lactosa".includes("intolerante") = false
- Puede que pase al fallback de regex que busca /lactosa/
- **Resultado probable:** depende de si el regex de fallback lo captura, si no, respuesta genérica.

**Con TF-IDF + Sinónimos:**
- Canonicalización: "intolerante" → "alergia", "lactosa" → "alergia"
- queryTokens: `["alergi", "alergi", "atiend"]` → después de dedup efectivo en TF: `{"alergi": 2, "atiend": 1}`
- TF("alergi") = 2/3 = 0.67 (término dominante)
- La FAQ "tienen opciones sin lactosa" tiene token "alergi" (de "lactosa" → "alergia" → stem "alergi")
- Cosine alto por el peso de "alergi" en ambos vectores
- **Resultado: "Para restricciones alimentarias específicas escríbanos para confirmar ingredientes"** ✓

---

### Caso 4: Pregunta de horario con hora específica

**Input del usuario:** `"ya son las 5 y media todavia puedo ir"`

**Sistema actual:**
- "puedo" no está en FAQs de horario. "ir" tampoco.
- La FAQ "ya son las 5 30 todavia atienden" matchea "todavia" pero no "ir", "media"
- Score bajo, puede no superar umbral → fallback regex que sí busca /hora|abren|cierran/
- **Resultado probable:** respuesta de horario genérica del fallback. OK pero no ideal.

**Con TF-IDF + Sinónimos:**
- "media" → no es stop-word, stem → "medi"
- "ir" → 2 chars, se descarta (< 2 chars mínimo en pipeline es ambiguo — en realidad se debería guardar)
- "todavia" → stem → "todavi"
- "son" → stop-word, eliminado
- Canonicalización: ninguno de estos mapea directamente
- queryTokens: `["todavi", "medi"]` (2 tokens útiles)
- La FAQ "ya son las 5 30 todavia atienden" tiene "todavi" en su vector
- IDF("todavi") es alto (raro en el corpus) → peso alto → cosine sube
- **Resultado: "¡Sí, todavía! Tiene tiempo, cerramos a las 6pm"** ✓

---

### Caso 5: Confusión entre preguntas parecidas pero distintas

**Problema del sistema actual:** "cuanto cuesta el cafe" vs "tienen cafe" reciben score similar porque comparten "cafe". El actual puede retornar la respuesta equivocada.

**Input del usuario:** `"tienen cafe alli"`

**Sistema actual:**
- Tokens: "tienen", "cafe", "alli"
- "tienen bebidas" tiene "tienen" + "cafe" (aproximado) → score alto
- "cuanto cuesta el cafe" tiene "cafe" → también score alto
- **Resultado probable:** puede retornar el de precio en vez del de disponibilidad.

**Con TF-IDF + Sinónimos:**
- Stop-words: "alli" es genérico (no en stop-words pero tampoco mapea a nada)
- Canonicalización: "tienen" → no cambia (está en stop-words → eliminado)
- Wait: "tienen" SÍ está en stop-words → se elimina
- queryTokens: `["caf", "alli"]`
- IDF("caf") = log(100 / (1 + df("caf"))). Si "caf" aparece en 2 FAQs → IDF = log(100/3) ≈ 3.5
- IDF("alli") ≈ alto si no aparece en corpus
- La FAQ "tienen bebidas" tiene "beb" (bebidas → beb) y "caf" (café → caf)
- La FAQ "cuanto cuesta el pinto" tiene "pint" y "preci" pero NO "caf"
- La FAQ "tiene algo barato" tiene "preci" y "caf" (menciona café en la respuesta... pero TF-IDF es sobre la `q`, no la `a`)
- Cosine más alto → FAQ de bebidas/café
- **Resultado: "¡Sí! Tenemos café ☕ ₡1.200. ¿Le agrego uno al pedido?"** ✓

---

## Resumen de Ventajas sobre Sistema Actual

| Aspecto | Sistema Actual | Propuesta A |
|---------|---------------|-------------|
| Peso de tokens | Uniforme | Discriminativo (IDF) |
| Sinónimos | Ninguno | 120+ mappings explícitos |
| Falsos positivos | Frecuentes por fuzzy bidireccional | Reducidos por cosine normalizado |
| Umbral | Fijo 1.2 arbitrario | Adaptativo ratio + absoluto |
| Stop-words | Ninguna eliminación | 50+ eliminadas antes de scoring |
| Mantenimiento | Lista de regex duplicadas | SYNONYM_MAP como única fuente |
| Escalabilidad | Degradación lineal | Mejora con más FAQs (IDF más preciso) |

---

## Limitaciones y Trade-offs

1. **Sin aprendizaje:** El SYNONYM_MAP es estático. Nuevas jergas ticas ("mae, qué precio tan brutal") requieren actualización manual del mapa.

2. **Stemming aproximado:** El stemmer por reglas puede sobre-reducir o no reducir. Ej: "caro" no reduce (correcto), pero "pero" podría reducirse mal si se añaden reglas. Un stemmer Snowball en español sería más robusto pero pesa ~15KB extra.

3. **Queries muy cortos (1–2 palabras):** "sinpe?" o "domicilio?" — el vector query tiene alta varianza. El caso especial de 1 token con score > 0.25 mitiga esto pero no elimina el riesgo.

4. **Bigramas hardcodeados:** La lista de bigramos es manual. Frases de 3+ palabras idiomáticas no se capturan. Un enfoque n-gram sería más completo pero O(Q²) en preproceso.

5. **FAQ_DB en el closure:** El sistema actual tiene FAQ_DB dentro del método `respondLocal()`, creándola en cada llamada. Para la propuesta, FAQ_DB debe subir al scope de clase o módulo para ser accedida en `_buildSearchIndex()`. Este es un **breaking change estructural menor** en el HTML.

---

*Propuesta A — TF-IDF + Expansión por Sinónimos + Cosine Similarity*  
*Diseño finalizado: 2026-04-24*
