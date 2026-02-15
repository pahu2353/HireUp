"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandLogo } from "@/components/brand/logo"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <nav className="app-shell mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-5">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <BrandLogo
            size={36}
            className="h-9 w-9 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          <span className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            HireUp
          </span>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/85 px-2 py-1 md:flex">
          <Link
            href="#how-it-works"
            className="rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="#for-companies"
            className="rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            For Companies
          </Link>
          <Link
            href="#for-applicants"
            className="rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            For Applicants
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="rounded-full" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" className="rounded-full px-4" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background md:hidden"
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
        <div className="app-shell mx-auto mt-2 w-full max-w-7xl px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#how-it-works"
              className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#for-companies"
              className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              For Companies
            </Link>
            <Link
              href="#for-applicants"
              className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              For Applicants
            </Link>
            <div className="flex items-center gap-2 pt-2">
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" className="justify-start" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
