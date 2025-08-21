# @piouc/screenshot

A TypeScript CLI tool for taking full-page screenshots of multiple URLs using Puppeteer.

## Features

- Take full-page screenshots of multiple URLs concurrently
- Multiple viewport sizes support with WIDTHxHEIGHT format (e.g., 1000x1000)
- Automatic scrolling to load lazy-loaded images
- Organized output with size and URL indexing in filenames
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

# Custom viewport size (WIDTHxHEIGHT format)
screenshot -s 1920x1080 https://example.com

# Multiple viewport sizes
screenshot -s 800x600 -s 1200x900 -s 1920x1080 https://example.com

# Custom concurrency and timeout
screenshot -c 4 -t 60 https://example.com

# Multiple options combined
screenshot -o ./output -s 1920x1080 -s 800x600 -c 2 -t 30 https://example.com https://google.com
```

### NPX Usage

```bash
npx @piouc/screenshot https://example.com
```

## Options

- `-o, --output <dir>`: Output directory for screenshots (default: ./screenshots)
- `-s, --size <size>`: Viewport size in WIDTHxHEIGHT format (e.g., 1000x1000). Can be specified multiple times for multiple sizes (default: 1440x1080)
- `-c, --concurrency <number>`: Number of parallel screenshots (default: 8)
- `-t, --timeout <seconds>`: Page load timeout in seconds (default: 30)

## Output

Screenshots are saved with descriptive filenames that include:
- Size index (zero-padded, 2 digits)
- URL index (zero-padded, 2 digits)
- Timestamp
- Viewport size (WIDTHxHEIGHT)
- Hostname and path from the URL

Example filenames with multiple sizes and URLs:
- `01_01_2024-01-15_10-30-45_800x600_example_com.png` (Size 1, URL 1)
- `01_02_2024-01-15_10-30-47_800x600_google_com.png` (Size 1, URL 2)
- `02_01_2024-01-15_10-30-49_1200x900_example_com.png` (Size 2, URL 1)
- `02_02_2024-01-15_10-30-51_1200x900_google_com.png` (Size 2, URL 2)

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
│   └── cli.js            # Executable entry point
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