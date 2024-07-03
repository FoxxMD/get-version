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

**@foxxmd/get-version solves this problem.** By using multiple sources, in an order you define, to glean a "version identifier" you can programmatically determine the most accurate identifier to display.

#### Example Scenario

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

# Install 

```
npm install @foxxmd/get-version
```

# Quick Start

```ts
import { getVersion } from "@foxxmd/logging";

// defaults to ENV => Git => Files => NPM => Fallback
const version = await getVersion();
console.log(version); // 1.0.0
```

# Configuring Version Options

Pass an object implementing [`VersionOpts`](https://foxxmd.github.io/get-version/docs/interfaces/VersionOpts.html) to `getVersion`

```ts
import { getVersion, VersionOpts } from "@foxxmd/logging";
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

// defaults to ENV => Git => Files => NPM => Fallback
const version = await getVersion(opts);
console.log(version); // 1.0.0
```

[**Read the docs for all options**](https://foxxmd.github.io/get-version/docs/functions/getVersion.html)
