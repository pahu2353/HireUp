import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <span className="text-xs font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-sm font-semibold text-foreground">HireUp</span>
        </div>
        <div className="flex gap-8">
          <Link
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Built by Waterloo students.
        </p>
      </div>
    </footer>
  )
}
