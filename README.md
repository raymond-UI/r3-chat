# R3 Chat – T3 Chat Cloneathon Submission

## 🚀 Overview

**R3 Chat** is a modern, real-time AI chat platform built for the T3 Chat Cloneathon. It delivers all core requirements and goes above and beyond with unique, production-grade features, a beautiful UI, and a focus on extensibility and performance.

---

## 🏆 How We Meet the Cloneathon Requirements

### Core Requirements

| Requirement                        | How We Meet It                                                                                   |
|-------------------------------------|--------------------------------------------------------------------------------------------------|
| **Chat with Various LLMs**          | - Model selector supports OpenAI, Anthropic, Google, OpenRouter, and more<br>- Vision model support<br>- Cost/speed badges, provider badges |
| **Authentication & Sync**           | - Clerk integration for secure auth (Google, GitHub, email)<br>- Real-time chat sync across devices<br>- User profile management |
| **Browser Friendly**                | - 100% web-based, responsive, mobile-first design<br>- No native app required                   |
| **Easy to Try**                     | - Instant sign-up, guest/anonymous mode<br>- Public share links for conversations and profiles   |

### Bonus Features

| Feature                        | Implementation Highlights                                                                                  |
|---------------------------------|----------------------------------------------------------------------------------------------------------|
| **Attachment Support**          | - Drag-and-drop file upload (images, PDFs)<br>- Visual file previews in chat<br>- PDF text extraction     |
| **Image Generation Support**    | - Text-to-image via supported models (DALL-E, Gemini, etc.)<br>- Image previews and chat integration      |
| **Syntax Highlighting**         | - Beautiful code blocks with language detection, line numbers, copy button, dark/light themes            |
| **Resumable Streams**           | - Real-time streaming with auto-resume after refresh<br>- No message loss, seamless user experience      |
| **Chat Branching**              | - Branch entire conversations or individual AI responses<br>- Visual branch selector, alternative responses |
| **Chat Sharing**                | - Share conversations via public/private links<br>- Password protection, anonymous access, expiration     |
| **Web Search**                  | - Real-time web search integration for up-to-date answers                                                |
| **Bring Your Own Key (BYOK)**   | - Users can add/manage their own API keys for all major providers                                        |

---

## ✨ Extra Value Features

| Feature                        | Description                                                                                             |
|---------------------------------|--------------------------------------------------------------------------------------------------------|
| **Public Profiles & Showcases** | - Users can create public profiles and showcase selected conversations<br>- SEO-friendly URLs           |
| **Conversation Organization**   | - Pin, search, and filter conversations<br>- Tag-based organization and featured conversations          |
| **Collaboration**               | - Real-time multi-user chat rooms<br>- Live presence, typing indicators, participant management         |
| **Conversation Export**         | - (Planned) Export chats to PDF/Markdown                                                               |
| **Mobile-First UI**             | - Touch-friendly, responsive, and beautiful on all devices                                             |
| **Performance Optimizations**   | - Virtualized lists, memoized components, and fast event handling for <200ms interactions               |
| **Advanced Access Control**     | - Fine-grained sharing (public, private, password, anonymous)<br>- Only creators can delete conversations|
| **Conversation Continuity**     | - Auto-save, scroll restoration, and context window management                                         |
| **AI Personality System**       | - (Planned) Switch between AI personas for different tasks                                             |
| **Real-time Collaboration**     | - Invite system, instant join links, and collaborative chat rooms                                      |

---

## 🛠️ Tech Stack

- **Next.js (App Router)**
- **Convex** (real-time DB, subscriptions)
- **Vercel AI SDK** (streaming, multi-model)
- **Clerk** (authentication)
- **Framer Motion + GSAP** (animations)
- **TypeScript** (type safety)
- **Tailwind CSS** (UI)
- **OpenRouter, OpenAI, Anthropic, Google** (LLM providers)

---

## 📝 How to Run Locally

1. `git clone https://github.com/raymond-ui/r3-chat`
2. `cd r3-chat`
3. `pnpm install`
4. Set up `.env` with your API keys (see `/src/config/providers.ts`)
5. `pnpm dev`
6. Visit [http://localhost:3000](http://localhost:3000)

---

## 🎨 Screenshots

<!-- Add screenshots/gifs here to show off UI, branching, file upload, etc. -->

---

## 📚 License

MIT

---

## 💡 Why R3 Chat?

- **All core requirements, fully productionized**
- **Unique features:** public profiles, branching, real-time collaboration, advanced sharing
- **Beautiful, modern, and fast**
- **Extensible and open source**

---

## 🏁 Ready for Judging

- All features are live and easy to try
- Open source, MIT licensed
- Built for vibes, speed, and extensibility

---

*Built for the T3 Chat Cloneathon. Not affiliated with T3 Chat.*
