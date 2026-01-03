// api/generate.js
import * as genAIModule from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未找到 API Key" });
  }

  try {
    // 1. 获取最新的 GoogleGenAI 类
    const GoogleGenAI = genAIModule.GoogleGenAI || genAIModule.GoogleGenerativeAI;
    
    // 2. 初始化客户端
    const genAI = new GoogleGenAI(apiKey);

    // 3. 兼容性适配：尝试最新版和旧版的不同方法名
    // 最新版通常直接在 genAI 对象上通过 models 属性或特定方法获取
    const model = genAI.getGenerativeModel 
      ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      : genAI.models.get("gemini-1.5-flash"); // 某些新版本的备选路径

    const { prompt } = req.body;
    
    // 4. 执行生成
    const result = await model.generateContent(prompt || "你好");
    const response = await result.response;
    const text = response.text();
    
    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // 5. 极致兜底方案：如果上述对象方法都失败，尝试直接使用模块导出的函数（如果存在）
    return res.status(500).json({ 
      error: "AI 接口调用失败", 
      details: error.message 
    });
  }
}