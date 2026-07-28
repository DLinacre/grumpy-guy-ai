# Grumpy Guy AI — Your Disagreeable Copilot ಠ_ಠ

![Grumpy Guy AI Banner](./docs/banner.png)

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-ff623d?style=for-the-badge&logo=github)](https://dlinacre.github.io/grumpy-guy-ai/)
[![Deploy to GitHub Pages](https://github.com/DLinacre/grumpy-guy-ai/actions/workflows/deploy.yml/badge.svg)](https://github.com/DLinacre/grumpy-guy-ai/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)

> **"Motivation, with complaints."**  
> Grumpy Guy AI is a lightweight, ultra-responsive web companion built for people who ship anyway. Ask for a reality check, pick your tone, or just hit the button and let him mutter about your daily procrastination.

---

## 🚀 Live Demo

Experience Grumpy Guy AI deployed live on GitHub Pages:  
👉 **[https://dlinacre.github.io/grumpy-guy-ai/](https://dlinacre.github.io/grumpy-guy-ai/)**

---

## ✨ Features

- **Tone Selection**: Switch between **Dry**, **Brutal**, and **Supportive** modes depending on how much unvarnished truth you can take.
- **Instant Speech Synthesis**: Built-in Web Speech API voice synthesis to speak grumbles aloud.
- **Local Persistence & Favoriting**: Save your favorite reality checks to local storage or synchronize across devices.
- **Offline Resiliency**: Built with intelligent offline fallbacks so the grumbling never stops, even without network connectivity.
- **Reduced Motion & Dark Theme**: Custom dark aesthetic designed for modern developer workflows.
- **Cloudflare Workers & Supabase Integration**: Cloudflare Worker backend for AI responses and optional Supabase auth for remote state sync.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, CSS Grid/Flexbox with HSL dark mode palette.
- **Testing**: Vitest for fast, reliable unit test coverage.
- **Backend (Optional API)**: Cloudflare Workers with Hono routing & OpenAI API integration.
- **Auth & Database (Optional)**: Supabase Auth & PostgreSQL.
- **Deployment**: Automated CI/CD deployment to **GitHub Pages** via GitHub Actions.

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/DLinacre/grumpy-guy-ai.git
   cd grumpy-guy-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Run unit tests**:
   ```bash
   npm test
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🚢 Deployment

Deployment is fully automated using GitHub Actions. Whenever code is pushed to the `main` branch, `.github/workflows/deploy.yml` triggers a build and deploys the generated static assets to GitHub Pages.

---

## 📄 License

Distributed under the MIT License. Built by [DLinacre](https://github.com/DLinacre).
