import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class IdempotencyMiddleware implements NestMiddleware {
    private readonly cache;
    constructor();
    use(req: Request, res: Response, next: NextFunction): void;
}
