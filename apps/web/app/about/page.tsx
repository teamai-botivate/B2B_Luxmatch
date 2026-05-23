'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { motion } from "motion/react";
import { Sparkles, Search, Camera, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="about-page">
      {/* Hero */}
      <div className="relative overflow-hidden py-24 px-4 md:px-6 lg:px-12 text-center" style={{ background: "linear-gradient(135deg, #FAF8F5 0%, #FBF7EE 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">AI-Powered Discovery</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">Jewellery Discovery,<br />Reimagined</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              LuxeMatch connects you with India's finest jewellery — certified, curated, and designed to be discovered through the power of AI and augmented reality.
            </p>
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-20 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Simple Process</p>
          <h2 className="text-2xl font-medium">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Search, step: "01", title: "Browse & Discover", desc: "Search by text, image, or take our style quiz to find pieces that match your taste and occasion." },
            { icon: Camera, step: "02", title: "Try It On Virtually", desc: "Use our AI-powered AR try-on to see how any piece looks on you — before you commit." },
            { icon: ShieldCheck, step: "03", title: "Buy with Confidence", desc: "Every jeweller is vetted, every piece is BIS hallmarked. Shop knowing your purchase is protected." },
          ].map(({ icon: Icon, step, title, desc }, i) => (
            <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent mx-auto mb-4 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <p className="text-xs font-bold text-primary mb-1">{step}</p>
              <h3 className="text-lg font-medium mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Technology */}
      <section className="py-20 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto bg-[#F5F0EB]/50 rounded-3xl">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Technology</p>
          <h2 className="text-2xl font-medium">Powered by Advanced AI</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            { title: "Semantic Search", desc: "Our AI understands natural language — search for 'something delicate for daily wear' and get exactly that." },
            { title: "Visual Search", desc: "Upload any jewellery photo and we'll find visually similar pieces using advanced computer vision." },
            { title: "AR Try-On", desc: "MediaPipe-powered face and hand tracking overlays jewellery on your live camera feed in real time." },
            { title: "Style Matching", desc: "Our quiz learns your preferences and uses ML to surface pieces you'll genuinely love." },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-2xl bg-white border border-border">
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
    </CustomerLayout>

  );
}
