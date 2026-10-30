export interface SearchableSize {
  talla: string | number;
  stock: number;
}

export interface SearchableProduct {
  id: string;
  codigo?: string;
  nombre?: string;
  marca?: string;
  color?: string;
  tallas?: SearchableSize[];
}

const STOPWORDS = new Set([
  "de",
  "con",
  "y",
  "e",
  "en",
  "el",
  "la",
  "los",
  "las",
  "del",
  "al",
  "para",
  "por",
  "un",
  "una",
  "unos",
  "unas",
  "color",
  "talla",
  "tallas",
  "modelo",
  "marca",
]);

/**
 * Normalizes a string by lowercasing, stripping accents/diacritics,
 * replacing punctuation with spaces, and collapsing whitespace.
 */
export function normalizeText(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_—–/.•,;:()[\]{}'"!?+*&@#$%^~`|\\<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1-to-1 map from typos, synonyms, and abbreviations to a single canonical token.
 * Applied to both query tokens and product tokens.
 */
const CANONICAL_TOKEN_MAP: Record<string, string> = {
  // Adidas & models
  adiddas: "adidas",
  adiddass: "adidas",
  adida: "adidas",
  adids: "adidas",
  adidaz: "adidas",
  sambba: "samba",
  samna: "samba",
  sanba: "samba",
  campis: "campus",
  canpus: "campus",
  terrez: "terrex",
  terex: "terrex",
  aidizero: "adizero",
  adisero: "adizero",
  acos: "tacos",

  // Nike & Jordan models
  nikke: "nike",
  nke: "nike",
  nikr: "nike",
  jordn: "jordan",
  jordam: "jordan",
  jodran: "jordan",
  afq: "af1",
  airforce: "af1",
  airforce1: "af1",
  airmx: "airmax",
  metocon: "metcon",
  meekcon: "metcon",
  metkon: "metcon",
  corzaxon: "corazon",
  corason: "corazon",
  shock: "shox",
  shocks: "shox",
  p6000: "p600",

  // New Balance
  newbalanxe: "newbalance",
  newbalnce: "newbalance",
  newbalanfe: "newbalance",
  nb: "newbalance",
  "1906": "1960",
  "1969": "1960",

  // On Cloud
  onclud: "oncloud",
  monstwr: "monster",
  moster: "monster",
  monter: "monster",
  runing: "running",
  runnig: "running",
  runnin: "running",
  runner: "running",

  // Converse
  comverse: "converse",
  convers: "converse",
  conberse: "converse",
  platafroma: "plataforma",

  // Reebok
  rebook: "reebok",
  rebok: "reebok",
  reebook: "reebok",

  // Hoka
  hooka: "hoka",
  hocka: "hoka",

  // Onitsuka Tiger
  onitzuka: "onitsuka",

  // Asics
  asic: "asics",
  asis: "asics",
  asix: "asics",

  // Under Armour
  underarmor: "underarmour",
  underarmount: "underarmour",
  undesrarmount: "underarmour",

  // Alexander McQueen
  macqueen: "mcqueen",

  // Puma
  suade: "suede",
  tennis: "tenis",
  taco: "tacos",

  // Apparel / Camisas
  overzise: "oversize",
  oversise: "oversize",

  // Colors
  blanca: "blanco",
  blancos: "blanco",
  blancas: "blanco",
  blamco: "blanco",
  nlanxo: "blanco",
  negra: "negro",
  negros: "negro",
  negras: "negro",
  megro: "negro",
  megor: "negro",
  negor: "negro",
  negri: "negro",
  azules: "azul",
  azil: "azul",
  roja: "rojo",
  rojos: "rojo",
  rojas: "rojo",
  roko: "rojo",
  amarilla: "amarillo",
  amarillos: "amarillo",
  amarrillo: "amarillo",
  anaranjado: "naranja",
  anaranjada: "naranja",
  naraja: "naranja",
  beich: "beige",
  beig: "beige",
  grises: "gris",
  ngris: "gris",
  rosado: "rosa",
  rosada: "rosa",
  rosado0: "rosa",
  flouforesente: "fluorescente",
  fosforescente: "fluorescente",
};

/**
 * Additional component tokens indexed on a product when a canonical token is present,
 * so partial/individual words also match (e.g., "new", "balance", "air", "force").
 */
const PRODUCT_TOKEN_EXPANSIONS: Record<string, string[]> = {
  newbalance: ["new", "balance", "nb"],
  oncloud: ["on", "cloud"],
  af1: ["air", "force"],
  airmax: ["air", "max"],
  superstar: ["super", "star"],
  swiftrun: ["swift", "run"],
  suedexl: ["suede", "xl"],
  oldmoney: ["old", "money"],
  underarmour: ["under", "armour", "armor"],
  mcqueen: ["alexander", "mcqueen"],
  tennistaco: ["tenis", "tacos"],
  tennistacos: ["tenis", "tacos"],
  tenistacos: ["tenis", "tacos"],
  botast: ["botas", "tacticas"],
  adiddassamba: ["adidas", "samba"],
  adidassamba: ["adidas", "samba"],
  adidasswift: ["adidas", "swift"],
  adiddassswift: ["adidas", "swift"],
};

/**
 * Normalizes multi-word compound brand/model names in a normalized text string
 * so that spaced and unspaced forms map to the same canonical tokens.
 */
function normalizeCompoundPhrases(norm: string): string {
  return norm
    .replace(/\bnew\s+balan[cxfe]*e?\b/g, "newbalance")
    .replace(/\bon\s+clu?o?u?d\b/g, "oncloud")
    .replace(/\bcloud\s*monster\b/g, "oncloud monster")
    .replace(/\bair\s+force(\s+1)?\b/g, "af1")
    .replace(/\baf\s+1\b/g, "af1")
    .replace(/\bair\s+ma?x\b/g, "airmax")
    .replace(/\bsuper\s+star\b/g, "superstar")
    .replace(/\bswift\s+run\b/g, "swiftrun")
    .replace(/\bsuede\s+xl\b/g, "suedexl")
    .replace(/\bold\s+money\b/g, "oldmoney")
    .replace(/\bunder\s+arm[ou0e]*r?n?t?\b/g, "underarmour")
    .replace(/\basi\s+s\b/g, "asics")
    .replace(/\b(jr|j)\s*4\b/g, "jordan retro 4")
    .replace(/\b(jr|j)\s*3\b/g, "jordan retro 3")
    .replace(/\br\s*4\b/g, "retro 4")
    .replace(/\br\s*3\b/g, "retro 3")
    .replace(/\bretro\s*(\d+)\b/g, "retro $1")
    .replace(/\bjordan\s*(\d+)\b/g, "jordan $1");
}

/**
 * Converts a normalized word into a Spanish phonetic skeleton so similar-sounding
 * spellings (v/b, c/s/z, k/c/qu, ll/y, mb/nv, duplicate letters) match automatically.
 */
export function toPhonetic(word: string): string {
  if (!word) return "";
  return word
    .replace(/qu/g, "k")
    .replace(/c([ei])/g, "s$1")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/ll/g, "y")
    .replace(/ph/g, "f")
    .replace(/[mn][bv]/g, "nb")
    .replace(/tz/g, "ts")
    .replace(/^h+/, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * Damerau-Levenshtein distance (supports adjacent character transpositions like "monstwr" or "platafroma").
 */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  if (a === b) return 0;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );

  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[lenA][lenB];
}

interface IndexedProduct {
  displayNorm: string;
  compactDisplay: string;
  codeNorm: string;
  compactCode: string;
  primaryTokens: string[];
  allTokens: Set<string>;
  allTokensList: string[];
  phoneticTokens: Set<string>;
  phoneticTokensList: string[];
  availableSizes: Set<string>;
}

const productIndexCache = new WeakMap<SearchableProduct, IndexedProduct>();

function getOrBuildProductIndex(item: SearchableProduct): IndexedProduct {
  const cached = productIndexCache.get(item);
  if (cached) return cached;
  const built = buildProductIndex(item);
  productIndexCache.set(item, built);
  return built;
}

function buildProductIndex(item: SearchableProduct): IndexedProduct {
  const rawDisplay = `${item.marca || ""} ${item.nombre || ""}`;
  const displayNorm = normalizeCompoundPhrases(normalizeText(rawDisplay));
  const rawCodeNorm = normalizeText(item.codigo || item.id || "");
  const colorNorm = normalizeCompoundPhrases(normalizeText(item.color || ""));

  // Check if display name already specifies a Retro number before expanding R3/R4 from code
  const hasExplicitRetroInName =
    displayNorm.includes("retro 4") || displayNorm.includes("retro 3");
  const codeNorm = hasExplicitRetroInName
    ? rawCodeNorm
    : normalizeCompoundPhrases(rawCodeNorm);

  const primaryTokens = displayNorm
    .split(" ")
    .filter(Boolean)
    .map((t) => CANONICAL_TOKEN_MAP[t] || t);

  const rawTokens = `${displayNorm} ${colorNorm} ${codeNorm}`
    .split(" ")
    .filter(Boolean);

  const allTokens = new Set<string>();

  const addToken = (tok: string) => {
    if (!tok) return;
    const canonical = CANONICAL_TOKEN_MAP[tok] || tok;
    allTokens.add(tok);
    allTokens.add(canonical);
    const expansions =
      PRODUCT_TOKEN_EXPANSIONS[canonical] || PRODUCT_TOKEN_EXPANSIONS[tok];
    if (expansions) {
      for (const exp of expansions) {
        allTokens.add(exp);
      }
    }
  };

  for (const tok of rawTokens) {
    addToken(tok);
  }

  for (const pTok of primaryTokens) {
    addToken(pTok);
  }

  const allTokensList = Array.from(allTokens);
  const phoneticTokens = new Set<string>();
  for (const tok of allTokensList) {
    if (!/\d/.test(tok) && tok.length >= 3) {
      const phon = toPhonetic(tok);
      if (phon.length >= 3) phoneticTokens.add(phon);
    }
  }

  const availableSizes = new Set<string>();
  if (Array.isArray(item.tallas)) {
    for (const t of item.tallas) {
      if ((t.stock || 0) > 0 && t.talla !== undefined && t.talla !== null) {
        availableSizes.add(String(t.talla).toLowerCase().trim());
      }
    }
  }

  return {
    displayNorm: primaryTokens.join(" "),
    compactDisplay: primaryTokens.join(""),
    codeNorm: rawCodeNorm,
    compactCode: rawCodeNorm.replace(/\s+/g, ""),
    primaryTokens,
    allTokens,
    allTokensList,
    phoneticTokens,
    phoneticTokensList: Array.from(phoneticTokens),
    availableSizes,
  };
}

/**
 * Scores a single query token against an indexed product.
 * Returns 0 if the token does not match at all.
 */
function scoreTokenMatch(qToken: string, idx: IndexedProduct): number {
  const candidate = CANONICAL_TOKEN_MAP[qToken] || qToken;

  // 1. Exact token match in primary display name (marca + nombre)
  if (idx.primaryTokens.includes(candidate)) {
    return 110;
  }

  // 2. Exact token match in expanded tokens (aliases, color, code)
  if (idx.allTokens.has(candidate)) {
    return 100;
  }

  // 3. Prefix match on primary display tokens (user is typing a word)
  if (idx.primaryTokens.some((t) => t.startsWith(candidate))) {
    return 92;
  }

  // 4. Prefix match on any expanded token
  if (idx.allTokensList.some((t) => t.startsWith(candidate))) {
    return 85;
  }

  // 5. Substring match inside code or longer tokens (only for >= 3 chars to avoid 2-letter false positives)
  if (candidate.length >= 3) {
    if (idx.compactCode.includes(candidate)) {
      return 82;
    }
    if (idx.allTokensList.some((t) => t.includes(candidate))) {
      return 75;
    }
  }

  // 6. Phonetic match (for >= 3 chars, alphabetic only)
  const hasDigits = /\d/.test(candidate);
  if (!hasDigits && candidate.length >= 3) {
    const qPhon = toPhonetic(candidate);
    if (qPhon.length >= 3) {
      if (idx.phoneticTokens.has(qPhon)) {
        return 84;
      }
      if (idx.phoneticTokensList.some((p) => p.startsWith(qPhon))) {
        return 76;
      }
    }
  }

  // 7. Fuzzy Damerau-Levenshtein match on alphabetic tokens
  if (!hasDigits && candidate.length >= 3) {
    const qPhon = toPhonetic(candidate);
    let bestFuzzyScore = 0;

    for (const itemTok of idx.allTokensList) {
      if (/\d/.test(itemTok) || itemTok.length < 3) continue;

      const minLen = Math.min(candidate.length, itemTok.length);
      const maxLen = Math.max(candidate.length, itemTok.length);
      if (maxLen - minLen > 2) continue;

      const dist = damerauLevenshtein(candidate, itemTok);
      const tPhon = toPhonetic(itemTok);
      const phonDist =
        qPhon.length >= 3 && tPhon.length >= 3
          ? damerauLevenshtein(qPhon, tPhon)
          : dist;
      const bestDist = Math.min(dist, phonDist);

      // Also check prefix fuzzy distance when user is mid-typing a longer word
      let prefixDist = 99;
      if (candidate.length >= 4 && itemTok.length > candidate.length) {
        prefixDist = damerauLevenshtein(
          candidate,
          itemTok.slice(0, candidate.length)
        );
      }

      const effectiveDist = Math.min(bestDist, prefixDist);
      const sameFirstChar =
        candidate[0] === itemTok[0] ||
        (qPhon[0] !== undefined && qPhon[0] === tPhon[0]);

      let allowedDist = 0;
      if (minLen === 3) {
        allowedDist = sameFirstChar && maxLen <= 4 ? 1 : 0;
      } else if (minLen <= 5) {
        allowedDist = sameFirstChar ? 1 : 1;
        if (sameFirstChar && minLen === 5 && maxLen === 5) allowedDist = 2;
      } else if (minLen <= 8) {
        allowedDist = sameFirstChar ? 2 : 1;
      } else {
        allowedDist = sameFirstChar ? 3 : 2;
      }

      if (effectiveDist <= allowedDist) {
        const fuzzyScore = Math.max(40, 72 - effectiveDist * 14);
        bestFuzzyScore = Math.max(bestFuzzyScore, fuzzyScore);
      }
    }

    if (bestFuzzyScore > 0) return bestFuzzyScore;
  }

  return 0;
}

/**
 * Filters and ranks products by relevance using token normalization,
 * compound phrase matching, Spanish phonetic matching, and Damerau-Levenshtein fuzzy search.
 */
export function filterAndRankProducts<T extends SearchableProduct>(
  items: T[],
  rawQuery: string
): T[] {
  if (!rawQuery || !rawQuery.trim()) {
    return items;
  }

  const normQuery = normalizeCompoundPhrases(normalizeText(rawQuery));
  if (!normQuery) {
    return items;
  }

  const rawTokens = normQuery.split(" ").filter(Boolean);
  const filteredTokens = rawTokens.filter((t) => !STOPWORDS.has(t));
  const queryTokens = (filteredTokens.length > 0 ? filteredTokens : rawTokens).map(
    (t) => CANONICAL_TOKEN_MAP[t] || t
  );
  const compactQuery = queryTokens.join("");

  const scored: { item: T; score: number; originalIndex: number }[] = [];
  const partialScored: {
    item: T;
    score: number;
    matchedCount: number;
    originalIndex: number;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const idx = getOrBuildProductIndex(item);

    let bonus = 0;
    if (idx.codeNorm === normQuery || idx.compactCode === compactQuery) {
      bonus += 200;
    } else if (idx.displayNorm === queryTokens.join(" ")) {
      bonus += 150;
    } else if (idx.displayNorm.includes(queryTokens.join(" "))) {
      bonus += 80;
    } else if (
      compactQuery.length >= 4 &&
      idx.compactDisplay.includes(compactQuery)
    ) {
      bonus += 60;
    }

    let totalTokenScore = 0;
    let matchedCount = 0;

    for (const qTok of queryTokens) {
      let tokScore = scoreTokenMatch(qTok, idx);

      // If user explicitly searched "talla 40" or included a shoe/shirt size with stock
      if (tokScore === 0 && rawTokens.includes("talla") && idx.availableSizes.has(qTok)) {
        tokScore = 70;
      }

      if (tokScore > 0) {
        matchedCount++;
        totalTokenScore += tokScore;
      }
    }

    let allMatched = matchedCount === queryTokens.length;

    // Fallback: if user typed a single glued word (like "nikedunk" or "adidassamba")
    if (
      !allMatched &&
      queryTokens.length === 1 &&
      compactQuery.length >= 4 &&
      (idx.compactDisplay.includes(compactQuery) ||
        idx.compactCode.includes(compactQuery))
    ) {
      allMatched = true;
      totalTokenScore = 85;
    }

    if (allMatched) {
      const avgTokenScore = totalTokenScore / queryTokens.length;
      scored.push({
        item,
        score: avgTokenScore + bonus,
        originalIndex: i,
      });
    } else if (queryTokens.length >= 2 && matchedCount >= Math.max(1, queryTokens.length - 1)) {
      const coverageRatio = matchedCount / queryTokens.length;
      partialScored.push({
        item,
        score: (totalTokenScore / queryTokens.length) * coverageRatio + bonus * 0.5,
        matchedCount,
        originalIndex: i,
      });
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    });
    return scored.map((s) => s.item);
  }

  if (partialScored.length > 0) {
    partialScored.sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    });
    return partialScored.map((s) => s.item);
  }

  return [];
}
