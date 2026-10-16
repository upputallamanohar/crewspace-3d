import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  absWorkingDir: projectRoot,
  entryPoints: ['components/standalone.tsx'],
  bundle: true,
  write: false,
  outfile: 'crewspace-bundle.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  jsx: 'automatic',
  minify: true,
  legalComments: 'inline',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': projectRoot },
});

const javascript = result.outputFiles.find(file => file.path.endsWith('.js'))?.text;
const stylesheet = result.outputFiles.find(file => file.path.endsWith('.css'))?.text;
if (!javascript || !stylesheet) throw new Error('The standalone bundle is incomplete.');
const favicon = await readFile(path.join(projectRoot, 'public/favicon.svg'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#fffaf3">
<meta name="description" content="A vivid interactive 3D playground. Ten projects, animated sculptures, and your next big idea.">
<title>Crewspace — Dream it. Crew it. Do it.</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}">
<style>${stylesheet.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body>
<div id="root"></div>
<noscript>Please enable JavaScript to use Crewspace's ten interactive workspaces.</noscript>
<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
const output = path.resolve(projectRoot, '..', 'crewspace.html');
await writeFile(output, html, 'utf8');
console.log(`Standalone website: ${output}`);
console.log(`${Math.round(Buffer.byteLength(html) / 1024)} KB, with React, styles, and all ten validated workflows included.`);

