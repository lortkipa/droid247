import { isValidEmail, type Session, type VerifyCodeResponse } from "@droid247/shared";
import { type FormEvent, type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api.ts";
import {
  forgetReturnedGoogleSignIn,
  googleErrorMessage,
  returnedGoogleSignIn,
  signInWithGoogle,
} from "./google.ts";
import { OtpInput } from "./OtpInput.tsx";
import { browserSignInIsExternal } from "./platform.ts";

type Step =
  | { name: "login"; googleError?: string }
  /** Back from Google on the web, claiming the result. */
  | { name: "google-return" }
  | { name: "verify"; email: string }
  | {
      name: "profile";
      signupToken: string;
      /** Set for Google sign-ups: the Google name, prefilled but editable. */
      google?: { name?: string };
    };

/** Sign-in flow: email → one-time code, or Google → (new accounts only) name. */
export function Login({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [step, setStep] = useState<Step>(() =>
    returnedGoogleSignIn() ? { name: "google-return" } : { name: "login" },
  );
  const restart = () => setStep({ name: "login" });

  function onGoogleResult(result: VerifyCodeResponse) {
    if (result.status === "signed-in") onSignedIn(result.session);
    else {
      setStep({ name: "profile", signupToken: result.signupToken, google: { name: result.name } });
    }
  }

  // Keyed by step so each one remounts and replays the enter animation.
  switch (step.name) {
    case "login":
      return (
        <LoginStep
          key="login"
          googleError={step.googleError}
          onCodeSent={(email) => setStep({ name: "verify", email })}
          onGoogleResult={onGoogleResult}
        />
      );
    case "google-return":
      return (
        <GoogleReturnStep
          key="google-return"
          onResult={onGoogleResult}
          onFailed={(googleError) => setStep({ name: "login", googleError })}
        />
      );
    case "verify":
      return (
        <VerifyStep
          key="verify"
          email={step.email}
          onSignedIn={onSignedIn}
          onNewAccount={(signupToken) => setStep({ name: "profile", signupToken })}
          onRestart={restart}
        />
      );
    case "profile":
      return (
        <ProfileStep
          key="profile"
          signupToken={step.signupToken}
          google={step.google}
          onSignedIn={onSignedIn}
          onRestart={restart}
        />
      );
  }
}

function LoginStep({
  googleError: initialGoogleError,
  onCodeSent,
  onGoogleResult,
}: {
  googleError?: string;
  onCodeSent: (email: string) => void;
  onGoogleResult: (result: VerifyCodeResponse) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState<AbortController | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(initialGoogleError ?? null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.requestCode(value);
      onCodeSent(value);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    const controller = new AbortController();
    setGoogle(controller);
    setGoogleError(null);
    try {
      const result = await signInWithGoogle(controller.signal);
      if (result) onGoogleResult(result);
      // No result: cancelled, or (web) the page is on its way to Google.
      else if (controller.signal.aborted) setGoogle(null);
    } catch (err) {
      setGoogleError(googleErrorMessage(err));
      setGoogle(null);
    }
  }

  const waiting = google !== null;

  return (
    <Section title="Log in to droid247">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="email">
          Email address
        </label>
        <input
          ref={emailRef}
          className="field"
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          spellCheck={false}
          autoCapitalize="off"
          value={email}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />
        {error && <ErrorMessage id="email-error">{error}</ErrorMessage>}
        <Button variant="primary" type="submit" loading={busy} disabled={busy || waiting}>
          Continue with Email
        </Button>
      </form>
      <div className="divider">or</div>
      <div className="stack">
        <Button onClick={continueWithGoogle} loading={waiting} disabled={busy || waiting}>
          <GoogleIcon />
          <span>Continue with Google</span>
        </Button>
        {googleError && <ErrorMessage>{googleError}</ErrorMessage>}
        {waiting && browserSignInIsExternal() && (
          <>
            <p className="hint">Finish signing in in your browser.</p>
            <Button variant="ghost" onClick={() => google.abort()}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </Section>
  );
}

function VerifyStep({
  email,
  onSignedIn,
  onNewAccount,
  onRestart,
}: {
  email: string;
  onSignedIn: (session: Session) => void;
  onNewAccount: (signupToken: string) => void;
  onRestart: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "checking" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  async function check(code: string) {
    setStatus("checking");
    setError(null);
    try {
      const result = await api.verifyCode(email, code);
      if (result.status === "signed-in") onSignedIn(result.session);
      else onNewAccount(result.signupToken);
    } catch (err) {
      // Any attempt uses the code up, so every failure means going back for a fresh code.
      setError(errorMessage(err));
      setStatus("failed");
    }
  }

  useEffect(() => {
    if (status === "failed") backRef.current?.focus();
  }, [status]);

  return (
    <Section
      title="Check your email"
      lede={
        <>
          We sent a 6-digit code to <strong>{email}</strong>. It may take a minute to arrive.
        </>
      }
    >
      <div className="stack">
        <OtpInput
          onComplete={check}
          checking={status === "checking"}
          failed={status === "failed"}
        />
        {status === "checking" && (
          <div className="checking-row">
            <span className="mini-spin" />
            <span>Verifying…</span>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button ref={backRef} variant="ghost" onClick={onRestart}>
          Use a different email
        </Button>
      </div>
    </Section>
  );
}

/** Claims the Google sign-in this page load returned from. */
function GoogleReturnStep({
  onResult,
  onFailed,
}: {
  onResult: (result: VerifyCodeResponse) => void;
  onFailed: (message: string | undefined) => void;
}) {
  useEffect(() => {
    const pending = returnedGoogleSignIn();
    if (!pending) {
      onFailed(undefined);
      return;
    }
    let cancelled = false;
    pending.then(
      (result) => {
        if (cancelled) return;
        forgetReturnedGoogleSignIn();
        onResult(result);
      },
      (err) => {
        if (cancelled) return;
        forgetReturnedGoogleSignIn();
        onFailed(googleErrorMessage(err) ?? undefined);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [onResult, onFailed]);

  return (
    <Section title="Signing in with Google">
      <div className="checking-row">
        <span className="mini-spin" />
        <span>Just a moment…</span>
      </div>
    </Section>
  );
}

function ProfileStep({
  signupToken,
  google,
  onSignedIn,
  onRestart,
}: {
  signupToken: string;
  google?: { name?: string };
  onSignedIn: (session: Session) => void;
  onRestart: () => void;
}) {
  const [name, setName] = useState(google?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = nameRef.current;
    if (!input) return;
    input.focus();
    // A name filled in from Google is ready to edit: caret at the end.
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await api.signup(signupToken, value));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Section title="What should we call you?">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="name">
          Your name
        </label>
        <input
          ref={nameRef}
          className="field"
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button variant="primary" type="submit" loading={busy} disabled={busy || !name.trim()}>
          Continue
        </Button>
        <Button variant="ghost" onClick={onRestart} disabled={busy}>
          {google ? "Use a different account" : "Use a different email"}
        </Button>
      </form>
    </Section>
  );
}

/* ---- building blocks ---- */

function Section({
  title,
  lede,
  before,
  children,
}: {
  title: string;
  lede?: ReactNode;
  before?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="step enter" aria-label={title}>
      {before}
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </section>
  );
}

function Button({
  variant,
  loading = false,
  type = "button",
  children,
  ...rest
}: {
  variant?: "primary" | "ghost";
  loading?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  const className = ["btn", variant && `btn-${variant}`, loading && "loading"]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={className} type={type} aria-busy={loading} {...rest}>
      {typeof children === "string" ? <span>{children}</span> : children}
    </button>
  );
}

function ErrorMessage({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className="msg" id={id} role="alert">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 4.75v3.75M8 10.75v.5" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
