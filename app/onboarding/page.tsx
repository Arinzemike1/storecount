"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { PIN_LENGTH, PinInput } from "@/components/ui/pin-input";
import { createPinCredential, unlockSession } from "@/lib/auth";
import { profileStore } from "@/lib/store";
import { setSyncToken } from "@/lib/sync";

const TOTAL_STEPS = 4;

interface Draft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<Draft>>({});
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registerConflict, setRegisterConflict] = useState(false);

  const setField = (field: keyof Draft) => (value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function continueFromName() {
    const next: Partial<Draft> = {};
    if (!draft.firstName.trim())
      next.firstName = "Please enter your first name";
    if (!draft.lastName.trim()) next.lastName = "Please enter your last name";
    setErrors(next);
    if (!next.firstName && !next.lastName) setStep(2);
  }

  function continueFromContact() {
    const next: Partial<Draft> = {};
    if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) {
      next.email = "Please enter a valid email address";
    }
    if (draft.phone.replace(/\D/g, "").length < 7) {
      next.phone = "Please enter a valid phone number";
    }
    setErrors(next);
    if (!next.email && !next.phone) setStep(3);
  }

  async function handlePinChange(value: string) {
    setPinError(false);
    if (!confirming) {
      setPin(value);
      if (value.length === PIN_LENGTH) {
        setTimeout(() => setConfirming(true), 200);
      }
      return;
    }
    setConfirmPin(value);
    if (value.length < PIN_LENGTH) return;

    if (value !== pin) {
      setPinError(true);
      setTimeout(() => {
        setConfirmPin("");
        setPinError(false);
      }, 500);
      return;
    }

    setSaving(true);
    const credential = await createPinCredential(pin);
    profileStore.set({
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      pin: credential,
      deviceRemembered: true,
      createdAt: new Date().toISOString(),
    });
    unlockSession();

    // Register the account in the cloud. This is best-effort — the app
    // works fully offline if it fails.
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          pinSalt: credential.salt,
          pinHash: credential.hash,
          pinIterations: credential.iterations,
        }),
      });
      if (res.ok) {
        const { token } = (await res.json()) as { token: string };
        setSyncToken(token);
      } else if (res.status === 409) {
        setRegisterConflict(true);
      }
    } catch {
      // Network unavailable — user can sync later via Settings.
    }

    setSaving(false);
    setStep(4);
  }

  function goBack() {
    if (step === 3 && confirming) {
      setConfirming(false);
      setPin("");
      setConfirmPin("");
      return;
    }
    if (step > 1) setStep(step - 1);
    else router.push("/");
  }

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-md pt-safe pb-safe">
      {step < 4 && (
        <header className="flex items-center gap-3 px-5 h-14">
          <button
            onClick={goBack}
            aria-label="Go back"
            className="-ml-2 size-10 rounded-full flex items-center justify-center text-ink active:bg-surface-2"
          >
            <ArrowLeftIcon className="size-6" />
          </button>
          <div
            className="flex-1 flex gap-1.5"
            aria-label={`Step ${step} of ${TOTAL_STEPS}`}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-primary" : "bg-border-strong"
                }`}
              />
            ))}
          </div>
        </header>
      )}

      {step === 1 && (
        <section
          key={1}
          className="flex-1 flex flex-col px-6 pt-6 animate-fade-up"
        >
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            What&apos;s your name?
          </h1>
          <p className="text-[15px] text-ink-2 mt-1 mb-7">
            This is how we&apos;ll greet you in the app.
          </p>
          <div className="flex flex-col gap-4">
            <Field
              label="First Name"
              value={draft.firstName}
              onChange={(e) => setField("firstName")(e.target.value)}
              error={errors.firstName}
              placeholder="e.g. Adaeze"
              autoComplete="given-name"
              autoFocus
            />
            <Field
              label="Last Name"
              value={draft.lastName}
              onChange={(e) => setField("lastName")(e.target.value)}
              error={errors.lastName}
              placeholder="e.g. Okafor"
              autoComplete="family-name"
            />
          </div>
          <div className="mt-auto py-6">
            <Button full onClick={continueFromName}>
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section
          key={2}
          className="flex-1 flex flex-col px-6 pt-6 animate-fade-up"
        >
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            How can we reach you?
          </h1>
          <p className="text-[15px] text-ink-2 mt-1 mb-7">
            You&apos;ll sign in with your phone number.
          </p>
          <div className="flex flex-col gap-4">
            <Field
              label="Email Address (optional)"
              type="email"
              inputMode="email"
              value={draft.email}
              onChange={(e) => setField("email")(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
            <Field
              label="Phone Number"
              type="tel"
              inputMode="tel"
              maxLength={11}
              value={draft.phone}
              onChange={(e) => setField("phone")(e.target.value)}
              error={errors.phone}
              placeholder="0803 123 4567"
              autoComplete="tel"
            />
          </div>
          <div className="mt-auto py-6">
            <Button full onClick={continueFromContact}>
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section
          key={confirming ? "confirm" : "create"}
          className="flex-1 flex flex-col px-6 pt-6 animate-fade-up"
        >
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            {confirming ? "Confirm your PIN" : "Create a 4-digit PIN"}
          </h1>
          <p className="text-[15px] text-ink-2 mt-1 mb-8">
            {pinError
              ? "Those PINs didn't match — try again."
              : confirming
                ? "Enter the same PIN one more time."
                : "You'll use this PIN to unlock StoreCount."}
          </p>
          <PinInput
            value={confirming ? confirmPin : pin}
            onChange={handlePinChange}
            error={pinError}
            disabled={saving}
          />

          {saving && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg/80 backdrop-blur-sm">
              <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-[15px] font-medium text-ink-2">Setting up your account…</p>
            </div>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <span className="size-24 rounded-full bg-success-soft text-success flex items-center justify-center animate-pop">
            <svg
              viewBox="0 0 24 24"
              className="size-12"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12.5 4.5 4.5L19 7" className="animate-draw-check" />
            </svg>
          </span>
          <h1 className="text-[26px] font-bold tracking-tight text-ink mt-2">
            You&apos;re all set, {draft.firstName.trim()}!
          </h1>
          <p className="text-[15px] text-ink-2 max-w-70">
            Add your first products and start recording sales.
          </p>
          {registerConflict && (
            <div className="w-full rounded-card bg-warning-soft border border-warning px-4 py-3 text-left text-[14px] text-ink-2">
              <p className="font-semibold text-ink mb-1">
                Phone number already registered
              </p>
              <p>
                This phone is linked to an existing account. To restore your
                previous data,{" "}
                <button
                  onClick={() => router.replace("/login")}
                  className="text-primary font-semibold underline"
                >
                  sign in instead
                </button>
                .
              </p>
            </div>
          )}
          <div className="w-full pt-8 pb-6">
            <Button full onClick={() => router.replace("/dashboard")}>
              Start Using StoreCount
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
