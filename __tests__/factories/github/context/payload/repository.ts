import { OwnerFactory } from "./repository/owner";

export class RepositoryFactory {
  static generate() {
    return {
      allow_forking: true,
      archive_url:
        "https://api.github.com/repos/snapsheet/some-test-project/{archive_format}{/ref}",
      archived: false,
      assignees_url:
        "https://api.github.com/repos/snapsheet/some-test-project/assignees{/user}",
      blobs_url:
        "https://api.github.com/repos/snapsheet/some-test-project/git/blobs{/sha}",
      branches_url:
        "https://api.github.com/repos/snapsheet/some-test-project/branches{/branch}",
      clone_url: "https://github.com/snapsheet/some-test-project.git",
      collaborators_url:
        "https://api.github.com/repos/snapsheet/some-test-project/collaborators{/collaborator}",
      comments_url:
        "https://api.github.com/repos/snapsheet/some-test-project/comments{/number}",
      commits_url:
        "https://api.github.com/repos/snapsheet/some-test-project/commits{/sha}",
      compare_url:
        "https://api.github.com/repos/snapsheet/some-test-project/compare/{base}...{head}",
      contents_url:
        "https://api.github.com/repos/snapsheet/some-test-project/contents/{+path}",
      contributors_url:
        "https://api.github.com/repos/snapsheet/some-test-project/contributors",
      created_at: "2021-05-20T16:40:18Z",
      custom_properties: {},
      default_branch: "main",
      deployments_url:
        "https://api.github.com/repos/snapsheet/some-test-project/deployments",
      description: null,
      disabled: false,
      downloads_url:
        "https://api.github.com/repos/snapsheet/some-test-project/downloads",
      events_url:
        "https://api.github.com/repos/snapsheet/some-test-project/events",
      fork: false,
      forks: 0,
      forks_count: 0,
      forks_url:
        "https://api.github.com/repos/snapsheet/some-test-project/forks",
      full_name: "snapsheet/some-test-project",
      git_commits_url:
        "https://api.github.com/repos/snapsheet/some-test-project/git/commits{/sha}",
      git_refs_url:
        "https://api.github.com/repos/snapsheet/some-test-project/git/refs{/sha}",
      git_tags_url:
        "https://api.github.com/repos/snapsheet/some-test-project/git/tags{/sha}",
      git_url: "git://github.com/snapsheet/some-test-project.git",
      has_discussions: false,
      has_downloads: true,
      has_issues: true,
      has_pages: true,
      has_projects: true,
      has_wiki: true,
      homepage: null,
      hooks_url:
        "https://api.github.com/repos/snapsheet/some-test-project/hooks",
      html_url: "https://github.com/snapsheet/some-test-project",
      id: 369274949,
      is_template: false,
      issue_comment_url:
        "https://api.github.com/repos/snapsheet/some-test-project/issues/comments{/number}",
      issue_events_url:
        "https://api.github.com/repos/snapsheet/some-test-project/issues/events{/number}",
      issues_url:
        "https://api.github.com/repos/snapsheet/some-test-project/issues{/number}",
      keys_url:
        "https://api.github.com/repos/snapsheet/some-test-project/keys{/key_id}",
      labels_url:
        "https://api.github.com/repos/snapsheet/some-test-project/labels{/name}",
      language: "TypeScript",
      languages_url:
        "https://api.github.com/repos/snapsheet/some-test-project/languages",
      license: null,
      merges_url:
        "https://api.github.com/repos/snapsheet/some-test-project/merges",
      milestones_url:
        "https://api.github.com/repos/snapsheet/some-test-project/milestones{/number}",
      mirror_url: null,
      name: "some-test-project",
      node_id: "MDEwOlJlcG9zaXRvcnkzNjkyNzQ5NDk=",
      notifications_url:
        "https://api.github.com/repos/snapsheet/some-test-project/notifications{?since,all,participating}",
      open_issues: 8,
      open_issues_count: 8,
      owner: OwnerFactory.generate(),
      private: true,
      pulls_url:
        "https://api.github.com/repos/snapsheet/some-test-project/pulls{/number}",
      pushed_at: "2024-05-08T22:06:21Z",
      releases_url:
        "https://api.github.com/repos/snapsheet/some-test-project/releases{/id}",
      size: 14705,
      ssh_url: "git@github.com:snapsheet/some-test-project.git",
      stargazers_count: 0,
      stargazers_url:
        "https://api.github.com/repos/snapsheet/some-test-project/stargazers",
      statuses_url:
        "https://api.github.com/repos/snapsheet/some-test-project/statuses/{sha}",
      subscribers_url:
        "https://api.github.com/repos/snapsheet/some-test-project/subscribers",
      subscription_url:
        "https://api.github.com/repos/snapsheet/some-test-project/subscription",
      svn_url: "https://github.com/snapsheet/some-test-project",
      tags_url: "https://api.github.com/repos/snapsheet/some-test-project/tags",
      teams_url:
        "https://api.github.com/repos/snapsheet/some-test-project/teams",
      topics: [],
      trees_url:
        "https://api.github.com/repos/snapsheet/some-test-project/git/trees{/sha}",
      updated_at: "2024-05-06T19:41:43Z",
      url: "https://api.github.com/repos/snapsheet/some-test-project",
      visibility: "private",
      watchers: 0,
      watchers_count: 0,
      web_commit_signoff_required: false
    };
  }
}
