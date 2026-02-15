"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandLogo } from "@/components/brand/logo"
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Plus,
  User,
  Building2,
  FileText,
  Users,
  LogOut,
} from "lucide-react"

const applicantLinks = [
  { href: "/dashboard", label: "Matched Jobs", icon: LayoutDashboard },
  { href: "/dashboard/applications", label: "My Applications", icon: Briefcase },
  { href: "/dashboard/profile", label: "Profile", icon: User },
]

const companyLinks = [
  { href: "/company", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company/postings", label: "Job Postings", icon: FileText },
  { href: "/company/candidates", label: "Candidates", icon: Users },
  { href: "/company/agent", label: "Iris", icon: MessageSquare },
  { href: "/company/profile", label: "Company Profile", icon: Building2 },
]

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode
  role: "applicant" | "company"
}) {
  const pathname = usePathname()
  const links = role === "applicant" ? applicantLinks : companyLinks

  return (
    <div className="flex min-h-screen px-4 py-4 md:px-6 md:py-6">
      <aside className="app-shell fixed left-6 top-6 z-40 hidden h-[calc(100vh-48px)] w-64 flex-col bg-sidebar/85 md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border/80 px-6 py-5">
          <BrandLogo size={32} className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">HireUp</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" &&
                link.href !== "/company" &&
                pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center justify-between border-t border-sidebar-border/80 px-4 py-4">
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-3 text-muted-foreground"
            asChild
          >
            <Link href="/">
              <LogOut className="h-4 w-4" />
              Log out
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex-1 md:ml-[280px]">
        <header className="app-shell sticky top-4 z-30 mb-4 flex h-14 items-center justify-between px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={28} className="h-7 w-7" />
            <span className="font-bold text-foreground">HireUp</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="app-shell min-h-[calc(100vh-48px)] p-5 md:p-7 lg:p-8">{children}</main>
      </div>

      {role === "company" ? (
        <Link
          href="/company/agent?new=1"
          className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-[0_14px_30px_-15px_hsl(var(--primary))] transition-all hover:scale-105 hover:bg-primary/90"
          aria-label="New chat"
          title="New chat"
        >
          <Plus className="h-5 w-5" />
        </Link>
      ) : null}
    </div>
  )
}
