import { Box, Text } from "ink";
import React from "react";
import type { LogFileInfo, LogLevelFilter } from "../types";

interface DiagnosticsHUDProps {
    activeFile?: LogFileInfo;
    lineCount: number;
    totalRecords?: number;
    isTruncated?: boolean;
    filterQuery?: string;
    levelFilter?: LogLevelFilter;
    systemTick?: number;
    schemaFormat?: string;
}

function GaugeBar({ ratio }: { ratio: number }) {
    const totalBars = 6;
    const filledBars = Math.min(totalBars, Math.max(1, Math.round(ratio * totalBars)));
    const emptyBars = totalBars - filledBars;
    const filledStr = "▮".repeat(filledBars);
    const emptyStr = "▯".repeat(emptyBars);

    return (
        <Box>
            <Text color="greenBright">{filledStr}</Text>
            <Text color="gray">{emptyStr} </Text>
            <Text color="cyanBright">{Math.round(ratio * 100)}%</Text>
        </Box>
    );
}

function HUDHeader({ pulseTick }: { pulseTick: string }) {
    return (
        <Box flexDirection="column" width="100%">
            <Box justifyContent="space-between" width="100%">
                <Text bold color="cyanBright">› TELEMETRY_HUD</Text>
                <Text color="gray">0x{pulseTick}</Text>
            </Box>
            <Box width="100%">
                <Text color="gray">┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄</Text>
            </Box>
        </Box>
    );
}

function getTrapColor(filter?: LogLevelFilter): "magentaBright" | "yellowBright" | "cyanBright" {
    if (filter === "ERROR") return "magentaBright";
    if (filter === "WARN") return "yellowBright";
    return "cyanBright";
}

function LevelTrapRow({ levelFilter }: { levelFilter?: LogLevelFilter }) {
    if (!levelFilter || levelFilter === "ALL") return null;

    return (
        <Box justifyContent="space-between" width="100%">
            <Text color="cyanBright">  LVL_TRAP</Text>
            <Text bold color={getTrapColor(levelFilter)}>
                [{levelFilter}]
            </Text>
        </Box>
    );
}

function HUDMetrics({
    statusColor,
    isOnline,
    memoryPercent,
    lineCount,
    totalRecords,
    isTruncated,
    streamMode,
    filterQuery,
    levelFilter,
    schemaFormat,
}: {
    statusColor: "greenBright" | "gray";
    isOnline: boolean;
    memoryPercent: number;
    lineCount: number;
    totalRecords?: number;
    isTruncated?: boolean;
    streamMode: string;
    filterQuery?: string;
    levelFilter?: LogLevelFilter;
    schemaFormat?: string;
}) {
    const isolateLabel = filterQuery
        ? filterQuery.length > 7
            ? `"${filterQuery.slice(0, 6)}…"`
            : `"${filterQuery}"`
        : "";

    const schemaLabel = schemaFormat === "JSON" ? "JSON_OBJECT" : schemaFormat === "LOGFMT" ? "LOGFMT_MAP" : "REGEX_MAP";
    const recordLabel = totalRecords && totalRecords !== lineCount
        ? `${lineCount}/${totalRecords}`
        : `${lineCount} LINES`;

    return (
        <Box flexDirection="column">
            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  LINK_STATE</Text>
                <Text bold color={statusColor}>{isOnline ? "● ONLINE" : "○ IDLE"}</Text>
            </Box>

            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  BUFFER_LOAD</Text>
                <GaugeBar ratio={memoryPercent || 0.15} />
            </Box>

            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  RECORDS</Text>
                <Text bold color="white">{recordLabel}</Text>
            </Box>

            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  FEED_MODE</Text>
                <Text bold color={isTruncated ? "magentaBright" : "cyanBright"}>{streamMode}</Text>
            </Box>

            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  SCHEMA_MAP</Text>
                <Text bold color={schemaFormat === "JSON" ? "greenBright" : "cyanBright"}>{schemaLabel}</Text>
            </Box>

            <LevelTrapRow levelFilter={levelFilter} />

            {isolateLabel && (
                <Box justifyContent="space-between" width="100%">
                    <Text color="magentaBright">  ISOLATE</Text>
                    <Text bold color="magentaBright">{isolateLabel}</Text>
                </Box>
            )}
        </Box>
    );
}

export default function DiagnosticsHUD({
    activeFile,
    lineCount,
    totalRecords,
    isTruncated,
    filterQuery,
    levelFilter,
    systemTick = 0,
    schemaFormat = "STANDARD",
}: DiagnosticsHUDProps) {
    const memoryPercent = activeFile ? Math.min(1, activeFile.size / (1024 * 1024)) : 0.08;
    const streamMode = isTruncated ? "TAIL_BURST" : "FULL_STREAM";
    const statusColor = activeFile ? "greenBright" : "gray";
    const pulseTick = (0x04a0 + (systemTick % 64)).toString(16).toUpperCase();

    return (
        <Box flexDirection="column" width="100%" marginTop={1}>
            <HUDHeader pulseTick={pulseTick} />

            <HUDMetrics
                statusColor={statusColor}
                isOnline={Boolean(activeFile)}
                memoryPercent={memoryPercent}
                lineCount={lineCount}
                totalRecords={totalRecords}
                isTruncated={isTruncated}
                streamMode={streamMode}
                filterQuery={filterQuery}
                levelFilter={levelFilter}
                schemaFormat={schemaFormat}
            />

            <Box width="100%">
                <Text color="gray">└ · · · ──────────────────╸</Text>
            </Box>
        </Box>
    );
}
