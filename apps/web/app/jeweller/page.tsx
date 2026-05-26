'use client';

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Camera, Search, BarChart3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerLayout from "@/components/layout/CustomerLayout";

const benefits = [
  {
    icon: Camera,
    title: "AR Virtual Try-On",
    desc: "Let customers try your jewellery virtually using their camera. Increase engagement and reduce returns.",
  },
  {
    icon: Search,
    title: "AI-Powered Discovery",
    desc: "Your products appear in text, image, and hybrid searches. Gemini AI embeddings match customers to your pieces.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track try-on sessions, search appearances, and product views. Make data-driven decisions.",
  },
];

const steps = [
  { num: "1", title: "Create Your Store", sub: "Set up your profile in 3 minutes" },
  { num: "2", title: "Upload Products", sub: "Add photos, specs, and transparent PNGs for AR" },
  { num: "3", title: "Reach Customers", sub: "Your products appear across LuxeMatch instantly" },
];

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function JewellerEntryPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    const data = localStorage.getItem("luxematch_jeweller");
    router.push(data ? "/jeweller/dashboard" : "/jeweller/onboarding");
  };

  const scrollToBenefits = () => {
    document.getElementById("benefits-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <CustomerLayout>
    <div className="flex flex-col min-h-screen bg-background" data-testid="jeweller-entry-page">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "60vh" }}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] via-[#2a1f0a] to-[#0f0d0a]" />
        {/* Gold glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#C9A84C]/8 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-6">
          <motion.div {...fadeUp}>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-4 py-1.5 mb-4">
              Jeweller Partner Programme
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-medium tracking-tight text-white leading-tight"
          >
            Grow Your Jewellery Business Online
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/60 max-w-2xl leading-relaxed"
          >
            Join India's premier AI-powered jewellery discovery platform. Reach thousands of potential customers with AR try-on, visual search, and personalised recommendations.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 mt-2"
          >
            <Button
              onClick={handleGetStarted}
              className="rounded-full px-8 py-3 text-sm font-semibold bg-[#C9A84C] hover:bg-[#b8963e] text-black"
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              onClick={scrollToBenefits}
              className="rounded-full px-8 py-3 text-sm font-semibold border-white/20 text-white hover:bg-white/10 bg-transparent"
              data-testid="button-see-how"
            >
              See How It Works
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits-section" className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Why LuxeMatch</p>
            <h2 className="text-3xl font-medium tracking-tight">Everything you need to succeed</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {benefits.map(b => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                className="bg-card border border-card-border rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary/5 border-y border-primary/10 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
            {[
              { value: "3", label: "Jewellers" },
              { value: "24", label: "Products" },
              { value: "347", label: "Try-On Sessions" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-semibold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Simple Setup</p>
            <h2 className="text-3xl font-medium tracking-tight">Up and running in minutes</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map(s => (
              <motion.div key={s.num} variants={fadeUp} className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-md">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          {/* Connector lines (desktop) */}
          <div className="hidden md:flex justify-center -mt-[88px] mb-[72px] pointer-events-none select-none">
            <div className="flex items-center w-full max-w-xs justify-around px-12">
              <div className="flex-1 h-px bg-primary/20" />
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by section */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap justify-center gap-8 items-center text-sm text-muted-foreground">
          {["BIS Hallmarked Products", "AR Try-On", "Instant Onboarding", "24/7 Support"].map(item => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-6"
          >
            <h2 className="text-3xl font-medium tracking-tight">Ready to Get Started?</h2>
            <p className="text-muted-foreground text-sm">Join LuxeMatch today and reach thousands of customers who are actively searching for jewellery like yours.</p>
            <Button
              onClick={handleGetStarted}
              className="rounded-full px-10 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-final-cta"
            >
              Create Your Store — It's Free
            </Button>
          </motion.div>
        </div>
      </section>

    </div>
    </CustomerLayout>
  );
}
