import { NextFunction, Request, Response } from "express";
import { GaxiosError } from "gaxios";
import ReactDOMServer from "react-dom/server";
import { logOutRequest, userFromContext } from "./auth.js";
import { ErrorView } from "./layout/ErrorView.js";

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
  console.log("ERror handler triggered");
  let user = userFromContext(req);
  let code = 500;
  if (error.message.includes("no refresh token")) {
    return logOutRequest(res).redirect("/");
  }
  if (error instanceof GcalError) {
    console.error(error.message, error.cause);
    code = error.status;
  }
  if (error instanceof GaxiosError) {
    let e = (error as GaxiosError).response?.data;
    return res
      .status(500)
      .send(ReactDOMServer.renderToString(ErrorView({ error: e, user })));
  } else {
    console.error(error.message, error.cause);
  }
  return res
    .status(code)
    .send(ReactDOMServer.renderToString(ErrorView({ error, user })));
}
