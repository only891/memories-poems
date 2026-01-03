
import { GoogleGenAI, Type } from "@google/genai";

export interface GroundingSource {
  title: string;
  url: string;
}

export class GeminiService {
  private static instance: GeminiService;
  
  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  // Stream explanation of a poem
  async streamPoemExplanation(
    query: string, 
    onChunk: (text: string) => void,
    onSources?: (sources: GroundingSource[]) => void
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        // 使用 gemini-2.5-flash 模型并启用 Google 搜索
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: `请简要赏析：${query}。
            重点：
            1. 解释诗句含义与核心典故。
            2. 简述意境与背景。
            要求：语言优美凝练，直击要点，避免冗长，输出字数严格控制在300字以内。`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
            }
            
            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && onSources) {
                const sources: GroundingSource[] = groundingChunks
                    .map((c: any) => c.web)
                    .filter((w: any) => w)
                    .map((w: any) => ({ title: w.title, url: w.uri }));
                
                if (sources.length > 0) {
                    onSources(sources);
                }
            }
        }
    } catch (error) {
        console.error("Gemini stream error:", error);
        throw error;
    }
  }

  // Generate artistic background based on poem
  async generateArt(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `一幅中国水墨画风格的插图，意境取自诗句：${prompt}。风格唯美、极简、大气。` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: size
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  // Animate image with Veo
  async animateScene(imageB64: string, prompt: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Remove data:image/...;base64, prefix
    const cleanB64 = imageB64.split(',')[1];
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `让这张画动起来，展现${prompt}的意境，云雾缭绕，微风拂动。`,
      image: {
        imageBytes: cleanB64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
