import { faker } from "@faker-js/faker";
import { ResponseFactory } from "../response";

export class DownloadArtifactResponseFactory extends ResponseFactory {
  static generate(mocks?: {
    status?: number;
    url?: string;
    headers?: unknown;
    data?: unknown;
  }) {
    const filename = "2224834938703.zip";
    return {
      ...ResponseFactory.generate(mocks),
      url: `https://productionresultssa3.blob.core.windows.net/actions-results/${faker.string.uuid()}/workflow-job-run-${faker.string.uuid()}/artifacts/${faker.string.hexadecimal({length: 64, casing: "lower"})}.zip?rscd=attachment%3B+filename%3D%${filename}`
    };
  }
}
