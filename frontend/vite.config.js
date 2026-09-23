import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    host: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        guidance: resolve(__dirname, 'pages/guidance.html'),
        howItWorks: resolve(__dirname, 'pages/how-it-works.html'),
        standards: resolve(__dirname, 'pages/standards.html'),
        compare: resolve(__dirname, 'pages/compare.html'),
        help: resolve(__dirname, 'pages/help.html'),
        login: resolve(__dirname, 'pages/login.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        analyze: resolve(__dirname, 'pages/analyze.html'),
        review: resolve(__dirname, 'pages/review.html'),
        results: resolve(__dirname, 'pages/results.html'),
        standardDetails: resolve(__dirname, 'pages/standard-details.html'),
        reports: resolve(__dirname, 'pages/reports.html'),
        reportView: resolve(__dirname, 'pages/report-view.html'),
        history: resolve(__dirname, 'pages/history.html'),
        saved: resolve(__dirname, 'pages/saved.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        about: resolve(__dirname, 'pages/about.html'),
        settings: resolve(__dirname, 'pages/settings.html')
      }
    }
  }
})
