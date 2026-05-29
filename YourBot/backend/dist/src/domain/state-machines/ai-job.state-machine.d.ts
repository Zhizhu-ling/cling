import { AiJobStatus } from '../enums';
export declare class AiJobStateMachine {
    static canTransition(from: AiJobStatus, to: AiJobStatus): boolean;
    static validateTransition(from: AiJobStatus, to: AiJobStatus): {
        valid: boolean;
        error?: string;
    };
    static getValidTransitions(from: AiJobStatus): readonly AiJobStatus[];
}
