"use client";

import { useAnonymousMessaging } from "@/hooks/useAnonymousMessaging";
import { useFiles } from "@/hooks/useFiles";
import { TabId, tabs } from "@/utils/suggestionData";
import { useUser } from "@clerk/nextjs";
import { gsap } from "gsap";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { MessageInput } from "./MessageInput";
import { ChatContainer } from "./ChatContainer";
import type { Id } from "../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";

const LoginPromptDialog = dynamic(() => import("../auth/LoginPromptDialog").then((mod) => mod.LoginPromptDialog), { ssr: false });

interface NewChatScreenProps {
  conversationId?: Id<"conversations">;
}

export function NewChatScreen({ conversationId }: NewChatScreenProps) {
  const { user } = useUser();
  const router = useRouter();
  const [currentConversationId, setCurrentConversationId] = useState<Id<"conversations"> | null>(conversationId || null);
  const [selectedModelForNewConversation, setSelectedModelForNewConversation] = useState<string | undefined>(undefined);
  
  const {
    uploadingFiles,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    saveUploadedFilesToDatabase,
    removeFile,
    clearUploadedFiles,
  } = useFiles();

  const {
    isSignedIn,
    canSendMessage,
    showLoginPrompt,
    handleLoginPromptClose,
    setShowLoginPrompt,
  } = useAnonymousMessaging();

  const [activeTab, setActiveTab] = useState<TabId>("create");
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inputRef = useRef<{ fillInput: (text: string) => void }>(null);

  const currentTab = tabs.find((tab) => tab.id === activeTab)!;

  // Handle new conversation creation
  const handleNewConversationCreated = (newConversationId: Id<"conversations">, selectedModel?: string) => {
    console.log("🔍 [CLIENT] NewChatScreen - conversation created with model:", { 
      newConversationId, 
      selectedModel 
    });
    setCurrentConversationId(newConversationId);
    setSelectedModelForNewConversation(selectedModel);
    // Optimistically update the URL without navigation
    router.replace(`/chat/${newConversationId}`, { scroll: false });
  };

  // GSAP animations for micro-interactions
  useEffect(() => {
    // Skip animations if showing chat container
    if (currentConversationId) return;
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
  }, [activeTab, currentConversationId]);

  // Tab hover animations
  useEffect(() => {
    // Skip animations if showing chat container
    if (currentConversationId) return;
    
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
  }, [currentConversationId]);

  const handleSuggestionClick = (text: string) => {
    // Fill the input with the selected suggestion
    if (inputRef.current) {
      inputRef.current.fillInput(text);
    }
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  // If we have a conversation ID, show the chat container
  if (currentConversationId) {
    return <ChatContainer conversationId={currentConversationId} initialSelectedModel={selectedModelForNewConversation} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center flex-col w-full h-full relative mx-auto">
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-y-auto p-4 w-full sm:pt-6 max-w-2xl mx-auto  sm:px-10 py-10">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
          {/* Header */}
          <motion.div
            className="space-y-4 w-full mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              How can I help you
              {isSignedIn && user?.firstName ? `, ${user.firstName}` : ""}?
            </h1>
          </motion.div>

          {/* Tabs */}
          <motion.div
            className="grid grid-cols-2 sm:flex sm:items-start gap-2 mb-8 w-full overflow-x-auto sm:justify-start"
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
                        ? "shadow-lg bg-primary/10 text-foreground border border-primary"
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
              // initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              // exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full grid grid-cols-1 sm:flex sm:flex-col sm:items-start gap-2"
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
                  className="w-full cursor-pointer text-left p-2 hover:bg-muted/80 hover:rounded-xl border-b last:border-b-0 border-border/50 hover:border-border transition-all duration-200 group"
                >
                  <p className="font-medium text-foreground ">
                    {suggestion.text}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Message Input */}
      <motion.div
        className="w-full relative"
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
          disabled={!canSendMessage}
          showSignUpPrompt={() => setShowLoginPrompt(true)}
          onNewConversationCreated={handleNewConversationCreated}
        />
      </motion.div>

      {/* Login Prompt Dialog */}
      <LoginPromptDialog
        isOpen={showLoginPrompt}
        onClose={handleLoginPromptClose}
      />
    </div>
  );
}
