import { RequirementStatus } from '../enums';
export interface TransitionResult {
    valid: boolean;
    error?: string;
}
export declare class RequirementStateMachine {
    private static readonly ALLOWED_TRANSITIONS;
    private static readonly FORBIDDEN_TRANSITIONS;
    static canTransition(from: RequirementStatus, to: RequirementStatus): boolean;
    static validateTransition(from: RequirementStatus, to: RequirementStatus): TransitionResult;
    static getValidTransitions(from: RequirementStatus): RequirementStatus[];
}
