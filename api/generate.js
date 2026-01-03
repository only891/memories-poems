// api/generate.js (诊断版)
export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  // 打印前四个字符用于核对（会在 Vercel Logs 中显示，不会泄露全称）
  console.log("使用 Key 前缀:", apiKey ? apiKey.substring(0, 4) : "未找到 Key");

  const modelName = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: req.body.prompt || "你好" }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      // 关键：把详细错误信息传回前端
      return res.status(200).json({ 
        text: `诗人遇到了困难：[错误代码 ${data.error.code}] - ${data.error.message}` 
      });
    }

    if (data.candidates) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    }
  } catch (err) {
    return res.status(200).json({ text: "系统底层报错: " + err.message });
  }
}