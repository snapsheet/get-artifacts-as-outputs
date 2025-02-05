# Get Artifacts as Job Outputs
A GitHub Action that retrieves artifacts from previous jobs in a workflow and makes them available as job outputs. This is particularly useful when you need to consolidate outputs from multiple matrix jobs or access data from previous workflow steps.


## Overview
This action helps you consolidate outputs from multiple jobs in a GitHub Actions workflow. It downloads artifacts from previous jobs, extracts their contents, and makes them available as outputs that can be referenced in subsequent steps.


## Features

- Automatically detects and downloads artifacts from dependent jobs

- Handles matrix jobs 

- Supports custom output file names

- Works with both successful and failed job runs

- Handles job reruns and multiple attempts


## Use Cases

- Consolidating test results from matrix jobs
- Gathering build artifacts for deployment
- Combining reports or metrics from parallel jobs
- Processing outputs from multiple workflow steps


## Usage

### Basic Example

```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo '{"result": "success"}' > outputs.json
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ github.job }}
          path: outputs.json

  job2:
    needs: [job1]
    runs-on: ubuntu-latest
    steps:
      - id: get_outputs
        uses: snapsheet/get-artifacts-as-outputs@0.1.1
        with:
          output_filename: outputs.json
      
      # Access the outputs from job1
      - run: |
          echo "Job1 results: ${{ steps.get_outputs.outputs.job1 }}"
```


### Inputs

| Input | Description | Required | 
|-------|-------------|----------|
| `output_filename` | Name of the file that contains the job outputs | Yes |


## How It Works
1. The action identifies all jobs that the current job depends on (specified in `needs`)
2. For each dependent job:
   - Retrieves artifacts generated by that job
   - Downloads and extracts the artifact contents
   - Reads the specified output file
   - Makes the contents available as a job output with the same name as the dependent job

This allows you to access data from previous jobs using the standard GitHub Actions outputs syntax:



### Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# To create a distribution branch for testing: 
# This creates a new branch named `dist/<current-branch-name>` with the compiled code that can be tagged for releases.
npm run dist-branch
```



### Project Structure
- `src/` - Source code
- `__tests__/` - Test files and fixtures
- `dist/` - Compiled output (generated)


### Testing

The project uses Jest for testing and maintains 100% line coverage (except for index.ts). Run tests with:

```bash
npm test
```

## License

MIT License - see LICENSE file for details.


## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
6. @snapsheet will review and merge your changes


## References
For more examples, see the test workflow:
