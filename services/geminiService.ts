import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables. Ensure GEMINI_API_KEY is set.");
  }
  // Initialize with the correct options object
  return new GoogleGenAI({ apiKey });
};

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const genAI = getClient();
    
    // Remove the data URL prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const prompt = `
      You are a futuristic cyberpunk security AI. 
      Analyze this visual feed of a person or object. 
      Provide a brief, robotic assessment of what you see.
      Determine a 'Threat Level' (e.g., LOW, MODERATE, CRITICAL, UNKNOWN).
      Extract key identifier tags.
      
      Respond in JSON format.
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: cleanBase64 } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A robotic, 2-sentence analysis of the subject." },
            threatLevel: { type: Type.STRING, description: "The calculated threat level (LOW, MODERATE, CRITICAL, or UNKNOWN)." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3-5 keywords identifying features." }
          },
          required: ["description", "threatLevel", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      description: "ANALYSIS FAILED. UNABLE TO PROCESS VISUAL DATA. SYSTEM ERROR.",
      threatLevel: "UNKNOWN",
      tags: ["ERROR", "OFFLINE"]
    };
  }
};