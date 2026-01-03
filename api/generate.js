// api/generate.js
import * as genAIModule from '@google/genai';

export default async function handler(req, res) {
  // 1. 允许跨域及请求方法检查
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务器未找到 API Key" });
  }

  try {
    // 2. 深度解析 GoogleGenerativeAI 类
    // 尝试所有可能的嵌套路径
    let GoogleGenerativeAI = 
        genAIModule.GoogleGenerativeAI || 
        (genAIModule.default && genAIModule.default.GoogleGenerativeAI) ||
        (genAIModule.default && genAIModule.default.default && genAIModule.default.default.GoogleGenerativeAI);

    // 3. 如果还是找不到，输出模块结构到 Log 以便诊断
    if (!GoogleGenerativeAI) {
      console.log("模块导出结构诊断:", JSON.stringify(Object.keys(genAIModule)));
      throw new Error("无法从模块中解析 GoogleGenerativeAI 类，请查看 Log 中的结构诊断。");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
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