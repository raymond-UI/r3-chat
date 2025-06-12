import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { gsap } from "gsap";
import {
  Copy,
  GitBranch,
  GitMerge,
  Pencil,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ChatBubbleActionProps {
  visible: boolean;
  onEdit: (event: React.MouseEvent) => void;
  onRetry: (event: React.MouseEvent) => void;
  onRetryAlternative: (event: React.MouseEvent) => void;
  onCopy: (event: React.MouseEvent) => void;
  // onBranchOut: (event: React.MouseEvent) => void;
  onBranchConversation: (event: React.MouseEvent) => void;
  isAssistant: boolean;
}

export function ChatBubbleAction({
  visible,
  onEdit,
  onRetry,
  onRetryAlternative,
  onCopy,
  onBranchConversation,
  isAssistant,
}: ChatBubbleActionProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isRetryDropdownOpen, setIsRetryDropdownOpen] = useState(false);

  // GSAP hover animations for buttons
  useEffect(() => {
    const buttons = buttonRefs.current.filter(Boolean);

    buttons.forEach((button, index) => {
      if (!button) return;

      const handleMouseEnter = () => {
        gsap.to(button, {
          scale: 1.1,
          duration: 0.2,
          ease: "power2.out",
        });

        // Add subtle rotation for the Plus icon
        if (index === 0) {
          gsap.to(button.querySelector("svg"), {
            rotation: 90,
            duration: 0.3,
            ease: "power2.out",
          });
        }
      };

      const handleMouseLeave = () => {
        gsap.to(button, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        });

        // Reset rotation for the Plus icon
        if (index === 0) {
          gsap.to(button.querySelector("svg"), {
            rotation: 0,
            duration: 0.3,
            ease: "power2.out",
          });
        }
      };

      button.addEventListener("mouseenter", handleMouseEnter);
      button.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        button.removeEventListener("mouseenter", handleMouseEnter);
        button.removeEventListener("mouseleave", handleMouseLeave);
      };
    });
  }, []);

  // GSAP entrance animation for menu
  useEffect(() => {
    if (visible && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.25, ease: "power2.out" }
      );
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div ref={menuRef} className="flex gap-1 rounded-lg p-1 w-auto">
          <TooltipProvider>
            {!isAssistant && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      buttonRefs.current[0] = el;
                    }}
                    variant="ghost"
                    size="icon"
                    onClick={onEdit}
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Enhanced Retry Button with Dropdown for AI messages */}
            {isAssistant ? (
              <DropdownMenu
                open={isRetryDropdownOpen}
                onOpenChange={setIsRetryDropdownOpen}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        ref={(el) => {
                          buttonRefs.current[1] = el;
                        }}
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive transition-colors"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retry Options</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-full max-w-2xs">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(e);
                      setIsRetryDropdownOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry
                    <span className="text-xs text-muted-foreground/70 ml-auto">
                      Replace
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryAlternative(e);
                      setIsRetryDropdownOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <GitBranch className="h-4 w-4" />
                    Retry Alternative
                    <span className="text-xs text-muted-foreground/70 ml-auto">
                      Create branch
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      buttonRefs.current[1] = el;
                    }}
                    variant="ghost"
                    size="icon"
                    onClick={onRetry}
                    className="hover:bg-destructive transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Retry</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={(el) => {
                    buttonRefs.current[2] = el;
                  }}
                  variant="ghost"
                  size="icon"
                  onClick={onCopy}
                  className="hover:bg-primary/10 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy</p>
              </TooltipContent>
            </Tooltip>

            {/* Branch Conversation Button */}
            {isAssistant && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      buttonRefs.current[3] = el;
                    }}
                    variant="ghost"
                    size="icon"
                    onClick={onBranchConversation}
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <GitMerge className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Branch Conversation</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}