'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { motion } from "motion/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail } from "lucide-react";

const FAQS = [
  { q: "How does Virtual Try-On work?", a: "Virtual Try-On uses AI and your camera to overlay jewellery onto your live image. It uses computer vision to detect your face and hands, then renders jewellery in the correct position. No installation required — it runs entirely in your browser." },
  { q: "Are all jewellers on LuxeMatch verified?", a: "Yes. Every jeweller goes through a verification process. We check BIS hallmarking compliance, business registration, and quality of products before onboarding any seller." },
  { q: "How do I return a product?", a: "We offer a 30-day hassle-free returns policy. Simply initiate a return from your order page, and we'll arrange a pickup. Refunds are processed within 5–7 business days." },
  { q: "Why is the camera not working for Try-On?", a: "Your browser needs camera permission for Virtual Try-On. See the camera permissions section below for step-by-step instructions for your browser." },
  { q: "What does BIS Hallmarked mean?", a: "BIS Hallmark is a certification from the Bureau of Indian Standards that guarantees the purity of gold, silver, and platinum jewellery. A hallmarked piece assures you that it meets the purity standard claimed." },
  { q: "Can I save items for later?", a: "Yes! Click the heart icon on any product to save it. Saved items persist in your browser and can be accessed from the Saved page at any time." },
];

const CAMERA_STEPS = [
  { browser: "Google Chrome", steps: ["Click the padlock icon in the address bar", "Select 'Site settings'", "Find 'Camera' and set to 'Allow'", "Refresh the page"] },
  { browser: "Safari (iOS)", steps: ["Go to Settings > Safari", "Scroll to 'Camera'", "Set to 'Allow'", "Return to Safari and refresh"] },
  { browser: "Firefox", steps: ["Click the padlock icon in the address bar", "Click the arrow next to 'Connection Secure'", "Click 'More Information'", "Go to Permissions tab and allow Camera"] },
];

export default function HelpPage() {
  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="help-page">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Support</p>
          <h1 className="text-3xl font-medium tracking-tight">Help Centre</h1>
        </motion.div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-5">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-2xl px-4 overflow-hidden" data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-sm font-medium py-4 text-left hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Camera Permissions */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-5">Camera Permissions</h2>
          <p className="text-sm text-muted-foreground mb-6">LuxeMatch&apos;s Virtual Try-On feature needs camera access. Here&apos;s how to enable it:</p>
          <div className="space-y-4">
            {CAMERA_STEPS.map(({ browser, steps }) => (
              <div key={browser} className="rounded-2xl border border-border p-5">
                <h3 className="text-base font-semibold mb-3">{browser}</h3>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl bg-accent/40 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold mb-1">Still need help?</h3>
            <p className="text-sm text-muted-foreground mb-2">Our support team responds within 24 hours.</p>
            <a href="mailto:support@luxematch.in" className="text-sm font-medium text-primary hover:underline" data-testid="link-support-email">
              support@luxematch.in
            </a>
          </div>
        </section>
      </div>
    </div>
    </CustomerLayout>

  );
}
