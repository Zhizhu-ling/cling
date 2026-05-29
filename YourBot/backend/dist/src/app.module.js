"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("./common/config");
const middleware_1 = require("./common/middleware");
const prisma_1 = require("./infra/prisma");
const auth_1 = require("./modules/auth");
const user_1 = require("./modules/user");
const requirement_1 = require("./modules/requirement");
const task_1 = require("./modules/task");
const ai_1 = require("./modules/ai");
const report_1 = require("./modules/report");
const alert_1 = require("./modules/alert");
const dashboard_1 = require("./modules/dashboard");
const notification_1 = require("./modules/notification");
const realtime_1 = require("./modules/realtime");
const audit_1 = require("./modules/audit");
const outbox_1 = require("./modules/outbox");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(middleware_1.IdempotencyMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.POST }, { path: '*', method: common_1.RequestMethod.PUT }, { path: '*', method: common_1.RequestMethod.PATCH }, { path: '*', method: common_1.RequestMethod.DELETE });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.AppConfigModule,
            prisma_1.PrismaModule,
            auth_1.AuthModule,
            user_1.UserModule,
            requirement_1.RequirementModule,
            task_1.TaskModule,
            ai_1.AiModule,
            report_1.ReportModule,
            alert_1.AlertModule,
            dashboard_1.DashboardModule,
            notification_1.NotificationModule,
            realtime_1.RealtimeModule,
            audit_1.AuditModule,
            outbox_1.OutboxModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map