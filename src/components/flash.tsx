"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type FlashType = "success" | "error";
type FlashMessage = { id: number; type: FlashType; text: string };

type FlashContextValue = {
  showFlash: (type: FlashType, text: string) => void;
};

const FlashContext = createContext<FlashContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

/**
 * Minimal toast-like feedback. It lives in the root layout, which stays mounted across
 * client-side navigations, so a form can show "Task created" and then redirect to the list.
 */
export function FlashProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [message, setMessage] = useState<FlashMessage | null>(null);

  const showFlash = useCallback((type: FlashType, text: string) => {
    setMessage({ id: Date.now(), type, text });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <FlashContext.Provider value={{ showFlash }}>
      {/* role="status"/"alert" makes screen readers announce the message. */}
      <div className="flash-region" aria-live="polite">
        {message && (
          <div
            key={message.id}
            className={`flash flash-${message.type}`}
            role={message.type === "error" ? "alert" : "status"}
          >
            <span>{message.text}</span>
            <button type="button" className="flash-close" onClick={() => setMessage(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
      </div>
      {children}
    </FlashContext.Provider>
  );
}

export function useFlash() {
  const context = useContext(FlashContext);
  if (!context) throw new Error("useFlash must be used within <FlashProvider>.");
  return context;
}
