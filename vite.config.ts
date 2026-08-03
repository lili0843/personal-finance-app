import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Netlify는 루트 도메인에서 서비스되므로 base는 '/'.
// (GitHub Pages 하위 경로로 다시 배포하려면 '/저장소이름/' 으로 바꾸면 됩니다.)
export default defineConfig({
  base: '/',
  plugins: [react()],
})
