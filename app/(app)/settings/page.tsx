"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { PIN_LENGTH, PinInput } from "@/components/ui/pin-input";
import {
  ChevronRightIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  PhoneIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
} from "@/components/ui/icons";
import {
  createPinCredential,
  lockSession,
  verifyPin,
} from "@/lib/auth";
import {
  profileStore,
  resetAllData,
  settingsStore,
  useProfile,
  useSettings,
} from "@/lib/store";

type EditSheet = "profile" | "business" | "pin" | "erase" | null;

export default function SettingsPage() {
  const profile = useProfile();
  const settings = useSettings();
  const router = useRouter();
  const [sheet, setSheet] = useState<EditSheet>(null);

  if (!profile) return null;

  return (
    <>
      <PageHeader title="Settings" />
      <main className="flex flex-col gap-5 px-5 pb-6">
        {/* Identity card */}
        <Card className="p-5 flex items-center gap-4">
          <span className="size-14 rounded-2xl bg-primary text-on-primary text-xl font-bold flex items-center justify-center uppercase">
            {profile.firstName.charAt(0)}
            {profile.lastName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-ink truncate">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-[14px] text-ink-2 truncate">
              {settings.businessName || "Set your business name"}
            </p>
          </div>
        </Card>

        <SettingsGroup title="Account">
          <SettingsRow
            icon={<UserIcon className="size-5" />}
            label="Profile"
            value={`${profile.firstName} ${profile.lastName}`}
            onClick={() => setSheet("profile")}
          />
          <SettingsRow
            icon={<PhoneIcon className="size-5" />}
            label="Phone Number"
            value={profile.phone}
            onClick={() => setSheet("profile")}
          />
          <SettingsRow
            icon={<MailIcon className="size-5" />}
            label="Email"
            value={profile.email}
            onClick={() => setSheet("profile")}
          />
        </SettingsGroup>

        <SettingsGroup title="Business">
          <SettingsRow
            icon={<TagIcon className="size-5" />}
            label="Business Name"
            value={settings.businessName || "Not set"}
            onClick={() => setSheet("business")}
          />
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow
            icon={<LockIcon className="size-5" />}
            label="Change PIN"
            onClick={() => setSheet("pin")}
          />
          <SettingsRow
            icon={<LogoutIcon className="size-5" />}
            label="Lock App"
            onClick={() => {
              lockSession();
              router.replace("/login");
            }}
          />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <SettingsRow
            icon={<span className="size-5 rounded-full bg-primary inline-block" />}
            label="Theme"
            value="Coming soon"
            disabled
          />
          <SettingsRow
            icon={<span className="size-5 rounded-full bg-accent inline-block" />}
            label="Brand Color"
            value="Coming soon"
            disabled
          />
        </SettingsGroup>

        <Button full variant="danger-soft" onClick={() => setSheet("erase")}>
          <TrashIcon className="size-5" /> Log Out & Erase Data
        </Button>
        <p className="text-center text-[12px] text-ink-3 -mt-2">
          StoreCount v1.0 · Your data is stored on this device
        </p>
      </main>

      <ProfileSheet open={sheet === "profile"} onClose={() => setSheet(null)} />
      <BusinessSheet open={sheet === "business"} onClose={() => setSheet(null)} />
      <ChangePinSheet open={sheet === "pin"} onClose={() => setSheet(null)} />

      <Sheet
        open={sheet === "erase"}
        onClose={() => setSheet(null)}
        title="Erase everything?"
      >
        <p className="text-[15px] text-ink-2 pb-5">
          This deletes your account, products, and sales history from this
          device. This cannot be undone.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            full
            variant="danger"
            onClick={() => {
              resetAllData();
              lockSession();
              router.replace("/");
            }}
          >
            Erase all data
          </Button>
          <Button full variant="secondary" onClick={() => setSheet(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3 px-1">
        {title}
      </h2>
      <Card className="divide-y divide-border">{children}</Card>
    </section>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2 disabled:active:bg-transparent first:rounded-t-card last:rounded-b-card"
    >
      <span className="size-9 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 font-semibold text-ink text-[15px]">{label}</span>
      {value && (
        <span className="text-[14px] text-ink-3 truncate max-w-36">{value}</span>
      )}
      {!disabled && <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />}
    </button>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  });

  if (!profile) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Edit Profile">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          profileStore.update((p) =>
            p
              ? {
                  ...p,
                  firstName: form.firstName.trim() || p.firstName,
                  lastName: form.lastName.trim() || p.lastName,
                  email: form.email.trim() || p.email,
                  phone: form.phone.trim() || p.phone,
                }
              : p,
          );
          onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First Name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Button full type="submit" className="mt-1">
          Save Changes
        </Button>
      </form>
    </Sheet>
  );
}

function BusinessSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings();
  const [name, setName] = useState(settings.businessName);

  return (
    <Sheet open={open} onClose={onClose} title="Business Name">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          settingsStore.update((s) => ({ ...s, businessName: name.trim() }));
          onClose();
        }}
      >
        <Field
          label="Business Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adaeze's Provisions"
          hint="Shown on your receipts."
        />
        <Button full type="submit" className="mt-1">
          Save
        </Button>
      </form>
    </Sheet>
  );
}

type PinStep = "current" | "new" | "confirm";

function ChangePinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const [step, setStep] = useState<PinStep>("current");
  const [entry, setEntry] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  function close() {
    setStep("current");
    setEntry("");
    setNewPin("");
    setError(false);
    setDone(false);
    onClose();
  }

  async function handleChange(value: string) {
    setError(false);
    setEntry(value);
    if (value.length < PIN_LENGTH || !profile) return;

    if (step === "current") {
      const ok = await verifyPin(value, profile.pin);
      if (!ok) {
        flashError();
        return;
      }
      setStep("new");
      setEntry("");
    } else if (step === "new") {
      setNewPin(value);
      setStep("confirm");
      setEntry("");
    } else {
      if (value !== newPin) {
        flashError();
        return;
      }
      const credential = await createPinCredential(value);
      profileStore.update((p) => (p ? { ...p, pin: credential } : p));
      setDone(true);
      setTimeout(close, 1200);
    }
  }

  function flashError() {
    setError(true);
    setTimeout(() => {
      setEntry("");
      setError(false);
    }, 500);
  }

  const titles: Record<PinStep, string> = {
    current: "Enter current PIN",
    new: "Choose a new PIN",
    confirm: "Confirm new PIN",
  };

  return (
    <Sheet open={open} onClose={close} title="Change PIN">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 animate-pop">
          <span className="size-14 rounded-full bg-success-soft text-success flex items-center justify-center">
            <LockIcon className="size-7" />
          </span>
          <p className="font-semibold text-ink">PIN updated</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 pb-2">
          <p className="text-[15px] text-ink-2">
            {error ? "That's not right — try again." : titles[step]}
          </p>
          <PinInput value={entry} onChange={handleChange} error={error} />
        </div>
      )}
    </Sheet>
  );
}
