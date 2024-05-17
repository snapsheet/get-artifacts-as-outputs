import { faker } from "@faker-js/faker";

export class OrganizationFactory {
  static generate() {
    const id = faker.number.int({ min: 100000, max: 1000000 });

    return {
      avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
      description: "",
      events_url: "https://api.github.com/orgs/snapsheet/events",
      hooks_url: "https://api.github.com/orgs/snapsheet/hooks",
      id,
      issues_url: "https://api.github.com/orgs/snapsheet/issues",
      login: "snapsheet",
      members_url: "https://api.github.com/orgs/snapsheet/members{/member}",
      node_id: "MDEyOk9yZ2FuaXphdGlvbjk1NzU1Nw==",
      public_members_url:
        "https://api.github.com/orgs/snapsheet/public_members{/member}",
      repos_url: "https://api.github.com/orgs/snapsheet/repos",
      url: "https://api.github.com/orgs/snapsheet"
    };
  }
}
