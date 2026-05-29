"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateReportDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../../../domain/enums");
class GenerateReportDto {
    report_type;
    date_from;
    date_to;
    project_id;
}
exports.GenerateReportDto = GenerateReportDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.ReportType, {
        message: `report_type must be one of: ${Object.values(enums_1.ReportType).join(', ')}`,
    }),
    __metadata("design:type", String)
], GenerateReportDto.prototype, "report_type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'date_from must be a valid ISO date string' }),
    __metadata("design:type", String)
], GenerateReportDto.prototype, "date_from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'date_to must be a valid ISO date string' }),
    __metadata("design:type", String)
], GenerateReportDto.prototype, "date_to", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateReportDto.prototype, "project_id", void 0);
//# sourceMappingURL=generate-report.dto.js.map