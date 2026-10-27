import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  START_LABEL, START_LABEL_DESKTOP, isTitleControl, shouldStartFromTitleEvent, wireTitleStart,
} from '../src/title-start.js';

function el(tag, id, kids = []) {
  const handlers = {};
  const node = {
    tagName: tag.toUpperCase(), id, textContent: '',
    children: kids, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, getAttribute() { return null; },
    contains(other) { return other === node || kids.includes(other) || kids.some(k => k.contains?.(other)); },
    closest(sel) {
      const parts = sel.split(',');
      for (const part of parts) {
        const t = part.trim();
        if (t === 'select' && tag === 'select') return node;
        if (t === 'input' && tag === 'input') return node;
        if (t === 'textarea' && tag === 'textarea') return node;
        if (t === 'a' && tag === 'a') return node;
        if (t === 'label' && tag === 'label') return node;
      }
      return null;
    },
    addEventListener(e, f) { (handlers[e] ??= []).push(f); },
    removeEventListener(e, f) { handlers[e] = (handlers[e] || []).filter(x => x !== f); },
    emit(e, data = {}) { for (const f of handlers[e] || []) f({ preventDefault() {}, target: node, ...data }); },
    _handlers: handlers,
  };
  for (const k of kids) k.parent = node;
  return node;
}

function setupDom() {
  const start = el('button', 'start');
  const rotate = el('button', 'rotate-start');
  const select = el('select', 'difficulty');
  const title = el('section', 'title', [select, start]);
  // closest walks: give select a closest that finds itself; title nodes need parent walk
  select.closest = (sel) => isTitleControl({ closest: (s) => s.split(',').map(x=>x.trim()).includes('select') ? select : null }) ? select : null;
  // simpler: patch kids' closest via parent chain
  const withClosest = (node) => {
    node.closest = (sel) => {
      let cur = node;
      while (cur) {
        const tags = sel.split(',').map(s => s.trim());
        for (const t of tags) {
          if (t === cur.tagName.toLowerCase()) return cur;
          if (t === 'label' && cur.tagName === 'LABEL') return cur;
        }
        cur = cur.parent || null;
      }
      return null;
    };
    return node;
  };
  withClosest(start); withClosest(rotate); withClosest(select); withClosest(title);
  select.parent = title; start.parent = title;
  const map = { start, 'rotate-start': rotate, title, difficulty: select };
  const doc = {
    getElementById: id => map[id] || null,
  };
  return { doc, start, rotate, select, title };
}

test('phone labels prefer TAP TO START', () => {
  assert.equal(START_LABEL, 'TAP TO START');
  assert.match(START_LABEL_DESKTOP, /RESCUE|START/i);
});

test('form controls do not count as start taps; empty title and start button do', () => {
  const { start, select, title } = setupDom();
  assert.equal(isTitleControl(select), true);
  assert.equal(isTitleControl(start), false);
  assert.equal(shouldStartFromTitleEvent(select, start), false);
  assert.equal(shouldStartFromTitleEvent(start, start), true);
  assert.equal(shouldStartFromTitleEvent(title, start), true);
});

test('wireTitleStart fires begin from start button, rotate CTA, and title tap-anywhere', () => {
  const { doc, start, rotate, select, title } = setupDom();
  let n = 0;
  const dispose = wireTitleStart({ doc, begin: () => { n += 1; }, coarse: true });
  assert.equal(start.textContent, 'TAP TO START');
  assert.equal(rotate.textContent, 'TAP TO START');
  start.emit('click');
  assert.equal(n, 1);
  rotate.emit('pointerup', { pointerType: 'touch' });
  assert.equal(n, 2);
  title.emit('pointerup', { pointerType: 'touch', target: title });
  assert.equal(n, 3);
  // Selecting difficulty must not start.
  title.emit('pointerup', { pointerType: 'touch', target: select });
  assert.equal(n, 3);
  dispose();
  start.emit('click');
  assert.equal(n, 3);
});

test('index.html exposes TAP TO START and rotate-start for phones', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /id="start"/);
  assert.match(html, /TAP TO START/);
  assert.match(html, /id="rotate-start"/);
  assert.match(html, /body:not\(\.playing\) #rotate/);
  assert.match(html, /pointer-events:none/); // canvas inert on title
  assert.match(html, /Or tap anywhere/);
});
