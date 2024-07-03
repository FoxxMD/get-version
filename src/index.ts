import createDebug from 'debug';
import { EnvOpts, parseEnvVersion } from "./envVersion.js";
import { FileOpts, parseFileVersion } from "./fileVersion.js";
import { GitOpts, parseGitVersion } from "./gitVersion.js";

const debug = createDebug('get-version');

export type VersionSource = 'env' | 'file' | 'git' | 'fallback';
const versionSources = ['env', 'git', 'file', 'fallback'];
const defaultSources = ['env', 'git', 'file', 'fallback'];

export interface VersionOpts {
    /**
     * The order which sources should be checked for a version
     *
     * @default ['env', 'git', 'file', 'fallback']
     * */
    priority?: VersionSource[]
    /**
     * Options for parsing version for ENV variables
     * */
    env?: EnvOpts
    /**
     * Options for parsing version from file and NPM package files
     * */
    file?: FileOpts
    /**
     * Options for parsing version from working git repository
     * */
    git?: GitOpts
    /**
     * The fallback value to return if no version is found from sources
     *
     * @default undefined
     * */
    fallback?: string
}

export type {
    EnvOpts,
    FileOpts,
    GitOpts
}

/**
 * Attempts to parse multiple sources to find a value to use as a version identifier
 *
 * @example ['1.2.3']
 * */
export const getVersion = async (opts: VersionOpts = {}): Promise<string | undefined> => {
    const {
        priority = defaultSources,
        fallback = undefined,
    } = opts;

    let validPriority: VersionSource[] = [];
    for (const source of Array.from(new Set(priority))) {
        const clean = source.trim().toLowerCase();
        if (!versionSources.includes(clean)) {
            debug(`WARN: 'Priority' '${clean} is not valid, ignoring.'`);
        }
        validPriority.push(clean as VersionSource);
    }

    if (fallback !== undefined && fallback.trim() !== '' && !validPriority.includes('fallback')) {
        debug(`WARN: 'fallback' value provided but not in priorities! Adding as last priority...`);
        validPriority.push('fallback');
    }

    if (validPriority.length === 0) {
        debug('WARN: No priorities found?');
    }

    for (const source of validPriority) {
        let version: string;
        switch (source) {
            case 'env':
                version = parseEnvVersion(opts.env);
                break;
            case 'file':
                version = await parseFileVersion(opts.file)
                break;
            case 'git':
                version = await parseGitVersion(opts.git)
                break;
            case 'fallback':
                version = fallback;
                break;
        }
        if (version !== undefined) {
            debug(`Found Version ${version} from Source ${source}`);
            return version;
        }
    }
    return;
}
