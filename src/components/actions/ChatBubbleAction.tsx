import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { gsap } from "gsap";
import { Copy, GitMerge, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface ChatBubbleActionProps {
  visible: boolean;
  onEdit: (event: React.MouseEvent) => void;
  onCopy: (event: React.MouseEvent) => void;
  onBranchConversation: (event: React.MouseEvent) => void;
  // onDropdownOpenChange?: (isOpen: boolean) => void;
  isAssistant: boolean;
  readOnly?: boolean;
}

export function ChatBubbleAction({
  visible,
  onEdit,
  onCopy,
  onBranchConversation,
  // onDropdownOpenChange,
  isAssistant,
  readOnly = false,
}: ChatBubbleActionProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

        // Add subtle rotation for the Plus icon (assuming it's the first button)
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
        { x: 0, opacity: 1, duration: 0.25, ease: "power2.out" },
      );
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div ref={menuRef} className="flex gap-1 rounded-lg p-1 w-auto">
          <TooltipProvider>
            {!readOnly && !isAssistant && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      buttonRefs.current[0] = el;
                    }} // This is now the first button
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={(el) => {
                    // Adjust index based on whether edit button is present
                    buttonRefs.current[!readOnly && !isAssistant ? 1 : 0] = el;
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

            {!readOnly && isAssistant && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      // Adjust index based on whether edit and copy buttons are present
                      const copyButtonIndex = !readOnly && !isAssistant ? 1 : 0;
                      buttonRefs.current[copyButtonIndex + 1] = el;
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