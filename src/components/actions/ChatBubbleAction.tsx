import { motion, AnimatePresence } from "motion/react";
import { useRef, useEffect } from "react";
import { Copy, GitBranch, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";

interface ChatBubbleActionProps {
  visible: boolean;
  onEdit: (event: React.MouseEvent) => void;
  onRetry: (event: React.MouseEvent) => void;
  onCopy: (event: React.MouseEvent) => void;
  onBranchOut: (event: React.MouseEvent) => void;
  isAssistant: boolean;
}

export function ChatBubbleAction({
  visible,
  onEdit,
  onRetry,
  onCopy,
  onBranchOut,
  isAssistant,
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
        <motion.div
          ref={menuRef}
          className="flex gap-1 rounded-lg p-1 w-auto"
        >
          {!isAssistant && (
            <Button
              ref={(el) => {
                buttonRefs.current[0] = el;
              }}
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={onEdit}
              className="hover:bg-primary/10 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            ref={(el) => {
              buttonRefs.current[1] = el;
            }}
            variant="ghost"
            size="icon"
            title="Retry"
            onClick={onRetry}
            className="hover:bg-destructive transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            ref={(el) => {
              buttonRefs.current[2] = el;
            }}
            variant="ghost"
            size="icon"
            title="Copy"
            onClick={onCopy}
            className="hover:bg-primary/10 transition-colors"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {isAssistant && (
            <Button
              ref={(el) => {
                buttonRefs.current[3] = el;
              }}
              variant="ghost"
              size="icon"
              title="Branch Out"
              onClick={onBranchOut}
              className="hover:bg-primary/10 transition-colors"
            >
              <GitBranch className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
