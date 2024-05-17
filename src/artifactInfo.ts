/**
 * Inferred by VSCode typescript interpreter inspection of Octokit response objects.
 */
export interface ArtifactInfo {
  id: number;
  node_id: string;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string | null;
  expires_at: string | null;
  updated_at: string | null;
  workflow_run?:
    | {
        id?: number | undefined;
        repository_id?: number | undefined;
        head_repository_id?: number | undefined;
        head_branch?: string | undefined;
        head_sha?: string | undefined;
      }
    | null
    | undefined;
}
