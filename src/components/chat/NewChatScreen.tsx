"use client";

import { Sparkles, Code, BookOpen, Search } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { useFiles } from "@/hooks/useFiles";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { Button } from "../ui/button";
import { useUser } from "@clerk/nextjs";

type TabId = "create" | "explore" | "code" | "learn";

interface Suggestion {
  id: string;
  text: string;
  description?: string;
}

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestions: Suggestion[];
}

export function NewChatScreen() {
  const { user } = useUser();
  const {
    uploadingFiles,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    saveUploadedFilesToDatabase,
    removeFile,
    clearUploadedFiles,
  } = useFiles();

  const [activeTab, setActiveTab] = useState<TabId>("create");
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<{ fillInput: (text: string) => void }>(null);

  const tabs: Tab[] = [
    {
      id: "create",
      label: "Create",
      icon: Sparkles,
      suggestions: [
        {
          id: "1",
          text: "Write a creative story about time travel",
          description: "Generate an engaging narrative",
        },
        {
          id: "2",
          text: "Create a marketing plan for a tech startup",
          description: "Business strategy and planning",
        },
        {
          id: "3",
          text: "Design a workout routine for beginners",
          description: "Health and fitness planning",
        },
        {
          id: "4",
          text: "Generate ideas for a mobile app",
          description: "Innovation and brainstorming",
        },
      ],
    },
    {
      id: "explore",
      label: "Explore",
      icon: Search,
      suggestions: [
        {
          id: "5",
          text: "Explain the CAP theorem in distributed systems",
          description: "Computer science concepts",
        },
        {
          id: "6",
          text: "What are the implications of quantum computing?",
          description: "Future technology exploration",
        },
        {
          id: "7",
          text: "How do neural networks actually work?",
          description: "AI and machine learning",
        },
        {
          id: "8",
          text: "Are black holes real?",
          description: "Space and physics",
        },
      ],
    },
    {
      id: "code",
      label: "Code",
      icon: Code,
      suggestions: [
        {
          id: "9",
          text: "Beginner's guide to TypeScript",
          description: "Programming tutorial",
        },
        {
          id: "10",
          text: "Build a REST API with Node.js and Express",
          description: "Backend development",
        },
        {
          id: "11",
          text: "Optimize React app performance",
          description: "Frontend optimization",
        },
        {
          id: "12",
          text: "Database design best practices",
          description: "Data architecture",
        },
      ],
    },
    {
      id: "learn",
      label: "Learn",
      icon: BookOpen,
      suggestions: [
        {
          id: "13",
          text: "Why is AI so expensive?",
          description: "Technology economics",
        },
        {
          id: "14",
          text: "How to improve critical thinking skills",
          description: "Personal development",
        },
        {
          id: "15",
          text: "Understanding cryptocurrency and blockchain",
          description: "Financial technology",
        },
        {
          id: "16",
          text: "The psychology of decision making",
          description: "Behavioral science",
        },
      ],
    },
  ];

  const currentTab = tabs.find((tab) => tab.id === activeTab)!;

  // GSAP animations for micro-interactions
  useEffect(() => {
    const suggestions = suggestionRefs.current.filter(Boolean);

    suggestions.forEach((suggestion) => {
      if (!suggestion) return;

      const handleMouseEnter = () => {
        gsap.to(suggestion, {
          scale: 1.02,
          duration: 0.2,
          ease: "power2.out",
        });
      };

      const handleMouseLeave = () => {
        gsap.to(suggestion, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        });
      };

      suggestion.addEventListener("mouseenter", handleMouseEnter);
      suggestion.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        suggestion.removeEventListener("mouseenter", handleMouseEnter);
        suggestion.removeEventListener("mouseleave", handleMouseLeave);
      };
    });
  }, [activeTab]);

  // Tab hover animations
  useEffect(() => {
    const tabs = tabRefs.current.filter(Boolean);

    tabs.forEach((tab) => {
      if (!tab) return;

      const handleMouseEnter = () => {
        if (!tab.dataset.active) {
          gsap.to(tab, {
            scale: 1.05,
            duration: 0.2,
            ease: "power2.out",
          });
        }
      };

      const handleMouseLeave = () => {
        if (!tab.dataset.active) {
          gsap.to(tab, {
            scale: 1,
            duration: 0.2,
            ease: "power2.out",
          });
        }
      };

      tab.addEventListener("mouseenter", handleMouseEnter);
      tab.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        tab.removeEventListener("mouseenter", handleMouseEnter);
        tab.removeEventListener("mouseleave", handleMouseLeave);
      };
    });
  }, []);

  const handleSuggestionClick = (text: string) => {
    // Fill the input with the selected suggestion
    if (inputRef.current) {
      inputRef.current.fillInput(text);
    }
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="flex-1 flex items-center justify-center flex-col w-full h-full relative mx-auto">
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-y-auto p-4 w-full sm:pt-6 max-w-4xl mx-auto  sm:px-10 py-10">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
          {/* Header */}
          <motion.div
            className="space-y-4 w-full mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              How can I help you? {user?.firstName}
            </h1>
          </motion.div>

          {/* Tabs */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 w-full overflow-x-auto justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  data-active={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  variant={isActive ? "default" : "outline"}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300
                    ${
                      isActive
                        ? "shadow-lg"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </Button>
              );
            })}
          </motion.div>

          {/* Suggestions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {currentTab.suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.id}
                    ref={(el) => {
                      suggestionRefs.current[index] = el;
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1,
                      ease: "easeOut",
                    }}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full cursor-pointer text-left p-4 rounded-xl bg-card hover:bg-muted/60 border border-border/50 hover:border-border transition-all duration-200 group"
                  > 
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {suggestion.text}
                      </p>
                      {suggestion.description && (
                        <p className="text-sm text-muted-foreground">
                          {suggestion.description}
                        </p>
                      )}     
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
        </div>
      </div>

      {/* Message Input */}
      <motion.div
        className="bg-secondary/60 backdrop-blur shadow-2xl p-2 w-full rounded-lg max-w-4xl mx-auto mt-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      >
        <MessageInput
          ref={inputRef}
          isNewChat={true}
          uploadingFiles={uploadingFiles}
          onUploadFiles={uploadFiles}
          onRemoveFile={removeFile}
          isUploading={isUploading}
          hasFilesToSend={hasFilesToSend}
          clearUploadedFiles={clearUploadedFiles}
          uploadStagedFiles={saveUploadedFilesToDatabase}
        />
      </motion.div>
    </div>
  );
}
