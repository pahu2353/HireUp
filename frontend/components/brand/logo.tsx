import Image from "next/image"
import { cn } from "@/lib/utils"

export function BrandLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/iris-logo.svg"
      alt="Iris logo"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  )
}
