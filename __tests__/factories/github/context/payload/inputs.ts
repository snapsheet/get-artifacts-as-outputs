import { faker } from "@faker-js/faker";

export class InputsFactory {
  static generate() {
    return { ref: faker.git.branch(), terraform_version: "1.8.0" };
  }
}
