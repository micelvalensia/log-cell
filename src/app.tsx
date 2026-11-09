import { Box, useApp, useInput, useWindowSize, Text } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FileExplorer from "./components/FileExplorer";
import DiagnosticsHUD from "./components/DiagnosticsHUD";
import FilePreview from "./components/FilePreview";
import type { ActivePane, FileReadResult, InputMode, LogFileInfo, ViewMode } from "./types";
import { getLogFiles, readLogFileLines } from "./utils/files";
import { parseLogLine } from "./utils/schema";

interface AppProps {
    targetDir?: string;
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

    const [inputMode, setInputMode] = useState<InputMode>("normal");
    const [inputValue, setInputValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterQuery, setFilterQuery] = useState("");

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

    const displayedLines = useMemo(() => {
        if (!filterQuery) return fileResult.lines;
        return fileResult.lines.filter((line) =>
            line.toLowerCase().includes(filterQuery.toLowerCase())
        );
    }, [fileResult.lines, filterQuery]);

    const searchMatchCount = useMemo(() => {
        if (!searchQuery) return 0;
        return displayedLines.filter((line) =>
            line.toLowerCase().includes(searchQuery.toLowerCase())
        ).length;
    }, [displayedLines, searchQuery]);

    const detectedFormat = useMemo(() => {
        if (!displayedLines || displayedLines.length === 0) return "STANDARD";
        const firstLine = displayedLines.find((l) => l.trim().length > 0);
        if (!firstLine) return "STANDARD";
        return parseLogLine(firstLine).format.toUpperCase();
    }, [displayedLines]);

    useEffect(() => {
        setScrollOffset(0);
    }, [selectedIndex, filterQuery]);

    const bodyHeight = Math.max(8, terminalHeight - 7);
    const explorerHeight = Math.max(4, Math.floor(bodyHeight * 0.48));

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
        }
    };

    const handlePreviewNav = (input: string, key: any) => {
        const previewHeight = Math.max(1, bodyHeight - 5);
        const maxScroll = Math.max(0, displayedLines.length - previewHeight);

        if (key.upArrow || input === "k") {
            setScrollOffset((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow || input === "j") {
            setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
        } else if (key.pageUp || (key.ctrl && input === "u")) {
            setScrollOffset((prev) => Math.max(0, prev - Math.max(1, Math.floor(previewHeight / 2))));
        } else if (key.pageDown || (key.ctrl && input === "d")) {
            setScrollOffset((prev) => Math.min(maxScroll, prev + Math.max(1, Math.floor(previewHeight / 2))));
        } else if (input === "g") {
            setScrollOffset(0);
        } else if (input === "G") {
            setScrollOffset(maxScroll);
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
            setSearchQuery("");
            setFilterQuery("");
            return;
        }

        if (activePane === "files") {
            handleFileNav(input, key);
        } else {
            handlePreviewNav(input, key);
        }
    });

    return (
        <Box flexDirection="column" height={terminalHeight} paddingX={1}>
            <Header
                targetDir={targetDir}
                activeFileName={activeFile?.name}
                totalFiles={files.length}
                viewMode={viewMode}
                filterText={filterQuery}
                isTruncated={fileResult.isTruncated}
                systemTick={systemTick}
                terminalWidth={terminalWidth}
                schemaFormat={detectedFormat}
            />

            <Box flexDirection="row" flexGrow={1} height={bodyHeight}>
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
                        lineCount={displayedLines.length}
                        isTruncated={fileResult.isTruncated}
                        filterQuery={filterQuery}
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
                    lines={displayedLines}
                    scrollOffset={scrollOffset}
                    isFocused={activePane === "preview"}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                    isTruncated={fileResult.isTruncated}
                    height={bodyHeight}
                    terminalWidth={terminalWidth}
                />
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
