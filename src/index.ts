#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { program } from 'commander';
import path from 'path';
import { promises as fs } from 'fs';

interface Options {
  output: string;
  width: string;
  height: string;
  concurrency: string;
  timeout: string;
}

interface ScreenshotResult {
  url: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

interface UrlWithIndex {
  url: string;
  index: number;
}


program
  .version('1.0.0')
  .description('Take full-page screenshots of multiple URLs')
  .option('-o, --output <dir>', 'Output directory for screenshots', './screenshots')
  .option('-w, --width <width>', 'Viewport width', '1440')
  .option('-h, --height <height>', 'Viewport height', '1080')
  .option('-c, --concurrency <number>', 'Number of parallel screenshots', '8')
  .option('-t, --timeout <seconds>', 'Page load timeout in seconds', '30')
  .argument('<urls...>', 'URLs to capture')
  .parse(process.argv);

const options = program.opts<Options>();
const urls = program.args;

const takeScreenshot = async (url: string, outputDir: string, index: number, totalCount: number): Promise<ScreenshotResult> => {
  const browser = await puppeteer.launch({
    headless: true
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setViewport({
      width: parseInt(options.width, 10),
      height: parseInt(options.height, 10)
    });
    
    console.log(`Capturing: ${url}`);
    await page.goto(url, { 
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
    
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathname = urlObj.pathname.replace(/\//g, '_').replace(/^_+|_+$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
    
    const baseFilename = totalCount > 1 
      ? `${String(index + 1).padStart(String(totalCount).length, '0')}_${timestamp}_${hostname}${pathname || ''}` 
      : `${timestamp}_${hostname}${pathname || ''}`;
    
    const pngFilename = `${baseFilename}.png`;
    const filePath = path.join(outputDir, pngFilename);
    
    await page.screenshot({
      // @ts-expect-error TypeScript template literal type checking is too strict for dynamic paths
      path: filePath,
      fullPage: true
    });
    
    console.log(`✓ Saved: ${filePath}`);
    return { url, success: true, filePath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`✗ Failed to capture ${url}: ${errorMessage}`);
    return { url, success: false, error: errorMessage };
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
  
  const outputDir = path.resolve(options.output);
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory: ${outputDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to create output directory: ${errorMessage}`);
    process.exit(1);
  }
  
  const concurrency = parseInt(options.concurrency, 10);
  console.log(`Processing ${urls.length} URLs with concurrency: ${concurrency}`);
  
  const urlsWithIndices: UrlWithIndex[] = urls.map((url, index) => {
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    return { url: fullUrl, index };
  });
  
  const results = await processInBatches(
    urlsWithIndices,
    concurrency,
    ({ url, index }) => takeScreenshot(url, outputDir, index, urls.length)
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