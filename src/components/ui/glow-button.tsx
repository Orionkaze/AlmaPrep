import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const GlowButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        className={cn(
          "glow-button inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-8 py-2",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
GlowButton.displayName = "GlowButton"

export { GlowButton }
