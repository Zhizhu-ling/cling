"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Idempotent = exports.IDEMPOTENT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IDEMPOTENT_KEY = 'isIdempotent';
const Idempotent = () => (0, common_1.SetMetadata)(exports.IDEMPOTENT_KEY, true);
exports.Idempotent = Idempotent;
//# sourceMappingURL=idempotent.decorator.js.map