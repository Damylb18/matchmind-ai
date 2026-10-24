
import "dotenv/config";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const key = process.env.AZURE_OPENAI_API_KEY;
const model = process.env.AZURE_OPENAI_MODEL;

if (!endpoint || !key || !model) {
  throw new Error("Missing Azure environment variables in .env");
}

const evidence = `Verified evidence:
- Team: Arsenal
- Pressure events recorded: 10
- Average pressure metric: 0.92

The metric's scale, definition, and reference range have not been provided.`;

const audiences = {
  Fan: `Write for a casual football fan.
Use everyday language and explain the available information clearly.
Avoid technical jargon and unnecessary caveats.
Do not pretend the numbers reveal more than they actually do.`,

  Analyst: `Write for a football analyst.
Use precise, evidence-based terminology.
Distinguish recorded measurements from interpretation.
State clearly when the evidence is insufficient for a tactical conclusion.`,

  Broadcast: `Write for a live football broadcast.
Use natural, concise language that sounds good when spoken aloud.
Lead with the key verified information.
Avoid stiff report-style wording, dramatic claims, and invented match events.`,
};

const languages = ["English", "Spanish", "French", "Yoruba"];

function extractAnswer(data) {
  return (
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text
  );
}

async function generateExplanation(audience, instructions, language) {
  const prompt = `You are MatchMind AI's football insight personalisation engine.

${evidence}

Audience: ${audience}
Audience style:
${instructions}

Required output language: ${language}

Requirements:
1. Write no more than two short sentences.
2. Respond entirely in the required language, using natural phrasing.
3. Adapt tone and wording to the audience while preserving the same facts.
4. Explain the available evidence without merely adding unsupported meaning to the numbers.
5. Do not describe 0.92 as high, low, good, or bad because its scale is unknown.
6. Do not invent causes, player actions, chances, goals, match outcomes, or tactical conclusions.
7. Do not add facts that are absent from the verified evidence.
8. Return only the explanation. No headings, labels, or commentary.`;

  const response = await fetch(`${endpoint}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  const answer = extractAnswer(data);

  if (!answer?.trim()) {
    throw new Error("No readable answer returned.");
  }

  return answer.trim();
}

let successful = 0;
let failed = 0;

console.log("MATCHMIND AI — PERSONALISATION EVALUATION");
console.log(`Model: ${model}`);
console.log("Evidence: identical across all tests");
console.log("=".repeat(60));

for (const [audience, instructions] of Object.entries(audiences)) {
  for (const language of languages) {
    console.log(`\n[${audience} | ${language}]`);

    try {
      const answer = await generateExplanation(
        audience,
        instructions,
        language
      );

      console.log(answer);
      successful++;
    } catch (error) {
      console.error(`Failed: ${error.message}`);
      failed++;
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log(`Completed: ${successful}/12 successful; ${failed} failed.`);
console.log("Review naturalness, audience fit, translation quality, and factual grounding manually.");
