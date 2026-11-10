import { Box, Text } from "ink";
import React from "react";
import type { ActivePane, InputMode } from "../types";

export const COMPACT_FOOTER_WIDTH = 95;

interface FooterProps {
    activePane: ActivePane;
    inputMode: InputMode;
    inputValue: string;
    totalMatches?: number;
    systemTick?: number;
    terminalWidth?: number;
}

function PromptBar({
    isSearch,
    inputValue,
    pulseGlyph,
    totalMatches,
}: {
    isSearch: boolean;
    inputValue: string;
    pulseGlyph: string;
    totalMatches?: number;
}) {
    const hint = isSearch
        ? "›› SCAN // SEARCH: "
        : "›› ISOLATE (e.g. 'level:info', 'payload:orderId'): ";

    return (
        <Box justifyContent="space-between" width="100%">
            <Text wrap="truncate-end">
                <Text bold color={isSearch ? "greenBright" : "magentaBright"}>
                    {hint}
                </Text>
                <Text bold color="white">
                    {inputValue}
                </Text>
                <Text bold color={isSearch ? "greenBright" : "magentaBright"}>
                    {pulseGlyph}
                </Text>
            </Text>

            <Text wrap="truncate-end">
                {isSearch && totalMatches !== undefined && (
                    <Text bold color="greenBright">
                        [{totalMatches} HITS]{" "}
                    </Text>
                )}
                <Text color="gray">[ENTER: EXEC] [ESC: ABORT]</Text>
            </Text>
        </Box>
    );
}

function StatusBar({
    isCompact,
    activePane,
}: {
    isCompact: boolean;
    activePane: ActivePane;
}) {
    const isFiles = activePane === "files";

    return (
        <Box justifyContent="space-between" width="100%">
            <Text wrap="truncate-end">
                <Text bold color="greenBright">
                    {isCompact ? "◖SYS:OK◗ " : "◖SYS_STATUS: ACTIVE◗ "}
                </Text>
                <Text bold color={isFiles ? "greenBright" : "cyanBright"}>
                    [{isFiles ? "INDEX" : "STREAM"}]
                </Text>
            </Text>

            <Text wrap="truncate-end">
                <Text bold color="cyanBright">[J/K] </Text><Text color="gray">NAV </Text>
                <Text bold color="cyanBright">[TAB] </Text><Text color="gray">PANE </Text>
                <Text bold color="cyanBright">[1-4] </Text><Text color="gray">LVL </Text>
                <Text bold color="cyanBright">[E] </Text><Text color="gray">EXPAND </Text>
                <Text bold color="cyanBright">[ENTER] </Text><Text color="gray">INSPECT </Text>
                <Text bold color="cyanBright">[F] </Text><Text color="gray">FILTER </Text>
                <Text bold color="cyanBright">[/] </Text><Text color="gray">SCAN </Text>
                <Text bold color="cyanBright">[S] </Text><Text color="gray">VIEW </Text>
                <Text bold color="magentaBright">[Q] </Text><Text color="gray">QUIT</Text>
            </Text>
        </Box>
    );
}

export default function Footer({
    activePane,
    inputMode,
    inputValue,
    totalMatches,
    systemTick = 0,
    terminalWidth = 80,
}: FooterProps) {
    const isSearch = inputMode === "search";
    const isFilter = inputMode === "filter";
    const isPromptActive = isSearch || isFilter;
    const pulseGlyph = systemTick % 2 === 0 ? "█" : " ";
    const isCompact = terminalWidth < COMPACT_FOOTER_WIDTH;

    return (
        <Box flexDirection="column" width="100%" marginTop={1}>
            <Box width="100%">
                <Text color="gray">
                    {"╺" + "━".repeat(Math.max(10, terminalWidth - 4)) + "╸"}
                </Text>
            </Box>

            {isPromptActive ? (
                <PromptBar
                    isSearch={isSearch}
                    inputValue={inputValue}
                    pulseGlyph={pulseGlyph}
                    totalMatches={totalMatches}
                />
            ) : (
                <StatusBar
                    isCompact={isCompact}
                    activePane={activePane}
                />
            )}
        </Box>
    );
}
