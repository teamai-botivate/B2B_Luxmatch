'use client';

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormData {
  storeName: string;
  city: string;
  gstin: string;
  ownerName: string;
  phone: string;
}

const steps = ["Store Details", "Owner Info", "Logo Upload"];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    if (step < 2) { setStep(s => s + 1); return; }
    localStorage.setItem("luxematch_jeweller", JSON.stringify({
      storeName: data.storeName,
      city: data.city,
      ownerName: data.ownerName,
      id: `j-${Date.now()}`,
    }));
    router.push("/jeweller/dashboard");
  };

  return (
    <div className="max-w-lg mx-auto" data-testid="onboarding-wizard">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Store Name <span className="text-destructive">*</span></Label>
              <Input id="storeName" placeholder="e.g. Mehta & Sons Jewellers" {...register("storeName", { required: "Store name is required" })} data-testid="input-store-name" />
              {errors.storeName && <p className="text-xs text-destructive">{errors.storeName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="e.g. Mumbai" {...register("city")} data-testid="input-city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" placeholder="22AAAAA0000A1Z5" {...register("gstin")} data-testid="input-gstin" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Owner Name <span className="text-destructive">*</span></Label>
              <Input id="ownerName" placeholder="Your full name" {...register("ownerName", { required: "Owner name is required" })} data-testid="input-owner-name" />
              {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+91 98765 43210" {...register("phone")} data-testid="input-phone" />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Store Logo (Optional)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Upload your store logo. PNG or JPG, max 2MB.</p>
              <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload logo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm font-semibold mb-1">Ready to launch?</p>
              <p className="text-xs text-muted-foreground">Your store <strong>{getValues("storeName")}</strong> is ready to be created. You can add products immediately after setup.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep(s => s - 1)}>Back</Button>
          ) : <div />}
          <Button type="submit" className="rounded-full bg-primary text-primary-foreground hover:opacity-90" data-testid={step === 2 ? "button-submit-onboarding" : "button-next-step"}>
            {step === 2 ? "Create Store" : "Next Step"}
          </Button>
        </div>
      </form>
    </div>
  );
}
