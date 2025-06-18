# R3 Chat – [Live demo](https://r3-chat.vercel.app) 🚀

**R3 Chat** is a sleek, real-time AI chat app built for the [T3 Chat Cloneathon](cloneathon.t3.chat). It checks all required boxes—then goes further—with powerful features, clean UX, and performance-first engineering.

---

## ✅ Cloneathon Requirements Met

**Core Features**
- ✅ Chat with multiple LLMs 
- ✅ Model selector with vision support, provider badges, cost/speed indicators
- ✅ Authentication via Clerk (Google, GitHub)
- ✅ Real-time sync across devices
- ✅ Fully web-based and responsive (mobile-first)
- ✅ Guest/anonymous mode for instant tryout
- ✅ Shareable links for chats and profiles

**Bonus Features**
- ✅ Bring Your Own Key (BYOK) support (OpenAI, Anthropic, Google, OpenRouter)
- ✅ File upload (images, PDFs), for models thaqt supoorts files
- ✅ Code syntax highlighting
- ✅ Chat/Conversation branching
- ✅ Chat sharing with password, expiration, and anonymous options
- ⚠️ Web search with models that supports

---

## ✨ Extra Value Adds

- ✅ Public user profiles with conversation showcases (SEO-friendly)
- ✅ Real-time multi-user chat rooms with live presence & invites
- ✅ Tags, pins, filters for organizing chats
---
- ⌛ Planned: export conversations to PDF/Markdown
- ⌛ Planned: custom AI personas per conversation
- ⌛ Resumable stream

---

## 🛠️ Tech Stack

- **Next.js (App Router)**
- **Convex** – real-time DB with live subscriptions
- **Vercel AI SDK** – multi-model streaming
- **Clerk** – authentication
- **TypeScript** – fully typed
- **Tailwind CSS** – UI styling
- **Framer Motion + GSAP** – animations

---

## 📦 Run Locally

```bash
git clone https://github.com/raymond-ui/r3-chat
```
```bash
cd r3-chat
```
Create .env with keys — see env.examples
```bash
pnpm install
```
```bash
pnpm dev
```

## 📄 License  
[Apache 2.0](./LICENSE)
