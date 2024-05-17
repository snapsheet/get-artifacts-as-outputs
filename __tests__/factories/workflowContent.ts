import fs from "fs";
import path from "path";
import YAML from "yaml";

export class WorkflowContentFactory {
  static generate() {
    const workflowPath = path.join(__dirname, "..", "fixtures", "workflow.yml");
    const workflowYamlString = fs.readFileSync(workflowPath, "utf8");
    return YAML.parse(workflowYamlString);
  }
}
