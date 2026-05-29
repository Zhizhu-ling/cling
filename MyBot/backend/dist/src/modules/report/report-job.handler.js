"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportJobHandler = void 0;
const common_1 = require("@nestjs/common");
const handlers_1 = require("../ai/handlers");
class ReportJobHandler {
    reportService;
    logger = new common_1.Logger(ReportJobHandler.name);
    innerHandler;
    constructor(reportService, aiClient) {
        this.reportService = reportService;
        this.innerHandler = new handlers_1.ReportGenerateHandler(aiClient);
    }
    async execute(inputPayload) {
        const result = await this.innerHandler.execute(inputPayload);
        const userId = BigInt(inputPayload.created_by);
        await this.reportService.onReportJobSuccess('', result.outputPayload, userId, inputPayload);
        this.logger.log('Report generated and saved successfully');
        return result;
    }
}
exports.ReportJobHandler = ReportJobHandler;
//# sourceMappingURL=report-job.handler.js.map