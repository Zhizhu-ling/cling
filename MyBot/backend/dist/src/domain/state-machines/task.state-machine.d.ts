import { TaskStatus } from '../enums/task-status.enum';
export interface TaskTransitionContext {
    isAdmin?: boolean;
    blockedReason?: string;
    progress?: number;
}
export interface TaskTransitionResult {
    valid: boolean;
    error?: string;
    sideEffects?: {
        completedAt?: Date;
        progress?: number;
    };
}
export declare class TaskStateMachine {
    canTransition(from: TaskStatus, to: TaskStatus, isAdmin?: boolean): boolean;
    validateTransition(from: TaskStatus, to: TaskStatus, context?: TaskTransitionContext): TaskTransitionResult;
    getValidTransitions(from: TaskStatus, isAdmin?: boolean): TaskStatus[];
}
