// app/not-found.tsx
import { AlertTriangle, MessageCircle, Plus, Zap } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary to-primary/50 text-foreground relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-2 h-2 bg-primary rounded-full animate-ping"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-primary rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-primary rounded-full animate-ping"></div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(var(--primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-primary mr-4 animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent animate-pulse">
              404
            </h1>
            <Zap className="w-12 h-12 text-primary ml-4 animate-bounce" />
          </div>
          <h2 className="text-lg sm:text-2xl font-semibold mb-2 animate-fade-in">
            Page Not Found in the Neural Network
          </h2>
          <p className="text-primary-foreground animate-fade-in-delay">
            Our AI assistant detected an anomaly in the matrix
          </p>
        </div>

        {/* Mock Chat Interface */}
        <div className="bg-background/50 backdrop-blur-lg rounded-xl border border-primary/50 shadow-2xl animate-slide-up">
          {/* Chat Header */}
          <div className="flex items-center p-4 border-b border-primary/50">
            <div className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></div>
            <MessageCircle className="w-5 h-5 mr-2 text-primary" />
            <span className="font-medium">AI Assistant</span>
            <div className="ml-auto text-sm text-primary/50">Analyzing...</div>
          </div>

          {/* Mock Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {/* Bot message 1 */}
            <div className="flex justify-start animate-message-1">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-background/50 text-foreground">
                <span className="typing-animation">
                  Hello! I&apos;m your AI assistant. It seems you&apos;ve
                  wandered into uncharted digital territory...
                </span>
              </div>
            </div>

            {/* Bot message 2 */}
            <div className="flex justify-start animate-message-2">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-secondary text-secondary-foreground">
                <span className="typing-animation-delay-1">
                  Error 404: The page you&apos;re looking for has vanished into
                  the digital void.
                </span>
              </div>
            </div>

            {/* Bot message 3 */}
            <div className="flex justify-start animate-message-3">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted text-muted-foreground">
                <span className="typing-animation-delay-2">
                  But don&apos;t worry! I&apos;m here to help you navigate back
                  to safety.
                </span>
              </div>
            </div>

            {/* Bot message 4 */}
            <div className="flex justify-start animate-message-4">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-accent text-accent-foreground">
                <span className="typing-animation-delay-3">
                  Would you like me to guide you to the homepage, or are you
                  looking for something specific?
                </span>
              </div>
            </div>

            {/* Typing indicator */}
            <div className="flex justify-start animate-typing-indicator">
              <div className="bg-background/50 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Input (non-functional for server component) */}
          <div className="p-4 border-t border-primary/50">
            <div className="flex space-x-2">
              <div className="flex-1 bg-background/50 border border-primary/50 rounded-lg px-4 py-2 text-primary-foreground">
                The AI is processing your location...
              </div>
              <div className="bg-background/50 px-6 py-2 rounded-lg font-medium cursor-not-allowed">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
          <Link
            href="/"
            className="flex items-center justify-center px-6 py-3 bg-secondary border text-secondary-foreground shadow hover:bg-secondary/80 rounded-lg font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <Plus className="w-5 h-5 mr-2" />
            New conversation
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-foreground text-sm animate-fade-in-delay-3">
          <p>Lost in the digital cosmos? Our AI is here to guide you home.</p>
        </div>
      </div>
    </div>
  );
}
