export const MANDATORY_SCHEMA = {
  type: "object",
  properties: {
    advice: { type: "string" },
    actions: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    impacts: {
      type: "object",
      properties: {
        finance: { type: "number" },
        health: { type: "number" },
        time: { type: "number" }
      },
      additionalProperties: true
    }
  },
  required: ["advice", "rationale", "sources", "confidence"],
  additionalProperties: true
};

export function schemaValidate(obj: any): [boolean, string[]] {
  try {
    if (typeof obj !== "object" || obj === null) return [false, ["not object"]];
    for (const k of MANDATORY_SCHEMA.required) {
      if (!(k in obj)) return [false, [`missing ${k}`]];
    }
    if (typeof obj.advice !== "string") return [false, ["advice not string"]];
    if (typeof obj.rationale !== "string") return [false, ["rationale not string"]];
    if (!Array.isArray(obj.sources)) return [false, ["sources not array"]];
    if (typeof obj.confidence !== "number") return [false, ["confidence not number"]];
    return [true, []];
  } catch (e) {
    return [false, [String(e)]];
  }
}

export function extractNumbers(text: string): number[] {
  return Array.from(text.matchAll(/\b\d+(\.\d+)?\b/g)).map(m => Number(m[0]));
}
