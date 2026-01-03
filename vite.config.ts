
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 加载当前模式下的所有环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 关键：将您在 Vercel 设置的键名映射到应用代码使用的 process.env.API_KEY
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.API_KEY || process.env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // 在构建时进行字符串替换
      'process.env.API_KEY': JSON.stringify(apiKey),
      // 兼容某些依赖库对 process.env 对象的整体访问
      'process.env': {
        API_KEY: JSON.stringify(apiKey)
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
