import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploying to GitHub pages at https://<user>.github.io/<repo>/ requires setting Vite's base
// We try to derive the repo name from GITHUB_REPOSITORY in CI, otherwise fall back to 'myproject'.
let repoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1] || process.env.PROJECT_REPO || ''

// Ensure leading slash
if (!repoName.startsWith('/')) {
  repoName = '/' + repoName;
}

// Ensure trailing slash
if (!repoName.endsWith('/')) {
  repoName = repoName + '/';
}

export default defineConfig({
  base: `${repoName}`,
  plugins: [react()],
})
