import { Box, Text } from "ink";
import React from "react";
import type { LogFileInfo, ViewMode } from "../types";
import { ColumnHeader, MatrixRow, TelemetryRow } from "./StreamRows";

function StreamHeader({
    isFocused,
    truncatedFileName,
    isTruncated,
    scrollOffset,
    endLine,
    totalLines,
    scrollPercent,
    previewWidth,
}: {
    isFocused: boolean;
    truncatedFileName: string;
    isTruncated?: boolean;
    scrollOffset: number;
    endLine: number;
    totalLines: number;
    scrollPercent: number;
    previewWidth: number;
}) {
    const lineRange = totalLines > 0 ? `${scrollOffset + 1}-${endLine}/${totalLines}` : "0/0";

    return (
        <Box justifyContent="space-between" width={previewWidth}>
            <Text wrap="truncate-end">
                <Text bold color={isFocused ? "greenBright" : "cyan"}>
                    › STREAM{" "}
                </Text>
                <Text color="gray">╸╸ </Text>
                <Text bold color="white">
                    [{truncatedFileName}]
                </Text>
            </Text>
            <Text wrap="truncate-end">
                {isTruncated && (
                    <Text bold color="magentaBright">
                        [TAIL]{" "}
                    </Text>
                )}
                <Text color="gray">[{lineRange}]{" "}</Text>
                <Text bold color={isFocused ? "greenBright" : "cyan"}>
                    {scrollPercent}%
                </Text>
            </Text>
        </Box>
    );
}

function StreamContent({
    hasFile,
    lines,
    visibleLines,
    scrollOffset,
    isSchema,
    searchQuery,
    previewWidth,
}: {
    hasFile: boolean;
    lines: string[];
    visibleLines: string[];
    scrollOffset: number;
    isSchema: boolean;
    searchQuery: string;
    previewWidth: number;
}) {
    if (!hasFile) {
        return (
            <Box marginTop={2}>
                <Text color="gray">›› [STANDBY] NO CHANNEL ATTACHED. SELECT VOLUME.</Text>
            </Box>
        );
    }

    if (lines.length === 0) {
        return (
            <Box marginTop={2}>
                <Text color="gray">›› [BUFFER_EMPTY] ZERO TELEMETRY RECORDS RETURNED.</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} width={previewWidth}>
            {visibleLines.map((line, idx) => {
                const lineNum = String(scrollOffset + idx + 1).padStart(4, "0");
                if (isSchema) {
                    return (
                        <MatrixRow
                            key={idx}
                            line={line}
                            lineNum={lineNum}
                            searchQuery={searchQuery}
                        />
                    );
                }
                return (
                    <TelemetryRow
                        key={idx}
                        line={line}
                        lineNum={lineNum}
                        searchQuery={searchQuery}
                    />
                );
            })}
        </Box>
    );
}

function StreamFooter({ previewWidth }: { previewWidth: number }) {
    return (
        <Box justifyContent="space-between" width={previewWidth} marginTop={0}>
            <Text color="gray">
                {"╶" + "─".repeat(Math.max(4, previewWidth - 14))}
            </Text>
            <Text wrap="truncate-end">
                <Text color="gray">[SYNCED] </Text>
                <Text color="greenBright">┘</Text>
            </Text>
        </Box>
    );
}

interface FilePreviewProps {
    activeFile?: LogFileInfo;
    lines: string[];
    scrollOffset: number;
    isFocused: boolean;
    viewMode: ViewMode;
    searchQuery: string;
    isTruncated?: boolean;
    height: number;
    terminalWidth?: number;
}

export default function FilePreview({
    activeFile,
    lines,
    scrollOffset,
    isFocused,
    viewMode,
    searchQuery,
    isTruncated,
    height,
    terminalWidth = 80,
}: FilePreviewProps) {
    const isSchema = viewMode === "schema";
    const availableLines = Math.max(1, height - 5);
    const visibleLines = lines.slice(scrollOffset, scrollOffset + availableLines);
    const endLine = Math.min(scrollOffset + availableLines, lines.length);

    const previewWidth = Math.max(26, terminalWidth - 32);
    const scrollPercent = lines.length > 0 ? Math.round((endLine / lines.length) * 100) : 0;

    const maxNameLength = Math.max(8, Math.floor(previewWidth * 0.35));
    const truncatedFileName = activeFile
        ? activeFile.name.length > maxNameLength
            ? `${activeFile.name.slice(0, maxNameLength - 1)}…`
            : activeFile.name
        : "NO_VOLUME";

    return (
        <Box flexGrow={1} flexDirection="column" paddingLeft={1} width={previewWidth}>
            <StreamHeader
                isFocused={isFocused}
                truncatedFileName={truncatedFileName}
                isTruncated={isTruncated}
                scrollOffset={scrollOffset}
                endLine={endLine}
                totalLines={lines.length}
                scrollPercent={scrollPercent}
                previewWidth={previewWidth}
            />

            <ColumnHeader isSchema={isSchema} previewWidth={previewWidth} />

            <StreamContent
                hasFile={Boolean(activeFile)}
                lines={lines}
                visibleLines={visibleLines}
                scrollOffset={scrollOffset}
                isSchema={isSchema}
                searchQuery={searchQuery}
                previewWidth={previewWidth}
            />

            <StreamFooter previewWidth={previewWidth} />
        </Box>
    );
}
