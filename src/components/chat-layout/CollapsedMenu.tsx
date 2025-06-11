"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "../ui/button";
import { Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface CollapsedMenuProps {
  onNewChat: () => void;
  onSearch: () => void;
}

export function CollapsedMenu({ onNewChat, onSearch }: CollapsedMenuProps) {
  const { state } = useSidebar();
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [state]);

  // Container hover effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => {
      gsap.to(container, {
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(container, {
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <AnimatePresence>
      {state === "collapsed" && (
        <motion.div
          ref={containerRef}
          initial={{ 
            opacity: 0, 
            x: -20,
            scale: 0.9
          }}
          animate={{ 
            opacity: 1, 
            x: 0,
            scale: 1
          }}
          exit={{ 
            opacity: 0, 
            x: -20,
            scale: 0.9
          }}
          transition={{ 
            duration: 0.3,
            ease: "easeOut"
          }}
          className="flex absolute top-2 left-2 z-50 items-center justify-between bg-secondary/25 backdrop-blur-sm border rounded-lg px-2 py-1 shadow-sm"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <SidebarTrigger />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              ref={(el) => { buttonRefs.current[0] = el; }}
              variant="ghost"
              size="icon"
              title="New Chat"
              onClick={onNewChat}
              className="h-8 w-8 hover:bg-primary/10 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              ref={(el) => { buttonRefs.current[1] = el; }}
              variant="ghost"
              size="icon"
              title="Search"
              onClick={onSearch}
              className="h-8 w-8 hover:bg-primary/10 transition-colors duration-200"
            >
              <Search className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}