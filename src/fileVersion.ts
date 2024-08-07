import { promises as fs } from 'node:fs';
import path from 'node:path';
import createDebug from 'debug';
import { fileURLToPath } from 'url'

const debug = createDebug('get-version:file');

/**
 * Get a dynamically-computed property from an object where path is a dot-notation string
 *
 * @see https://stackoverflow.com/a/45322101/1469797
 * */
const resolve = (path: string, obj: object): any | undefined => {
    return path.split('.').reduce(function (prev, curr) {
        return prev ? prev[curr] : undefined
    }, obj || self)
}

const readFile = async (path: string): Promise<string | Record<any, any> | undefined> => {
    let contents: string
    try {
        const result = await fs.readFile(path);
        contents = result.toString();
    } catch (e) {
        const {code} = e;
        if (code === 'ENOENT') {
            debug(`No file found at given path: ${path}`)
        } else {
            debug(new Error(`Encountered error while parsing file: ${path}`, {cause: e}));
        }
        return;
    }

    try {
        const object = JSON.parse(contents);
        return object;
    } catch (e) {
        debug(new Error(`Could not parse file contents at ${path} as JSON`), {cause: e});
    }
    return contents;
}


export interface FileOpts {
    /**
     * Recursively walk parent folders to find an NPM package file and use version found
     *
     * Looks for these files in order:
     *
     * * `package.json`
     * * `package-lock.json`
     * * `npm-shrinkwrap.json`
     *
     * @default true
     * */
    npmPackage?: boolean
    /**
     * Absolute file paths to attempt to read for version information.
     *
     * If the file is JSON will try to get top-level 'version' prop. Specify as `AdditionalFileOptions` to customize version prop.
     *
     * @see AdditionalFileOptions
     * */
    additionalFiles?: (string | AdditionalFileOptions)[]
    /**
     * @default true
     * */
    enable?: boolean
}

export interface AdditionalFileOptions {
    /**
     * The absolute path of a file to read.
     *
     * * If JSON will parse property from object, using dot notation, to get version string.
     * * If not JSON will read entire file contents as version string.
     *
     * */
    path: string
    /**
     * The property from parsed JSON object, using dot notation, to get version string
     *
     * @default 'version'
     * */
    prop: string
}

const packageFileNames = [
    'package.json',
    'package-lock.json',
    'npm-shrinkwrap.json'
]

export const parseFileVersion = async (opts: FileOpts = {}, npmStartDir?: string): Promise<string | undefined> => {
    const {
        npmPackage = true,
        additionalFiles = [],
        enable = true
    } = opts;

    if (!enable) {
        return;
    }

    let propName = 'version';
    let versionData: Record<any, any> | string;

    const additionalFilesInfo: AdditionalFileOptions[] = [];
    for (const fileData of additionalFiles) {
        if (typeof fileData === 'string') {
            additionalFilesInfo.push({path: fileData, prop: 'version'});
        } else {
            additionalFilesInfo.push(fileData);
        }
    }

    for (const fileInfo of additionalFilesInfo) {
        const content = await readFile(fileInfo.path);
        if (content !== undefined) {
            versionData = content;
            propName = fileInfo.prop;
            debug(`Found additional file at ${fileInfo.path}`);
            break;
        }
    }

    if (versionData === undefined && npmPackage) {

        const validParentDir = getParentNodeModulesFolder(npmStartDir ?? get__filename());
        versionData = await findFilesRecuriveParently(validParentDir);
        if(versionData !== undefined) {
            propName = 'version';
        }

    }

    if (versionData !== undefined) {
        if (typeof versionData === 'object') {
            const versionObjectVal = resolve(propName, versionData);
            if (versionObjectVal === undefined) {
                debug(`Value was undefined at object path '${propName}'`);
            }
            return versionObjectVal;
        }
        return versionData;
    }
}

const findFilesRecuriveParently = async (fromDir: string, files: string[] = packageFileNames) => {

    let currDirectory = fromDir;
    let parentDirectory = fromDir;
    let firstRun = true;

    // https://hals.app/blog/recursively-read-parent-folder-nodejs/
    while (firstRun || currDirectory !== parentDirectory) {

        firstRun = false;

        for (const fileName of packageFileNames) {
            const packagePath = path.join(parentDirectory, fileName);
            const content = await readFile(packagePath);
            if (content !== undefined) {
                debug(`Found package file at ${packagePath}`);
                return content;
            }
        }

        // The trick is here:
        // Using path.dirname() of a directory returns the parent directory!
        currDirectory = parentDirectory
        parentDirectory = path.dirname(parentDirectory);
    }

    return undefined;
}

const getParentNodeModulesFolder = (fromDir: string) => {

    let currentDirectory = fromDir;
    if(path.parse(currentDirectory).name === 'node_modules') {
        // get parent
        return path.dirname(currentDirectory);
    }

    let parentDirectory = path.dirname(currentDirectory);

    while(currentDirectory !== parentDirectory) {
        if(path.parse(parentDirectory).name === 'node_modules') {
            return path.dirname(parentDirectory);
        }

        currentDirectory = parentDirectory;
        parentDirectory = path.dirname(parentDirectory);
    }

    return fromDir;
}

/**
 * Absolute insanity to get filename/dirname cross-compatible for esm/cjs
 *
 * @see https://stackoverflow.com/a/75670725/1469797
 * */
function get__filename() {
    const error = new Error()
    const stack = error.stack
    const match = stack.match(/^Error\s+at[^\r\n]+\s+at *(?:[^\r\n(]+\((.+?)(?::\d+:\d+)?\)|(.+?)(?::\d+:\d+)?) *([\r\n]|$)/)
    const filename = match[1] || match[2]
    if (filename.startsWith('file://')) {
        return fileURLToPath(filename)
    }
    return filename
}
