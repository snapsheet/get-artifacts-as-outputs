import { Context } from "@actions/github/lib/context";
import { Octokit } from "@octokit/core";
import { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { ArtifactInfo } from "./artifactInfo";
import { JobInfo } from "./jobInfo";
/**
 * Consolidate the output of all jobs that came prior to this job and return as the output of this job.
 */
export declare class Consolidator {
    octokit: Octokit & Api & {
        paginate: PaginateInterface;
    };
    context: Context;
    artifacts: ArtifactInfo[];
    schema: any;
    /**
     * Initialize clients and member variables.
     */
    constructor();
    /**
     * Octokit query parameters that are used across multiple API requests.
     */
    commonQueryParams(): {
        owner: any;
        repo: string;
        per_page: number;
    };
    /**
     * Runtime entrypoint. Query for the last successful ran (not reran) jobs prior to this job and
     * return the content of the outputs JSON as an output of this job. Outputs of this job will have
     * the same key/name as the strings defined in the `needs` configuration.
     */
    run(): Promise<void>;
    /**
     * Get the GitHub Action Workflow schema for the currently running job. This will query for the
     * YAML file of the current branch and return a data structure.
     */
    getWorkflowSchema(): Promise<any>;
    /**
     * Get jobs running within this workflow that are immediately preceding on this job, and have this
     * job as a dependent. If a workflow has been reran, this will iteratively query previous runs
     * until it can identify the job details that generated Artifacts.
     */
    getLastRanWorkflowJobs(jobName: string, workflowJobs: JobInfo[]): Promise<JobInfo[]>;
    /**
     * Query for and filter jobs only relevent for the dependency relation.
     */
    getRelevantWorkflowJobs(jobName: string, runId: number, runAttempt?: number | null): Promise<JobInfo[]>;
    /**
     * Get all jobs running within this workflow. An optional attempt number can be passed.
     */
    getWorkflowJobs(run_id: number, attempt_number?: number | null): Promise<{
        id: number;
        run_id: number;
        run_url: string;
        run_attempt?: number | undefined;
        node_id: string;
        head_sha: string;
        url: string;
        html_url: string | null;
        status: "queued" | "in_progress" | "completed" | "waiting";
        conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
        created_at: string;
        started_at: string;
        completed_at: string | null;
        name: string;
        steps?: {
            status: "queued" | "in_progress" | "completed";
            conclusion: string | null;
            name: string;
            number: number;
            started_at?: string | null | undefined;
            completed_at?: string | null | undefined;
        }[] | undefined;
        check_run_url: string;
        labels: string[];
        runner_id: number | null;
        runner_name: string | null;
        runner_group_id: number | null;
        runner_group_name: string | null;
        workflow_name: string | null;
        head_branch: string | null;
    }[]>;
    /**
     * Get all artifacts associated with this run.
     */
    getRunArtifacts(): Promise<ArtifactInfo[]>;
    /**
     * Get the job details for any job that ran with that same definition. Matches the full name immediately followed by open parenthesis.
     */
    filterForRelevantJobDetails(jobName: string, workflowJobs: JobInfo[]): JobInfo[];
    /**
     * Gather the outputs for the job runs and put them into an array.
     */
    getJobOutputs(jobDetails: JobInfo[]): Promise<{
        [k: string]: any;
    }>;
    /**
     * Download and unpack an artifact to a temporary directory. Return the directory name.
     */
    downloadArtifactFile(artifactId: number): Promise<string>;
    /**
     * Read the outputs from the artifact directory path.
     */
    readOutputs(artifactDirectoryPath: string): any;
    /**
     * Download from a HTTPS endpoint and stream directly to file.
     *
     * Sourced from https://stackoverflow.com/questions/55374755/node-js-axios-download-file-stream-and-writefile
     */
    downloadFile(fileUrl: string, outputLocationPath: string): Promise<unknown>;
}
