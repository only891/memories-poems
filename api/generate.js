// api/generate.js
import pkg from '@google/genai';
const { GoogleGenerativeAI } = pkg;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未找到 API Key" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { prompt } = req.body;
    const result = await model.generateContent(prompt || "你好");
    const response = await result.response;
    
    return res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "AI 生成失败", details: error.message });
  }
}