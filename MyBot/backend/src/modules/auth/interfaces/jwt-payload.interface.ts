export interface JwtPayload {
  userId: bigint;
  role: string;
}

/**
 * The raw JWT payload as stored in the token (with string userId for JSON serialization)
 */
export interface JwtPayloadRaw {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}
