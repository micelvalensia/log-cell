import { Box, Text } from "ink";
import React from "react";
import type { ParsedLogEntry } from "../types";
import { LevelIndicator } from "./StreamRows";

interface LogInspectorProps {
    entry: ParsedLogEntry;
    fileName: string;
    totalLines: number;
    height: number;
    width: number;
    scrollOffset: number;
}

function wrapText(text: string, maxWidth: number): string[] {
    if (!text) return [""];
    const lines: string[] = [];
    const words = text.split(" ");
    let currentLine = "";

    for (const word of words) {
        if (!currentLine) {
            currentLine = word;
        } else if (currentLine.length + 1 + word.length <= maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
}

function getPayloadValColor(val: any): "greenBright" | "magentaBright" | "yellowBright" | "white" {
    if (typeof val === "number") return "magentaBright";
    if (typeof val === "boolean") return "greenBright";
    if (val === null || val === undefined) return "yellowBright";
    return "white";
}

function renderPayloadEntry(key: string, val: any, branch: string): React.ReactNode[] {
    if (typeof val !== "object" || val === null) {
        return [
            <Text key={`payload-${key}`} wrap="truncate-end">
                <Text color="gray">  {branch} </Text>
                <Text bold color="cyan">{key}: </Text>
                <Text color={getPayloadValColor(val)}>{String(val)}</Text>
            </Text>,
        ];
    }

    const lines: React.ReactNode[] = [
        <Text key={`payload-${key}`}>
            <Text color="gray">  {branch} </Text>
            <Text bold color="cyan">{key}: </Text>
        </Text>,
    ];

    const jsonLines = JSON.stringify(val, null, 2).split("\n");
    for (let jIdx = 0; jIdx < jsonLines.length; jIdx++) {
        lines.push(
            <Text key={`payload-${key}-j${jIdx}`} color="white">
                {"     "}{jsonLines[jIdx]}
            </Text>
        );
    }
    return lines;
}

function renderPayloadSection(extra: Record<string, any> | undefined): React.ReactNode[] {
    if (!extra || Object.keys(extra).length === 0) return [];

    const fieldCount = Object.keys(extra).length;
    const nodes: React.ReactNode[] = [
        <Box key="div-payload-space" height={1} />,
        <Text key="sec-payload-title" bold color="greenBright">
            › STRUCTURED PAYLOAD / ATTRIBUTES ({fieldCount} fields)
        </Text>,
    ];

    const entries = Object.entries(extra);
    for (let idx = 0; idx < entries.length; idx++) {
        const [key, val] = entries[idx];
        const isLast = idx === entries.length - 1;
        const branch = isLast ? "└─" : "├─";
        nodes.push(...renderPayloadEntry(key, val, branch));
    }
    return nodes;
}

function InspectorTopBar({ lineNum, scrollPercent }: { lineNum: string; scrollPercent: number }) {
    return (
        <Box justifyContent="space-between" width="100%">
            <Text bold color="greenBright">
                ◖TELEMETRY RECORD INSPECTOR◗
            </Text>
            <Text color="gray">
                [LINE {lineNum}] [{scrollPercent}%]
            </Text>
        </Box>
    );
}

function InspectorBottomBar({ modalWidth }: { modalWidth: number }) {
    return (
        <Box justifyContent="space-between" width="100%">
            <Text color="gray">
                {"─".repeat(Math.max(4, modalWidth - 36))}
            </Text>
            <Text wrap="truncate-end">
                <Text bold color="cyanBright">[↑/↓, J/K] </Text>
                <Text color="gray">SCROLL </Text>
                <Text bold color="magentaBright">[ESC/ENTER/Q] </Text>
                <Text color="gray">CLOSE</Text>
            </Text>
        </Box>
    );
}

export default function LogInspector({
    entry,
    fileName,
    totalLines,
    height,
    width,
    scrollOffset,
}: LogInspectorProps) {
    const modalWidth = Math.max(40, width - 4);
    const contentWidth = modalWidth - 4;
    const bodyHeight = Math.max(6, height - 4);

    const lineNum = entry.lineIndex !== undefined
        ? String(entry.lineIndex + 1).padStart(4, "0")
        : "----";

    // Build list of inspectable visual lines
    const allContentLines: React.ReactNode[] = [];

    // Header info line
    allContentLines.push(
        <Box key="meta-header" justifyContent="space-between" width={contentWidth}>
            <Text>
                <Text color="gray">VOL: </Text>
                <Text bold color="white">{fileName} </Text>
                <Text color="gray">┆ LN: </Text>
                <Text bold color="cyanBright">{lineNum}/{totalLines} </Text>
                <Text color="gray">┆ FORMAT: </Text>
                <Text bold color="greenBright">{entry.format.toUpperCase()}</Text>
            </Text>
        </Box>
    );

    // Meta chips line
    allContentLines.push(
        <Box key="meta-chips" gap={1} width={contentWidth}>
            <LevelIndicator level={entry.level} />
            <Text color="gray">┆ TIME: </Text>
            <Text bold color="cyan">{entry.timestamp || "N/A"}</Text>
            {entry.module && (
                <>
                    <Text color="gray">┆ MOD: </Text>
                    <Text bold color="magentaBright">{entry.module}</Text>
                </>
            )}
        </Box>
    );

    allContentLines.push(
        <Text key="div-1" color="gray">
            {"─".repeat(contentWidth)}
        </Text>
    );

    // Message section
    allContentLines.push(
        <Text key="sec-msg-title" bold color="cyanBright">
            › MESSAGE
        </Text>
    );
    const msgWrapped = wrapText(entry.message || "(No message)", contentWidth - 2);
    for (let i = 0; i < msgWrapped.length; i++) {
        allContentLines.push(
            <Text key={`msg-${i}`} color="white">
                {"  "}{msgWrapped[i]}
            </Text>
        );
    }

    // Payload / Extra attributes section
    allContentLines.push(...renderPayloadSection(entry.extra));

    // Raw stream section
    allContentLines.push(
        <Box key="div-raw-space" height={1} />
    );
    allContentLines.push(
        <Text key="sec-raw-title" bold color="cyanBright">
            › RAW TELEMETRY LINE
        </Text>
    );
    const rawWrapped = wrapText(entry.raw, contentWidth - 2);
    for (let i = 0; i < rawWrapped.length; i++) {
        allContentLines.push(
            <Text key={`raw-${i}`} color="white">
                {"  "}{rawWrapped[i]}
            </Text>
        );
    }

    const totalContentLines = allContentLines.length;
    const maxOffset = Math.max(0, totalContentLines - bodyHeight);
    const effectiveOffset = Math.min(scrollOffset, maxOffset);
    const visibleContent = allContentLines.slice(effectiveOffset, effectiveOffset + bodyHeight);

    const scrollPercent = totalContentLines > bodyHeight
        ? Math.round(((effectiveOffset + bodyHeight) / totalContentLines) * 100)
        : 100;

    return (
        <Box
            flexDirection="column"
            width={modalWidth}
            height={height}
            borderStyle="double"
            borderColor="greenBright"
            paddingX={1}
        >
            <InspectorTopBar lineNum={lineNum} scrollPercent={scrollPercent} />

            <Box flexDirection="column" flexGrow={1} height={bodyHeight} marginTop={1}>
                {visibleContent}
            </Box>

            <InspectorBottomBar modalWidth={modalWidth} />
        </Box>
    );
}
