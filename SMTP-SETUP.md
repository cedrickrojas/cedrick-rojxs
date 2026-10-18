# Gmail SMTP setup

The contact form posts to `/api/contact` on the same Vercel deployment. The server
uses Nodemailer and Gmail SMTP over TLS to send to `rojascedrick543@gmail.com`.
The visitor's address is used as Reply-To. SMTP credentials never go into the HTML.

## Enable sending

1. Sign into the Google account `rojascedrick543@gmail.com`.
2. Enable [2-Step Verification](https://myaccount.google.com/security).
3. Open [App Passwords](https://myaccount.google.com/apppasswords), create one called
   `Portfolio`, and copy the generated password. Use this app password, not your
   normal Google password. If the option is missing, see [Google's guide](https://support.google.com/accounts/answer/185833).
4. In the portfolio's Vercel project, open **Settings → Environment Variables**.
   Add these for **Production** (and Preview if you want preview deployments to send):

   | Name | Value |
   | --- | --- |
   | `GMAIL_USER` | `rojascedrick543@gmail.com` |
   | `GMAIL_APP_PASSWORD` | The generated app password |

   Mark the app password as sensitive when available. Do not put it in a GitHub
   file, frontend code, screenshot, or chat message.
5. Deploy this code after saving the variables. For an already deployed version,
   redeploy so the new variables are applied. The repository's `vercel.json` sets
   the build command and static output; the root `api/contact.js` becomes a Vercel Function.
6. Submit a test from the deployed contact form. It stays on the portfolio page.
   Check Gmail Inbox and Spam for **New portfolio inquiry - Cedrick Rojas**.
   Reply should target the visitor's email.

## Checks and local development

Run `npm ci`, `npm test`, and `npm run build`. Static output contains only
`index.html`, `picture/`, and `assets/`; API source and env files are excluded.
For local sending, create an ignored `.env.local` using `.env.example`, then use
`npx vercel dev` to serve both the site and API. A plain HTML Live Server cannot
run the Node.js SMTP endpoint.

Until credentials are configured, the API returns an unavailable error and the
form preserves the visitor's message. Successful sending means Gmail accepted
the message; final inbox placement must be checked in the recipient's mailbox.
The hidden honeypot catches simple bots; there is no CAPTCHA or shared rate limiter.
