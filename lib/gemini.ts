import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateColoringPage(theme: string, childName: string, size: "1K" | "2K" | "4K" = "1K") {
  const prompt = `A high-quality, black and white coloring book page for a child named ${childName}. 
  The theme is: ${theme}. 
  Style: Thick black outlines, simple shapes, no shading, white background, suitable for crayons. 
  Ensure the drawing is clear and fun for kids.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: size
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

export async function getChatResponse(messages: { role: 'user' | 'model', content: string }[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction: "You are a creative assistant helping parents and kids come up with fun themes for a coloring book. Suggest creative, imaginative, and age-appropriate themes. Keep your responses short, playful, and encouraging.",
    }
  });

  return response.text;
}
