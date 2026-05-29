export declare const JobTypes: {
    readonly AI_REQUIREMENT_SPLIT: "ai:requirement_split";
    readonly AI_ASSIGNMENT_SUGGEST: "ai:assignment_suggest";
    readonly AI_REPORT_GENERATE: "ai:report_generate";
    readonly ALERT_DETECTION: "alert:detection";
    readonly OUTBOX_DISPATCH: "outbox:dispatch";
};
export type JobType = (typeof JobTypes)[keyof typeof JobTypes];
