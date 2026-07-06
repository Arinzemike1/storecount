"use client";

import { useEffect } from "react";

/** Registers the offline service worker once the page is interactive. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Offline support is progressive enhancement — never block the app.
      });
  }, []);
  return null;
}
