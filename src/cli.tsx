#!/usr/bin/env bun
import { render } from "ink";
import React from "react";
import App from "./app";

const arg = process.argv[2];

if (arg === "-v" || arg === "--version") {
    process.stdout.write("log-cell v0.1.0 // CYBERPUNK_TUI_OS\n");
    process.exit(0);
}

if (arg === "-h" || arg === "--help") {
    process.stdout.write(`
  ◖NET.RUNNER//CELL_OS◗ log-cell v0.1.0
  Futuristic Cyberpunk Terminal Log Reader & Schema Formatter

  USAGE:
    log [directory] [options]

  EXAMPLES:
    log .              Scan logs in current directory
    log ./logs         Scan logs in specific directory
    log                Default to current directory

  OPTIONS:
    -h, --help         Display this help guide
    -v, --version      Display system version

  VIM KEYBINDINGS:
    [j] / [k]          Navigate down / up (files or log stream)
    [g] / [G]          Jump to top / bottom
    [Tab]              Toggle focus between Index and Stream pane
    [/]                Live keyword scan with glowing highlights
    [f]                Isolate matching log lines (filter trap)
    [s]                Toggle Matrix Schema (JSON auto-map) / Raw view
    [Esc]              Clear active scan / isolation filter
    [q]                Halt process and exit cleanly
\n`);
    process.exit(0);
}

const targetDir = arg || ".";

// Setup terminal: Hide cursor & enable alternate screen buffer
process.stdout.write("\x1b[?25l");
process.stdout.write("\x1b[?1049h");
process.stdout.write("\x1b[2J");
process.stdout.write("\x1b[H");

const cleanup = () => {
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[H");
    process.stdout.write("\x1b[?25h"); // Restore cursor
    process.stdout.write("\x1b[?1049l"); // Restore screen
};

// Ensure terminal is always restored on any exit or SIGINT
process.on("exit", cleanup);
process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
});

const { waitUntilExit, clear } = render(<App targetDir={targetDir} />, {
    exitOnCtrlC: true,
    patchConsole: false,
});

await waitUntilExit();
clear();
cleanup();
process.exit(0);
