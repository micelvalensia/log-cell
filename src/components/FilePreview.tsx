import { Box, Text } from "ink";
import React from "react";
import type { LogFileInfo, ParsedLogEntry, ViewMode } from "../types";
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
    selectedLineIndex,
    expandedCount,
}: {
    isFocused: boolean;
    truncatedFileName: string;
    isTruncated?: boolean;
    scrollOffset: number;
    endLine: number;
    totalLines: number;
    scrollPercent: number;
    previewWidth: number;
    selectedLineIndex: number;
    expandedCount: number;
}) {
    const lineRange = totalLines > 0 ? `${scrollOffset + 1}-${endLine}/${totalLines}` : "0/0";
    const selectedLineStr = totalLines > 0 ? ` [SEL: #${selectedLineIndex + 1}]` : "";

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
                {expandedCount > 0 && (
                    <Text bold color="yellowBright">
                        {" "}[EXPANDED: {expandedCount}]
                    </Text>
                )}
            </Text>
            <Text wrap="truncate-end">
                {isTruncated && (
                    <Text bold color="magentaBright">
                        [TAIL]{" "}
                    </Text>
                )}
                <Text color="cyan">{selectedLineStr}</Text>
                <Text color="gray"> [{lineRange}]{" "}</Text>
                <Text bold color={isFocused ? "greenBright" : "cyan"}>
                    {scrollPercent}%
                </Text>
            </Text>
        </Box>
    );
}

function formatLineNumber(entry: ParsedLogEntry, index: number): string {
    const rawNum = entry.lineIndex !== undefined ? entry.lineIndex + 1 : index + 1;
    return String(rawNum).padStart(4, "0");
}

function StreamRowItem({
    entry,
    index,
    isSelected,
    isExpanded,
    isFocused,
    isSchema,
    searchQuery,
}: {
    entry: ParsedLogEntry;
    index: number;
    isSelected: boolean;
    isExpanded: boolean;
    isFocused: boolean;
    isSchema: boolean;
    searchQuery: string;
}) {
    const lineNum = formatLineNumber(entry, index);
    if (isSchema) {
        return (
            <MatrixRow
                entry={entry}
                lineNum={lineNum}
                searchQuery={searchQuery}
                isSelected={isSelected}
                isFocused={isFocused}
                isExpanded={isExpanded}
            />
        );
    }
    return (
        <TelemetryRow
            entry={entry}
            lineNum={lineNum}
            searchQuery={searchQuery}
            isSelected={isSelected}
            isFocused={isFocused}
            isExpanded={isExpanded}
        />
    );
}

function StreamContent({
    hasFile,
    entries,
    visibleItems,
    selectedLineIndex,
    expandedLines,
    isFocused,
    isSchema,
    searchQuery,
    previewWidth,
}: {
    hasFile: boolean;
    entries: ParsedLogEntry[];
    visibleItems: { entry: ParsedLogEntry; index: number }[];
    selectedLineIndex: number;
    expandedLines: Set<number>;
    isFocused: boolean;
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

    if (entries.length === 0) {
        return (
            <Box marginTop={2}>
                <Text color="gray">›› [BUFFER_EMPTY] ZERO TELEMETRY RECORDS RETURNED.</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} width={previewWidth}>
            {visibleItems.map(({ entry, index }) => (
                <StreamRowItem
                    key={index}
                    entry={entry}
                    index={index}
                    isSelected={index === selectedLineIndex}
                    isExpanded={expandedLines.has(index)}
                    isFocused={isFocused}
                    isSchema={isSchema}
                    searchQuery={searchQuery}
                />
            ))}
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
    entries: ParsedLogEntry[];
    scrollOffset: number;
    selectedLineIndex: number;
    expandedLines: Set<number>;
    isFocused: boolean;
    viewMode: ViewMode;
    searchQuery: string;
    isTruncated?: boolean;
    height: number;
    terminalWidth?: number;
}

export default function FilePreview({
    activeFile,
    entries,
    scrollOffset,
    selectedLineIndex,
    expandedLines,
    isFocused,
    viewMode,
    searchQuery,
    isTruncated,
    height,
    terminalWidth = 80,
}: FilePreviewProps) {
    const isSchema = viewMode === "schema";
    const availableHeight = Math.max(1, height - 5);
    const previewWidth = Math.max(26, terminalWidth - 32);

    // Calculate visible items based on line budget
    let lineBudget = availableHeight;
    const visibleItems: { entry: ParsedLogEntry; index: number }[] = [];

    for (let i = scrollOffset; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry) break;
        const isExpanded = expandedLines.has(i);

        let consumed = 1;
        if (isExpanded) {
            if (isSchema && entry.extra) {
                consumed += Object.keys(entry.extra).length;
            } else {
                consumed += Math.max(1, Math.min(6, Math.ceil(entry.raw.length / Math.max(30, previewWidth - 12))));
            }
        }

        if (visibleItems.length > 0 && lineBudget - consumed < 0) {
            break;
        }

        visibleItems.push({ entry, index: i });
        lineBudget -= consumed;
        if (lineBudget <= 0) break;
    }

    const endLine = visibleItems.length > 0
        ? visibleItems[visibleItems.length - 1].index + 1
        : 0;

    const scrollPercent = entries.length > 0 ? Math.round((endLine / entries.length) * 100) : 0;

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
                totalLines={entries.length}
                scrollPercent={scrollPercent}
                previewWidth={previewWidth}
                selectedLineIndex={selectedLineIndex}
                expandedCount={expandedLines.size}
            />

            <ColumnHeader isSchema={isSchema} previewWidth={previewWidth} />

            <StreamContent
                hasFile={Boolean(activeFile)}
                entries={entries}
                visibleItems={visibleItems}
                selectedLineIndex={selectedLineIndex}
                expandedLines={expandedLines}
                isFocused={isFocused}
                isSchema={isSchema}
                searchQuery={searchQuery}
                previewWidth={previewWidth}
            />

            <StreamFooter previewWidth={previewWidth} />
        </Box>
    );
}
