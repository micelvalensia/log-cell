import { Box, Text } from "ink";
import React from "react";
import { formatPayloadExtra, parseLogLine } from "../utils/schema";

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
            <Text bold color="greenBright">
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

export function MatrixRow({
    line,
    lineNum,
    searchQuery,
}: {
    line: string;
    lineNum: string;
    searchQuery: string;
}) {
    const entry = parseLogLine(line);

    if (entry.format === "raw") {
        return (
            <Text wrap="truncate-end">
                <Text color="gray">{lineNum} │ </Text>
                <HighlightedText text={line} query={searchQuery} />
            </Text>
        );
    }

    const timeStr = entry.timestamp ? entry.timestamp.slice(0, 8).padEnd(8, " ") : "        ";
    const tagStr = entry.module ? entry.module.slice(0, 6).padEnd(6, " ") : "      ";
    const extraStr = formatPayloadExtra(entry.extra);

    return (
        <Text wrap="truncate-end">
            <Text color="gray">{lineNum} │ </Text>
            <Text color="cyan">{timeStr} </Text>
            <Text color="gray">│ </Text>
            <LevelIndicator level={entry.level} />
            <Text color="gray">│ </Text>
            <Text color="cyanBright">{tagStr} </Text>
            <Text color="gray">│ </Text>
            <HighlightedText text={entry.message} query={searchQuery} />
            {extraStr ? (
                <Text color="gray">
                    <HighlightedText text={extraStr} query={searchQuery} />
                </Text>
            ) : null}
        </Text>
    );
}

export function TelemetryRow({
    line,
    lineNum,
    searchQuery,
}: {
    line: string;
    lineNum: string;
    searchQuery: string;
}) {
    let textColor: "magentaBright" | "greenBright" | "cyanBright" | "white" = "white";
    if (/error|fatal|exception|fail|crit/i.test(line)) {
        textColor = "magentaBright";
    } else if (/warn|warning/i.test(line)) {
        textColor = "greenBright";
    } else if (/info/i.test(line)) {
        textColor = "cyanBright";
    }

    return (
        <Text wrap="truncate-end">
            <Text color="gray">{lineNum} │ </Text>
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
        const payloadLength = Math.max(4, previewWidth - 36);
        return (
            <Box flexDirection="column" width={previewWidth} marginBottom={0}>
                <Text wrap="truncate-end">
                    <Text color="gray">  LN │ </Text>
                    <Text color="cyan">TIME     </Text>
                    <Text color="gray">│ </Text>
                    <Text color="cyan">LVL    </Text>
                    <Text color="gray">│ </Text>
                    <Text color="cyan">MOD    </Text>
                    <Text color="gray">│ </Text>
                    <Text color="white">EVENT / PAYLOAD</Text>
                </Text>
                <Text color="gray" wrap="truncate-end">
                    {"─────┼──────────┼────────┼────────┼" + "─".repeat(payloadLength)}
                </Text>
            </Box>
        );
    }

    const payloadLength = Math.max(4, previewWidth - 7);
    return (
        <Box flexDirection="column" width={previewWidth} marginBottom={0}>
            <Text wrap="truncate-end">
                <Text color="gray">  LN │ </Text>
                <Text color="white">RAW TELEMETRY DATA STREAM</Text>
            </Text>
            <Text color="gray" wrap="truncate-end">
                {"─────┼" + "─".repeat(payloadLength)}
            </Text>
        </Box>
    );
}
