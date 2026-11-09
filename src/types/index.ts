export interface LogFileInfo {
    name: string;
    path: string;
    size: number;
    formattedSize: string;
    mtime: Date;
}

export interface FileReadResult {
    lines: string[];
    isTruncated: boolean;
    totalSize: number;
}

export type ActivePane = "files" | "preview";
export type InputMode = "normal" | "search" | "filter";
export type ViewMode = "raw" | "schema";

export interface ParsedLogEntry {
    raw: string;
    timestamp?: string;
    level: string;
    module?: string;
    message: string;
    extra?: Record<string, any>;
    format: "json" | "logfmt" | "standard" | "raw";
}
