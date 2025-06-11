"use client";

import { motion, AnimatePresence } from "motion/react";
import { ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  titleIcon?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  contentClassName?: string;
  confirmButtonProps?: React.ComponentProps<typeof Button>;
  cancelButtonProps?: React.ComponentProps<typeof Button>;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  titleIcon,
  description,
  children,
  footer,
  hideCloseButton = false,
  contentClassName = "",
  confirmButtonProps,
  cancelButtonProps,
}: ModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 sm:mx-auto bg-black/80 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="dialog fixed z-50 bg-card text-foreground shadow-2xl border border-secondary
             bottom-52 mx-auto left-0 right-0 w-full max-w-md rounded-2xl"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            role="dialog"
            aria-modal="true"
          >
            {(title || !hideCloseButton) && (
              <div className="w-full flex items-center justify-between mb-4 border-b px-4 py-2">
                {title && (
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {titleIcon && titleIcon}
                    {title}
                  </h2>
                )}
                {!hideCloseButton && (
                  <Button
                    onClick={onClose}
                    size="icon"
                    variant="ghost"
                    aria-label="Close"
                  >
                    <X strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            )}

            <div
              className={`${contentClassName || "w-full px-4 text-left"} sm:flex-grow sm:overflow-auto`}
            >
              {description && (
                <p className="text-muted-foreground mb-6">{description}</p>
              )}
              {children}
            </div>

            {footer || (
              <div className="w-full p-4 border-t flex justify-end gap-2 sm:mt-auto">
                <Button variant="ghost" onClick={onClose} {...cancelButtonProps}>
                  {cancelButtonProps?.children || "Close"}
                </Button>
                <Button {...confirmButtonProps}>
                  {confirmButtonProps?.children || "Confirm"}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ModalTriggerProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function ModalTrigger({
  onClick,
  children,
  className,
}: ModalTriggerProps) {
  return (
    <AnimatePresence>
      <motion.button
        className={className}
        initial={{
          opacity: 0,
          scaleX: 0.5,
          scaleY: 0.2,
          translateY: -60,
        }}
        animate={{
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          translateY: 0,
        }}
        exit={{
          opacity: 0,
          scale: 1.5,
          borderRadius: "30px",
          transition: { duration: 0.3 },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onClick}
      >
        {children}
      </motion.button>
    </AnimatePresence>
  );
}
