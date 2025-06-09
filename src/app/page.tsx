"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";
import Link from "next/link";
import { CodeHighlightDemo } from "@/components/chat/CodeHighlightDemo";

export default function HomePage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <MessageSquare className="h-10 w-10 text-primary" />
          </div>
          <CodeHighlightDemo />

          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text">
              R3 Chat
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Real-time AI conversations with multiple models, collaborative chat
            rooms, and seamless user experience powered by modern technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {isSignedIn ? (
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/chat">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Open Chat
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link href="/auth">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Get Started
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6"
                >
                  <Link href="/chat">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    View Demo
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Model AI</h3>
            <p className="text-muted-foreground">
              Choose from GPT-4, Claude, Gemini, and more. Switch models
              seamlessly based on your needs.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Real-time Collaboration
            </h3>
            <p className="text-muted-foreground">
              Chat with friends and AI together. See typing indicators, presence
              status, and instant message updates.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Built with modern tech stack for instant responses, smooth
              animations, and zero lag.
            </p>
          </div>
        </div>

        {/* Tech Stack Badge */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground mb-4">Powered by</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Next.js", "Convex", "Clerk", "Tailwind", "TypeScript"].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 text-xs bg-muted rounded-full border"
                >
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
