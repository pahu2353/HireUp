import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Problems } from "@/components/landing/problems"
import { Solution } from "@/components/landing/solution"
import { DualCTA } from "@/components/landing/dual-cta"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Problems />
      <Solution />
      <DualCTA />
      <Footer />
    </main>
  )
}
