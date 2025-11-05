// src/services/predict.js
import modelJson from "../ml/model_symptoms_lr_v5.json";
import { loadLRModel, predictLR } from "../ml/inferLR";

let cachedModel = null;

export async function predictSymptoms(text) {
  try {
    if (!cachedModel) cachedModel = loadLRModel(modelJson);
    const result = predictLR(text, cachedModel);
    return {
      label: result.label,
      confidence: result.confidence,
      probs: result.probs,
    };
  } catch (err) {
    console.error("Error en predictSymptoms:", err);
    return { label: "desconocido", confidence: 0, probs: [] };
  }
}
