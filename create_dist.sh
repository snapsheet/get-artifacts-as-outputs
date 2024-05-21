#!/bin/bash

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Append "DIST" to the current branch name
dist_branch="dist/${current_branch}"

# Delete the dist branch if it exists
git branch -D $dist_branch

# Checkout a new branch based off of the current branch
git checkout -b $dist_branch

# Run the build command
npm run build

# Add the dist folder and other folders
git add dist/* -f 

# Commit the changes
git commit -m "Build for $dist_branch"

# Force push the changes
git push origin $dist_branch --force

# Switch back to the original branch
git checkout $current_branch
