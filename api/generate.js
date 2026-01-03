// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  // 备选模型列表：按先进程度排序
  const models = [
    "gemini-1.5-flash", // 目前全球最稳定、响应最快的版本
    "gemini-pro"        // 备用版本
  ];

  let lastError = null;

  for (const modelName of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: req.body.prompt || "请写一句优美的古诗词。" }] }]
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0].content) {
        // 成功获取内容，直接返回并退出循环
        return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
      } else {
        lastError = data.error ? data.error.message : "未知错误";
        console.warn(`模型 ${modelName} 尝试失败: ${lastError}`);
        continue; // 尝试下一个模型
      }
    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  // 如果所有模型都失败了
  res.status(500).json({ error: "所有 AI 模型均暂时不可用", details: lastError });
}