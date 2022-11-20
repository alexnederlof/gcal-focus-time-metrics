import { Handler, Response } from "express";
import fs from "fs/promises";
import { Auth } from "googleapis";

interface ClientDetails {
  web: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
    javascript_origins: string[];
  };
}

const COOKIE_NAME = "gt";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
export class GoogleAuth {
  constructor(public client: Auth.OAuth2Client) {}

  static async create() {
    let asText = await fs.readFile("secrets/credentials.server.json", "utf-8");
    let { web } = JSON.parse(asText) as ClientDetails;
    let redi = web.redirect_uris.find((u) => u.includes("localhost"));
    if (process.env["NODE_ENV"] === "prod") {
      redi = web.redirect_uris.find((u) => !u.includes("localhost"));
    }
    return new GoogleAuth(
      new Auth.OAuth2Client(web.client_id, web.client_secret, redi)
    );
  }

  public requireLogin(): Handler {
    let client = this.client;
    return (req, resp, next) => {
      let cookie = req.cookies[COOKIE_NAME];
      console.log("Cookie " + cookie);
      if (!cookie) {
        console.debug("You are not logged in ");
        return redirToGoogle(resp);
      } else {
        try {
          console.debug("You are logged in with " + cookie);
          let tokens = JSON.parse(cookie) as Auth.Credentials;
          if (new Date(tokens.expiry_date || 0) < new Date()) {
            return redirToGoogle(resp);
          }
          client.setCredentials(tokens);
          next();
        } catch (e) {
          console.error("Could not set credentials" + e);
          return redirToGoogle(resp);
        }
      }

      function redirToGoogle(resp: Response) {
        let redir = client.generateAuthUrl({
          access_type: "offline",
          scope: SCOPES,
        });
        return resp.redirect(redir);
      }
    };
  }

  public handleLogOut(): Handler {
    return (req, resp) => {
      console.log("Logging yout out");
      resp.clearCookie(COOKIE_NAME).send("You are now logged out");
    };
  }

  public handleCallBack(): Handler {
    const client = this.client;
    return async (req, res) => {
      console.log("Gonna handle auth for ", req.query);
      if (req.query.error) {
        // The user did not give us permission.
        console.error(`Received Google error ` + req.query.error);
        return res.redirect("/");
      } else {
        try {
          console.log("Getting tokens from google");
          let { tokens } = await client.getToken(req.query.code as string);
          console.log("Got tokens. Setting cookie");
          let expires = undefined;
          if (tokens.expiry_date) {
            console.log("Token expires", [
              tokens.expiry_date,
              new Date(tokens.expiry_date),
              new Date(),
            ]);
            expires = new Date(tokens.expiry_date);
          }
          res
            .cookie(COOKIE_NAME, JSON.stringify(tokens), {
              httpOnly: process.env["NODE_ENV"] === "prod",
              secure: process.env["NODE_ENV"] === "prod",
              sameSite: process.env["NODE_ENV"] === "prod",
              expires,
            })
            .redirect("/");
        } catch (err) {
          console.error("Cannot do a thing" + err);
          return res.redirect("/");
        }
      }
    };
  }
}
