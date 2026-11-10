import { Box, Text } from "ink";
import React from "react";
import type { ParsedLogEntry } from "../types";
import { formatPayloadExtra } from "../utils/schema";

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedText({ text, query }: { text: string; query: string }) {
    if (!query) return <Text color="white">{text}</Text>;

    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
    return (
        <Text>
            {parts.map((part, i) => {
                const isMatch = part.toLowerCase() === query.toLowerCase();
                if (isMatch) {
                    return (
                        <Text key={i} backgroundColor="greenBright" color="black" bold>
                            {part}
                        </Text>
                    );
                }
                return (
                    <Text key={i} color="white">
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
}

export function LevelIndicator({ level }: { level: string }) {
    const upper = level.toUpperCase();
    if (upper.includes("ERR") || upper.includes("FATAL") || upper.includes("CRIT")) {
        return (
            <Text bold color="magentaBright">
                {"✖ ERR  "}
            </Text>
        );
    }
    if (upper.includes("WARN")) {
        return (
            <Text bold color="yellowBright">
                {"▲ WARN "}
            </Text>
        );
    }
    if (upper.includes("DEBUG") || upper.includes("TRACE")) {
        return (
            <Text color="gray">
                {"░ DBG  "}
            </Text>
        );
    }
    return (
        <Text bold color="cyanBright">
            {"● INFO "}
        </Text>
    );
}

function ExpandedPayloadItem({
    keyName,
    value,
    isLast,
    searchQuery,
}: {
    keyName: string;
    value: any;
    isLast: boolean;
    searchQuery: string;
}) {
    const branch = isLast ? "└─" : "├─";
    const strVal = typeof value === "object" ? JSON.stringify(value) : String(value);

    return (
        <Text key={keyName} wrap="wrap">
            <Text color="gray">    │  {branch} </Text>
            <Text bold color="cyan">{keyName}: </Text>
            <HighlightedText text={strVal} query={searchQuery} />
        </Text>
    );
}

function ExpandedPayloadTree({
    extra,
    searchQuery,
}: {
    extra?: Record<string, any>;
    searchQuery: string;
}) {
    if (!extra) return null;
    const entries = Object.entries(extra);
    if (entries.length === 0) return null;

    return (
        <Box flexDirection="column" paddingLeft={3}>
            {entries.map(([k, v], idx) => (
                <ExpandedPayloadItem
                    key={k}
                    keyName={k}
                    value={v}
                    isLast={idx === entries.length - 1}
                    searchQuery={searchQuery}
                />
            ))}
        </Box>
    );
}

export function MatrixRow({
    entry,
    lineNum,
    searchQuery,
    isSelected = false,
    isFocused = false,
    isExpanded = false,
}: {
    entry: ParsedLogEntry;
    lineNum: string;
    searchQuery: string;
    isSelected?: boolean;
    isFocused?: boolean;
    isExpanded?: boolean;
}) {
    const cursorPrefix = isSelected && isFocused ? "▶" : isSelected ? "▷" : " ";
    const cursorColor = isFocused ? "greenBright" : "cyan";

    if (entry.format === "raw") {
        return (
            <Box flexDirection="column">
                <Text wrap={isExpanded ? "wrap" : "truncate-end"}>
                    <Text bold color={cursorColor}>{cursorPrefix}</Text>
                    <Text color={isSelected ? "white" : "gray"}>{lineNum} │ </Text>
                    <HighlightedText text={entry.raw} query={searchQuery} />
                </Text>
            </Box>
        );
    }

    const timeStr = entry.timestamp ? entry.timestamp.slice(0, 8).padEnd(8, " ") : "        ";
    const tagStr = entry.module ? entry.module.slice(0, 6).padEnd(6, " ") : "      ";
    const extraStr = formatPayloadExtra(entry.extra);

    // Collapsed single-line view
    if (!isExpanded) {
        return (
            <Text wrap="truncate-end">
                <Text bold color={cursorColor}>{cursorPrefix}</Text>
                <Text color={isSelected ? "white" : "gray"}>{lineNum} │ </Text>
                <Text color="cyan">{timeStr} </Text>
                <Text color="gray">│ </Text>
                <LevelIndicator level={entry.level} />
                <Text color="gray">│ </Text>
                <Text color="cyanBright">{tagStr} </Text>
                <Text color="gray">│ </Text>
                <HighlightedText text={entry.message} query={searchQuery} />
                {extraStr ? (
                    <HighlightedText text={extraStr} query={searchQuery} />
                ) : null}
            </Text>
        );
    }

    return (
        <Box flexDirection="column" marginBottom={0}>
            {/* Header / Primary Line */}
            <Text wrap="wrap">
                <Text bold color={cursorColor}>{cursorPrefix}</Text>
                <Text bold color={isSelected ? "white" : "gray"}>{lineNum} │ </Text>
                <Text color="cyan">{timeStr} </Text>
                <Text color="gray">│ </Text>
                <LevelIndicator level={entry.level} />
                <Text color="gray">│ </Text>
                <Text color="cyanBright">{tagStr} </Text>
                <Text color="gray">│ </Text>
                <HighlightedText text={entry.message} query={searchQuery} />
            </Text>

            {/* Expanded Payload Tree */}
            <ExpandedPayloadTree extra={entry.extra} searchQuery={searchQuery} />
        </Box>
    );
}

export function TelemetryRow({
    entry,
    lineNum,
    searchQuery,
    isSelected = false,
    isFocused = false,
    isExpanded = false,
}: {
    entry: ParsedLogEntry;
    lineNum: string;
    searchQuery: string;
    isSelected?: boolean;
    isFocused?: boolean;
    isExpanded?: boolean;
}) {
    let textColor: "magentaBright" | "yellowBright" | "cyanBright" | "white" = "white";
    const line = entry.raw;
    if (/error|fatal|exception|fail|crit/i.test(line)) {
        textColor = "magentaBright";
    } else if (/warn|warning/i.test(line)) {
        textColor = "yellowBright";
    } else if (/info/i.test(line)) {
        textColor = "cyanBright";
    }

    const cursorPrefix = isSelected && isFocused ? "▶" : isSelected ? "▷" : " ";
    const cursorColor = isFocused ? "greenBright" : "cyan";

    return (
        <Text wrap={isExpanded ? "wrap" : "truncate-end"}>
            <Text bold color={cursorColor}>{cursorPrefix}</Text>
            <Text color={isSelected ? "white" : "gray"}>{lineNum} │ </Text>
            {searchQuery ? (
                <HighlightedText text={line} query={searchQuery} />
            ) : (
                <Text color={textColor}>
                    {line}
                </Text>
            )}
        </Text>
    );
}

export function ColumnHeader({ isSchema, previewWidth }: { isSchema: boolean; previewWidth: number }) {
    if (isSchema) {
        const payloadLength = Math.max(4, previewWidth - 37);
        return (
            <Box flexDirection="column" width={previewWidth} marginBottom={0}>
                <Text wrap="truncate-end">
                    <Text color="gray">   LN │ </Text>
                    <Text color="cyan">TIME     </Text>
                    <Text color="gray">│ </Text>
                    <Text color="cyan">LVL    </Text>
                    <Text color="gray">│ </Text>
                    <Text color="cyan">MOD    </Text>
                    <Text color="gray">│ </Text>
                    <Text color="white">EVENT / PAYLOAD</Text>
                </Text>
                <Text color="gray" wrap="truncate-end">
                    {"──────┼──────────┼────────┼────────┼" + "─".repeat(payloadLength)}
                </Text>
            </Box>
        );
    }

    const payloadLength = Math.max(4, previewWidth - 8);
    return (
        <Box flexDirection="column" width={previewWidth} marginBottom={0}>
            <Text wrap="truncate-end">
                <Text color="gray">   LN │ </Text>
                <Text color="white">RAW TELEMETRY DATA STREAM</Text>
            </Text>
            <Text color="gray" wrap="truncate-end">
                {"──────┼" + "─".repeat(payloadLength)}
            </Text>
        </Box>
    );
}
