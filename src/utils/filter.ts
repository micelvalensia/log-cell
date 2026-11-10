import type { LogLevelFilter, ParsedLogEntry } from "../types";

export interface FilterToken {
    field: string;
    value: string;
}

export interface ParsedFilterQuery {
    tokens: FilterToken[];
}

function normalizeLevelString(level: string): "ERROR" | "WARN" | "INFO" | "DEBUG" | "OTHER" {
    const upper = level.toUpperCase();
    if (upper.includes("ERR") || upper.includes("FATAL") || upper.includes("CRIT")) return "ERROR";
    if (upper.includes("WARN")) return "WARN";
    if (upper.includes("INFO")) return "INFO";
    if (upper.includes("DEBUG") || upper.includes("TRACE") || upper.includes("DBG")) return "DEBUG";
    return "OTHER";
}

function matchesLevel(entryLevel: string, queryLevel: string): boolean {
    const normEntry = normalizeLevelString(entryLevel);
    const normQuery = normalizeLevelString(queryLevel);
    if (normQuery !== "OTHER") {
        return normEntry === normQuery;
    }
    return entryLevel.toLowerCase().includes(queryLevel.toLowerCase());
}

export function parseFilterQuery(query: string): ParsedFilterQuery {
    const trimmed = query.trim();
    if (!trimmed) return { tokens: [] };

    // Matches field:value, field:"quoted", or "quoted text", or single words
    const regex = /(?:([a-zA-Z0-9_\-]+)[:=](?:"([^"]*)"|'([^']*)'|([^\s]+)))|(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
    const tokens: FilterToken[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(trimmed)) !== null) {
        if (match[1]) {
            // Key-value pair
            const rawField = match[1];
            const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
            const lowerField = rawField.toLowerCase();

            if (lowerField === "level" || lowerField === "lvl") {
                tokens.push({ field: "level", value: rawValue });
            } else if (lowerField === "payload" || lowerField === "extra" || lowerField === "data") {
                tokens.push({ field: "payload", value: rawValue });
            } else if (lowerField === "mod" || lowerField === "module" || lowerField === "service" || lowerField === "svc") {
                tokens.push({ field: "module", value: rawValue });
            } else if (lowerField === "msg" || lowerField === "message") {
                tokens.push({ field: "message", value: rawValue });
            } else {
                // Custom attribute like status:504 or orderId:ord_123
                tokens.push({ field: rawField, value: rawValue });
            }
        } else {
            // Free text token
            const freeText = match[5] ?? match[6] ?? match[7] ?? "";
            if (freeText) {
                tokens.push({ field: "text", value: freeText });
            }
        }
    }

    return { tokens };
}

function matchesKeyValuePair(extra: Record<string, any> | undefined, key: string, val: string): boolean {
    if (!extra) return false;
    const lowerKey = key.toLowerCase();
    const lowerVal = val.toLowerCase();

    for (const [k, v] of Object.entries(extra)) {
        if (k.toLowerCase() !== lowerKey) continue;
        const strVal = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (strVal.toLowerCase().includes(lowerVal)) return true;
    }
    return false;
}

function matchesAnyPayloadField(extra: Record<string, any>, target: string): boolean {
    const lowerTarget = target.toLowerCase();
    for (const [k, v] of Object.entries(extra)) {
        if (k.toLowerCase().includes(lowerTarget)) return true;
        const strVal = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (strVal.toLowerCase().includes(lowerTarget)) return true;
    }
    return false;
}

function matchesPayload(extra: Record<string, any> | undefined, raw: string, target: string): boolean {
    const colonIdx = target.indexOf(":");
    const equalsIdx = target.indexOf("=");
    const sepIdx = colonIdx !== -1 ? colonIdx : equalsIdx;

    if (sepIdx !== -1) {
        const subKey = target.slice(0, sepIdx).trim();
        const subVal = target.slice(sepIdx + 1).trim();
        return matchesKeyValuePair(extra, subKey, subVal);
    }

    if (extra && Object.keys(extra).length > 0) {
        return matchesAnyPayloadField(extra, target);
    }

    return raw.toLowerCase().includes(target.toLowerCase());
}

function matchesCustomAttribute(extra: Record<string, any> | undefined, raw: string, field: string, value: string): boolean {
    if (matchesKeyValuePair(extra, field, value)) {
        return true;
    }

    const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`["']?${escapedField}["']?\\s*[:=]\\s*["']?([^"',\\s}]+)`, "i");
    const m = raw.match(pattern);
    if (!m || !m[1]) return false;

    return m[1].toLowerCase().includes(value.toLowerCase());
}

function matchesFreeText(entry: ParsedLogEntry, text: string): boolean {
    const lower = text.toLowerCase();
    if (entry.message && entry.message.toLowerCase().includes(lower)) return true;
    if (entry.module && entry.module.toLowerCase().includes(lower)) return true;
    if (entry.level && entry.level.toLowerCase().includes(lower)) return true;
    if (entry.raw.toLowerCase().includes(lower)) return true;
    if (!entry.extra) return false;
    return matchesAnyPayloadField(entry.extra, text);
}

export function matchesFilter(
    entry: ParsedLogEntry,
    query: string,
    levelFilter: LogLevelFilter = "ALL"
): boolean {
    // 1. Check Global Level Filter
    if (levelFilter !== "ALL") {
        const normEntry = normalizeLevelString(entry.level);
        if (levelFilter === "ERROR" && normEntry !== "ERROR") return false;
        if (levelFilter === "WARN" && normEntry !== "WARN") return false;
        if (levelFilter === "INFO" && normEntry !== "INFO") return false;
        if (levelFilter === "DEBUG" && normEntry !== "DEBUG") return false;
    }

    // 2. Check Query Tokens
    const { tokens } = parseFilterQuery(query);
    if (tokens.length === 0) return true;

    for (const token of tokens) {
        const { field, value } = token;
        const lowerVal = value.toLowerCase();

        switch (field) {
            case "level": {
                if (!matchesLevel(entry.level, value)) return false;
                break;
            }
            case "payload": {
                if (!matchesPayload(entry.extra, entry.raw, value)) return false;
                break;
            }
            case "module": {
                if (!entry.module || !entry.module.toLowerCase().includes(lowerVal)) return false;
                break;
            }
            case "message": {
                if (!entry.message || !entry.message.toLowerCase().includes(lowerVal)) return false;
                break;
            }
            case "text": {
                if (!matchesFreeText(entry, value)) return false;
                break;
            }
            default: {
                if (!matchesCustomAttribute(entry.extra, entry.raw, field, value)) return false;
                break;
            }
        }
    }

    return true;
}
