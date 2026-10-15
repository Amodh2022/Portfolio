"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export default function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        form.reset();
        setStatus({ kind: "sent" });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({
        kind: "error",
        message:
          res.status === 503
            ? "The form isn't connected yet."
            : res.status === 429
              ? "Too many messages. Try again later."
              : body.error ?? "Something went wrong.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error." });
    }
  }

  return (
    <form className="cform" onSubmit={onSubmit} noValidate={false}>
      <div className="cform-grid">
        <label className="field">
          <span>Name</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required maxLength={120} autoComplete="email" />
        </label>
      </div>
      <label className="field">
        <span>Message</span>
        <textarea name="message" required minLength={10} maxLength={2000} rows={5} />
      </label>
      {/* honeypot: real visitors never see or fill this */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hp" />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 24px" }}>
        <button type="submit" className="cta dark" disabled={status.kind === "sending"} style={{ border: 0, cursor: "pointer" }}>
          {status.kind === "sending" ? "Sending..." : "Send invite"}
        </button>
        <a className="link" style={{ color: "inherit" }} href={`mailto:${email}`}>or email directly</a>
      </div>
      <p role="status" aria-live="polite" style={{ margin: 0, fontWeight: 600, minHeight: "1.6em" }}>
        {status.kind === "sent" && "Invite sent. I'll get back to you soon."}
        {status.kind === "error" && `${status.message} Please use the email link instead.`}
      </p>
    </form>
  );
}
