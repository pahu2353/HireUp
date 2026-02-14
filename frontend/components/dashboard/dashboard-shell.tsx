"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
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
  { href: "/company/agent", label: "AI Agent", icon: MessageSquare },
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
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <span className="text-sm font-bold text-primary-foreground">H</span>
          </div>
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border px-4 py-4 flex items-center justify-between">
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

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
              <span className="text-xs font-bold text-primary-foreground">
                H
              </span>
            </div>
            <span className="font-bold text-foreground">HireUp</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
