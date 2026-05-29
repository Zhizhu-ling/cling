"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertSeverity = exports.AlertType = void 0;
var AlertType;
(function (AlertType) {
    AlertType["DELAY"] = "delay";
    AlertType["BLOCKED"] = "blocked";
    AlertType["NO_UPDATE"] = "no_update";
    AlertType["OVERLOAD"] = "overload";
    AlertType["MISSING_DEPENDENCY"] = "missing_dependency";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
//# sourceMappingURL=alert-type.enum.js.map