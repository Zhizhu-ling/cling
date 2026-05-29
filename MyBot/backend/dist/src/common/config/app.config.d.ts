export declare const appConfig: (() => {
    port: number;
    prefix: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    ai: {
        modelEndpoint: string;
        modelName: string;
        apiKey: string;
        timeoutMs: number;
    };
    redis: {
        host: string;
        port: number;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    port: number;
    prefix: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    ai: {
        modelEndpoint: string;
        modelName: string;
        apiKey: string;
        timeoutMs: number;
    };
    redis: {
        host: string;
        port: number;
    };
}>;
