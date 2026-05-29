"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const filters_1 = require("./common/filters");
const interceptors_1 = require("./common/interceptors");
BigInt.prototype.toJSON = function () {
    return this.toString();
};
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('app.port', 3000);
    const prefix = configService.get('app.prefix', 'api/v1');
    app.setGlobalPrefix(prefix);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new filters_1.GlobalExceptionFilter());
    app.useGlobalInterceptors(new interceptors_1.TransformResponseInterceptor());
    app.enableCors();
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}/${prefix}`);
}
bootstrap();
//# sourceMappingURL=main.js.map