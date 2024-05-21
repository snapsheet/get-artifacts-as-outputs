/**
 * Inferred by VSCode typescript interpreter inspection of Octokit response objects.
 */
export interface JobInfo {
  id: number;
  run_id: number;
  run_url: string;
  run_attempt?: number | undefined;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string | null;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  created_at: string;
  started_at: string;
  completed_at: string | null;
  name: string;
  steps?:
    | {
        status: "queued" | "in_progress" | "completed";
        conclusion: string | null;
        name: string;
        number: number;
        started_at?: string | null | undefined;
        completed_at?: string | null | undefined;
      }[]
    | undefined;
  check_run_url: string;
  labels: string[];
  runner_id: number | null;
  runner_name: string | null;
  runner_group_id: number | null;
  runner_group_name: string | null;
  workflow_name: string | null;
  head_branch: string | null;
}
