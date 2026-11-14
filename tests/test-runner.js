// A tiny test runner: register tests with test(), then call runTests().

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assert(condition, message = 'Expected condition to be true') {
  if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, message = '') {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message ? `${message}: ` : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertDeepEqual(actual, expected, message = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message ? `${message}: ` : ''}expected ${b}, got ${a}`);
}

export async function runTests(output) {
  const results = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
  }

  const failed = results.filter((r) => !r.passed);
  const summary = failed.length === 0
    ? `All ${results.length} tests passed`
    : `${failed.length} of ${results.length} tests failed`;

  document.title = `${failed.length === 0 ? 'PASS' : 'FAIL'}: ${summary}`;
  output.innerHTML = `
    <h1 class="${failed.length === 0 ? 'pass' : 'fail'}">${summary}</h1>
    <ul>${results.map((r) => `
      <li class="${r.passed ? 'pass' : 'fail'}">
        ${r.passed ? '✓' : '✗'} ${escape(r.name)}
        ${r.passed ? '' : `<div class="error">${escape(r.error)}</div>`}
      </li>`).join('')}
    </ul>`;

  window.testResults = { total: results.length, failed: failed.length, results };
  return window.testResults;
}

function escape(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}
