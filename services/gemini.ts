
import { GoogleGenAI } from "@google/genai";

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

  // 使用 Flash 模型快速解析诗句
  async streamPoemExplanation(
    query: string, 
    onChunk: (text: string) => void,
    onSources?: (sources: GroundingSource[]) => void
  ) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing. Please check your deployment environment variables.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const responseStream = await ai.models.generateContentStream({
            // 使用 Gemini 2.5 Flash 实现极速响应
            model: "gemini-2.5-flash",
            contents: `请对以下诗句进行精炼赏析：${query}。
            要求：
            1. 简述意象与意境。
            2. 解释核心典故。
            3. 概括情感。
            注意：语言要优美、极其精炼，输出严格控制在 300 字以内，不要冗长。`,
            config: {
                // 取消 thinkingConfig 以获得更快的响应速度
                tools: [{ googleSearch: {} }]
            }
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
            }
            
            // 提取搜索来源（内部保留，UI 层根据需求决定是否展示）
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

  // 生成背景画
  async generateArt(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
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

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  }

  // 使用 Veo 让画面动起来
  async animateScene(imageB64: string, prompt: string) {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
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
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
