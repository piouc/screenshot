# @piouc/screenshot

A TypeScript CLI tool for taking full-page screenshots of multiple URLs using Puppeteer.

## Features

- Take full-page screenshots of multiple URLs concurrently
- Configurable viewport dimensions and timeout settings
- Automatic scrolling to load lazy-loaded images
- Organized output with timestamps and URL-based filenames
- Built with strict TypeScript for type safety

## Installation

### NPM Package

```bash
npm install -g @piouc/screenshot
```

### Local Development

```bash
npm install
npm run build
```

## Usage

### Command Line Interface

```bash
# Basic usage
screenshot https://example.com https://google.com

# Custom output directory
screenshot -o ./my-screenshots https://example.com

# Custom viewport dimensions
screenshot -w 1920 -h 1080 https://example.com

# Custom concurrency and timeout
screenshot -c 4 -t 60 https://example.com

# Multiple options combined
screenshot -o ./output -w 1920 -h 1080 -c 2 -t 30 https://example.com https://google.com
```

### NPX Usage

```bash
npx @piouc/screenshot https://example.com
```

## Options

- `-o, --output <dir>`: Output directory for screenshots (default: ./screenshots)
- `-w, --width <width>`: Viewport width in pixels (default: 1440)
- `-h, --height <height>`: Viewport height in pixels (default: 1080)
- `-c, --concurrency <number>`: Number of parallel screenshots (default: 8)
- `-t, --timeout <seconds>`: Page load timeout in seconds (default: 30)

## Output

Screenshots are saved with descriptive filenames that include:
- Zero-padded sequence number (when multiple URLs)
- Timestamp
- Hostname and path from the URL

Example filenames:
- `01_2024-01-15_10-30-45_example_com.png`
- `02_2024-01-15_10-30-47_google_com_search.png`

## Development

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Scripts

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Development with watch mode
npm run dev

# Clean build directory
npm run clean

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Project Structure

```
├── src/
│   └── index.ts          # Main CLI application
├── bin/
│   └── screenshot-cli.js # Executable entry point
├── dist/                 # Compiled JavaScript output
├── tsconfig.json        # TypeScript configuration
├── package.json         # Package configuration
└── README.md           # This file
```

## Technical Details

- Built with TypeScript with strict type checking
- Uses Puppeteer for browser automation
- Commander.js for CLI argument parsing
- Supports both CommonJS and ES modules
- Follows functional programming patterns (no classes unless necessary)

## License

MIT