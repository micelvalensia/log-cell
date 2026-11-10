import type { ParsedLogEntry } from "../types";

const TIMESTAMP_KEYS = new Set([
    "timestamp",
    "time",
    "ts",
    "@timestamp",
    "datetime",
    "date",
]);

const LEVEL_KEYS = new Set([
    "level",
    "severity",
    "lvl",
    "log_level",
    "status",
    "type",
]);

const MODULE_KEYS = new Set([
    "module",
    "service",
    "logger",
    "tag",
    "component",
    "caller",
    "name",
    "pkg",
    "app",
]);

const MESSAGE_KEYS = new Set([
    "message",
    "msg",
    "event",
    "text",
    "error",
    "log",
    "detail",
]);

export function formatTime(raw?: string | number): string {
    if (raw === undefined || raw === null || raw === "") {
        return "        ";
    }

    if (typeof raw === "number" || /^\d{10,13}$/.test(String(raw))) {
        const num = typeof raw === "number" ? raw : Number(raw);
        const ms = num < 1e11 ? num * 1000 : num;
        const d = new Date(ms);
        return !isNaN(d.getTime()) ? d.toTimeString().slice(0, 8) : "        ";
    }

    const str = String(raw).trim();
    if (str.includes("T")) {
        const afterT = str.split("T")[1];
        return (afterT ? afterT.slice(0, 8) : str.slice(0, 8)).padEnd(8, " ");
    }

    if (str.includes(" ")) {
        const parts = str.split(" ");
        const selected = parts[1] || parts[0] || "";
        return selected.slice(0, 8).padEnd(8, " ");
    }

    return str.slice(0, 8).padEnd(8, " ");
}

export function mapLogLevel(raw?: string | number): string {
    if (raw === undefined || raw === null) return "INFO";

    if (typeof raw === "number") {
        if (raw >= 60) return "FATAL";
        if (raw >= 50) return "ERROR";
        if (raw >= 40) return "WARN";
        if (raw >= 30) return "INFO";
        if (raw >= 20) return "DEBUG";
        return "TRACE";
    }

    const str = String(raw).toUpperCase().trim();
    if (str.includes("ERR") || str.includes("FATAL") || str.includes("CRIT")) return "ERROR";
    if (str.includes("WARN")) return "WARN";
    if (str.includes("DBG") || str.includes("DEBUG") || str.includes("TRACE")) return "DEBUG";
    return "INFO";
}

export function formatPayloadExtra(extra?: Record<string, any>): string {
    if (!extra || Object.keys(extra).length === 0) return "";

    const entries = Object.entries(extra);
    const formatted = entries
        .map(([k, v]) => {
            if (typeof v === "object" && v !== null) {
                return `${k}=${JSON.stringify(v)}`;
            }
            return `${k}=${String(v)}`;
        })
        .join(" ");

    return formatted ? ` ${formatted}` : "";
}

function parseJsonLog(line: string): ParsedLogEntry | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        return null;
    }

    try {
        const obj = JSON.parse(trimmed);
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
            return null;
        }

        let timestamp: string | number | undefined;
        let level: string | number | undefined;
        let module: string | undefined;
        let message: string | undefined;
        const extra: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            if (!timestamp && TIMESTAMP_KEYS.has(lowerKey)) {
                timestamp = value as string | number;
            } else if (!level && LEVEL_KEYS.has(lowerKey)) {
                level = value as string | number;
            } else if (!module && MODULE_KEYS.has(lowerKey)) {
                module = String(value);
            } else if (!message && MESSAGE_KEYS.has(lowerKey)) {
                message = typeof value === "object" ? JSON.stringify(value) : String(value);
            } else {
                extra[key] = value;
            }
        }

        return {
            raw: line,
            timestamp: formatTime(timestamp),
            level: mapLogLevel(level),
            module: module ? String(module) : "",
            message: message || (Object.keys(extra).length > 0 ? "" : line),
            extra,
            format: "json",
        };
    } catch {
        return null;
    }
}

function parseLogfmt(line: string): ParsedLogEntry | null {
    if (!line.includes("=")) return null;

    const regex = /(?:([a-zA-Z0-9_\-@]+)=(?:"([^"]*)"|([^\s]+)))/g;
    const obj: Record<string, string> = {};
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = regex.exec(line)) !== null) {
        count++;
        const key = match[1];
        if (key) {
            obj[key] = match[2] !== undefined ? match[2] : match[3] || "";
        }
    }

    if (count < 2) return null;

    let timestamp: string | undefined;
    let level: string | undefined;
    let module: string | undefined;
    let message: string | undefined;
    const extra: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (!timestamp && TIMESTAMP_KEYS.has(lowerKey)) {
            timestamp = value;
        } else if (!level && LEVEL_KEYS.has(lowerKey)) {
            level = value;
        } else if (!module && MODULE_KEYS.has(lowerKey)) {
            module = value;
        } else if (!message && MESSAGE_KEYS.has(lowerKey)) {
            message = value;
        } else {
            extra[key] = value;
        }
    }

    return {
        raw: line,
        timestamp: formatTime(timestamp),
        level: mapLogLevel(level),
        module: module ? String(module) : "",
        message: message || line,
        extra,
        format: "logfmt",
    };
}

function parseStandardLog(line: string): ParsedLogEntry | null {
    // 1. Spring Boot / Logback: 2026-11-09 10:14:02.123 [main] INFO com.example.Server - Started in 1.4s
    const springMatch = line.match(
        /^(\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\[([^\]]+)\]\s+([A-Z]+)\s+([^\s]+)\s+-\s+(.*)$/i
    );
    if (springMatch) {
        const mod = springMatch[4] || springMatch[2] || "";
        return {
            raw: line,
            timestamp: formatTime(springMatch[1]),
            level: mapLogLevel(springMatch[3]),
            module: mod,
            message: springMatch[5] || "",
            format: "standard",
        };
    }

    // 2. Bracketed: 2026-11-09 10:14:01 [INFO] [System] Application server starting
    const bracketMatch = line.match(
        /^(\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?\s*\[?(\b(?:INFO|WARN|WARNING|ERROR|FATAL|DEBUG|TRACE|CRIT)\b)\]?\s*(?:\[([^\]]+)\])?\s*(.*)$/i
    );
    if (bracketMatch) {
        return {
            raw: line,
            timestamp: formatTime(bracketMatch[1]),
            level: mapLogLevel(bracketMatch[2]),
            module: bracketMatch[3] ? bracketMatch[3] : "",
            message: bracketMatch[4] || "",
            format: "standard",
        };
    }

    return null;
}

export function parseLogLine(raw: string): ParsedLogEntry {
    const jsonParsed = parseJsonLog(raw);
    if (jsonParsed) return jsonParsed;

    const logfmtParsed = parseLogfmt(raw);
    if (logfmtParsed) return logfmtParsed;

    const standardParsed = parseStandardLog(raw);
    if (standardParsed) return standardParsed;

    let fallbackLevel = "INFO";
    if (/\b(?:ERROR|FATAL|CRIT|EXCEPTION|FAIL)\b/i.test(raw)) {
        fallbackLevel = "ERROR";
    } else if (/\b(?:WARN|WARNING)\b/i.test(raw)) {
        fallbackLevel = "WARN";
    } else if (/\b(?:DEBUG|TRACE)\b/i.test(raw)) {
        fallbackLevel = "DEBUG";
    }

    return {
        raw,
        level: fallbackLevel,
        message: raw,
        format: "raw",
    };
}
