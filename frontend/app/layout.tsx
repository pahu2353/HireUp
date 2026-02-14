import type { Metadata, Viewport } from 'next'
import { Quicksand, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { GridBackground } from '@/components/grid-background'

import './globals.css'

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'HireUp - Intelligent Job Matching',
  description:
    'Stop spam applying. Start getting matched. HireUp uses a two-tower recommendation model and AI agents to connect the right talent with the right companies.',
}

export const viewport: Viewport = {
  themeColor: '#1c1b1d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <GridBackground />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
