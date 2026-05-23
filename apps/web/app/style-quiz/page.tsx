'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProductCard from "@/components/product/ProductCard";
import ImageUploadDropzone from "@/components/search/ImageUploadDropzone";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

const OCCASIONS = ["Wedding", "Daily Wear", "Festival", "Anniversary", "Gift"];
const FOR_WHOM = ["Myself", "Partner", "Family", "Friend"];
const BUDGETS = ["Under ₹10,000", "₹10,000 – ₹30,000", "₹30,000 – ₹1,00,000", "Above ₹1,00,000"];
const METALS = ["Gold", "Silver", "Platinum", "Rose Gold", "No Preference"];
const CATEGORIES = ["Necklace", "Earrings", "Ring", "Bangle", "Full Set", "No Preference"];
const MOODS = ["Classic", "Contemporary", "Statement", "Minimal", "Traditional"];

interface QuizState {
  occasion?: string;
  forWhom?: string;
  budget?: string;
  metal?: string;
  category?: string;
  mood?: string;
}

function OptionGrid({ options, selected, onSelect, imageMap }: { options: string[]; selected?: string; onSelect: (v: string) => void; imageMap?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`relative rounded-2xl p-4 text-sm font-medium text-left transition-all border ${selected === opt ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-accent/50"}`}
          data-testid={`quiz-option-${opt.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {imageMap?.[opt] && (
            <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-muted">
              <img src={imageMap[opt]} alt={opt} className="w-full h-full object-cover" />
            </div>
          )}
          <span>{opt}</span>
          {selected === opt && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg></div>}
        </button>
      ))}
    </div>
  );
}

const STEPS = ["Occasion", "Who is it for?", "Budget", "Metal", "Category", "Style Mood", "Inspiration"];

export default function StyleQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<QuizState>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const select = (key: keyof QuizState, val: string) => {
    setQuiz(prev => ({ ...prev, [key]: val }));
    setTimeout(() => { if (step < 6) setStep(s => s + 1); }, 200);
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1200);
  };

  const results = MOCK_PRODUCTS.slice(0, 8);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Finding your perfect pieces...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen pt-16" data-testid="quiz-results">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Your Recommendations</p>
            <h1 className="text-3xl font-medium tracking-tight mb-2">Your Personalised Picks</h1>
            <p className="text-muted-foreground">Curated based on your style preferences.</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {results.map((p, i) => (
              <div key={p.id} className="space-y-2">
                <ProductCard product={p} index={i} />
                <div className="flex flex-wrap gap-1">
                  {["Matches your style", "Within budget"].slice(0, 1 + (i % 2)).map(tag => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="outline" className="rounded-full mr-3" onClick={() => { setDone(false); setStep(0); setQuiz({}); }}>Retake Quiz</Button>
            <Button className="rounded-full bg-primary text-primary-foreground" onClick={() => router.push("/catalog")}>Explore More</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="style-quiz-page">
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <h2 className="text-2xl font-medium mb-6">{STEPS[step]}</h2>
            {step === 0 && <OptionGrid options={OCCASIONS} selected={quiz.occasion} onSelect={v => select("occasion", v)} />}
            {step === 1 && <OptionGrid options={FOR_WHOM} selected={quiz.forWhom} onSelect={v => select("forWhom", v)} />}
            {step === 2 && <OptionGrid options={BUDGETS} selected={quiz.budget} onSelect={v => select("budget", v)} />}
            {step === 3 && <OptionGrid options={METALS} selected={quiz.metal} onSelect={v => select("metal", v)} />}
            {step === 4 && <OptionGrid options={CATEGORIES} selected={quiz.category} onSelect={v => select("category", v)} />}
            {step === 5 && <OptionGrid options={MOODS} selected={quiz.mood} onSelect={v => select("mood", v)} />}
            {step === 6 && (
              <div className="space-y-6">
                <ImageUploadDropzone />
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={handleSubmit} data-testid="button-skip-image">Skip</Button>
                  <Button className="flex-1 rounded-full bg-primary text-primary-foreground" onClick={handleSubmit} data-testid="button-get-results">Get My Picks</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && (
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-8 transition-colors" onClick={() => setStep(s => s - 1)} data-testid="button-quiz-back">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
      </div>
    </div>
    </CustomerLayout>

  );
}
