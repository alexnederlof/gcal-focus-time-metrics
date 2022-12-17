import { GaxiosError, GaxiosResponse } from "gaxios";
import { Auth, cloudidentity_v1, google } from "googleapis";
import log from "loglevel";
export type SimpleGroup = Pick<
  cloudidentity_v1.Schema$Group,
  "name" | "parent" | "description" | "displayName" | "labels"
> & { id: string };

export type SimpleMember = {
  memberName: string;
  groupName: string;
  email: string;
  relationShip: string;
};

let cachedGroups: Promise<SimpleGroup[]> | null = null;

export class SimpleGroups {
  private ident: cloudidentity_v1.Cloudidentity;

  constructor(auth: Auth.OAuth2Client) {
    this.ident = google.cloudidentity({ version: "v1", auth });
    if (!cachedGroups) {
      cachedGroups = this.getAllGroups();
    }
  }

  public async getMembersFor(groupEmail: string) {
    log.info("Getting group members for " + groupEmail);
    let pageToken = undefined;
    let members: SimpleMember[] = [];
    let groupName: string;
    try {
      let group = await this.ident.groups.lookup({
        "groupKey.id": groupEmail,
      });
      groupName = group.data.name!;
    } catch (e: any) {
      if (e instanceof GaxiosError && e.response?.status === 403) {
        // 403 weirdly means it's not found
        return null;
      }

      throw e;
    }
    do {
      let resp: GaxiosResponse<cloudidentity_v1.Schema$SearchTransitiveMembershipsResponse> =
        await this.ident.groups.memberships.searchTransitiveMemberships({
          parent: groupName,
          pageSize: 100,
          pageToken,
        });
      pageToken = resp.data.nextPageToken;
      resp.data.memberships
        ?.filter((m) => m.member?.startsWith("users/"))
        .forEach((m) =>
          members.push({
            groupName: groupName,
            memberName: m.member!,
            email: m.preferredMemberKey![0]!.id!,
            relationShip: m.relationType!,
          })
        );
    } while (pageToken);

    return members;
  }

  public async getAllGroups() {
    if (cachedGroups) {
      return cachedGroups;
    }
    log.info("Getting groups");
    let pageToken = undefined;
    let groups: SimpleGroup[] = [];
    do {
      let resp: GaxiosResponse<cloudidentity_v1.Schema$ListGroupsResponse> =
        await this.ident.groups.list({
          parent: `customers/${process.env["GOOGLE_CUSTOMER_ID"]}`,
          pageSize: 100,
          pageToken,
        });
      pageToken = resp.data.nextPageToken;
      resp.data.groups?.forEach((g) =>
        groups.push({
          name: g.name,
          displayName: g.displayName,
          id: g.groupKey!.id!,
        })
      );
    } while (pageToken);
    return groups;
  }
}
