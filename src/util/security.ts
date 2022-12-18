import crypto from "crypto";
import { Express, Response } from "express";
import helmet from "helmet";

export function setupSecuritys(app: Express) {
  app.use((_req, res, next) => {
    res.context.cspNonce = crypto.randomBytes(16).toString("hex");
    next();
  });
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net/npm/",
          (_req, res) => `'nonce-${getNonceFromResp(res as Response)}'`,
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net/npm/",
        ],
      },
    })
  );
}

export function getNonceFromResp(resp: Response<any, any>) {
  return resp.context.cspNonce;
}
