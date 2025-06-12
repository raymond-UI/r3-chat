"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { gsap } from "gsap"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const arrowRef = React.useRef<SVGSVGElement>(null)

  React.useEffect(() => {
    const content = contentRef.current
    const arrow = arrowRef.current
    
    if (!content || !arrow) return

    // Set initial state
    gsap.set([content, arrow], {
      opacity: 0,
      scale: 0.8,
      y: -8,
    })

    // Create timeline for entry animation
    const enterTl = gsap.timeline({ paused: true })
    enterTl
      .to([content, arrow], {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.2,
        ease: "back.out(1.2)",
      })

    // Create timeline for exit animation
    const exitTl = gsap.timeline({ paused: true })
    exitTl
      .to([content, arrow], {
        opacity: 0,
        scale: 0.9,
        y: -4,
        duration: 0.15,
        ease: "power2.in",
      })

    // Animation control based on data-state
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const state = content.getAttribute('data-state')
          
          if (state === 'delayed-open' || state === 'instant-open') {
            exitTl.pause()
            enterTl.restart()
          } else if (state === 'closed') {
            enterTl.pause()
            exitTl.restart()
          }
        }
      })
    })

    observer.observe(content, {
      attributes: true,
      attributeFilter: ['data-state']
    })

    // Initial animation if already open
    const initialState = content.getAttribute('data-state')
    if (initialState === 'delayed-open' || initialState === 'instant-open') {
      enterTl.play()
    }

    return () => {
      observer.disconnect()
      enterTl.kill()
      exitTl.kill()
    }
  }, [])

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={contentRef}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-secondary border text-foreground z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow 
          ref={arrowRef}
          className="bg-secondary border fill-secondary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" 
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }