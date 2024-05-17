import { faker } from "@faker-js/faker";

export class EnterpriseFactory {
  static generate() {
    const id = faker.number.int({ min: 100, max: 2000 });
    const slug = faker.internet.userName();
    return {
      avatar_url: `https://avatars.githubusercontent.com/b/${id}?v=4`,
      created_at: faker.date.past({ years: 10 }),
      description: null,
      html_url: `https://github.com/enterprises/${slug}`,
      id,
      name: faker.company.name(),
      node_id: faker.string.alphanumeric({ length: 24 }),
      slug,
      updated_at: faker.date.past({ years: 1 }),
      website_url: null
    };
  }
}
