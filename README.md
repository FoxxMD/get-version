# @foxxmd/get-version

[![Latest Release](https://img.shields.io/github/v/release/foxxmd/get-version)](https://github.com/FoxxMD/logging/get-version)
[![NPM Version](https://img.shields.io/npm/v/%40foxxmd%2Fget-version)](https://www.npmjs.com/package/@foxxmd/get-version)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A convenient way to get a version identifier from a set of ordered sources (ENV, Git, File, NPM Package, default value...)

Features:

* Fully typed for Typescript projects
* Supports ESM and CJS projects
* Get a version identifier from any of these sources in **an order you define**:
  * Environment Variables
  * Working Git repository
    * Template your version from last commit (branch, hash, tag)
  * `version` in NPM Packages
    * `package.json`
    * `package-lock.json`
    * `npm-shrinkwrap.json`
  * Arbitrary json/text files
* Return a default value if no other version found

**Documentation best viewed on [https://foxxmd.github.io/get-version](https://foxxmd.github.io/get-version)**

# Why?

You have a project that can be distributed, or run, in multiple ways. You want to output the version of the project so users know what they are running or for debugging purposes.

The problem you have is you have:

* Tagged releases on Github
* Build Docker images
* Have PR/branches used by end-users
* etc...

and there's no _one way_ to make sure all of these instances display an accurate version unless you want to manually add/commit a Source of Truth value somewhere every time you make a change.

**@foxxmd/get-version solves this problem.** It parses multiple sources, in an order you define, to glean a "version identifier" that is most accurate to display based on how and from what source your app is deployed from.

<details>

<summary>Example Scenario</summary>

We will look for a version from sources in this order=: ENV, Git, NPM, Fallback

First look for ENV...

* Build your images with ENV `APP_VERSION` parsed from release tag with GH Actions
* Build and push image from local to registry with a custom `APP_VERSION` for one-offs

ENV not found then with Git...

* End-user (or you) clones/forks project and runs natively => version parsed from last commit as `{branch}-{commit}`

Git not found then with NPM...

* End-user downloads copy of project from Release asset or .zip on github => finds `package-lock.json` in project folder and uses `version` set by you for release

NPM not found...

* Uses `fallback` value set in project so you know user is using an uncommon setup (or something is wrong!)


</details>

# Install 

```
npm install @foxxmd/get-version
```

# Quick Start

```ts
import { getVersion } from "@foxxmd/get-version";

// defaults to ENV => Git => Files => NPM => Fallback
const version = await getVersion();
console.log(version); // 1.0.0
```

# Configuring Version Options

Pass an object implementing [`VersionOpts`](https://foxxmd.github.io/get-version/interfaces/VersionOpts.html) to `getVersion`

```ts
import { getVersion, VersionOpts } from "@foxxmd/get-version";
import path from 'node:path';

const opts: VersionOpts = {
    priority: ['file', 'env', 'git'],
    env: {
        names: ['CUSTOM_VERSION','APP_VERSION']
    },
    file: {
        npmPackage: false,
        additionalFiles: [path.join(process.cwd(), 'version.txt')],
    },
    git: {
        gitTemplate: 'GIT-{branch}-{hash}'
    },
    fallback: 'unknown'
}

const version = await getVersion(opts);
console.log(version); // 1.0.0
```

[**Read the docs for all options**](https://foxxmd.github.io/get-version/functions/getVersion.html)

# Recipes

## Docker Image

`get-version` looks for `APP_VERSION` env by default. Set `APP_VERSION` using [docker build arg](https://stackoverflow.com/questions/39597925/how-do-i-set-environment-variables-during-the-docker-build-process/63640896#63640896) in `Dockerfile`:

```dockerfile
#FROM ....

# then in your last build stage...
ARG APP_BUILD_VERSION
ENV APP_VERSION=$APP_BUILD_VERSION

#ENTRYPOINT ...
```

### Setting `APP_VERSION` based on Github Actions trigger

If you build and publish images using [Github Actions](https://docs.github.com/en/actions) the version can be configured to use release tag, github info (without including git repo in image), or other arbitrary info.

In your [workflow](https://docs.github.com/en/actions/using-workflows/about-workflows) when using [build-push-action](https://github.com/docker/build-push-action):

```yaml
# steps:
# ....
    - name: Build and push Docker image
      env:
        APP_VERSION: myCustomAppVersionInfo
      uses: docker/build-push-action@v5
      with:
        context: .
        build-args: |
          APP_BUILD_VERSION=${{env.APP_VERSION}}
        # ...
```

### Use Release Tag or branch-commit, based on trigger

<details>

```yaml
on:
  push:
    branches:
      - 'master'
      - 'develop'
    tags:
      - '*.*.*'
jobs:
  publish:
    name: Build and Publish Image
    if: github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - 
      - name: Check out the repo
        uses: actions/checkout@v4
        
      - name: Set short git commit SHA
        id: vars
        # https://dev.to/hectorleiva/github-actions-and-creating-a-short-sha-hash-8b7
        # short sha available under env.COMMIT_SHORT_SHA
        run: |
          calculatedSha=$(git rev-parse --short HEAD)
          branchName=$(git rev-parse --abbrev-ref HEAD)
          echo "COMMIT_SHORT_SHA=$calculatedSha" >> $GITHUB_ENV
          echo "COMMIT_BRANCH=$branchName" >> $GITHUB_ENV

# do whatever else you need to do...

      - name: Build and push Docker image
        env:
          # if action triggers on release, version uses tag
          # if action triggers on push to an included branch version is {branch}-{shortSHA}
          APP_VERSION: ${{ contains(github.ref, 'refs/tags/') && github.ref_name || format('{0}-{1}', env.COMMIT_BRANCH, env.COMMIT_SHORT_SHA ) }}
        uses: docker/build-push-action@v5
        with:
          context: .
          build-args: |
            APP_BUILD_VERSION=${{env.APP_VERSION}}
          # ...
```

</details>

### Use PR info

**WARNING:** Do not use [`pull_request_target` trigger](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target) without some security measures in place to [prevent malicious PRs.](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)

<details>

```yaml
name: PR Workflow

on:
  pull_request_target:
    types:
      - labeled
      - synchronize
      - reopened
      - opened
    # only run if PR targets 'develop' branch for merging
    branches:
      - 'develop'
jobs:
  release-snapshot:
    name: Release snapshot
    runs-on: ubuntu-latest
    # don't run job unless PR has been marked safe after manual review of changes!
    if: contains(github.event.pull_request.labels.*.name, 'safe to test')
  steps:
    - uses: actions/checkout@v4
      with:
        ref: ${{ github.event.pull_request.head.sha }}
    # ...
    - name: Build and push
      id: docker_build
      uses: docker/build-push-action@v5
      env:
        # produces version like pr152-11ec1c7c
        APP_VERSION: ${{ format('pr{0}-{1}', github.event.number, github.event.pull_request.head.sha ) }}
      with:
        context: .
        build-args: |
          APP_BUILD_VERSION=${{env.APP_VERSION}}
        # ...
```

</details>
