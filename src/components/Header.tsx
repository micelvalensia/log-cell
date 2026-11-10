import { Box, Text } from "ink";
import React from "react";
import type { LogLevelFilter, ViewMode } from "../types";

export const COMPACT_TERMINAL_WIDTH = 95;

interface HeaderProps {
    targetDir: string;
    activeFileName?: string;
    totalFiles: number;
    viewMode: ViewMode;
    filterText?: string;
    levelFilter?: LogLevelFilter;
    isTruncated?: boolean;
    systemTick?: number;
    terminalWidth?: number;
    schemaFormat?: string;
}

function HudIdentity({ systemTick }: { systemTick: number }) {
    const pulseGlyph = systemTick % 2 === 0 ? "●" : "○";
    const hexTick = (0x8f20 + (systemTick % 256)).toString(16).toUpperCase();

    return (
        <Box gap={1}>
            <Text bold color="greenBright">
                ◖NET.RUNNER//CELL_OS◗
            </Text>
            <Text color="gray">v2.4</Text>
            <Text color="gray">┆</Text>
            <Text color="cyanBright">0x{hexTick}</Text>
            <Text color="gray">┆</Text>
            <Text bold color="greenBright">
                {pulseGlyph} ONLINE
            </Text>
        </Box>
    );
}

function getLevelBadgeColor(filter?: LogLevelFilter): "magentaBright" | "yellowBright" | "cyanBright" | "gray" {
    if (filter === "ERROR") return "magentaBright";
    if (filter === "WARN") return "yellowBright";
    if (filter === "INFO") return "cyanBright";
    return "gray";
}

function LevelBadge({ levelFilter }: { levelFilter?: LogLevelFilter }) {
    if (!levelFilter || levelFilter === "ALL") return null;
    const levelColor = getLevelBadgeColor(levelFilter);
    return (
        <Text bold color={levelColor}>
            [LVL: {levelFilter}]
        </Text>
    );
}

function StatusBadges({
    viewMode,
    isCompact,
    isTruncated,
    filterText,
    levelFilter,
    schemaFormat,
}: {
    viewMode: ViewMode;
    isCompact: boolean;
    isTruncated?: boolean;
    filterText?: string;
    levelFilter?: LogLevelFilter;
    schemaFormat?: string;
}) {
    const isSchema = viewMode === "schema";
    const trapLabel = filterText
        ? filterText.length > 8
            ? `${filterText.slice(0, 7)}…`
            : filterText
        : "";

    const matrixLabel = schemaFormat === "JSON" ? "◈ NDJSON" : "◈ MATRIX";

    return (
        <Box gap={1}>
            {!isCompact && (
                <>
                    <Text color="gray">GEO: 35.68°N</Text>
                    <Text color="gray">┆</Text>
                </>
            )}
            {isTruncated && (
                <Text bold color="magentaBright">
                    [TAIL]
                </Text>
            )}
            <LevelBadge levelFilter={levelFilter} />
            {trapLabel && (
                <Text bold color="magentaBright">
                    [TRAP: "{trapLabel}"]
                </Text>
            )}
            <Text bold color={isSchema ? "cyanBright" : "greenBright"}>
                {isSchema ? matrixLabel : "⚡ RAW"}
            </Text>
        </Box>
    );
}

function SubTelemetryRibbon({ activeFileName }: { activeFileName?: string }) {
    return (
        <Box justifyContent="space-between" width="100%">
            <Box gap={1}>
                <Text color="gray">› CHANNEL:</Text>
                <Text bold color="white">
                    {activeFileName || "NO_CHANNEL_LOCKED"}
                </Text>
            </Box>
            <Box gap={1}>
                <Text color="gray">BUS: 64-BIT</Text>
                <Text color="gray">┆</Text>
                <Text color="cyanBright">STREAM::ACTIVE</Text>
            </Box>
        </Box>
    );
}

export default function Header({
    targetDir,
    activeFileName,
    totalFiles,
    viewMode,
    filterText,
    levelFilter,
    isTruncated,
    systemTick = 0,
    terminalWidth = 80,
    schemaFormat = "STANDARD",
}: HeaderProps) {
    const isCompact = terminalWidth < COMPACT_TERMINAL_WIDTH;
    const availableWidth = Math.max(30, terminalWidth - 2);

    const prefix = `╺━━ [NODE: ${targetDir}] ━━ [VOLUMES: ${totalFiles}] `;
    const suffix = " · · · ╸";
    const repeatCount = Math.max(2, availableWidth - prefix.length - suffix.length);

    return (
        <Box flexDirection="column" width="100%" marginBottom={1}>
            <Box justifyContent="space-between" width="100%">
                <HudIdentity systemTick={systemTick} />
                <StatusBadges
                    viewMode={viewMode}
                    isCompact={isCompact}
                    isTruncated={isTruncated}
                    filterText={filterText}
                    levelFilter={levelFilter}
                    schemaFormat={schemaFormat}
                />
            </Box>

            <Box width="100%">
                <Text color="greenBright">╺━━</Text>
                <Text color="gray"> [NODE: </Text>
                <Text bold color="white">{targetDir}</Text>
                <Text color="gray">] ━━ </Text>
                <Text color="cyanBright">[VOLUMES: {totalFiles}] </Text>
                <Text color="gray">
                    {"━".repeat(repeatCount)}
                </Text>
                <Text color="gray"> · · · </Text>
                <Text color="greenBright">╸</Text>
            </Box>

            <SubTelemetryRibbon activeFileName={activeFileName} />
        </Box>
    );
}
