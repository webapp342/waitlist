import { cn } from "@/lib/utils";
import { CSSProperties, FC, ReactNode } from "react";

interface AnimatedShinyTextProps {
  children: ReactNode;
  className?: string;
  shimmerWidth?: number;
}

const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 200,
}) => {
  return (
    <p
      style={
        {
          "--shimmer-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-yellow-100/45",

        // Optimize shimmer effect
        "will-change-[background-position] animate-shimmer bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shimmer-width)_100%]",

        // Optimize shimmer gradient
        "[transition:background-position_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent dark:via-yellow-300/80",

        className,
      )}>
      {children}
    </p>
  );
};

export default AnimatedShinyText;
