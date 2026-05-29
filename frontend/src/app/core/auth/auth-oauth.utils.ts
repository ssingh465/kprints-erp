export interface OAuthRedirectError {
  error: string;
  errorCode: string;
  description: string;
}

function readParam(search: URLSearchParams, hash: URLSearchParams | null, key: string): string | null {
  return search.get(key) ?? hash?.get(key) ?? null;
}

export function mapOAuthRedirectErrorMessage(err: OAuthRedirectError): string {
  if (err.errorCode === 'signup_disabled') {
    return (
      'This workspace is invite-only. Your Google account is not registered yet. ' +
      'Contact your administrator for an invitation, or sign in with an email that already has access.'
    );
  }

  if (err.errorCode === 'session_missing') {
    return 'We could not establish a sign-in session. Please try again.';
  }

  if (err.error === 'access_denied') {
    return 'Sign-in was cancelled or denied. Please try again.';
  }

  if (err.description) {
    return err.description;
  }

  return 'We could not complete sign-in. Please try again.';
}

function urlAuthParams(): { search: URLSearchParams; hash: URLSearchParams | null } {
  const search = new URLSearchParams(window.location.search);
  const hashRaw = window.location.hash.replace(/^#/, '');
  const hash = hashRaw ? new URLSearchParams(hashRaw) : null;
  return { search, hash };
}

/** Read OAuth error params Supabase puts in the query string and/or URL hash. */
export function readOAuthRedirectError(): OAuthRedirectError | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { search, hash } = urlAuthParams();

  const error = readParam(search, hash, 'error');
  const errorCode = readParam(search, hash, 'error_code');
  const rawDescription = readParam(search, hash, 'error_description');

  if (!error && !errorCode) {
    return null;
  }

  const description = rawDescription
    ? decodeURIComponent(rawDescription.replace(/\+/g, ' '))
    : '';

  return {
    error: error ?? '',
    errorCode: errorCode ?? '',
    description,
  };
}

/**
 * Supabase auth redirect type from the invite / recovery / signup email link.
 * Common values: `invite`, `signup`, `recovery`, `magiclink`.
 */
export function readAuthCallbackType(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { search, hash } = urlAuthParams();
  return readParam(search, hash, 'type');
}

export function isInviteCallbackType(type: string | null): boolean {
  return type === 'invite' || type === 'signup';
}
