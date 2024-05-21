export class SenderFactory {
  static generate() {
    return {
      avatar_url: "https://avatars.githubusercontent.com/u/177431?v=4",
      events_url: "https://api.github.com/users/whatisdot/events{/privacy}",
      followers_url: "https://api.github.com/users/whatisdot/followers",
      following_url:
        "https://api.github.com/users/whatisdot/following{/other_user}",
      gists_url: "https://api.github.com/users/whatisdot/gists{/gist_id}",
      gravatar_id: "",
      html_url: "https://github.com/whatisdot",
      id: 177431,
      login: "whatisdot",
      node_id: "MDQ6VXNlcjE3NzQzMQ==",
      organizations_url: "https://api.github.com/users/whatisdot/orgs",
      received_events_url:
        "https://api.github.com/users/whatisdot/received_events",
      repos_url: "https://api.github.com/users/whatisdot/repos",
      site_admin: false,
      starred_url:
        "https://api.github.com/users/whatisdot/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/whatisdot/subscriptions",
      type: "User",
      url: "https://api.github.com/users/whatisdot"
    };
  }
}
