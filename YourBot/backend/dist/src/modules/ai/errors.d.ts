export declare class AiError extends Error {
    readonly rawResponse?: string;
    constructor(message: string, rawResponse?: string);
}
export declare class NetworkError extends AiError {
    constructor(message: string, rawResponse?: string);
}
export declare class ParseError extends AiError {
    constructor(message: string, rawResponse?: string);
}
export declare class TimeoutError extends AiError {
    constructor(message: string, rawResponse?: string);
}
export declare class BusinessValidationError extends AiError {
    constructor(message: string, rawResponse?: string);
}
