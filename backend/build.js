#!/usr/bin/env node

import { build } from 'esbuild';
import { createWriteStream } from 'fs';
import { readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const handlers = [
  'getQuizzes',
  'getQuiz',
  'getQuestions',
  // Admin handlers
  'generatePresignedUrl',
  'processPdf',
  'getQuestionBank',
  'reviewQuestion',
  'bulkReviewQuestions',
  'getExtractionJobs',
  'publishQuiz',
];

async function buildHandler(handlerName) {
  console.log(`Building ${handlerName}...`);

  try {
    await build({
      entryPoints: [`src/handlers/${handlerName}.ts`],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: `dist/${handlerName}/index.js`,
      external: ['@aws-sdk/*'],
      format: 'cjs',
    });

    console.log(`✓ Built ${handlerName}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to build ${handlerName}:`, error);
    return false;
  }
}

async function zipHandler(handlerName) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(`dist/${handlerName}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✓ Zipped ${handlerName} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(`dist/${handlerName}/`, false);
    archive.finalize();
  });
}

async function main() {
  console.log('Building Lambda functions...\n');

  // Create dist directory
  await mkdir('dist', { recursive: true });

  // Build all handlers
  const buildResults = await Promise.all(
    handlers.map(handler => buildHandler(handler))
  );

  if (buildResults.some(result => !result)) {
    console.error('\n✗ Some builds failed');
    process.exit(1);
  }

  // Zip all handlers
  console.log('\nZipping Lambda functions...\n');
  await Promise.all(handlers.map(handler => zipHandler(handler)));

  console.log('\n✓ All Lambda functions built and zipped successfully');
}

main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
