"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/input";
import { LockIcon, Logo } from "@/components/ui/icons";
import { PIN_LENGTH, PinInput } from "@/components/ui/pin-input";
import {
  normalizePhone,
  rememberDevice,
  unlockSession,
  verifyPin,
} from "@/lib/auth";
import { useHydrated, useProfile } from "@/lib/store";

export default function LoginPage() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (hydrated && !profile) router.replace("/");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  const pinOnly = profile.deviceRemembered;

  async function submit(currentPin: string) {
    if (!profile || checking) return;

    if (!pinOnly) {
      if (normalizePhone(phone) !== normalizePhone(profile.phone)) {
        setPhoneError("This phone number doesn't match this account");
        setPin("");
        return;
      }
      setPhoneError(undefined);
    }

    setChecking(true);
    const valid = await verifyPin(currentPin, profile.pin);
    if (!valid) {
      setPinError(true);
      setTimeout(() => {
        setPin("");
        setPinError(false);
        setChecking(false);
      }, 500);
      return;
    }
    rememberDevice();
    unlockSession();
    router.replace("/dashboard");
  }

  function handlePinChange(value: string) {
    setPinError(false);
    setPin(value);
    if (value.length === PIN_LENGTH) submit(value);
  }

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-md px-6 pt-safe pb-safe">
      <div className="flex flex-col items-center text-center gap-3 pt-16 pb-10 animate-fade-up">
        {pinOnly ? (
          <>
            <Logo size={64} />
            <h1 className="text-[26px] font-bold tracking-tight text-ink mt-2">
              Welcome back, {profile.firstName}
            </h1>
            <p className="text-[15px] text-ink-2 flex items-center gap-1.5">
              <LockIcon className="size-4" />
              {pinError ? "Wrong PIN — try again." : "Enter your PIN to unlock"}
            </p>
          </>
        ) : (
          <>
            <Logo size={64} />
            <h1 className="text-[26px] font-bold tracking-tight text-ink mt-2">
              Sign in to StoreCount
            </h1>
            <p className="text-[15px] text-ink-2">
              {pinError
                ? "Wrong PIN — try again."
                : "Enter your phone number and PIN."}
            </p>
          </>
        )}
      </div>

      {!pinOnly && (
        <div className="pb-8">
          <Field
            label="Phone Number"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(undefined);
            }}
            error={phoneError}
            placeholder="0803 123 4567"
            autoComplete="tel"
            autoFocus
          />
        </div>
      )}

      <PinInput
        value={pin}
        onChange={handlePinChange}
        error={pinError}
        disabled={checking && !pinError}
      />
    </main>
  );
}
