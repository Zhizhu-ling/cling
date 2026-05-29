export declare const EventTypes: {
    readonly TASK_CREATED: "task.created";
    readonly TASK_UPDATED: "task.updated";
    readonly TASK_ASSIGNED: "task.assigned";
    readonly TASK_STATUS_CHANGED: "task.status_changed";
    readonly TASK_BLOCKED: "task.blocked";
    readonly TASK_DONE: "task.done";
    readonly REQUIREMENT_CREATED: "requirement.created";
    readonly REQUIREMENT_SPLIT_DONE: "requirement.split_done";
    readonly AI_JOB_CREATED: "ai_job.created";
    readonly AI_JOB_RUNNING: "ai_job.running";
    readonly AI_JOB_SUCCESS: "ai_job.success";
    readonly AI_JOB_FAIL: "ai_job.fail";
    readonly REPORT_GENERATED: "report.generated";
    readonly ALERT_CREATED: "alert.created";
    readonly ALERT_RESOLVED: "alert.resolved";
    readonly NOTIFICATION_CREATED: "notification.created";
};
export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
