import Link from "next/link"
import { BrandLogo } from "@/components/brand/logo"

export function Footer() {
  return (
    <footer className="px-6 pb-12 pt-8">
      <div className="app-shell mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-6 md:flex-row md:px-8">
        <div className="flex items-center gap-2">
          <BrandLogo size={32} className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-tight text-foreground">HireUp</span>
        </div>
        <div className="flex gap-8">
          <Link
            href="#"
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Built by builders from Waterloo.
        </p>
      </div>
    </footer>
  )
}
