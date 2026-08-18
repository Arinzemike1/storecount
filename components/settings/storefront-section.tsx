"use client";

import { useState } from "react";
import { SettingsGroup, SettingsRow } from "@/components/settings/settings-row";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import {
  AlertIcon,
  BoxIcon,
  PhoneIcon,
  ShareIcon,
  StoreIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import {
  republishCatalog,
  updateStore,
  useStorefront,
  OrderActionError,
} from "@/lib/orders";
import { useProducts, useSettings } from "@/lib/store";
import type { StoreProfile } from "@/lib/storefront-types";

/** Public origin of the storefront deployment. */
const STOREFRONT_ORIGIN =
  process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? "https://shop.storecount.app";

export function storeUrl(slug: string): string {
  return `${STOREFRONT_ORIGIN}/${slug}`;
}

type StoreSheet = "share" | "details" | "delivery" | "slug" | "create" | null;

export function StorefrontSection() {
  const storefront = useStorefront();
  const products = useProducts();
  const settings = useSettings();
  const [sheet, setSheet] = useState<StoreSheet>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const publishedCount = products.filter((p) => p.published).length;

  async function toggleOpen(next: boolean) {
    setBusy(true);
    try {
      await updateStore({ isOpen: next });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function republish() {
    setBusy(true);
    setNote(null);
    try {
      const count = await republishCatalog();
      setNote(`${count} ${count === 1 ? "product" : "products"} published.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not republish");
    } finally {
      setBusy(false);
    }
  }

  if (!storefront) {
    return (
      <>
        <SettingsGroup title="Online Store">
          <SettingsRow
            icon={<StoreIcon className="size-5" />}
            label="Set up your online store"
            value="Take orders"
            onClick={() => setSheet("create")}
          />
        </SettingsGroup>
        <CreateStoreSheet
          open={sheet === "create"}
          onClose={() => setSheet(null)}
          defaultName={settings.businessName}
        />
      </>
    );
  }

  return (
    <>
      <SettingsGroup title="Online Store">
        <SettingsRow
          icon={<ShareIcon className="size-5" />}
          label="Store link"
          value={storefront.slug}
          onClick={() => setSheet("share")}
        />
        <SettingsRow
          icon={<StoreIcon className="size-5" />}
          label="Accepting orders"
          trailing={
            <Toggle
              label="Accepting orders"
              checked={storefront.isOpen}
              disabled={busy}
              onChange={toggleOpen}
            />
          }
        />
        <SettingsRow
          icon={<TruckIcon className="size-5" />}
          label="Delivery"
          value={
            storefront.deliveryFee > 0
              ? formatMoney(storefront.deliveryFee, settings)
              : "Free"
          }
          onClick={() => setSheet("delivery")}
        />
        <SettingsRow
          icon={<PhoneIcon className="size-5" />}
          label="Store details"
          value={storefront.name}
          onClick={() => setSheet("details")}
        />
        <SettingsRow
          icon={<BoxIcon className="size-5" />}
          label="Republish catalog"
          value={`${publishedCount} online`}
          onClick={republish}
          disabled={busy}
        />
      </SettingsGroup>

      {note && (
        <p className="text-[13px] text-ink-3 px-1 -mt-3">{note}</p>
      )}

      <ShareSheet
        open={sheet === "share"}
        onClose={() => setSheet(null)}
        store={storefront}
        onEditSlug={() => setSheet("slug")}
      />
      <DetailsSheet
        open={sheet === "details"}
        onClose={() => setSheet(null)}
        store={storefront}
      />
      <DeliverySheet
        open={sheet === "delivery"}
        onClose={() => setSheet(null)}
        store={storefront}
      />
      <SlugSheet
        open={sheet === "slug"}
        onClose={() => setSheet(null)}
        store={storefront}
      />
    </>
  );
}

function useSave(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Parameters<typeof updateStore>[0]) {
    setBusy(true);
    setError(null);
    try {
      await updateStore(patch);
      onDone();
    } catch (err) {
      setError(
        err instanceof OrderActionError ? err.message : "Could not save changes",
      );
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, save };
}

function CreateStoreSheet({
  open,
  onClose,
  defaultName,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const { busy, error, save } = useSave(onClose);

  return (
    <Sheet open={open} onClose={onClose} title="Set up your online store">
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-ink-2">
          Customers get a link they can open on their phone, browse what you have,
          and place an order. You confirm each one before anything leaves your
          shelf.
        </p>
        <Field
          label="Store name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adaeze Stores"
          error={error ?? undefined}
          autoFocus
        />
        <p className="text-[13px] text-ink-3">
          Your store opens closed. Publish a few products first, then switch
          &ldquo;Accepting orders&rdquo; on when you&apos;re ready.
        </p>
        <Button
          full
          loading={busy}
          disabled={!name.trim()}
          onClick={() => save({ name: name.trim(), isPublished: true })}
        >
          Create store
        </Button>
      </div>
    </Sheet>
  );
}

function ShareSheet({
  open,
  onClose,
  store,
  onEditSlug,
}: {
  open: boolean;
  onClose: () => void;
  store: StoreProfile;
  onEditSlug: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = storeUrl(store.slug);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the URL is still selectable on screen.
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your store link">
      <div className="flex flex-col gap-4">
        <p className="rounded-control bg-surface-2 px-4 py-3 text-[15px] text-ink break-all select-all">
          {url}
        </p>

        {!store.isOpen && (
          <p className="flex gap-2 text-[13px] text-warning">
            <AlertIcon className="size-4 shrink-0 mt-0.5" />
            Your store is closed, so visitors can browse but not order.
          </p>
        )}

        <Button full onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Order from ${store.name}: ${url}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="w-full"
        >
          <Button full variant="secondary">
            Share on WhatsApp
          </Button>
        </a>
        <Button full variant="ghost" onClick={onEditSlug}>
          Change link name
        </Button>
      </div>
    </Sheet>
  );
}

function SlugSheet({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store: StoreProfile;
}) {
  const [slug, setSlug] = useState(store.slug);
  const { busy, error, save } = useSave(onClose);

  return (
    <Sheet open={open} onClose={onClose} title="Change link name">
      <div className="flex flex-col gap-4">
        <Field
          label="Link name"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={error ?? undefined}
          hint={storeUrl(slug || store.slug)}
          autoFocus
        />
        <p className="flex gap-2 text-[13px] text-warning">
          <AlertIcon className="size-4 shrink-0 mt-0.5" />
          Your old link stops working immediately. Anything you have already
          printed or shared will lead nowhere.
        </p>
        <Button
          full
          loading={busy}
          disabled={!slug.trim() || slug === store.slug}
          onClick={() => save({ slug: slug.trim() })}
        >
          Change link
        </Button>
      </div>
    </Sheet>
  );
}

function DetailsSheet({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store: StoreProfile;
}) {
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const { busy, error, save } = useSave(onClose);

  return (
    <Sheet open={open} onClose={onClose} title="Store details">
      <div className="flex flex-col gap-4">
        <Field
          label="Store name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
        />
        <Field
          label="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Provisions & drinks, Ikeja"
        />
        <Field
          label="Public phone number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Number customers can call"
          hint="Shown on your store page. Keep it separate from your sign-in number."
        />
        <Field
          label="Shop address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Where customers collect from"
        />
        <Button
          full
          loading={busy}
          disabled={!name.trim()}
          onClick={() =>
            save({
              name: name.trim(),
              description: description.trim(),
              phone: phone.trim(),
              address: address.trim(),
            })
          }
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}

function DeliverySheet({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store: StoreProfile;
}) {
  const [fee, setFee] = useState(String(store.deliveryFee));
  const [minimum, setMinimum] = useState(String(store.minOrderTotal));
  const [delivery, setDelivery] = useState(store.acceptsDelivery);
  const [pickup, setPickup] = useState(store.acceptsPickup);
  const [deliveryNote, setDeliveryNote] = useState(store.deliveryNote ?? "");
  const { busy, error, save } = useSave(onClose);

  const nothingSelected = !delivery && !pickup;

  return (
    <Sheet open={open} onClose={onClose} title="Delivery & pickup">
      <div className="flex flex-col gap-4">
        <div className="rounded-control border border-border-strong divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[15px] font-medium text-ink">
              Deliver to customers
            </span>
            <Toggle
              label="Deliver to customers"
              checked={delivery}
              onChange={setDelivery}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[15px] font-medium text-ink">
              Allow pickup
            </span>
            <Toggle label="Allow pickup" checked={pickup} onChange={setPickup} />
          </div>
        </div>

        {nothingSelected && (
          <p className="text-[13px] text-danger font-medium">
            Choose at least one — customers need a way to receive their order.
          </p>
        )}

        {delivery && (
          <>
            <Field
              label="Delivery fee"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              hint="Added to every delivery order"
            />
            <Field
              label="Delivery note"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="e.g. Same-day within Ikeja"
            />
          </>
        )}

        <Field
          label="Minimum order"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
          hint="Leave at 0 for no minimum"
          error={error ?? undefined}
        />

        <Button
          full
          loading={busy}
          disabled={nothingSelected}
          onClick={() =>
            save({
              acceptsDelivery: delivery,
              acceptsPickup: pickup,
              deliveryFee: Number(fee) || 0,
              minOrderTotal: Number(minimum) || 0,
              deliveryNote: deliveryNote.trim(),
            })
          }
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
