// api/generate.js
import { GoogleGenerativeAI } from "@google/genai";

export default async function handler(req, res) {
  // 1. 检查请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  // 2. 检查 API Key
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未找到 API Key，请检查 Vercel 环境变量设置" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { prompt } = req.body;
    
    // 3. 调用 Gemini
    const result = await model.generateContent(prompt || "你好");
    const response = await result.response;
    const text = response.text();

    // 4. 返回成功响应
    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 5. 返回具体的 AI 错误信息
    return res.status(500).json({ 
      error: "AI 生成失败", 
      details: error.message 
    });
  }
}