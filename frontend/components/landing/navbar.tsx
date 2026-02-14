"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <span className="text-sm font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            HireUp
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="#for-companies"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            For Companies
          </Link>
          <Link
            href="#for-applicants"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            For Applicants
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#for-companies"
              className="text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              For Companies
            </Link>
            <Link
              href="#for-applicants"
              className="text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              For Applicants
            </Link>
            <div className="flex items-center gap-2 pt-2">
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
