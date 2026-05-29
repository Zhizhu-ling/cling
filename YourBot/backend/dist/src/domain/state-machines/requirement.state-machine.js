"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementStateMachine = void 0;
const enums_1 = require("../enums");
class RequirementStateMachine {
    static ALLOWED_TRANSITIONS = new Map([
        [enums_1.RequirementStatus.DRAFT, [enums_1.RequirementStatus.ANALYZING]],
        [enums_1.RequirementStatus.ANALYZING, [enums_1.RequirementStatus.SPLIT_DONE]],
        [enums_1.RequirementStatus.SPLIT_DONE, [enums_1.RequirementStatus.ASSIGNED]],
        [enums_1.RequirementStatus.ASSIGNED, [enums_1.RequirementStatus.IN_PROGRESS]],
        [enums_1.RequirementStatus.IN_PROGRESS, [enums_1.RequirementStatus.CLOSED]],
        [enums_1.RequirementStatus.CLOSED, []],
    ]);
    static FORBIDDEN_TRANSITIONS = new Map([
        [
            `${enums_1.RequirementStatus.CLOSED}->${enums_1.RequirementStatus.IN_PROGRESS}`,
            'Cannot reopen a closed requirement. Closed requirements are final.',
        ],
        [
            `${enums_1.RequirementStatus.SPLIT_DONE}->${enums_1.RequirementStatus.DRAFT}`,
            'Cannot revert a split requirement back to draft. The task tree has already been generated.',
        ],
        [
            `${enums_1.RequirementStatus.ASSIGNED}->${enums_1.RequirementStatus.SPLIT_DONE}`,
            'Cannot revert an assigned requirement back to split_done. Tasks have already been assigned.',
        ],
        [
            `${enums_1.RequirementStatus.CLOSED}->${enums_1.RequirementStatus.ASSIGNED}`,
            'Cannot reassign a closed requirement. Closed requirements are final.',
        ],
    ]);
    static canTransition(from, to) {
        const allowed = this.ALLOWED_TRANSITIONS.get(from);
        if (!allowed) {
            return false;
        }
        return allowed.includes(to);
    }
    static validateTransition(from, to) {
        if (from === to) {
            return {
                valid: false,
                error: `Requirement is already in '${from}' status. No transition needed.`,
            };
        }
        const transitionKey = `${from}->${to}`;
        const forbiddenMessage = this.FORBIDDEN_TRANSITIONS.get(transitionKey);
        if (forbiddenMessage) {
            return { valid: false, error: forbiddenMessage };
        }
        if (this.canTransition(from, to)) {
            return { valid: true };
        }
        return {
            valid: false,
            error: `Invalid transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${(this.ALLOWED_TRANSITIONS.get(from) || []).join(', ')}].`,
        };
    }
    static getValidTransitions(from) {
        return [...(this.ALLOWED_TRANSITIONS.get(from) || [])];
    }
}
exports.RequirementStateMachine = RequirementStateMachine;
//# sourceMappingURL=requirement.state-machine.js.map