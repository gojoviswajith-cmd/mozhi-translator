import { GoogleGenAI, Modality, Type } from "@google/genai";
import { DraftResponse, ResearchResponse } from "../types";
import { blobToBase64 } from "../utils/audioUtils";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateDraft = async (audioBlob: Blob, useHighIntellect: boolean = false): Promise<DraftResponse> => {
  const base64Audio = await blobToBase64(audioBlob);

  // Use Pro for complex tasks (Thinking), Flash for standard speed
  const model = useHighIntellect ? "gemini-3-pro-preview" : "gemini-2.5-flash";

  const prompt = `
    I am speaking in Tamil (or potentially broken English). 
    Your task is to:
    1. Transcribe the audio.
    2. Translate and refine the content into corporate professional English.
    3. Fix any spelling or grammatical errors.
    4. Generate THREE distinct versions based on the refined content:

    - **email**: Formal, suitable for external or formal internal communication. Include a professional "Subject:" line at the very top. Use standard email structure (Salutation, Body, Sign-off).
    - **whatsapp**: Professional but concise and direct. Less formal than email. Suitable for quick updates to colleagues or clients. No subject line.
    - **teamChat**: Efficient, direct, and professional (like Slack/Teams). Use bullet points for lists to make it scannable. No formal salutations or sign-offs needed, just the core message.
    
    Output ONLY the JSON object.
  `;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        email: { type: Type.STRING, description: "The formal email version with subject line." },
        whatsapp: { type: Type.STRING, description: "The concise WhatsApp version." },
        teamChat: { type: Type.STRING, description: "The efficient Team Chat version with bullet points." }
      },
      required: ["email", "whatsapp", "teamChat"]
    }
  };

  // Enable Thinking for Pro model
  if (useHighIntellect) {
    config.thinkingConfig = { thinkingBudget: 32768 };
    // Do NOT set maxOutputTokens when using thinkingConfig
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type, // e.g., 'audio/webm'
              data: base64Audio,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: config
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated");
    }
    return JSON.parse(text) as DraftResponse;
  } catch (error) {
    console.error("Error generating draft:", error);
    throw error;
  }
};

export const generateResearchContent = async (audioBlob: Blob, mode: 'SEARCH' | 'THINKING'): Promise<ResearchResponse> => {
  const base64Audio = await blobToBase64(audioBlob);

  let model: string;
  let config: any = {};

  if (mode === 'SEARCH') {
    model = 'gemini-2.5-flash';
    // Add Google Search Tool
    config.tools = [{ googleSearch: {} }];
    // responseMimeType and responseSchema are NOT allowed with googleSearch
  } else {
    model = 'gemini-3-pro-preview';
    // Add Thinking Config
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const prompt = `
    You are a professional consultant. The user is speaking (likely in Tamil or English).
    1. Transcribe the audio input.
    2. ${mode === 'SEARCH'
      ? 'Search for the most recent and accurate information available on Google to answer their query.'
      : 'Analyze the query deeply, considering multiple perspectives, strategic implications, and logical reasoning.'}
    3. Provide a comprehensive, professional answer in English.
    4. Format the output with clear Markdown headings and bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: { mimeType: audioBlob.type, data: base64Audio }
          },
          { text: prompt }
        ]
      },
      config: config
    });

    // Extract Text
    const text = response.text || "No response generated.";

    // Extract Sources if available (for Search)
    const sources: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || 'Source',
            uri: chunk.web.uri
          });
        }
      });
    }

    return { text, sources };

  } catch (error) {
    console.error("Error generating research content:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const model = "gemini-2.5-flash-preview-tts";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: text }],
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error("No audio data returned");
    }
    return audioData;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};