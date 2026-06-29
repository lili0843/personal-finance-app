import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 하위 경로(/budget-app/) 배포용 base 설정.
// 다른 경로/도메인으로 배포하려면 이 값만 바꾸면 됩니다.
export default defineConfig({
  base: '/budget-app/',
  plugins: [react()],
})
