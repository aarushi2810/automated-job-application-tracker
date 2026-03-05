const OpenAI = require("openai");

let client = null;
if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function parseJobText(text) {
  if (!client) {
    const error = new Error("OpenAI not configured");
    error.code = "OPENAI_NOT_CONFIGURED";
    throw error;
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a parser that extracts structured job information from unstructured job descriptions or job pages.",
      },
      {
        role: "user",
        content: `
Extract the following fields from this job posting text:
- company
- role
- location
- skills (array of key skills mentioned)
- salary (string, if any explicit salary or range is mentioned)

Return a JSON object with exactly these keys.

TEXT:
"""${text}"""
        `,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw };
  }

  return parsed;
}

module.exports = { parseJobText };

