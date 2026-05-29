"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_VERSIONS = void 0;
exports.getPromptVersionConfig = getPromptVersionConfig;
const enums_1 = require("../../../domain/enums");
exports.PROMPT_VERSIONS = {
    [enums_1.AiJobType.REQUIREMENT_SPLIT]: {
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        templateName: 'requirement_split_v1',
    },
    [enums_1.AiJobType.ASSIGNMENT_SUGGEST]: {
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        templateName: 'assignment_suggest_v1',
    },
    [enums_1.AiJobType.REPORT_GENERATE]: {
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        templateName: 'report_generate_v1',
    },
};
function getPromptVersionConfig(jobType, templateNameOverride) {
    const config = exports.PROMPT_VERSIONS[jobType];
    if (templateNameOverride) {
        return { ...config, templateName: templateNameOverride };
    }
    return config;
}
//# sourceMappingURL=prompt-versions.js.map