import git, { Commit } from "git-last-commit";
import createDebug from 'debug';

const debug = createDebug('get-version:git');

export interface GitOpts {
    /**
     * A string template that will be interpolated with git commit information to return as version string
     *
     * Placeholders like `{VAR}` will be replaced. Available variables:
     *
     * * `branch`
     * * `hash`
     * * `shortHash`
     *
     * @default '{branch}-{shortHash}'
     * */
    gitTemplate?: string
    /**
     * @default true
     * */
    enable?: boolean
}

const parseTemplate = (commit: Commit, template: string) => {
    let parsed = template;
    if (parsed.includes('{branch}')) {
        parsed = parsed.replace('{branch}', commit.branch === undefined ? '' : commit.branch);
    }
    if (parsed.includes('{shortHash}')) {
        parsed = parsed.replace('{shortHash}', commit.shortHash === undefined ? '' : commit.shortHash);
    }
    if (parsed.includes('{hash}')) {
        parsed = parsed.replace('{hash}', commit.hash === undefined ? '' : commit.hash);
    }
    if (parsed.includes('{tag}')) {
        parsed = parsed.replace('{tag}', commit.tags.length === 0 ? '' : commit.tags[0]);
    }
    return parsed;
}

export const parseGitVersion = async (options: GitOpts = {}): Promise<string | undefined> => {

    const {
        enable = true,
        gitTemplate = '{branch}-{shortHash}'
    } = options;

    if (!enable) {
        return;
    }

    try {
        const gitInfo = await new Promise((resolve, reject) => {
            git.getLastCommit((err, commit) => {
                if (err) {
                    reject(err);
                }
                // read commit object properties
                resolve(commit);
            });
        }) as Commit;
        const parts = [];
        if (gitInfo.tags.length > 0) {
            parts.push(gitInfo.tags[0]);
        } else {
            if (gitInfo.branch !== undefined) {
                parts.push(gitInfo.branch);
            }
            parts.push(gitInfo.shortHash);
        }
        return parseTemplate(gitInfo, gitTemplate);
    } catch (e) {
        if (process.env.DEBUG_MODE === "true") {
            debug(new Error('Could not get git info, continuing...', {cause: e}))
        }
        return undefined;
    }
}
