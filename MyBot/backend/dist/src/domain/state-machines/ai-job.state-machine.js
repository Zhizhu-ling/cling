"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJobStateMachine = void 0;
const enums_1 = require("../enums");
const AI_JOB_TRANSITIONS = new Map([
    [enums_1.AiJobStatus.PENDING, [enums_1.AiJobStatus.RUNNING, enums_1.AiJobStatus.CANCELED]],
    [enums_1.AiJobStatus.RUNNING, [enums_1.AiJobStatus.SUCCESS, enums_1.AiJobStatus.FAIL]],
    [enums_1.AiJobStatus.SUCCESS, []],
    [enums_1.AiJobStatus.FAIL, []],
    [enums_1.AiJobStatus.CANCELED, []],
]);
const FORBIDDEN_TRANSITIONS = new Map([
    [
        `${enums_1.AiJobStatus.SUCCESS}->${enums_1.AiJobStatus.RUNNING}`,
        'Cannot restart a completed AI job. A successful job is final.',
    ],
    [
        `${enums_1.AiJobStatus.FAIL}->${enums_1.AiJobStatus.SUCCESS}`,
        'Cannot mark a failed AI job as successful. Submit a new job instead.',
    ],
    [
        `${enums_1.AiJobStatus.CANCELED}->${enums_1.AiJobStatus.RUNNING}`,
        'Cannot run a canceled AI job. Submit a new job instead.',
    ],
]);
class AiJobStateMachine {
    static canTransition(from, to) {
        const allowed = AI_JOB_TRANSITIONS.get(from);
        if (!allowed) {
            return false;
        }
        return allowed.includes(to);
    }
    static validateTransition(from, to) {
        const key = `${from}->${to}`;
        const forbiddenMessage = FORBIDDEN_TRANSITIONS.get(key);
        if (forbiddenMessage) {
            return { valid: false, error: forbiddenMessage };
        }
        if (this.canTransition(from, to)) {
            return { valid: true };
        }
        return {
            valid: false,
            error: `Transition from '${from}' to '${to}' is not allowed.`,
        };
    }
    static getValidTransitions(from) {
        return AI_JOB_TRANSITIONS.get(from) ?? [];
    }
}
exports.AiJobStateMachine = AiJobStateMachine;
//# sourceMappingURL=ai-job.state-machine.js.map