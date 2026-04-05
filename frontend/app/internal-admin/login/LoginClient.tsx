"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginFormAction, type LoginState } from "../actions";
import { Card, PageShell } from "../../../components/ui";

const initial: LoginState = { error: null };

function SubmitButton({ requirePassword }: { requirePassword: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 min-h-11 rounded-xl border border-[#00c896]/40 bg-[#00c896]/18 px-4 text-sm font-semibold text-white transition-opacity hover:bg-[#00c896]/25 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in…" : requirePassword ? "Sign in" : "Continue"}
    </button>
  );
}

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
          <p className="mt-0 text-sm text-white/75">
            Development mode: no <code>INTERNAL_ADMIN_UI_PASSWORD</code> set — click Continue. Set a password in production.
          </p>
        ) : null}
        {state.error ? <p className="mt-0 text-sm text-red-300">{state.error}</p> : null}
        <form action={formAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label className="mt-2 block text-sm text-white/85">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required={requirePassword}
              className="mt-1.5 block max-w-[360px] w-full rounded-lg border border-white/12 bg-black/25 px-2.5 py-2.5 text-sm text-white focus:border-[#00c896]/45 focus:outline-none focus:ring-1 focus:ring-[#00c896]/35"
            />
          </label>
          <SubmitButton requirePassword={requirePassword} />
        </form>
        <p className="mt-4 text-sm text-white/60">
          <Link href="/" className="text-[#7ab8ff] hover:text-[#9ccaff] hover:underline">
            ← Back to app
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}
