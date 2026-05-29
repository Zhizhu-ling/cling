export declare const ErrorCodes: {
    readonly SUCCESS: 0;
    readonly VALIDATION_ERROR: 40001;
    readonly UNAUTHORIZED: 40101;
    readonly FORBIDDEN: 40301;
    readonly NOT_FOUND: 40401;
    readonly SERVER_ERROR: 50001;
    readonly AI_ERROR: 50002;
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
