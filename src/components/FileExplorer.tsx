import { Box, Text } from "ink";
import React from "react";
import type { LogFileInfo } from "../types";

const MAX_NAME_LENGTH = 11;

interface FileExplorerProps {
    files: LogFileInfo[];
    selectedIndex: number;
    isFocused: boolean;
    height: number;
}

function VolumeRow({
    file,
    index,
    isSelected,
    isFocused,
}: {
    file: LogFileInfo;
    index: number;
    isSelected: boolean;
    isFocused: boolean;
}) {
    const formattedIndex = String(index + 1).padStart(2, "0");
    const truncatedName =
        file.name.length > MAX_NAME_LENGTH
            ? `${file.name.slice(0, MAX_NAME_LENGTH - 1)}…`
            : file.name.padEnd(MAX_NAME_LENGTH, " ");

    const formattedSize = file.formattedSize.padStart(6, " ");

    if (isSelected) {
        return (
            <Box justifyContent="space-between" width="100%">
                <Box>
                    <Text bold color={isFocused ? "greenBright" : "cyanBright"}>
                        {isFocused ? "▶" : "▷"} {formattedIndex}{" "}
                    </Text>
                    <Text bold color={isFocused ? "white" : "cyan"}>
                        {truncatedName}
                    </Text>
                </Box>
                <Text bold color={isFocused ? "greenBright" : "cyanBright"}>
                    {formattedSize}
                </Text>
            </Box>
        );
    }

    return (
        <Box justifyContent="space-between" width="100%">
            <Box>
                <Text color="gray">
                    {"  "}{formattedIndex}{" "}
                </Text>
                <Text color="gray">{truncatedName}</Text>
            </Box>
            <Text color="gray">{formattedSize}</Text>
        </Box>
    );
}

function ExplorerHeader({
    isFocused,
    totalFiles,
}: {
    isFocused: boolean;
    totalFiles: number;
}) {
    return (
        <Box flexDirection="column" width="100%">
            <Box justifyContent="space-between" width="100%">
                <Text bold color={isFocused ? "greenBright" : "cyan"}>
                    › DIRECTORY_INDEX
                </Text>
                <Text color="gray">
                    [{String(totalFiles).padStart(2, "0")}]
                </Text>
            </Box>
            <Box justifyContent="space-between" width="100%">
                <Text color="gray">  ID VOLUME</Text>
                <Text color="gray">  SIZE</Text>
            </Box>
            <Box width="100%">
                <Text color="gray">┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄</Text>
            </Box>
        </Box>
    );
}

export default function FileExplorer({
    files,
    selectedIndex,
    isFocused,
    height,
}: FileExplorerProps) {
    const availableLines = Math.max(1, height - 3);

    let startIndex = 0;
    if (selectedIndex >= availableLines) {
        startIndex = selectedIndex - availableLines + 1;
    }
    const visibleFiles = files.slice(startIndex, startIndex + availableLines);

    return (
        <Box width="100%" flexDirection="column">
            <ExplorerHeader isFocused={isFocused} totalFiles={files.length} />

            <Box flexDirection="column" flexGrow={1}>
                {files.length === 0 ? (
                    <Text color="gray">  // NO LOGS FOUND //</Text>
                ) : (
                    visibleFiles.map((file, idx) => {
                        const actualIndex = startIndex + idx;
                        return (
                            <VolumeRow
                                key={file.path}
                                file={file}
                                index={actualIndex}
                                isSelected={actualIndex === selectedIndex}
                                isFocused={isFocused}
                            />
                        );
                    })
                )}
            </Box>
        </Box>
    );
}
