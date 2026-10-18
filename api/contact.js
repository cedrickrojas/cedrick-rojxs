const nodemailer = require('nodemailer');
const { createContactHandler } = require('../lib/contact');

module.exports = createContactHandler({
  createTransport: options => nodemailer.createTransport(options),
  env: process.env,
});
