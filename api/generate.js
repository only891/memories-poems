// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  /**
   * 针对 Gemini 3 Flash 的关键修改：
   * 1. 使用 v1beta 路径
   * 2. 模型名称使用 gemini-3-flash
   */
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: req.body.prompt || "请写一句优美的古诗词。" }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API 返回错误:", data.error);
      return res.status(data.error.code || 500).json({ 
        error: data.error.message,
        details: "请检查 API Key 是否有权访问 Gemini 3 系列模型"
      });
    }

    // 解析生成的内容
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      res.status(200).json({ text });
    } else {
      res.status(500).json({ error: "无法解析 API 返回的内容", raw: data });
    }

  } catch (error) {
    console.error("Vercel Function Error:", error);
    res.status(500).json({ error: "服务器内部错误" });
  }
}