"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <div className="relative flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-card p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
            <span className="text-sm font-bold text-primary-foreground">H</span>
          </div>
          <span className="text-lg font-bold text-foreground">HireUp</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-foreground">
            Quality over quantity.
            <br />
            <span className="bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">Signal over noise.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            Whether you{"'"}re hiring or looking for your next role, HireUp
            matches you with precision.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Built by Waterloo students.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <span className="text-sm font-bold text-primary-foreground">
                  H
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">HireUp</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to your account to continue.
          </p>

          <Tabs defaultValue="applicant" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="applicant" className="flex-1">
                Applicant
              </TabsTrigger>
              <TabsTrigger value="company" className="flex-1">
                Company
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applicant">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="space-y-2">
                  <Label htmlFor="applicant-email">Email</Label>
                  <Input
                    id="applicant-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicant-password">Password</Label>
                  <Input
                    id="applicant-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" type="submit">
                  Log in as Applicant
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="company">
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="space-y-2">
                  <Label htmlFor="company-email">Company Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-password">Password</Label>
                  <Input
                    id="company-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" type="submit">
                  Log in as Company
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don{"'"}t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
