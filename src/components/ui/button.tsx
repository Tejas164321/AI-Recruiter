import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[2px] active:shadow-none font-mono uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(var(--foreground))]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000]",
        outline:
          "border-2 border-foreground bg-transparent text-foreground shadow-[4px_4px_0px_0px_rgba(var(--foreground))] hover:bg-foreground hover:text-background hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(var(--foreground))]",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-transparent hover:border-foreground",
        ghost: "hover:bg-muted hover:text-foreground hover:underline decoration-wavy",
        link: "text-primary underline-offset-4 hover:underline decoration-2",
        glow: "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,0,0,0.5)] border-2 border-primary hover:shadow-[0_0_25px_rgba(255,0,0,0.7)]",
        glass: "nothing-border bg-white/5 backdrop-blur-sm text-foreground hover:bg-white/10"
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-10 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
