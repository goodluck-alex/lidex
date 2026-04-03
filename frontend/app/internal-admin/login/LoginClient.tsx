"use client";

import type { CSSProperties } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginFormAction, type LoginState } from "../actions";
import { Card, PageShell } from "../../../components/ui";

const initial: LoginState = { error: null };

function SubmitButton({ requirePassword }: { requirePassword: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={btnStyle}>
      {pending ? "Signing in…" : requirePassword ? "Sign in" : "Continue"}
    </button>
  );
}

const btnStyle: CSSProperties = {
  marginTop: 12,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(0,200,150,0.35)",
  background: "rgba(0,200,150,0.18)",
  color: "white",
  fontWeight: 650,
  cursor: "pointer"
};

export function LoginClient({
  nextPath,
  requirePassword
}: {
  nextPath: string;
  requirePassword: boolean;
}) {
  const [state, formAction] = useActionState(loginFormAction, initial);

  return (
    <PageShell title="Internal admin" subtitle="Server-gated console; API key never leaves the Next server.">
      <Card title="Sign in">
        {!requirePassword ? (
          <p style={{ marginTop: 0, opacity: 0.75, fontSize: 13 }}>
            Development mode: no <code style={{ opacity: 0.9 }}>INTERNAL_ADMIN_UI_PASSWORD</code> set — click Continue.
            Set a password in production.
          </p>
        ) : null}
        {state.error ? (
          <p style={{ color: "#ff8a8a", marginTop: 0, fontSize: 14 }}>{state.error}</p>
        ) : null}
        <form action={formAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label style={{ display: "block", fontSize: 13, marginTop: 8 }}>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required={requirePassword}
              style={{
                display: "block",
                width: "100%",
                maxWidth: 360,
                marginTop: 6,
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                color: "white"
              }}
            />
          </label>
          <SubmitButton requirePassword={requirePassword} />
        </form>
        <p style={{ marginTop: 16, fontSize: 13, opacity: 0.65 }}>
          <Link href="/" style={{ color: "rgba(100,180,255,0.95)" }}>
            ← Back to app
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}
