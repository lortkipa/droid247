import { useState } from "react";

/**
 * A round profile photo. Accounts without one (made with an email code) get a
 * plain silhouette, as does a photo that fails to load.
 */
export function Avatar({ src, size = 40 }: { src: string | null | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        className="avatar"
        src={src}
        alt=""
        width={size}
        height={size}
        // Google's photo CDN can refuse requests that carry a referrer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <svg className="avatar" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <rect width="40" height="40" fill="var(--avatar-bg)" />
      <circle cx="20" cy="15.5" r="7.5" fill="var(--avatar-fg)" />
      <path d="M5 40c0-9 6.7-15 15-15s15 6 15 15z" fill="var(--avatar-fg)" />
    </svg>
  );
}
