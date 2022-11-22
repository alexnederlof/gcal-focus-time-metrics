import cookies from "cookie-parser";
import express from "express";
import expressContext from "express-request-context";
import { google } from "googleapis";
import ReactDOMServer from "react-dom/server";
import { GoogleAuth, userFromContext } from "./auth";
import { SimpleGcal } from "./gcal";
import { SimpleGroups } from "./gGroups";
import { renderFocusTime } from "./handlers/focusTime";
import { Welcome } from "./layout/Welcome";

async function server() {
  const app = express();
  app.use(cookies());
  app.use(expressContext());
  let gAuth = await GoogleAuth.create();
  app.get("/oauth/callback", gAuth.handleCallBack());
  app.get("/logout", gAuth.handleLogOut());
  app.get("/_health", (_, res) => res.send("IMOK"));
  app.use(gAuth.requireLogin());
  app.get("/focus-time", renderFocusTime(gAuth));
  app.get("/", async (req, resp) => {
    let user = userFromContext(req);
    let cal = new SimpleGcal(gAuth.client);
    let groupApi = new SimpleGroups(gAuth.client);
    let groups = await groupApi.getMyGroups();
    console.log(groups);
    let calendars = await cal.getCalendars();

    resp.send(
      ReactDOMServer.renderToString(
        Welcome({
          user: { name: user.given_name || user.name, picture: user.picture },
          calendars,
        })
      )
    );
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
