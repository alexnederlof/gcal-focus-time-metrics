import { NextFunction, Request, Response } from "express";
import { GaxiosError } from "gaxios";
import log from "loglevel";
import ReactDOMServer from "react-dom/server";
import { logOutRequest, userFromContext } from "./google_api/auth.js";
import { ErrorView } from "./layout/ErrorView.js";
import { getNonceFromResp } from "./util/security.js";

export class GcalError extends Error {
  constructor(
    public status: number,
    public message: string,
    public cause?: any
  ) {
    super(message);
  }
}

export function ErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  log.info("Error handler triggered", error);
  let user = userFromContext(req);
  let code = 500;
  if (error.message.includes("no refresh token")) {
    return logOutRequest(res).redirect("/");
  }
  if (error instanceof GcalError) {
    log.error(error.message, error.cause);
    code = error.status;
  }
  const security = { nonce: getNonceFromResp(res) };
  if (error instanceof GaxiosError) {
    let e = (error as GaxiosError).response?.data;
    return res.status(500).send(
      ReactDOMServer.renderToString(
        ErrorView({
          error: e,
          user,
          security,
        })
      )
    );
  } else {
    log.error(error.message, error.cause);
  }
  return res
    .status(code)
    .send(ReactDOMServer.renderToString(ErrorView({ error, user, security })));
}
