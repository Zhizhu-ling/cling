"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJobType = exports.AiJobStatus = void 0;
var AiJobStatus;
(function (AiJobStatus) {
    AiJobStatus["PENDING"] = "pending";
    AiJobStatus["RUNNING"] = "running";
    AiJobStatus["SUCCESS"] = "success";
    AiJobStatus["FAIL"] = "fail";
    AiJobStatus["CANCELED"] = "canceled";
})(AiJobStatus || (exports.AiJobStatus = AiJobStatus = {}));
var AiJobType;
(function (AiJobType) {
    AiJobType["REQUIREMENT_SPLIT"] = "requirement_split";
    AiJobType["ASSIGNMENT_SUGGEST"] = "assignment_suggest";
    AiJobType["REPORT_GENERATE"] = "report_generate";
})(AiJobType || (exports.AiJobType = AiJobType = {}));
//# sourceMappingURL=ai-job-status.enum.js.map