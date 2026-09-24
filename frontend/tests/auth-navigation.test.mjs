import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtectedDestination, getLoginDestination, getPostLoginDestination, initAuthNavigation } from '../js/utils/auth-navigation.js';

const origin = 'https://praman.example';
let stored, clickHandler, navigated;
function setup(path = '/', user = null) {
  stored = new Map(user ? [['praman_user', JSON.stringify({id: 'test-user', ...user})], ['praman_token', 'test-session']] : []);
  globalThis.localStorage = { getItem: key => stored.get(key) || null };
  const url = new URL(path, origin);
  globalThis.window = { location: { origin, href: url.href, search: url.search,
    assign: value => { navigated = value; }, replace: value => { navigated = value; } } };
  globalThis.document = { addEventListener: (type, handler) => { clickHandler = handler; } };
  navigated = null;
  clickHandler = null;
}

test('guest actions retain exact destination through login', () => {
  for (const target of ['/pages/analyze.html', '/pages/standard-details.html?id=STD-001', '/pages/compare.html?ids=STD-001,STD-002#matrix']) {
    setup();
    assert.equal(initAuthNavigation(), true);
    let prevented = false;
    clickHandler({button: 0, target: {closest: () => ({href: origin + target, hasAttribute: () => false})}, preventDefault: () => { prevented = true; }});
    assert.ok(prevented);
    assert.equal(navigated, '/pages/login.html?redirect=' + encodeURIComponent(target));
    setup(navigated);
    assert.equal(getLoginDestination(), target);
    stored.set('praman_user', JSON.stringify({role: 'Procurement Officer'}));
    assert.equal(getPostLoginDestination(), target);
  }
});

test('signed-in links navigate normally, including Compare', () => {
  setup('/', {role: 'Procurement Officer'});
  initAuthNavigation();
  clickHandler({button: 0, target: {closest: () => ({href: origin + '/pages/compare.html?id1=STD-001', hasAttribute: () => false})}, preventDefault: () => assert.fail('Logged-in navigation was blocked')});
  assert.equal(navigated, null);
});

test('direct protected visits redirect guests and permit signed-in users', () => {
  setup('/pages/compare.html?ids=STD-001');
  assert.equal(initAuthNavigation(), false);
  assert.equal(navigated, '/pages/login.html?redirect=%2Fpages%2Fcompare.html%3Fids%3DSTD-001');
  setup('/pages/analyze.html', {role: 'Procurement Officer'});
  assert.equal(initAuthNavigation(), true);
  assert.equal(navigated, null);
});

test('reject external, script, and non-workspace return URLs', () => {
  setup();
  for (const value of ['https://evil.example/pages/analyze.html', '//evil.example/pages/compare.html', 'javascript:alert(1)', '/pages/login.html', '/pages/about.html', 'http://[']) {
    assert.equal(getProtectedDestination(value), null);
  }
});

test('normal logins keep role defaults; explicit destinations take precedence', () => {
  setup('/pages/login.html', {role: 'Procurement Officer'});
  assert.equal(getPostLoginDestination(), '/pages/dashboard.html');
  setup('/pages/login.html', {role: 'Admin'});
  assert.equal(getPostLoginDestination(), '/pages/admin.html');
  setup('/pages/login.html?redirect=%2Fpages%2Fanalyze.html', {role: 'Admin'});
  assert.equal(getPostLoginDestination(), '/pages/analyze.html');
});
