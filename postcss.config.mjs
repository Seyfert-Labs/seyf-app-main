import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Raíz fija del repo. Si `base` no se fija, el plugin usa `process.cwd()` y Next/Turbopack
// a veces resuelve `@import 'tailwindcss'` desde `~/Documents`, falla en bucle y dispara CPU.
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: projectRoot,
    },
  },
}

export default config
