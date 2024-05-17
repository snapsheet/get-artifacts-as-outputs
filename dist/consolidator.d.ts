import { Context } from "@actions/github/lib/context";
import { Octokit } from "@octokit/core";
import { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
/**
 * Consolidate the output of all jobs that came prior to this job and return as the output of this job.
 */
export declare class Consolidator {
    octokit: Octokit & Api & {
        paginate: PaginateInterface;
    };
    context: Context;
    /**
     * Initialize clients and member variables.
     */
    constructor();
    /**
     * Runtime entrypoint. Query for the last successful ran (not reran) jobs prior to this job and
     * return the content of the outputs JSON as an output of this job. Outputs of this job will have
     * the same key/name as the strings defined in the `needs` configuration.
     */
    run(): Promise<void>;
}
