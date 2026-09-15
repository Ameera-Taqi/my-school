#!/usr/bin/env node
/**
 * Replace Material <mat-icon>…</mat-icon> with <app-ui-icon name="…"> across the frontend.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (/\.(ts|html)$/.test(entry.name)) files.push(p);
  }
  return files;
}

function relImport(fromFile) {
  let rel = path.relative(path.dirname(fromFile), path.join(root, 'app/shared/icons/ui-icon.component'))
    .replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.ts$/, '');
}

function transformHtml(content) {
  let out = content;
  out = out.replace(/<mat-icon(\s[^>]*)?>\s*([a-z0-9_]+)\s*<\/mat-icon>/gi, (_, attrs = '', name) => {
    const cleaned = (attrs || '')
      .replace(/\s*fontIcon\s*=\s*("[^"]*"|'[^']*'|\{\{[^}]+\}\})/g, '')
      .replace(/\s*fontSet\s*=\s*("[^"]*"|'[^']*')/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `<app-ui-icon name="${name}"${cleaned ? ' ' + cleaned : ''}></app-ui-icon>`;
  });
  out = out.replace(/<mat-icon(\s[^>]*)?>\s*\{\{\s*([^}]+?)\s*\}\}\s*<\/mat-icon>/gi, (_, attrs = '', expr) => {
    const cleaned = (attrs || '').replace(/\s+/g, ' ').trim();
    return `<app-ui-icon [name]="${expr.trim()}"${cleaned ? ' ' + cleaned : ''}></app-ui-icon>`;
  });
  return out;
}

function ensureImport(tsContent, file) {
  const htmlPath = file.replace(/\.ts$/, '.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const uses = /app-ui-icon/.test(tsContent) || /app-ui-icon/.test(html);
  if (!uses) return tsContent;

  let out = tsContent;
  if (!/UiIconComponent/.test(out)) {
    const imp = `import { UiIconComponent } from '${relImport(file)}';`;
    const importMatches = [...out.matchAll(/^import .+;$/gm)];
    if (importMatches.length) {
      const last = importMatches[importMatches.length - 1];
      const idx = last.index + last[0].length;
      out = out.slice(0, idx) + '\n' + imp + out.slice(idx);
    } else {
      out = imp + '\n' + out;
    }
  }

  if (/@Component\s*\(/.test(out) && /imports:\s*\[/.test(out) && !/imports:\s*\[[^\]]*UiIconComponent/.test(out.replace(/\s+/g, ' '))) {
    out = out.replace(/imports:\s*\[/, 'imports: [UiIconComponent, ');
  }
  return out;
}

function stripUnusedMatIcon(tsContent, file) {
  const htmlPath = file.replace(/\.ts$/, '.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  if (/<mat-icon[\s>]/.test(tsContent) || /<mat-icon[\s>]/.test(html)) return tsContent;

  let next = tsContent;
  // Remove MatIconModule from imports arrays
  next = next.replace(/imports:\s*\[([\s\S]*?)\]/g, (full, inner) => {
    if (!inner.includes('MatIconModule')) return full;
    const cleaned = inner
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => s !== 'MatIconModule')
      .join(', ');
    return `imports: [${cleaned}]`;
  });
  next = next.replace(/import \{([^}]*)\} from '@angular\/material\/icon';\n?/g, (full, inner) => {
    const parts = inner.split(',').map(s => s.trim()).filter(Boolean).filter(s => s !== 'MatIconModule');
    if (!parts.length) return '';
    return `import { ${parts.join(', ')} } from '@angular/material/icon';\n`;
  });
  return next;
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  if (file.includes('/shared/icons/')) continue;
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  if (file.endsWith('.html')) {
    after = transformHtml(after);
  } else if (file.endsWith('.ts')) {
    after = transformHtml(after);
    after = ensureImport(after, file);
    after = stripUnusedMatIcon(after, file);
  }
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log('updated', path.relative(path.join(root, '..'), file));
  }
}
console.log(`Done. Files changed: ${changed}`);
