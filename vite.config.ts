
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 显式定义 process.env.API_KEY。
    // 构建时，代码中所有的 'process.env.API_KEY' 字符串都会被替换为实际的环境变量值。
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    // 同时定义 process.env 对象，以防某些库以对象属性方式访问。
    'process.env': {
      API_KEY: JSON.stringify(process.env.API_KEY || '')
    }
  }
});
