import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/wms-virtual-demo/', // 适配 GitHub Pages 仓库路径
  plugins: [vue()]
}) 