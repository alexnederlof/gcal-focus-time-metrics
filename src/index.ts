import cookies from 'cookie-parser';
import { config } from 'dotenv';
import express from 'express';
import promBundle from 'express-prom-bundle';
import expressContext from 'express-request-context';
import log, { LogLevelDesc } from 'loglevel';
import prometheus from 'prom-client';
import ReactDOMServer from 'react-dom/server';
import { ErrorHandler } from './errors.js';
import { GoogleAuth, userFromContext } from './google_api/auth.js';
import { renderFocusTime } from './handlers/focusTime.js';
import { Welcome } from './layout/Welcome.js';
import { setupSecuritys as setupSecurity } from './util/security.js';
import { getNonceFromResp } from './util/security.js';

async function server() {
  checkConfig();

  const app = express();
  app.use(setupMetrics());
  app.use(expressContext.default());
  app.use(cookies());
  setupSecurity(app);
  let gAuth = await GoogleAuth.create();
  app.get("/oauth/callback", gAuth.handleCallBack());
  app.get("/logout", gAuth.handleLogOut());
  app.get("/_health", (_, res) => res.send("IMOK"));
  app.use(gAuth.requireLogin());
  app.get("/focus-time", renderFocusTime(gAuth));

  app.get("/", async (req, resp, next) => {
    try {
      let user = userFromContext(req);
      resp.send(
        ReactDOMServer.renderToString(
          Welcome({
            user: { name: user.given_name || user.name, picture: user.picture },
            userEmail: user.email,
            security: {
              nonce: getNonceFromResp(resp),
            },
          })
        )
      );
    } catch (e) {
      next(e);
    }
  });

  app.use(ErrorHandler);

  let port = Number(process.env["NODE_PORT"] || 3000);
  let server = app.listen(port, () =>
    log.info(`Started @ http://localhost:${port}`)
  );

  process.on("SIGINT", server.close);
  process.on("SIGTERM", server.close);
  process.on("SIGHUP", server.close);
}

function setupMetrics() {
  prometheus.collectDefaultMetrics();
  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
  });
  return metricsMiddleware;
}

function checkConfig() {
  config();
  if (!process.env["GOOGLE_CUSTOMER_ID"]?.startsWith("C")) {
    throw Error("Please configure your GOOGLE_CUSTOMER_ID");
  }
  log.setLevel((process.env["LOG_LEVEL"] || "info") as LogLevelDesc);
}

server().catch((e) => {
  log.error(e);
  process.exit(1);
});
