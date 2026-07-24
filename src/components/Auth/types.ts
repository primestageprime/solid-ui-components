// ============================================
// Auth — shared types for the Auth Composites
// STRUCTURAL MIRROR of @primestageprime/auth0-stdb-client's `AuthApi`
// (that repo's src/api.ts). SUI has ZERO dependency on that package —
// the components take the API via the `auth` Data Prop (dependency
// injection keeps the library pure and the flows testable/showcasable
// with fakes). Apps pass the package's `authApi` export, which matches
// this shape structurally. Keep the two in sync by hand.
// ============================================

/** One offerable login method: the Auth0 connection name + its UI label. */
export interface ConnectionEntry {
  connection: string;
  label: string;
}

/** One entry of an Auth0 user's identities array. */
export interface AuthIdentity {
  provider: string;
  user_id: string;
  connection: string;
  isSocial: boolean;
}

export interface AuthApi {
  getAuth0User(): Promise<{ sub: string; name: string; email: string } | null>;
  logout(): Promise<void>;
  getMyIdentities(allowPopup: boolean): Promise<AuthIdentity[] | null>;
  linkAnotherMethod(
    targetConnection: string,
    mergeBeforeLink: (secondaryAccessToken: string) => Promise<void>,
  ): Promise<Array<{ provider: string; connection: string; isSocial: boolean }>>;
  unlinkMethod(provider: string, secondaryUserId: string): Promise<AuthIdentity[]>;
  getUnlinkedSiblingHint(): Promise<string | null>;
  /** The app's configured login-method catalog (drives Add-method offers). */
  connections(): ConnectionEntry[];
  /** UI label for a provider/connection; raw name if uncataloged. */
  connectionLabel(connection: string): string;
}
