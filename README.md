# cheatsheet

This project uses [Mise](https://mise.jdx.dev/) for managing tools and [Bun](https://bun.com) as the JavaScript runtime.

## Setting up tools with Mise

Mise automatically installs and manages versions defined in `.mise.toml`:

```bash
mise install
```

This installs Bun, Node, and other tools specified in the configuration.

## Running scripts

Run scripts through mise to ensure correct tool versions:

```bash
mise exec -- bun run index.ts
```

Or use bun directly if tools are in your PATH:

```bash
bun install
bun run index.ts
```

## Project info

This project was created using `bun init` in bun v1.3.5.
