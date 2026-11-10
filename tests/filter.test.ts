import { describe, expect, it } from "bun:test";
import { matchesFilter, parseFilterQuery } from "../src/utils/filter";
import { parseLogLine } from "../src/utils/schema";

describe("Schema-Aware Filter Engine", () => {
    const jsonErrLine = JSON.stringify({
        timestamp: "2026-11-09T10:18:45.920Z",
        level: "error",
        service: "payment",
        message: "Payment gateway connection timeout",
        provider: "Midtrans",
        orderId: "ord_44120",
        statusCode: 504,
    });

    const jsonInfoLine = JSON.stringify({
        timestamp: "2026-11-09T10:16:00.104Z",
        level: "info",
        service: "orders",
        message: "Order created successfully",
        orderId: "ord_44120",
        userId: "usr_772",
        amount: 150.0,
    });

    const jsonWarnLine = JSON.stringify({
        timestamp: "2026-11-09T10:15:30.812Z",
        level: "warn",
        service: "rate-limiter",
        message: "Client rate threshold reached 90%",
        clientIp: "192.168.1.100",
        remaining: 5,
    });

    const standardLine = "2026-11-09 10:18:45 [ERROR] [PaymentService] Payment gateway timeout for order #10842 (provider=Midtrans).";

    const parsedJsonErr = parseLogLine(jsonErrLine);
    const parsedJsonInfo = parseLogLine(jsonInfoLine);
    const parsedJsonWarn = parseLogLine(jsonWarnLine);
    const parsedStandard = parseLogLine(standardLine);

    it("parses filter query tokens properly", () => {
        const parsed = parseFilterQuery("level:error payload:Midtrans status:504 timeout");
        expect(parsed.tokens).toHaveLength(4);
        expect(parsed.tokens[0]).toEqual({ field: "level", value: "error" });
        expect(parsed.tokens[1]).toEqual({ field: "payload", value: "Midtrans" });
        expect(parsed.tokens[2]).toEqual({ field: "status", value: "504" });
        expect(parsed.tokens[3]).toEqual({ field: "text", value: "timeout" });
    });

    it("filters by level:info, level:error, level:warn", () => {
        expect(matchesFilter(parsedJsonErr, "level:error", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "level:info", "ALL")).toBe(false);
        expect(matchesFilter(parsedJsonInfo, "level:info", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "lvl:info", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonWarn, "level:warn", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonWarn, "level:warning", "ALL")).toBe(true);
    });

    it("filters by payload field and value", () => {
        // filter payload by string
        expect(matchesFilter(parsedJsonErr, "payload:Midtrans", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "payload:Midtrans", "ALL")).toBe(false);

        // filter by specific payload key:value
        expect(matchesFilter(parsedJsonErr, "provider:Midtrans", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "statusCode:504", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "statusCode:200", "ALL")).toBe(false);

        // filter payload for info log
        expect(matchesFilter(parsedJsonInfo, "payload:usr_772", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "userId:usr_772", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonWarn, "clientIp:192.168.1.100", "ALL")).toBe(true);
    });

    it("filters by module and message", () => {
        expect(matchesFilter(parsedJsonErr, "mod:payment", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "module:payment", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "service:payment", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "mod:orders", "ALL")).toBe(false);

        expect(matchesFilter(parsedJsonErr, "msg:timeout", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "message:timeout", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "msg:created", "ALL")).toBe(true);
    });

    it("combines level and payload filters", () => {
        expect(matchesFilter(parsedJsonErr, "level:error payload:Midtrans", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "level:info payload:ord_44120", "ALL")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "level:error payload:ord_44120", "ALL")).toBe(false);
    });

    it("supports global level filter shortcuts", () => {
        expect(matchesFilter(parsedJsonErr, "", "ERROR")).toBe(true);
        expect(matchesFilter(parsedJsonErr, "", "INFO")).toBe(false);
        expect(matchesFilter(parsedJsonInfo, "", "INFO")).toBe(true);
        expect(matchesFilter(parsedJsonInfo, "", "ERROR")).toBe(false);
        expect(matchesFilter(parsedJsonWarn, "", "WARN")).toBe(true);
        expect(matchesFilter(parsedJsonWarn, "", "INFO")).toBe(false);
    });

    it("handles standard/bracketed formatted logs with payload fallback", () => {
        expect(matchesFilter(parsedStandard, "level:error", "ALL")).toBe(true);
        expect(matchesFilter(parsedStandard, "mod:PaymentService", "ALL")).toBe(true);
        expect(matchesFilter(parsedStandard, "payload:Midtrans", "ALL")).toBe(true);
    });
});
