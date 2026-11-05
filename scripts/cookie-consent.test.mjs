import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual browser consent code without loading the directory app.
const source = fs.readFileSync(new URL('../site/assets/site.js', import.meta.url), 'utf8');
const start = source.indexOf("  var consentKey = 'fth-consent-v1';");
const end = source.indexOf('  var menuToggle = ', start);
assert.ok(start >= 0 && end > start, 'consent block must be testable');
const consentScript = source.slice(start, end);

function browser({ cookieJar = new Map(), storage = new Map(), blockStorage = false, blockCookies = false } = {}) {
  function element(tag) {
    return {
      tag, hidden: false, children: [], listeners: {}, attributes: {}, focusCalls: 0,
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      focus() { this.focusCalls++; },
      click() { this.listeners.click?.(); }
    };
  }
  const body = element('body');
  const footer = element('footer');
  const document = {
    body, head: element('head'),
    createElement: element,
    querySelector(selector) { return selector === 'footer' ? footer : null; }
  };
  Object.defineProperty(document, 'cookie', {
    get() {
      if (blockCookies) throw Error('Cookie access restricted');
      return [...cookieJar].map(([key, value]) => key + '=' + value).join('; ');
    },
    set(value) {
      if (blockCookies) throw Error('Cookie access restricted');
      const [pair, ...flags] = value.split(';');
      const delimiter = pair.indexOf('=');
      const name = pair.slice(0, delimiter).trim();
      const next = pair.slice(delimiter + 1);
      if (flags.some(flag => flag.trim().toLowerCase() === 'max-age=0')) cookieJar.delete(name);
      else cookieJar.set(name, next);
    }
  });
  const events = [];
  const window = {
    localStorage: {
      getItem(key) { if (blockStorage) throw Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blockStorage) throw Error('Storage blocked'); storage.set(key, value); },
      removeItem(key) { if (blockStorage) throw Error('Storage blocked'); storage.delete(key); }
    },
    location: { protocol: 'https:', hostname: 'free-tier.eplus.dev', reload() {} },
    dispatchEvent(event) { events.push(event.type); }
  };
  vm.runInNewContext(consentScript, { document, window, Event: class { constructor(type) { this.type = type; } } });
  const notice = body.children[0];
  const settings = footer.children[0];
  const actions = notice.children[1];
  return { notice, settings, decline: actions.children[0], allow: actions.children[1], cookieJar, storage, events };
}

test('first-visit allow persists consent without scrolling to footer', () => {
  const page = browser();
  assert.equal(page.notice.hidden, false);
  page.allow.click();
  assert.equal(page.notice.hidden, true);
  assert.equal(page.storage.get('fth-consent-v1'), 'accepted');
  assert.equal(page.cookieJar.get('fth-consent-v1'), 'accepted');
  assert.equal(page.settings.focusCalls, 0, 'footer focus would jump iPhone users down the page');
  assert.deepEqual(page.events, ['fth-consent-change']);
});

test('Safari with inaccessible localStorage remembers an existing first-party consent cookie', () => {
  const cookies = new Map([['unrelated', 'ok']]);
  const first = browser({ cookieJar: cookies, blockStorage: true });
  first.decline.click();
  assert.equal(cookies.get('fth-consent-v1'), 'rejected');
  const next = browser({ cookieJar: cookies, blockStorage: true });
  assert.equal(next.notice.hidden, true);
});

test('Safari can fall back to localStorage when cookies are disabled', () => {
  const storage = new Map();
  const first = browser({ storage, blockCookies: true });
  assert.doesNotThrow(() => first.allow.click());
  assert.equal(browser({ storage, blockCookies: true }).notice.hidden, true);
});

test('both storage mechanisms blocked never prevent dismissing this visit', () => {
  const page = browser({ blockStorage: true, blockCookies: true });
  assert.doesNotThrow(() => page.decline.click());
  assert.equal(page.notice.hidden, true);
});

test('cookie settings reopens the notice and returns focus to its trigger', () => {
  const page = browser({ cookieJar: new Map([['fth-consent-v1', 'accepted']]) });
  assert.equal(page.notice.hidden, true);
  page.settings.click();
  assert.equal(page.notice.hidden, false);
  page.decline.click();
  assert.equal(page.notice.hidden, true);
  assert.equal(page.settings.focusCalls, 1);
});

test('mobile cookie banner accounts for iPhone safe areas and allows scrolling', () => {
  const css = fs.readFileSync(new URL('../site/assets/site.css', import.meta.url), 'utf8');
  assert.match(css, /\.cookie-notice\{[^}]*max-height:calc\(100dvh/);
  assert.match(css, /\.cookie-notice\{[^}]*overflow-y:auto/);
  assert.match(css, /@media\(max-width:680px\)\{\s*\.cookie-notice\{[^}]*safe-area-inset-bottom/);
  assert.match(css, /\.cookie-actions button\{min-width:0;min-height:44px/);
});
