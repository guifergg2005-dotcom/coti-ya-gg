import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'firebase-auth', test: /node_modules[\\/]@firebase[\\/]auth[\\/]/ },
    { name: 'firebase-data', test: /node_modules[\\/]@firebase[\\/]firestore[\\/]/ },
    { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }
  ] } } } }
})
