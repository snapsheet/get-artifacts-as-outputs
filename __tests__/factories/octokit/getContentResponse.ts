import { faker } from "@faker-js/faker";
import { ResponseFactory } from "../response";

export class GetContentResponseFactory extends ResponseFactory {
  static generate(mocks?: {
    status?: number;
    url?: string;
    headers?: unknown;
    data?: unknown;
  }) {
    const orgName = faker.word.noun().toLowerCase();
    const repoName = faker.word.noun().toLowerCase();
    const name = "cdktf_command.yml";
    const filepath = `.github/workflows/${name}`;
    const ref = "DNM-TEST-SRE-2250";
    const sha = "f372cc1fa2fe5ae5a668d1a510e74fc80f5b9daa";
    const temporaryToken = "FDSIOJFDISOMIEWOJ";

    return {
      ...ResponseFactory.generate(mocks),
      data: {
        ...(mocks?.data || {}),
        name,
        path: filepath,
        sha,
        size: 5417,
        url: `https://api.github.com/repos/${orgName}/${repoName}/contents/${filepath}?ref=refs/heads/${ref}`,
        html_url: `https://github.com/${orgName}/${repoName}/blob/refs/heads/${ref}/${filepath}`,
        git_url: `https://api.github.com/repos/${orgName}/${repoName}/git/blobs/${sha}`,
        download_url: `https://raw.githubusercontent.com/${orgName}/${repoName}/refs/heads/${ref}/${filepath}?token=${temporaryToken}`,
        type: "file",
        content: "",
        encoding: "base64",
        _links: {
          self: `https://api.github.com/repos/${orgName}/${repoName}/contents/${filepath}?ref=refs/heads/${ref}`,
          git: `https://api.github.com/repos/${orgName}/${repoName}/git/blobs/${sha}`,
          html: `https://github.com/${orgName}/${repoName}/blob/refs/heads/${ref}/${filepath}`
        }
      }
    };
  }
}
