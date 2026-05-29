export interface JwtPayload {
    userId: bigint;
    role: string;
}
export interface JwtPayloadRaw {
    userId: string;
    role: string;
    iat?: number;
    exp?: number;
}
