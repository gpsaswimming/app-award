import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createMailer } from './email.js';

const cfg = loadConfig();
const mailer = createMailer(cfg.smtp);
const app = buildApp({ cfg, mailer });

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: '0.0.0.0' })
  .then((addr) => app.log.info(`app-award-api listening on ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
