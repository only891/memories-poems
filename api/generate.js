// api/generate.js
import * as genAIModule from '@google/genai';

export default async function handler(req, res) {
  // 1. 检查请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未找到 API Key" });
  }

  try {
    // 2. 使用日志中确认存在的类名：GoogleGenAI
    // 兼容处理：优先找 GoogleGenAI (最新版)，备选 GoogleGenerativeAI (旧版)
    const AIClass = genAIModule.GoogleGenAI || genAIModule.GoogleGenerativeAI;

    if (!AIClass) {
      throw new Error("无法解析 AI 类。当前模块可用导出: " + Object.keys(genAIModule).join(', '));
    }

    const genAI = new AIClass(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { prompt } = req.body;
    const result = await model.generateContent(prompt || "你好");
    const response = await result.response;
    
    return res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ 
      error: "AI 生成失败", 
      details: error.message 
    });
  }
}