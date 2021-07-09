import { AuthenticationResult } from "@azure/msal-browser";

export default interface IAuthenticationWrapper {
  getSessionId(): string | null;
  logIn(sessionId?: string): Promise<AuthenticationResult>;
  logOut(): void;
  logOutPopUp(): void;
  consentToScopes(scopes: string[]): Promise<AuthenticationResult>;
  clearCache(): void;
}