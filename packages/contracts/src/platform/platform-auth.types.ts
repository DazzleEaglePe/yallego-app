export interface PlatformSessionResult {
  access_token: string;
  expires_in: number;
  admin: {
    id: string;
    email: string;
    full_name: string;
  };
}
