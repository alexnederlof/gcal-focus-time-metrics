import cookies from "cookie-parser";
import { config } from "dotenv";
import express from "express";
import expressContext from "express-request-context";
import ReactDOMServer from "react-dom/server";
import { ErrorHandler } from "./errors.js";
import { GoogleAuth, userFromContext } from "./google_api/auth.js";
import { renderFocusTime } from "./handlers/focusTime.js";
import { Welcome } from "./layout/Welcome.js";

async function server() {
  checkConfig();

  const app = express();
  app.use(cookies());
  app.use(expressContext.default());
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
    console.log(`Started @ http://localhost:${port}`)
  );

  process.on("SIGINT", server.close);
  process.on("SIGTERM", server.close);
  process.on("SIGHUP", server.close);
}

function checkConfig() {
  config();
  if (!process.env["GOOGLE_CUSTOMER_ID"]?.startsWith("C")) {
    throw Error("Please configure your GOOGLE_CUSTOMER_ID");
  }
}

server().catch((e) => {
  console.error(e);
  process.exit(1);
});
