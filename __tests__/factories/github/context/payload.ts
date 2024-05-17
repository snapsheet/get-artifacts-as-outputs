import { faker } from "@faker-js/faker";
import { EnterpriseFactory } from "./payload/enterprise";
import { InputsFactory } from "./payload/inputs";
import { OrganizationFactory } from "./payload/organization";
import { RepositoryFactory } from "./payload/repository";
import { SenderFactory } from "./payload/sender";

export class PayloadFactory {
  static generate() {
    const inputs = InputsFactory.generate();

    return {
      enterprise: EnterpriseFactory.generate(),
      inputs,
      organization: OrganizationFactory.generate(),
      ref: `refs/heads/${inputs.ref}`,
      repository: RepositoryFactory.generate(),
      sender: SenderFactory.generate(),
      workflow: `.github/workflows/${faker.system.directoryPath()}.yml`
    };
  }
}
