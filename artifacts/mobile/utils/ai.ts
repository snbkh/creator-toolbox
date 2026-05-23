import { Alert } from "react-native";

export interface AiConfig {
  provider: "local" | "gemini" | "openai" | "groq" | "claude";
  geminiKey: string;
  openaiKey: string;
  groqKey: string;
  claudeKey: string;
}

export async function generateWithAi(
  systemInstruction: string,
  userPrompt: string,
  config: AiConfig,
  fallback: () => string[]
): Promise<string[]> {
  const { provider, geminiKey, openaiKey, groqKey, claudeKey } = config;

  if (provider === "local") {
    // Simulate slight loading delay for natural feeling
    await new Promise((r) => setTimeout(r, 600));
    return fallback();
  }

  // Check key availability
  if (provider === "gemini" && !geminiKey.trim()) {
    Alert.alert("API Key Required", "Please enter your Gemini API key in Settings.");
    return fallback();
  }
  if (provider === "openai" && !openaiKey.trim()) {
    Alert.alert("API Key Required", "Please enter your OpenAI API key in Settings.");
    return fallback();
  }
  if (provider === "groq" && !groqKey.trim()) {
    Alert.alert("API Key Required", "Please enter your Groq API key in Settings.");
    return fallback();
  }
  if (provider === "claude" && !claudeKey.trim()) {
    Alert.alert("API Key Required", "Please enter your Claude API key in Settings.");
    return fallback();
  }

  const prompt = `${systemInstruction}\n\nUser Input/Context:\n${userPrompt}`;

  try {
    let textResult = "";

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey.trim()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try {
          const errObj = JSON.parse(errorText);
          errMsg = errObj.error?.message || errorText;
        } catch {}
        throw new Error(`Gemini API Error (Status ${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "openai") {
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try {
          const errObj = JSON.parse(errorText);
          errMsg = errObj.error?.message || errorText;
        } catch {}
        throw new Error(`OpenAI API Error (Status ${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      textResult = data.choices?.[0]?.message?.content || "";
    } else if (provider === "groq") {
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey.trim()}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try {
          const errObj = JSON.parse(errorText);
          errMsg = errObj.error?.message || errorText;
        } catch {}
        throw new Error(`Groq API Error (Status ${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      textResult = data.choices?.[0]?.message?.content || "";
    } else if (provider === "claude") {
      const url = "https://api.anthropic.com/v1/messages";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey.trim(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try {
          const errObj = JSON.parse(errorText);
          errMsg = errObj.error?.message || errorText;
        } catch {}
        throw new Error(`Claude API Error (Status ${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      textResult = data.content?.[0]?.text || "";
    }

    if (!textResult) {
      throw new Error("No response from AI API.");
    }

    // Try parsing the response as a JSON array of strings
    try {
      // Find the first '[' and last ']' to extract JSON array
      const startIdx = textResult.indexOf("[");
      const endIdx = textResult.lastIndexOf("]");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = textResult.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          return parsed;
        }
      }
    } catch {
      // Fall through to line-based parsing if JSON parsing fails
    }

    // Fallback parsing: split by lines, trim, filter empty lines, remove markdown formatting or lists
    const lines = textResult
      .split("\n")
      .map((l) => l.trim())
      .map((l) => l.replace(/^[-*•\d+.]\s*/, "")) // remove lists/bullets
      .map((l) => l.replace(/^["']|["']$/g, "")) // remove surrounding quotes
      .filter((l) => l.length > 0 && !l.startsWith("```") && l !== "[" && l !== "]");

    if (lines.length > 0) {
      return lines;
    }

    throw new Error("Could not parse AI response.");
  } catch (error: any) {
    Alert.alert("AI Generation Error", error?.message || "Failed to contact AI provider. Falling back to offline generator.");
    return fallback();
  }
}
