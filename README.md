# cheatsheet

This project uses [Mise](https://mise.jdx.dev/) for managing tools and [Bun](https://bun.com) as the JavaScript runtime.

## Quick start

### Running tasks

Run defined tasks with:

```bash
mise run dev
```

This automatically installs tools and runs the script with correct versions.

### Using `mise exec` (for ad-hoc commands)

Run commands with the correct tool versions without permanently modifying your shell:

```bash
mise exec -- bun run index.ts
```

### Using `mise activate` (recommended for interactive shells)

For a persistent shell session with all tools loaded:

```bash
eval "$(mise activate bash)"  # or zsh/fish
bun run index.ts
```

See [mise activation guide](https://mise.jdx.dev/cli/activate.html) for your shell.

## Managing tools

Tools are defined in `.mise.toml`. Install them with:

```bash
mise install
```

To add a new tool, use:

```bash
mise use bun@latest
```

## Defining tasks

Tasks are defined in `.mise.toml` under `[tasks.taskname]`:

```toml
[tasks.dev]
description = "Start the development script"
run = "bun run index.ts"
```

Run with `mise run dev`. Tasks automatically load all tools before executing.

## Project info

Created with `bun init` in bun v1.3.5. Managed by Mise v2025.11.3.
