import cookies from "cookie-parser";
import express from "express";
import ReactDOMServer from "react-dom/server";
import { GoogleAuth } from "./auth";
import { renderFocusTime } from "./handlers/focusTime";
import { Welcome } from "./layout/Welcome";

async function server() {
  const app = express();
  app.use(cookies());
  let gAuth = await GoogleAuth.create();
  app.get("/oauth/callback", gAuth.handleCallBack());
  app.get("/logout", gAuth.handleLogOut());
  app.use(gAuth.requireLogin());
  app.get("/focus-time", renderFocusTime(gAuth));
  app.get("/", async (req, resp) => {
    resp.send(ReactDOMServer.renderToString(Welcome({})));
  });

  let port = Number(process.env["NODE_PORT"] || 3000);
  let server = app.listen(port, () =>
    console.log(`Started @ http://localhost:${port}`)
  );

  process.on("SIGINT", server.close);
  process.on("SIGTERM", server.close);
  process.on("SIGHUP", server.close);
}

server().catch((e) => {
  console.error(e);
  process.exit(1);
});
