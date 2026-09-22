import { z } from "zod";

export const MatchEvaluationSchema = z.object({
  results: z.array(
    z.object({
      provider_job_id: z.string(),
      relevant: z.boolean(),
      relevance_score: z.number().min(0).max(1),
      explanation: z.string().max(600),
    })
  ),
});

export type MatchEvaluation = z.infer<typeof MatchEvaluationSchema>;

// Hand-kept in sync with MatchEvaluationSchema above — passed to OpenAI as
// the strict JSON Schema for structured output.
export const MATCH_EVALUATION_JSON_SCHEMA = {
  name: "match_evaluation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            provider_job_id: { type: "string" },
            relevant: { type: "boolean" },
            relevance_score: { type: "number" },
            explanation: { type: "string" },
          },
          required: ["provider_job_id", "relevant", "relevance_score", "explanation"],
        },
      },
    },
    required: ["results"],
  },
} as const;
