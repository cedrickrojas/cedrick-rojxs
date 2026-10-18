const test = require('node:test');
const assert = require('node:assert/strict');
const { createContactHandler } = require('../lib/contact');

const valid = { name: ' Ana ', email: 'ana@example.org', message: ' Hello Cedrick! ', website: '' };
const configured = { GMAIL_USER: 'rojascedrick543@gmail.com', GMAIL_APP_PASSWORD: 'test app password' };

function setup({ env = configured, send } = {}) {
  const deliveries = [];
  let options;
  let closed = false;
  const handler = createContactHandler({
    env,
    createTransport(value) {
      options = value;
      return {
        async sendMail(mail) {
          deliveries.push(mail);
          return send ? send(mail) : { accepted: ['rojascedrick543@gmail.com'] };
        },
        close() { closed = true; },
      };
    },
  });
  return {
    deliveries,
    get options() { return options; },
    get closed() { return closed; },
    async call(body = valid, method = 'POST') {
      const response = {
        headers: {}, statusCode: 200,
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; },
      };
      await handler({ method, body }, response);
      return response;
    },
    handler,
  };
}

test('sends to the owner using authenticated sender and visitor Reply-To', async () => {
  const service = setup();
  const response = await service.call({ ...valid, to: 'other@example.org', _subject: 'Untrusted subject' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(service.options.host, 'smtp.gmail.com');
  assert.equal(service.options.secure, true);
  assert.equal(service.options.auth.pass, 'testapppassword');
  assert.deepEqual(service.deliveries[0].replyTo, { name: 'Ana', address: 'ana@example.org' });
  assert.equal(service.deliveries[0].from.address, configured.GMAIL_USER);
  assert.equal(service.deliveries[0].to, 'rojascedrick543@gmail.com');
  assert.equal(service.deliveries[0].subject, 'New portfolio inquiry - Cedrick Rojas');
  assert.equal(service.deliveries[0].text, 'Name: Ana\nEmail: ana@example.org\n\nHello Cedrick!');
  assert.equal(service.closed, true);
});

test('rejects non-POST methods without sending', async () => {
  const service = setup();
  const response = await service.call(valid, 'GET');
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.equal(service.deliveries.length, 0);
});

test('rejects malformed, blank, oversized, and header-injection inputs', async () => {
  for (const body of [
    null, [], 'not an object',
    { ...valid, name: ' ' },
    { ...valid, name: 'x'.repeat(101) },
    { ...valid, name: 'Ana\r\nBcc: other@example.org' },
    { ...valid, email: 'ana@example.org\r\nBcc: other@example.org' },
    { ...valid, email: 'not-an-email' },
    { ...valid, email: ['ana@example.org'] },
    { ...valid, message: '\t\n' },
    { ...valid, message: 'x'.repeat(5001) },
    { ...valid, message: 'hello\x00world' },
  ]) {
    const service = setup();
    const response = await service.call(body);
    assert.equal(response.statusCode, 400);
    assert.equal(service.deliveries.length, 0);
  }
});

test('handles Vercel malformed JSON without leaking parser details', async () => {
  const service = setup();
  const request = { method: 'POST', get body() { throw new Error('private parser detail'); } };
  const response = {
    setHeader() {}, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; },
  };
  await service.handler(request, response);
  assert.equal(response.statusCode, 400);
  assert(!JSON.stringify(response.body).includes('private'));
});

test('honeypot submissions never send email', async () => {
  const service = setup();
  await service.call({ ...valid, website: 'spam' });
  assert.equal(service.deliveries.length, 0);
  assert.equal(service.options, undefined);
});

test('missing credentials return unavailable rather than claiming success', async () => {
  const service = setup({ env: {} });
  const response = await service.call();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.success, false);
  assert.equal(service.deliveries.length, 0);
});

test('SMTP errors preserve safe error responses and close the transport', async () => {
  const service = setup({ send() { throw new Error('SMTP authentication failed: secret-password'); } });
  const response = await service.call();
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.success, false);
  assert(!JSON.stringify(response.body).includes('secret-password'));
  assert.equal(service.closed, true);
});

test('SMTP recipient rejection is reported as a failure', async () => {
  const service = setup({ send() { return { accepted: [], rejected: ['rojascedrick543@gmail.com'] }; } });
  const response = await service.call();
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.success, false);
});
