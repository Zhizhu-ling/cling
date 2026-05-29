"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStateMachine = void 0;
const task_status_enum_1 = require("../enums/task-status.enum");
const ALLOWED_TRANSITIONS = {
    [task_status_enum_1.TaskStatus.TODO]: [task_status_enum_1.TaskStatus.DOING],
    [task_status_enum_1.TaskStatus.DOING]: [task_status_enum_1.TaskStatus.BLOCKED, task_status_enum_1.TaskStatus.DELAYED, task_status_enum_1.TaskStatus.DONE],
    [task_status_enum_1.TaskStatus.BLOCKED]: [task_status_enum_1.TaskStatus.DOING],
    [task_status_enum_1.TaskStatus.DELAYED]: [task_status_enum_1.TaskStatus.DOING],
    [task_status_enum_1.TaskStatus.DONE]: [],
};
const ADMIN_ONLY_TRANSITIONS = [
    { from: task_status_enum_1.TaskStatus.TODO, to: task_status_enum_1.TaskStatus.DONE },
];
class TaskStateMachine {
    canTransition(from, to, isAdmin = false) {
        if (from === to) {
            return false;
        }
        const allowed = ALLOWED_TRANSITIONS[from];
        if (allowed && allowed.includes(to)) {
            return true;
        }
        if (isAdmin) {
            return ADMIN_ONLY_TRANSITIONS.some((t) => t.from === from && t.to === to);
        }
        return false;
    }
    validateTransition(from, to, context) {
        const isAdmin = context?.isAdmin ?? false;
        if (!this.canTransition(from, to, isAdmin)) {
            return {
                valid: false,
                error: `Transition from "${from}" to "${to}" is not allowed`,
            };
        }
        if (to === task_status_enum_1.TaskStatus.BLOCKED) {
            if (!context?.blockedReason || context.blockedReason.trim() === '') {
                return {
                    valid: false,
                    error: 'Transition to "blocked" requires a blocked_reason',
                };
            }
        }
        if (context?.progress !== undefined && context.progress !== null) {
            if (context.progress < 0 || context.progress > 100) {
                return {
                    valid: false,
                    error: 'Progress must be between 0 and 100 inclusive',
                };
            }
        }
        if (to === task_status_enum_1.TaskStatus.DONE) {
            return {
                valid: true,
                sideEffects: {
                    completedAt: new Date(),
                    progress: 100,
                },
            };
        }
        return { valid: true };
    }
    getValidTransitions(from, isAdmin = false) {
        const transitions = [...(ALLOWED_TRANSITIONS[from] || [])];
        if (isAdmin) {
            for (const t of ADMIN_ONLY_TRANSITIONS) {
                if (t.from === from && !transitions.includes(t.to)) {
                    transitions.push(t.to);
                }
            }
        }
        return transitions;
    }
}
exports.TaskStateMachine = TaskStateMachine;
//# sourceMappingURL=task.state-machine.js.map