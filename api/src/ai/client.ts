import type { AiConfig } from "./config.js";

/** One structured-output request to the OpenAI Responses API. */
export type AiRequest = {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type AiResponse = {
  /** The model's JSON text (already checked to be complete). */
  text: string;
  /** Model name reported by the API, e.g. "gpt-4.1-mini-2025-04-14". */
  model: string;
  responseId: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

/** Anything that can answer an AiRequest. Tests pass a mock instead of the real API. */
export type AiCaller = (request: AiRequest) => Promise<AiResponse>;

export class AiError extends Error {
  /** True when retrying cannot help this run (bad key, no access, unknown model). */
  constructor(message: string, readonly fatal = false) {
    super(message);
  }
}

/** Never let anything that looks like a key reach a log line or an error message. */
export function redactSecrets(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_\-*.]{4,}/g, "sk-***");
}

type ResponsesBody = {
  id?: unknown;
  model?: unknown;
  status?: unknown;
  incomplete_details?: { reason?: unknown } | null;
  error?: { message?: unknown } | null;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
  output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown; refusal?: unknown }> }>;
};

/** Calls POST /v1/responses with a strict JSON schema. The key stays on the server. */
export function createOpenAiCaller(config: AiConfig, fetchImpl: typeof fetch = fetch): AiCaller {
  return async (request) => {
    // One deadline for the whole exchange, including reading the body.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      return await send(request, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw new AiError(`OpenAI request timed out after ${request.timeoutMs} ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  async function send(request: AiRequest, signal: AbortSignal): Promise<AiResponse> {
    let response: Response;
    try {
      response = await fetchImpl(`${config.baseUrl}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          instructions: request.instructions,
          input: request.input,
          max_output_tokens: request.maxOutputTokens,
          temperature: 0.4,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              schema: request.schema,
              strict: true,
            },
          },
        }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new AiError(`OpenAI request failed: ${redactSecrets(String(error))}`);
    }

    let body: ResponsesBody;
    try {
      body = (await response.json()) as ResponsesBody;
    } catch (error) {
      if (signal.aborted) throw error;
      throw new AiError(`OpenAI returned HTTP ${response.status} with an unreadable body`);
    }

    if (!response.ok) {
      const message = typeof body.error?.message === "string" ? body.error.message : "no message";
      const fatal = response.status === 401 || response.status === 403 || response.status === 404;
      throw new AiError(`OpenAI HTTP ${response.status}: ${redactSecrets(message)}`, fatal);
    }
    if (body.status !== "completed") {
      const reason = typeof body.incomplete_details?.reason === "string" ? body.incomplete_details.reason : String(body.status);
      throw new AiError(`OpenAI response not completed (${reason})`);
    }

    let text = "";
    for (const item of body.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part.type === "refusal") throw new AiError("OpenAI refused the request");
        if (part.type === "output_text" && typeof part.text === "string") text += part.text;
      }
    }
    if (!text) throw new AiError("OpenAI response contained no text");

    const count = (value: unknown) => (typeof value === "number" ? value : null);
    return {
      text,
      model: typeof body.model === "string" ? body.model : config.model,
      responseId: typeof body.id === "string" ? body.id : "",
      inputTokens: count(body.usage?.input_tokens),
      outputTokens: count(body.usage?.output_tokens),
    };
  }
}
