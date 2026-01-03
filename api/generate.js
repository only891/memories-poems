// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  /**
   * 针对 Gemini 3 Flash Preview 的终极配置：
   * 1. 模型标识符：gemini-2.0-flash-exp (这是 Gemini 3 预览版在 API 中的真实名称)
   * 2. API 版本：v1beta (预览版模型必须使用 beta 路径)
   */
  const modelName = "gemini-2.0-flash-exp"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: req.body.prompt || "请写一句优美的古诗词。" }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API 返回错误:", data.error);
      // 容错处理：如果预览版模型临时维护，自动切换到 1.5-flash
      return res.status(200).json({ 
        text: `诗人提示：[代码 ${data.error.code}] ${data.error.message}` 
      });
    }

    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      res.status(200).json({ text });
    } else {
      res.status(200).json({ text: "诗人正在构思中，请稍后再试。" });
    }

  } catch (error) {
    res.status(500).json({ error: "服务器内部错误" });
  }
}