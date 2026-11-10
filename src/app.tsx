import { Box, useApp, useInput, useWindowSize, Text } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FileExplorer from "./components/FileExplorer";
import DiagnosticsHUD from "./components/DiagnosticsHUD";
import FilePreview from "./components/FilePreview";
import LogInspector from "./components/LogInspector";
import type { ActivePane, FileReadResult, InputMode, LogFileInfo, LogLevelFilter, ParsedLogEntry, ViewMode } from "./types";
import { getLogFiles, readLogFileLines } from "./utils/files";
import { parseLogLine } from "./utils/schema";
import { matchesFilter } from "./utils/filter";

interface AppProps {
    targetDir?: string;
}

function toggleLineExpansion(prev: Set<number>, targetIndex: number): Set<number> {
    const next = new Set(prev);
    if (next.has(targetIndex)) {
        next.delete(targetIndex);
    } else {
        next.add(targetIndex);
    }
    return next;
}

function toggleAllVisibleExpansion(
    prev: Set<number>,
    startOffset: number,
    count: number,
    total: number
): Set<number> {
    if (prev.size > 0) return new Set();
    const next = new Set<number>();
    const limit = Math.min(total, startOffset + count);
    for (let i = startOffset; i < limit; i++) {
        next.add(i);
    }
    return next;
}

export default function App({ targetDir = "." }: AppProps) {
    const { exit } = useApp();
    const { rows: windowRows, columns: windowColumns } = useWindowSize();
    const terminalHeight = windowRows || process.stdout.rows || 24;
    const terminalWidth = windowColumns || process.stdout.columns || 80;

    const [files, setFiles] = useState<LogFileInfo[]>(() => getLogFiles(targetDir));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activePane, setActivePane] = useState<ActivePane>("files");
    const [viewMode, setViewMode] = useState<ViewMode>("raw");
    const [scrollOffset, setScrollOffset] = useState(0);
    const [selectedLineIndex, setSelectedLineIndex] = useState(0);
    const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

    // Inspector modal state
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [inspectorScrollOffset, setInspectorScrollOffset] = useState(0);

    const [inputMode, setInputMode] = useState<InputMode>("normal");
    const [inputValue, setInputValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterQuery, setFilterQuery] = useState("");
    const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("ALL");

    // Dynamic telemetry tick for live indicators
    const [systemTick, setSystemTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setSystemTick((prev) => (prev + 1) % 10000);
        }, 500);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const discovered = getLogFiles(targetDir);
        setFiles(discovered);
        if (discovered.length > 0) {
            setSelectedIndex(0);
        }
    }, [targetDir]);

    const activeFile = files[selectedIndex];

    const fileResult: FileReadResult = useMemo(() => {
        if (!activeFile) {
            return { lines: [], isTruncated: false, totalSize: 0 };
        }
        return readLogFileLines(activeFile.path);
    }, [activeFile]);

    // Parse all lines into structured entries once per file
    const parsedFileEntries: ParsedLogEntry[] = useMemo(() => {
        return fileResult.lines.map((raw, idx) => ({
            ...parseLogLine(raw),
            lineIndex: idx,
        }));
    }, [fileResult.lines]);

    // Filter entries using schema-aware filter engine
    const displayedEntries: ParsedLogEntry[] = useMemo(() => {
        if (!filterQuery && levelFilter === "ALL") {
            return parsedFileEntries;
        }
        return parsedFileEntries.filter((entry) =>
            matchesFilter(entry, filterQuery, levelFilter)
        );
    }, [parsedFileEntries, filterQuery, levelFilter]);

    const searchMatchCount = useMemo(() => {
        if (!searchQuery) return 0;
        const q = searchQuery.toLowerCase();
        return displayedEntries.filter((entry) =>
            entry.raw.toLowerCase().includes(q)
        ).length;
    }, [displayedEntries, searchQuery]);

    const detectedFormat = useMemo(() => {
        if (!displayedEntries || displayedEntries.length === 0) return "STANDARD";
        const first = displayedEntries.find((e) => e.raw.trim().length > 0);
        if (!first) return "STANDARD";
        return first.format.toUpperCase();
    }, [displayedEntries]);

    // Reset cursor, scroll, and expansions when file or filter changes
    useEffect(() => {
        setScrollOffset(0);
        setSelectedLineIndex(0);
        setExpandedLines(new Set());
    }, [selectedIndex, filterQuery, levelFilter]);

    const bodyHeight = Math.max(8, terminalHeight - 7);
    const explorerHeight = Math.max(4, Math.floor(bodyHeight * 0.48));
    const previewHeight = Math.max(1, bodyHeight - 5);

    const handlePromptInput = (input: string, key: any) => {
        if (key.escape) {
            setInputMode("normal");
            setInputValue("");
            return;
        }

        if (key.return) {
            if (inputMode === "search") setSearchQuery(inputValue);
            if (inputMode === "filter") setFilterQuery(inputValue);
            setInputMode("normal");
            return;
        }

        if (key.backspace || key.delete) {
            setInputValue((prev) => prev.slice(0, -1));
            return;
        }

        if (input && !key.ctrl && !key.meta) {
            setInputValue((prev) => prev + input);
        }
    };

    const handleFileNav = (input: string, key: any) => {
        if (key.upArrow || input === "k") {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow || input === "j") {
            setSelectedIndex((prev) =>
                Math.min(Math.max(0, files.length - 1), prev + 1)
            );
        } else if (input === "g") {
            setSelectedIndex(0);
        } else if (input === "G") {
            setSelectedIndex(Math.max(0, files.length - 1));
        } else if (key.return) {
            setActivePane("preview");
        }
    };

    const handlePreviewNav = (input: string, key: any) => {
        const total = displayedEntries.length;
        if (total === 0) return;

        if (key.upArrow || input === "k") {
            const nextIdx = Math.max(0, selectedLineIndex - 1);
            setSelectedLineIndex(nextIdx);
            if (nextIdx < scrollOffset) {
                setScrollOffset(nextIdx);
            }
            return;
        }

        if (key.downArrow || input === "j") {
            const nextIdx = Math.min(total - 1, selectedLineIndex + 1);
            setSelectedLineIndex(nextIdx);
            if (nextIdx >= scrollOffset + previewHeight) {
                setScrollOffset(nextIdx - previewHeight + 1);
            }
            return;
        }

        if (key.pageUp || (key.ctrl && input === "u")) {
            const jump = Math.max(1, Math.floor(previewHeight / 2));
            const nextIdx = Math.max(0, selectedLineIndex - jump);
            setSelectedLineIndex(nextIdx);
            setScrollOffset(Math.max(0, scrollOffset - jump));
            return;
        }

        if (key.pageDown || (key.ctrl && input === "d")) {
            const jump = Math.max(1, Math.floor(previewHeight / 2));
            const nextIdx = Math.min(total - 1, selectedLineIndex + jump);
            setSelectedLineIndex(nextIdx);
            setScrollOffset(Math.min(Math.max(0, total - previewHeight), scrollOffset + jump));
            return;
        }

        if (input === "g") {
            setSelectedLineIndex(0);
            setScrollOffset(0);
            return;
        }

        if (input === "G") {
            const last = Math.max(0, total - 1);
            setSelectedLineIndex(last);
            setScrollOffset(Math.max(0, total - previewHeight));
            return;
        }

        if (input === "e" || input === " ") {
            setExpandedLines((prev) => toggleLineExpansion(prev, selectedLineIndex));
            return;
        }

        if (input === "E") {
            setExpandedLines((prev) => toggleAllVisibleExpansion(prev, scrollOffset, previewHeight, total));
            return;
        }

        if (key.return) {
            setIsInspectorOpen(true);
            setInspectorScrollOffset(0);
            return;
        }
    };

    const handleInspectorNav = (input: string, key: any) => {
        if (key.escape || key.return || input === "q" || input === "x") {
            setIsInspectorOpen(false);
            return;
        }

        if (key.upArrow || input === "k") {
            setInspectorScrollOffset((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow || input === "j") {
            setInspectorScrollOffset((prev) => prev + 1);
        } else if (key.pageUp || (key.ctrl && input === "u")) {
            setInspectorScrollOffset((prev) => Math.max(0, prev - 8));
        } else if (key.pageDown || (key.ctrl && input === "d")) {
            setInspectorScrollOffset((prev) => prev + 8);
        } else if (input === "g") {
            setInspectorScrollOffset(0);
        }
    };

    const handleExit = () => {
        exit();
        process.stdout.write("\x1b[2J");
        process.stdout.write("\x1b[H");
        process.stdout.write("\x1b[?25h");
        process.stdout.write("\x1b[?1049l");
        process.exit(0);
    };

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            handleExit();
            return;
        }

        if (isInspectorOpen) {
            handleInspectorNav(input, key);
            return;
        }

        if (inputMode === "search" || inputMode === "filter") {
            handlePromptInput(input, key);
            return;
        }

        if (input === "q") {
            handleExit();
            return;
        }

        if (key.tab) {
            setActivePane((prev) => (prev === "files" ? "preview" : "files"));
            return;
        }

        if (input === "s") {
            setViewMode((prev) => (prev === "raw" ? "schema" : "raw"));
            return;
        }

        // Quick log level shortcuts
        if (input === "1") {
            setLevelFilter((prev) => (prev === "ERROR" ? "ALL" : "ERROR"));
            return;
        }
        if (input === "2") {
            setLevelFilter((prev) => (prev === "WARN" ? "ALL" : "WARN"));
            return;
        }
        if (input === "3") {
            setLevelFilter((prev) => (prev === "INFO" ? "ALL" : "INFO"));
            return;
        }
        if (input === "4") {
            setLevelFilter((prev) => (prev === "DEBUG" ? "ALL" : "DEBUG"));
            return;
        }
        if (input === "0") {
            setLevelFilter("ALL");
            return;
        }

        if (input === "/") {
            setInputMode("search");
            setInputValue(searchQuery);
            return;
        }

        if (input === "f") {
            setInputMode("filter");
            setInputValue(filterQuery);
            return;
        }

        if (key.escape) {
            if (filterQuery || levelFilter !== "ALL") {
                setFilterQuery("");
                setLevelFilter("ALL");
            } else if (searchQuery) {
                setSearchQuery("");
            } else if (expandedLines.size > 0) {
                setExpandedLines(new Set());
            }
            return;
        }

        if (activePane === "files") {
            handleFileNav(input, key);
        } else {
            handlePreviewNav(input, key);
        }
    });

    const inspectedEntry = displayedEntries[selectedLineIndex];

    return (
        <Box flexDirection="column" height={terminalHeight} paddingX={1}>
            <Header
                targetDir={targetDir}
                activeFileName={activeFile?.name}
                totalFiles={files.length}
                viewMode={viewMode}
                filterText={filterQuery}
                levelFilter={levelFilter}
                isTruncated={fileResult.isTruncated}
                systemTick={systemTick}
                terminalWidth={terminalWidth}
                schemaFormat={detectedFormat}
            />

            <Box flexDirection="row" flexGrow={1} height={bodyHeight}>
                {isInspectorOpen && inspectedEntry ? (
                    <LogInspector
                        entry={inspectedEntry}
                        fileName={activeFile?.name || "LOG_ENTRY"}
                        totalLines={displayedEntries.length}
                        height={bodyHeight}
                        width={terminalWidth}
                        scrollOffset={inspectorScrollOffset}
                    />
                ) : (
                    <>
                        {/* Left Asymmetric Navigation & HUD Column */}
                        <Box flexDirection="column" width={28} flexShrink={0}>
                            <FileExplorer
                                files={files}
                                selectedIndex={selectedIndex}
                                isFocused={activePane === "files"}
                                height={explorerHeight}
                            />
                            <DiagnosticsHUD
                                activeFile={activeFile}
                                lineCount={displayedEntries.length}
                                totalRecords={parsedFileEntries.length}
                                isTruncated={fileResult.isTruncated}
                                filterQuery={filterQuery}
                                levelFilter={levelFilter}
                                systemTick={systemTick}
                                schemaFormat={detectedFormat}
                            />
                        </Box>

                        {/* Vertical Cybernetic Hairline Rail Divider */}
                        <Box flexDirection="column" width={1} flexShrink={0}>
                            {Array.from({ length: bodyHeight }).map((_, idx) => (
                                <Text key={idx} color="gray">
                                    {idx === 0 ? "┬" : idx === bodyHeight - 1 ? "┴" : idx % 6 === 0 ? "┼" : "│"}
                                </Text>
                            ))}
                        </Box>

                        {/* Right Telemetry Stream Workspace */}
                        <FilePreview
                            activeFile={activeFile}
                            entries={displayedEntries}
                            scrollOffset={scrollOffset}
                            selectedLineIndex={selectedLineIndex}
                            expandedLines={expandedLines}
                            isFocused={activePane === "preview"}
                            viewMode={viewMode}
                            searchQuery={searchQuery}
                            isTruncated={fileResult.isTruncated}
                            height={bodyHeight}
                            terminalWidth={terminalWidth}
                        />
                    </>
                )}
            </Box>

            <Footer
                activePane={activePane}
                inputMode={inputMode}
                inputValue={inputValue}
                totalMatches={searchMatchCount}
                systemTick={systemTick}
                terminalWidth={terminalWidth}
            />
        </Box>
    );
}
