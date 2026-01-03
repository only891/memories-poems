
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 加载当前模式下的环境变量（包括 Vercel 注入的系统变量）
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // 将 process.env.API_KEY 替换为构建时的实际值
      // 优先级：系统环境变量 > .env 文件 > 空字符串
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // 兼容某些库可能对 process.env 的整体访问
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || '')
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
