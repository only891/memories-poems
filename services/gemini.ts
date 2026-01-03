
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

  // 使用深度思考模式解析诗句
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
            // 使用 Pro 模型以支持复杂推理和深度思考
            model: "gemini-3-pro-preview",
            contents: `请对以下诗句进行深度的文化与文学赏析：${query}。
            要求：
            1. 解释核心意象与背后隐喻。
            2. 详述相关的历史典故与时代背景。
            3. 分析诗人的情感寄托与艺术特色。
            语言要求优美凝练，具有深度，字数控制在500字左右。`,
            config: {
                // 启用深度思考，预算设为最大值 32768
                thinkingConfig: { thinkingBudget: 32768 },
                tools: [{ googleSearch: {} }]
            }
        });

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
            }
            
            // 提取搜索来源（指令要求必须展示）
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
