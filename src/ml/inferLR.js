// src/ml/inferLR.js
// IA local TF-IDF + Regresión Logística para clasificación de síntomas

function normalizeText(text) {
  if (!text) return "";
  text = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let out = "", prev = "";
  for (const ch of text) {
    if (ch === prev && /[a-zñ]/.test(ch)) continue;
    out += ch; prev = ch;
  }
  return out.trim();
}

function tokenizeWords(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const unis = tokens;
  const bis = [];
  for (let i = 0; i < tokens.length - 1; i++) bis.push(tokens[i] + " " + tokens[i + 1]);
  return [...unis, ...bis];
}

function tokenizeChars(text, minN = 3, maxN = 5) {
  const grams = [];
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i + n <= text.length; i++) grams.push(text.slice(i, i + n));
  }
  return grams;
}

function buildTfidfVector(model, text) {
  const norm = normalizeText(text);
  const wvocab = model.vectorizer.word.vocab;
  const widf = model.vectorizer.word.idf;
  const cvocab = model.vectorizer.char.vocab;
  const cidf = model.vectorizer.char.idf;
  const charMax = model.meta?.params?.char_max ?? 5;

  const wcounts = {};
  for (const tok of tokenizeWords(norm)) {
    if (wvocab[tok]) wcounts[tok] = (wcounts[tok] || 0) + 1;
  }
  const ccounts = {};
  for (const tok of tokenizeChars(norm, 3, charMax)) {
    if (cvocab[tok]) ccounts[tok] = (ccounts[tok] || 0) + 1;
  }

  const tf = (v) => (v > 0 ? 1 + Math.log(v) : 0);

  const wDim = Object.keys(wvocab).length;
  const cDim = Object.keys(cvocab).length;
  const X = new Float64Array(wDim + cDim);

  for (const [t, c] of Object.entries(wcounts)) X[wvocab[t]] = tf(c) * widf[wvocab[t]];
  for (const [t, c] of Object.entries(ccounts))
    X[wDim + cvocab[t]] = tf(c) * cidf[cvocab[t]];

  // L2 normalization
  let norm2 = Math.sqrt(X.reduce((a, b) => a + b * b, 0)) || 1;
  for (let i = 0; i < X.length; i++) X[i] /= norm2;
  return X;
}

function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

export function loadLRModel(modelJson) {
  return {
    modelJson,
    classes: modelJson.classifier.classes,
    coef: modelJson.classifier.coef,
    intercept: modelJson.classifier.intercept,
  };
}

export function predictLR(text, model) {
  const X = buildTfidfVector(model.modelJson, text);
  const logits = model.coef.map((coefRow, i) => {
    let s = model.intercept[i];
    for (let j = 0; j < X.length; j++) s += X[j] * coefRow[j];
    return s;
  });
  const probs = softmax(logits);
  const maxIdx = probs.indexOf(Math.max(...probs));
  return {
    label: model.classes[maxIdx],
    confidence: probs[maxIdx],
    probs,
  };
}
