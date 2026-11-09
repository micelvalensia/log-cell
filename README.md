# log-cell

Interactive terminal log viewer (TUI) built with Bun, React, and Ink.

Designed with an open cyberpunk terminal aesthetic (acid green, electric cyan, no bulky card containers) to read, search, and parse application logs directly in your terminal.

---

## Installation

### Option 1: Install globally via Bun (Recommended)

```bash
bun install -g github:micelvalensia/log-cell
```

Now `log` is available anywhere in your terminal.

### Option 2: Clone & Link locally

```bash
git clone https://github.com/micelvalensia/log-cell.git
cd log-cell
bun install
bun link
```

### Option 3: Compile standalone binary

```bash
bun run build
# Outputs single binary to dist/log
```

You can copy `dist/log` to `/usr/local/bin` or `~/.local/bin` and run it without needing Bun installed.

---

## Usage

```bash
# View logs in current folder
log-cell .
# or simply 'log .' (see Zsh note below)
log .

# View logs in a specific folder
log-cell ./logs
log-cell /var/log

# View help and flags
log-cell --help
```

> **Catatan untuk pengguna Zsh:**
> Di Zsh, `log` adalah nama *shell builtin* bawaan. Agar Zsh memprioritaskan binary ini saat mengetik `log`, tambahkan perintah ini ke `~/.zshrc`:
> ```bash
> echo "disable log" >> ~/.zshrc
> source ~/.zshrc
> ```
> Atau Anda bisa langsung mengetik `log-cell .` tanpa perlu mengubah konfigurasi Zsh.

---

## Keybindings

| Key | Action |
| :---: | :--- |
| `j` / `k` | Scroll down / up (or navigate files) |
| `g` / `G` | Jump to top / bottom |
| `Tab` | Switch between file list and log stream |
| `s` | Toggle view: **Raw** vs **Schema Matrix** |
| `/` | Search keyword (highlights matches) |
| `f` | Filter (isolate lines matching query, hide the rest) |
| `Esc` | Clear search or filter |
| `q` | Quit |

---

## Features

### 1. Auto-Detection for JSON & Object Logs
When switching to Schema mode (`s`), `log-cell` parses each line:
- **JSON / NDJSON**: Automatically extracts timestamp, log level (`INFO`, `WARN`, `ERROR`, `DEBUG`), service/module, message, and formats remaining JSON payload keys inline. Works out of the box with Winston, Pino, Bunyan, and Zap.
- **Logfmt**: Parses `key=value` lines (`ts=... level=... msg=...`).
- **Standard format**: Parses timestamps, levels, and bracketed tags (`[INFO] [AuthService] ...`).

### 2. Search & Line Isolation
- **Search (`/`)**: Highlights matching keywords across the log stream and JSON payloads.
- **Filter (`f`)**: Shows only lines matching your query and filters out everything else.

### 3. Open Cyberpunk TUI
- Full-screen terminal interface with alternate buffer.
- No heavy rectangular box borders or card grids. Uses thin line dividers, monospace alignment, and corner markers.
- Responsive to terminal resize (`useWindowSize`).
- Handles large log files using tail chunking so the UI does not freeze on multi-megabyte files.

---

## Development

```bash
# Run locally
bun run dev

# Type check
bun x tsc --noEmit

# Build binary
bun run build
```

## License

MIT
