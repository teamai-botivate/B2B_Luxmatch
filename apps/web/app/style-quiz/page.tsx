'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import CustomerLayout from '@/components/layout/CustomerLayout';
import ProductCard from '@/components/product/ProductCard';
import ImageUploadDropzone from '@/components/search/ImageUploadDropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { adaptProduct, fetchCategories, type ApiCategory, type ApiProduct } from '@/lib/catalog-adapter';
import { trackEvent } from '@/lib/analytics';
import type { Product } from '@/lib/mock-data';

// ─── Quiz options ──────────────────────────────────────────────────────────

const OCCASIONS  = ['Wedding', 'Daily Wear', 'Festival', 'Anniversary', 'Gift'];
const FOR_WHOM   = ['Myself', 'Partner', 'Family', 'Friend'];
const BUDGETS    = ['Under ₹10,000', '₹10,000 – ₹30,000', '₹30,000 – ₹1,00,000', 'Above ₹1,00,000'];
const METALS     = ['Gold', 'Silver', 'Platinum', 'Rose Gold', 'No Preference'];
const CATEGORIES = ['Necklace', 'Earrings', 'Ring', 'Bangle', 'Full Set', 'No Preference'];
const MOODS      = ['Classic', 'Contemporary', 'Statement', 'Minimal', 'Traditional'];
const STEPS      = ['Occasion', 'Who is it for?', 'Budget', 'Metal', 'Category', 'Style Mood', 'Inspiration (optional)'];

interface QuizState {
  occasion?: string;
  forWhom?: string;
  budget?: string;
  metal?: string;
  category?: string;
  mood?: string;
}

// ─── Budget → price range ─────────────────────────────────────────────────

function budgetToRange(budget: string | undefined): { priceMin?: number; priceMax?: number } {
  if (!budget) return {};
  if (budget.startsWith('Under'))   return { priceMax: 10000 };
  if (budget.includes('10,000 –')) return { priceMin: 10000, priceMax: 30000 };
  if (budget.includes('30,000 –')) return { priceMin: 30000, priceMax: 100000 };
  if (budget.startsWith('Above'))  return { priceMin: 100000 };
  return {};
}

// ─── Quiz → text query ────────────────────────────────────────────────────

function buildQuery(quiz: QuizState): string {
  const parts: string[] = [];
  if (quiz.mood)     parts.push(quiz.mood.toLowerCase());
  if (quiz.category && quiz.category !== 'No Preference') parts.push(quiz.category.toLowerCase());
  parts.push('jewellery');
  if (quiz.metal && quiz.metal !== 'No Preference') parts.push(`in ${quiz.metal.toLowerCase()}`);
  if (quiz.occasion) parts.push(`for ${quiz.occasion.toLowerCase()}`);
  if (quiz.forWhom && quiz.forWhom !== 'Myself') parts.push(`as a gift for ${quiz.forWhom.toLowerCase()}`);
  if (quiz.budget)   parts.push(`budget ${quiz.budget}`);
  return parts.join(' ');
}

// ─── Metal mapping ────────────────────────────────────────────────────────

const METAL_MAP: Record<string, string> = {
  Gold: 'gold', Silver: 'silver', Platinum: 'platinum', 'Rose Gold': 'rose_gold',
};

// ─── Reason chips ─────────────────────────────────────────────────────────

function reasonsFor(product: Product, quiz: QuizState): string[] {
  const chips: string[] = [];
  const occ = quiz.occasion?.toLowerCase();
  if (occ && (product.occasions ?? []).some(o => o.toLowerCase().includes(occ))) {
    chips.push(`Great for ${quiz.occasion}`);
  }
  const metal = quiz.metal !== 'No Preference' ? quiz.metal?.toLowerCase() : null;
  if (metal && product.metal?.toLowerCase().includes(metal)) chips.push(`${quiz.metal} as preferred`);
  if (quiz.budget) {
    const range = budgetToRange(quiz.budget);
    const price = product.price ?? 0;
    if ((!range.priceMin || price >= range.priceMin) && (!range.priceMax || price <= range.priceMax)) {
      chips.push('Within your budget');
    }
  }
  if (product.hasTryOn) chips.push('Try-on ready');
  if (chips.length === 0) chips.push('Matches your style');
  return chips.slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────

function OptionGrid({
  options, selected, onSelect,
}: {
  options: string[]; selected?: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`relative rounded-2xl border p-4 text-left text-sm font-medium transition-all ${
            selected === opt
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40 hover:bg-accent/50'
          }`}
          data-testid={`quiz-option-${opt.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {opt}
          {selected === opt && (
            <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function StyleQuizPage() {
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [quiz, setQuiz]   = useState<QuizState>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [done, setDone]   = useState(false);
  const [cats, setCats]   = useState<ApiCategory[]>([]);
  const inspirationFile   = useRef<File | null>(null);

  useEffect(() => { void fetchCategories().then(setCats); }, []);

  const select = useCallback((key: keyof QuizState, val: string) => {
    setQuiz(prev => ({ ...prev, [key]: val }));
    setTimeout(() => { if (step < 6) setStep(s => s + 1); }, 200);
  }, [step]);

  async function handleSubmit() {
    setLoading(true);
    try {
      const query = buildQuery(quiz);
      const metal = quiz.metal && quiz.metal !== 'No Preference' ? METAL_MAP[quiz.metal] : undefined;
      const { priceMin, priceMax } = budgetToRange(quiz.budget);
      const filters = { ...(metal ? { metal } : {}), ...(priceMin ? { price_min: priceMin } : {}), ...(priceMax ? { price_max: priceMax } : {}) };

      let json: { data?: { results: Array<{ product: ApiProduct; score: number }> }; error?: { message: string } };

      if (inspirationFile.current) {
        // Convert File to base64 for the hybrid endpoint
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(inspirationFile.current!);
        });
        const res = await fetch('/api/search/hybrid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, image_base64: base64, filters, limit: 20 }),
        });
        json = await res.json();
      } else {
        const res = await fetch('/api/search/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, limit: 20 }),
        });
        json = await res.json();
      }

      let resultCount = 0;
      if (json.error || !json.data) {
        // Graceful fallback — show empty results rather than crashing
        setResults([]);
      } else {
        const adapted = json.data.results.map(r => adaptProduct(r.product, cats));
        setResults(adapted);
        resultCount = adapted.length;
      }
      trackEvent('style_quiz_completed', {
        metadata: {
          occasion: quiz.occasion, budget: quiz.budget, metal: quiz.metal,
          category: quiz.category, mood: quiz.mood,
          with_photo: Boolean(inspirationFile.current), results: resultCount,
        },
      });
      setDone(true);
    } catch {
      setResults([]);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Results screen ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Finding your perfect pieces…</p>
        </div>
      </CustomerLayout>
    );
  }

  if (done) {
    return (
      <CustomerLayout>
        <div className="min-h-screen" data-testid="quiz-results">
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 lg:px-12">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Your Recommendations</p>
              <h1 className="mb-2 text-3xl font-medium tracking-tight">Your Personalised Picks</h1>
              <p className="text-muted-foreground">
                {results.length > 0
                  ? `${results.length} pieces curated for ${quiz.occasion ?? 'you'}${quiz.metal && quiz.metal !== 'No Preference' ? ` in ${quiz.metal}` : ''}.`
                  : 'We\'re still building our catalogue — check back soon!'}
              </p>
            </motion.div>

            {results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {results.map((p, i) => (
                    <div key={p.id} className="space-y-2">
                      <ProductCard product={p} index={i} />
                      <div className="flex flex-wrap gap-1">
                        {reasonsFor(p, quiz).map(tag => (
                          <span key={tag} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AR-ready subset */}
                {results.some(p => p.hasTryOn) && (
                  <div className="mt-12">
                    <h2 className="mb-4 text-lg font-medium">Try-on ready picks</h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                      {results.filter(p => p.hasTryOn).map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                No products found for your preferences right now.
              </div>
            )}

            <div className="mt-10 text-center">
              <Button variant="outline" className="mr-3 rounded-full" onClick={() => { setDone(false); setStep(0); setQuiz({}); inspirationFile.current = null; }}>
                Retake Quiz
              </Button>
              <Button className="rounded-full bg-primary text-primary-foreground" onClick={() => router.push('/catalog')}>
                Explore More
              </Button>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // ── Quiz steps ──────────────────────────────────────────────────────────

  return (
    <CustomerLayout>
      <div className="min-h-screen" data-testid="style-quiz-page">
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{STEPS[step]}</span>
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="mb-6 text-2xl font-medium">{STEPS[step]}</h2>
              {step === 0 && <OptionGrid options={OCCASIONS}  selected={quiz.occasion}  onSelect={v => select('occasion', v)} />}
              {step === 1 && <OptionGrid options={FOR_WHOM}   selected={quiz.forWhom}   onSelect={v => select('forWhom', v)} />}
              {step === 2 && <OptionGrid options={BUDGETS}    selected={quiz.budget}    onSelect={v => select('budget', v)} />}
              {step === 3 && <OptionGrid options={METALS}     selected={quiz.metal}     onSelect={v => select('metal', v)} />}
              {step === 4 && <OptionGrid options={CATEGORIES} selected={quiz.category}  onSelect={v => select('category', v)} />}
              {step === 5 && <OptionGrid options={MOODS}      selected={quiz.mood}      onSelect={v => select('mood', v)} />}
              {step === 6 && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Upload a photo of jewellery you love and we&apos;ll find similar pieces from our catalogue.
                  </p>
                  <ImageUploadDropzone
                    onSearch={(file) => { inspirationFile.current = file; }}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 rounded-full" onClick={handleSubmit} data-testid="button-skip-image">
                      Skip
                    </Button>
                    <Button className="flex-1 rounded-full bg-primary text-primary-foreground" onClick={handleSubmit} data-testid="button-get-results">
                      Get My Picks
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step > 0 && (
            <button
              className="mt-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setStep(s => s - 1)}
              data-testid="button-quiz-back"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
