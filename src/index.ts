#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { program } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';

interface Options {
  output: string;
  size: string[];
  concurrency: string;
  timeout: string;
}

interface ScreenshotResult {
  url: string;
  success: boolean;
  filePath?: string;
  error?: string;
}


interface Size {
  width: number;
  height: number;
}

interface ScreenshotTask {
  url: string;
  urlIndex: number;
  size: Size;
  sizeIndex: number;
}


program
  .version('1.0.0')
  .description('Take full-page screenshots of multiple URLs')
  .option('-o, --output <dir>', 'Output directory for screenshots', './screenshots')
  .option('-s, --size <size>', 'Viewport size in WIDTHxHEIGHT format (e.g., 1000x1000). Can be specified multiple times', (value, previous: string[]) => {
    return [...previous, value];
  }, [])
  .option('-c, --concurrency <number>', 'Number of parallel screenshots', '8')
  .option('-t, --timeout <seconds>', 'Page load timeout in seconds', '30')
  .argument('<urls...>', 'URLs to capture')
  .parse(process.argv);

const options = program.opts<Options>();
const urls = program.args;

// If no size is specified, use default
if (options.size.length === 0) {
  options.size = ['1440x1080'];
}

const parseSize = (sizeStr: string): Size => {
  const match = sizeStr.match(/^(\d+)x(\d+)$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid size format: ${sizeStr}. Expected format: WIDTHxHEIGHT (e.g., 1000x1000)`);
  }
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10)
  };
};

const takeScreenshot = async (task: ScreenshotTask, outputDir: string, totalTasks: number): Promise<ScreenshotResult> => {
  const browser = await puppeteer.launch({
    headless: true
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setViewport({
      width: task.size.width,
      height: task.size.height
    });
    
    console.log(`Capturing: ${task.url} (${task.size.width}x${task.size.height})`);
    await page.goto(task.url, { 
      waitUntil: 'networkidle2',
      timeout: parseInt(options.timeout, 10) * 1000
    });
    
    await page.evaluate(async (): Promise<void> => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 500);
          }
        }, 100);
      });
    });
    
    await page.evaluate(async (): Promise<void> => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map((img) => {
        const htmlImg = img instanceof HTMLImageElement ? img : null;
        if (!htmlImg) return Promise.resolve();
        if (htmlImg.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          htmlImg.addEventListener('load', () => resolve());
          htmlImg.addEventListener('error', () => resolve());
          setTimeout(() => resolve(), 5000);
        });
      }));
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const urlObj = new URL(task.url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_').replace(/^_+|_+$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
    
    const sizeIndexStr = String(task.sizeIndex + 1).padStart(2, '0');
    const urlIndexStr = String(task.urlIndex + 1).padStart(2, '0');
    
    const baseFilename = totalTasks > 1 
      ? `${urlIndexStr}_${sizeIndexStr}_${timestamp}_${task.size.width}x${task.size.height}_${hostname}${pathname || ''}`
      : `${timestamp}_${task.size.width}x${task.size.height}_${hostname}${pathname || ''}`;
    
    const pngFilename = `${baseFilename}.png`;
    const filePath = path.join(outputDir, pngFilename);
    
    await page.screenshot({
      // @ts-expect-error TypeScript template literal type checking is too strict for dynamic paths
      path: filePath,
      fullPage: true
    });
    
    console.log(`✓ Saved: ${filePath}`);
    return { url: task.url, success: true, filePath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`✗ Failed to capture ${task.url}: ${errorMessage}`);
    return { url: task.url, success: false, error: errorMessage };
  } finally {
    await browser.close();
  }
};

const processInBatches = async <T, R>(
  items: T[], 
  batchSize: number, 
  processor: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchPromises = batch.map((item, index) => {
      return new Promise<R>(async (resolve) => {
        await new Promise(r => setTimeout(r, index * 1000));
        const result = await processor(item);
        resolve(result);
      });
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  return results;
};

const main = async (): Promise<void> => {
  if (urls.length === 0) {
    console.error('Error: At least one URL is required');
    process.exit(1);
  }
  
  // Parse all sizes
  const sizes: Size[] = [];
  for (const sizeStr of options.size) {
    try {
      sizes.push(parseSize(sizeStr));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(errorMessage);
      process.exit(1);
    }
  }
  
  const outputDir = path.resolve(options.output);
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory: ${outputDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to create output directory: ${errorMessage}`);
    process.exit(1);
  }
  
  // Create tasks for all size/URL combinations
  const tasks: ScreenshotTask[] = [];
  for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
      const currentUrl = urls[urlIndex];
      const currentSize = sizes[sizeIndex];
      if (!currentUrl || !currentSize) continue;
      
      const fullUrl = currentUrl.startsWith('http://') || currentUrl.startsWith('https://') 
        ? currentUrl 
        : `https://${currentUrl}`;
      
      tasks.push({
        url: fullUrl,
        urlIndex,
        size: currentSize,
        sizeIndex
      });
    }
  }
  
  const concurrency = parseInt(options.concurrency, 10);
  console.log(`Processing ${urls.length} URLs in ${sizes.length} sizes (${tasks.length} total screenshots) with concurrency: ${concurrency}`);
  
  const results = await processInBatches(
    tasks,
    concurrency,
    (task) => takeScreenshot(task, outputDir, tasks.length)
  );
  
  console.log('\n=== Summary ===');
  const successful = results.filter(r => r.success).length;
  console.log(`Total: ${results.length} | Success: ${successful} | Failed: ${results.length - successful}`);
  
  if (successful < results.length) {
    process.exit(1);
  }
};

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});