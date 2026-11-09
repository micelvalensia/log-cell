import * as fs from "fs";
import * as path from "path";
import type { FileReadResult, LogFileInfo } from "../types";

const BYTES_IN_KB = 1024;
const BYTES_IN_MB = 1024 * 1024;
const SMALL_FILE_MAX_BYTES = 2 * BYTES_IN_MB;
const CHUNK_SIZE = 64 * BYTES_IN_KB;
const MAX_TAIL_LINES = 3000;
const MAX_ACCUMULATE_BYTES = 5 * BYTES_IN_MB;

export function formatFileSize(bytes: number): string {
    if (bytes < BYTES_IN_KB) return `${bytes} B`;
    if (bytes < BYTES_IN_MB) return `${(bytes / BYTES_IN_KB).toFixed(1)} KB`;
    return `${(bytes / BYTES_IN_MB).toFixed(1)} MB`;
}

export function getLogFiles(dirPath: string): LogFileInfo[] {
    try {
        const resolvedPath = path.resolve(dirPath);
        if (!fs.existsSync(resolvedPath)) return [];

        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const files: LogFileInfo[] = [];

        for (const entry of entries) {
            if (!entry.isFile() || entry.name.startsWith(".")) continue;

            const ext = path.extname(entry.name).toLowerCase();
            if (ext !== ".log" && ext !== ".txt") continue;

            const fullPath = path.join(resolvedPath, entry.name);
            appendLogFileEntry(files, entry.name, fullPath);
        }

        return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

function appendLogFileEntry(files: LogFileInfo[], name: string, fullPath: string) {
    try {
        const stats = fs.statSync(fullPath);
        files.push({
            name,
            path: fullPath,
            size: stats.size,
            formattedSize: formatFileSize(stats.size),
            mtime: stats.mtime,
        });
    } catch {
        // Skip inaccessible file
    }
}

function readSmallFile(filePath: string, totalSize: number): FileReadResult {
    const content = fs.readFileSync(filePath, "utf-8");
    return {
        lines: content.split(/\r?\n/),
        isTruncated: false,
        totalSize,
    };
}

function readLargeFileTail(filePath: string, totalSize: number): FileReadResult {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(CHUNK_SIZE);
    let position = totalSize;
    let accumulated = "";
    let lineCount = 0;

    try {
        while (position > 0 && lineCount < MAX_TAIL_LINES) {
            const readLength = Math.min(CHUNK_SIZE, position);
            position -= readLength;
            fs.readSync(fd, buffer, 0, readLength, position);
            accumulated = buffer.toString("utf-8", 0, readLength) + accumulated;
            lineCount = (accumulated.match(/\n/g) || []).length;

            if (accumulated.length >= MAX_ACCUMULATE_BYTES) break;
        }
    } finally {
        fs.closeSync(fd);
    }

    let lines = accumulated.split(/\r?\n/);
    const isTruncated = position > 0 || lines.length > MAX_TAIL_LINES;
    if (lines.length > MAX_TAIL_LINES) {
        lines = lines.slice(lines.length - MAX_TAIL_LINES);
    }

    return { lines, isTruncated, totalSize };
}

export function readLogFileLines(filePath: string): FileReadResult {
    try {
        if (!fs.existsSync(filePath)) {
            return { lines: [], isTruncated: false, totalSize: 0 };
        }

        const stats = fs.statSync(filePath);
        if (stats.size <= SMALL_FILE_MAX_BYTES) {
            return readSmallFile(filePath, stats.size);
        }

        return readLargeFileTail(filePath, stats.size);
    } catch {
        return {
            lines: ["// SYS_ERR: UNABLE TO ACCESS OR READ TELEMETRY STREAM."],
            isTruncated: false,
            totalSize: 0,
        };
    }
}
