
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 在 Vite 中，'process.env' 默认在客户端不可用。
    // 我们必须明确地将特定的环境变量定义为字符串，以便在构建时进行替换。
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  }
});
