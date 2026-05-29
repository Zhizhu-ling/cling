"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const constants_1 = require("../../domain/constants");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const { code, message, httpStatus } = this.mapException(exception);
        const body = {
            code,
            message,
            data: null,
            request_id: (0, uuid_1.v4)(),
        };
        response.status(httpStatus).json(body);
    }
    mapException(exception) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            let message;
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                const resp = exceptionResponse;
                if (Array.isArray(resp.message)) {
                    message = resp.message.join('; ');
                }
                else if (typeof resp.message === 'string') {
                    message = resp.message;
                }
                else {
                    message = exception.message;
                }
            }
            else {
                message = exception.message;
            }
            if (this.isAiError(exception)) {
                return {
                    code: constants_1.ErrorCodes.AI_ERROR,
                    message,
                    httpStatus: status,
                };
            }
            const code = this.httpStatusToErrorCode(status);
            return { code, message, httpStatus: status };
        }
        const message = exception instanceof Error ? exception.message : 'Internal server error';
        return {
            code: constants_1.ErrorCodes.SERVER_ERROR,
            message,
            httpStatus: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
        };
    }
    httpStatusToErrorCode(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return constants_1.ErrorCodes.VALIDATION_ERROR;
            case common_1.HttpStatus.UNAUTHORIZED:
                return constants_1.ErrorCodes.UNAUTHORIZED;
            case common_1.HttpStatus.FORBIDDEN:
                return constants_1.ErrorCodes.FORBIDDEN;
            case common_1.HttpStatus.NOT_FOUND:
                return constants_1.ErrorCodes.NOT_FOUND;
            default:
                return constants_1.ErrorCodes.SERVER_ERROR;
        }
    }
    isAiError(exception) {
        const response = exception.getResponse();
        if (typeof response === 'object' && response !== null) {
            const resp = response;
            return resp.errorType === 'AI_ERROR' || resp.code === constants_1.ErrorCodes.AI_ERROR;
        }
        return false;
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map