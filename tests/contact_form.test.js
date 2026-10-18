const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const script = fullScript.split('/* ===== CONTACT FORM VIA GMAIL SMTP ===== */')[1]
  .split('/* ===== PROJECT CTA TO CONTACT ===== */')[0];

function setup(fetchResponse) {
  function field(value) {
    return {
      value, readOnly: false, error: '', handlers: {},
      setCustomValidity(error) { this.error = error; },
      addEventListener(event, handler) { this.handlers[event] = handler; },
    };
  }
  const elements = {
    cname: field(' Ana '), cemail: field('ana@example.org'), cmsg: field(' Hello Cedrick '),
    sendBtn: { disabled: false }, sendLabel: { textContent: 'Send Message' },
    formMsg: { textContent: '', style: {}, classList: { add() {}, remove() {} } },
    contactForm: {
      action: 'https://portfolio.example/api/contact', handlers: {}, attrs: {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
      setAttribute(key, value) { this.attrs[key] = value; },
      removeAttribute(key) { delete this.attrs[key]; },
      reportValidity() { return ['cname', 'cemail', 'cmsg'].every(id => !elements[id].error); },
      reset() { ['cname', 'cemail', 'cmsg'].forEach(id => { elements[id].value = ''; }); },
    },
  };
  const calls = [];
  let timer;
  vm.runInNewContext(script, {
    document: { getElementById(id) { return elements[id]; } },
    FormData: class {
      *[Symbol.iterator]() {
        yield ['name', elements.cname.value];
        yield ['email', elements.cemail.value];
        yield ['message', elements.cmsg.value];
        yield ['website', ''];
      }
    },
    AbortController,
    setTimeout(fn) { timer = fn; return 1; }, clearTimeout() { timer = null; },
    async fetch(url, options) { calls.push({ url, options }); return fetchResponse(url, options); },
  });
  return {
    elements, calls,
    timeout() { timer(); },
    async submit() {
      let prevented = false;
      await elements.contactForm.handlers.submit({ preventDefault() { prevented = true; } });
      assert(prevented, 'The visitor must stay on the portfolio');
    },
  };
}

test('inline form script parses and targets the same-site SMTP API', () => {
  new vm.Script(fullScript);
  assert(html.includes('action="/api/contact"'));
  assert(!html.includes('formsubmit.co'));
  assert(!html.includes('GMAIL_APP_PASSWORD'));
});

test('successful request clears the form only after server confirmation', async () => {
  const form = setup(async () => ({ ok: true, json: async () => ({ success: true }) }));
  await form.submit();
  assert.equal(form.calls.length, 1);
  assert.equal(form.calls[0].url, 'https://portfolio.example/api/contact');
  assert.equal(JSON.parse(form.calls[0].options.body).message, 'Hello Cedrick');
  assert.equal(form.elements.cmsg.value, '');
  assert(form.elements.formMsg.textContent.includes('Message sent'));
  assert.equal(form.elements.sendBtn.disabled, false);
  assert.equal(form.elements.cmsg.readOnly, false);
});

test('server failure, unconfirmed success, and network failure keep the message', async () => {
  for (const response of [
    async () => ({ ok: false, json: async () => ({ success: false }) }),
    async () => ({ ok: true, json: async () => ({ success: false }) }),
    async () => { throw new Error('offline'); },
    async () => ({ ok: true, json: async () => { throw new SyntaxError('not JSON'); } }),
  ]) {
    const form = setup(response);
    await form.submit();
    assert.equal(form.elements.cmsg.value, 'Hello Cedrick');
    assert(form.elements.formMsg.textContent.includes('Your message is still here'));
    assert.equal(form.elements.sendBtn.disabled, false);
    assert.equal(form.elements.cmsg.readOnly, false);
  }
});

test('pending requests prevent duplicate submissions and timeout restores editing', async () => {
  const form = setup((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('timeout')));
  }));
  const pending = form.submit();
  assert.equal(form.elements.cmsg.readOnly, true);
  await form.submit();
  assert.equal(form.calls.length, 1);
  form.timeout();
  await pending;
  assert.equal(form.elements.cmsg.value, 'Hello Cedrick');
  assert.equal(form.elements.sendBtn.disabled, false);
});

test('whitespace-only messages are blocked before any server request', async () => {
  const form = setup(async () => { throw new Error('must not fetch'); });
  form.elements.cmsg.value = '   ';
  await form.submit();
  assert.equal(form.calls.length, 0);
  assert.equal(form.elements.sendBtn.disabled, false);
});
