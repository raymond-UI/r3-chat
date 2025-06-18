import { motion, AnimatePresence } from "motion/react";
import { useRef, useEffect } from "react";
import { Pin, PinOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap } from "gsap";
import { Authenticated } from "convex/react";

interface ConversationListActionProps {
  visible: boolean;
  isPinned: boolean;
  onPin: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

export function ConversationListAction({
  visible,
  isPinned,
  onPin,
  onDelete,
}: ConversationListActionProps) {
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
          className="flex gap-1 absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-muted rounded-lg"
        >
          <Authenticated>
          <Button
            ref={(el) => {
              buttonRefs.current[0] = el;
            }}
            variant="ghost"
            size="icon"
            title={isPinned ? "Unpin conversation" : "Pin conversation"}
            onClick={onPin}
            className="hover:bg-primary/10 transition-colors"
          >
            {isPinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
                <Pin className="h-4 w-4" />
              )}
            </Button>
          </Authenticated>

          <Button
            ref={(el) => {
              buttonRefs.current[2] = el;
            }}
            variant="ghost"
            size="icon"
            title="Delete conversation"
            onClick={onDelete}
            className="hover:bg-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
