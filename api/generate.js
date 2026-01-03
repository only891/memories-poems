// api/generate.js (原生 Fetch 稳定版)
export default async function handler(req, res) {
  // 1. 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  // 2. 构造 Google Gemini API 的原生请求地址
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    // 3. 使用原生 fetch 发起请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: req.body.prompt || "请写一句诗" }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    const data = await response.json();

    // 4. 检查 Google API 是否返回了错误
    if (data.error) {
      console.error("Google API Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // 5. 解析并返回诗词文本
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });

  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "服务器内部错误，请检查日志" });
  }
}