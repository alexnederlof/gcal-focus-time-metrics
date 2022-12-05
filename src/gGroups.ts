import { Auth, cloudidentity_v1, google, people_v1 } from "googleapis";

export class SimpleGroups {
  ident: cloudidentity_v1.Cloudidentity;
  orgs: people_v1.People;

  constructor(auth: Auth.OAuth2Client) {
    this.ident = google.cloudidentity({ version: "v1", auth });
    this.orgs = google.people("v1");
  }

  public async getMyGroups() {
    console.log("Getting groups");
    const parent = await this.ident.groups.get({
      name: "groups/technology@flexport.com",
    });
    console.log("Parent " + parent.data);

    const { data } =
      await this.ident.groups.memberships.searchTransitiveMemberships({
        parent: "group/amsteam",
      });
    console.log("Context", data);

    try {
      const rep = await this.ident.groups.search({});
      console.log("list is ", rep.data);
      return "Yo";
    } catch (e) {
      console.error("" + e);
    }
  }
}
