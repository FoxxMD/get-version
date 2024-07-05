import { describe } from "mocha";
import chai, { expect } from "chai";
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';
import childProcess from 'node:child_process';
import withLocalTmpDir from 'with-local-tmp-dir';
import { parseEnvVersion } from "../src/envVersion.js";
import { parseFileVersion } from "../src/fileVersion.js";
import { parseGitVersion } from "../src/gitVersion.js";
import { getVersion } from "../src/index.js";

const envTestPropNames = ['APP_VERSION'];

const versionFileJson = {version: '1.2.3'};
const versionNMFileJson = {version: '0.0.1'};
const versionFileOtherPropJson = {nested: {version: '4.5.6'}};
const textVersion = '8.9.0';

describe('ENV', function () {
    beforeEach(function () {
        for (const name of envTestPropNames) {
            delete process.env[name];
        }
    });
    it('Accepts name as single string', function () {
        process.env.APP_VERSION = 'test';
        expect(parseEnvVersion({name: 'APP_VERSION'})).is.eq('test')
    });

    it('Accepts name as array', function () {
        process.env.APP_VERSION = 'test';
        expect(parseEnvVersion({name: ['NONEXISTENT', 'APP_VERSION']})).is.eq('test')
    });

    it('Trims values', function () {
        process.env.APP_VERSION = 'test  ';
        expect(parseEnvVersion({name: 'APP_VERSION'})).is.eq('test')
    });

    it('Returns unset ENV as undefined', function () {
        expect(parseEnvVersion({name: 'APP_VERSION'})).is.undefined;
    });

    it('Returns empty string as undefined', function () {
        process.env.APP_VERSION = '  ';
        expect(parseEnvVersion({name: 'APP_VERSION'})).is.undefined;
        process.env.APP_VERSION = '';
        expect(parseEnvVersion({name: 'APP_VERSION'})).is.undefined;
    });
});

describe('Files', function () {

    describe('NPM Package', async function () {
        it('Finds package.json', async function () {
            await withLocalTmpDir(async () => {
                const childFolder = path.join(process.cwd(), 'childLevel');
                await fs.mkdir(childFolder)
                await fs.writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(versionFileJson));

                const data = await parseFileVersion(undefined, childFolder);
                expect(data).is.eq('1.2.3');
            });
        });

        it('Finds package-lock.json', async function () {
            await withLocalTmpDir(async () => {
                const childFolder = path.join(process.cwd(), 'childLevel');
                await fs.mkdir(childFolder)
                await fs.writeFile(path.join(process.cwd(), 'package-lock.json'), JSON.stringify(versionFileJson));

                const data = await parseFileVersion(undefined, childFolder);
                expect(data).is.eq('1.2.3');
            });
        });

        it('Finds npm-shrinkwrap.json', async function () {
            await withLocalTmpDir(async () => {
                const childFolder = path.join(process.cwd(), 'childLevel');
                await fs.mkdir(childFolder)
                await fs.writeFile(path.join(process.cwd(), 'npm-shrinkwrap.json'), JSON.stringify(versionFileJson));

                const data = await parseFileVersion(undefined, childFolder);
                expect(data).is.eq('1.2.3');
            });
        });

        it('Finds a package file while deeply nested', async function () {
            await withLocalTmpDir(async () => {
                const childFolder = path.join(process.cwd(), 'childLevel');
                await fs.mkdir(childFolder);
                const childFolder2 = path.join(childFolder, 'childLevelAgain');
                await fs.mkdir(childFolder2);
                await fs.writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(versionFileJson));

                const data = await parseFileVersion(undefined, childFolder2);
                expect(data).is.eq('1.2.3');
            });
        });

        it('Walks up to node_modules folder', async function () {
            await withLocalTmpDir(async () => {
                const nmPackageFolder = path.join(process.cwd(), 'node_modules', '@foxxmd', 'get-version');
                const startFolder = path.join(nmPackageFolder, 'dist', 'esm');
                await fs.mkdir(startFolder, { recursive: true });
                await fs.writeFile(path.join(nmPackageFolder, 'package.json'), JSON.stringify(versionNMFileJson));
                await fs.writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(versionFileJson));

                const data = await parseFileVersion(undefined, startFolder);
                expect(data).is.eq('1.2.3');
            });
        });
    });

    describe('Additional Files', async function () {
        it('Finds additional files when using a string', async function () {
            await withLocalTmpDir(async () => {
                const file = path.join(process.cwd(), 'myfile.json')
                await fs.writeFile(file, JSON.stringify(versionFileJson));

                const data = await parseFileVersion({additionalFiles: [file]});
                expect(data).is.eq('1.2.3');
            });
        });

        it('Finds additional files when using an array', async function () {
            await withLocalTmpDir(async () => {
                const file = path.join(process.cwd(), 'myfile.json');
                await fs.writeFile(file, JSON.stringify(versionFileJson));

                const data = await parseFileVersion({additionalFiles: [path.join(process.cwd(), 'notReal.json'), file]});
                expect(data).is.eq('1.2.3');
            });
        });

        it('Finds additional file with nested prop', async function () {
            await withLocalTmpDir(async () => {
                const file = path.join(process.cwd(), 'myfile.json');
                await fs.writeFile(file, JSON.stringify(versionFileOtherPropJson));

                const data = await parseFileVersion({additionalFiles: [{path: file, prop: 'nested.version'}]});
                expect(data).is.eq('4.5.6');
            });
        });

        it('Finds additional file plain text', async function () {
            await withLocalTmpDir(async () => {
                const file = path.join(process.cwd(), 'myfile.text');
                await fs.writeFile(file, textVersion);

                const data = await parseFileVersion({additionalFiles: [file]});
                expect(data).is.eq(textVersion);
            });
        });
    });
});

describe('Git', async function () {

    it('Returns undefined when Git is not present', async function () {
        let processExecMethod;
        processExecMethod = sinon.stub(childProcess, 'exec');
        processExecMethod.yields(null, undefined);
        expect(await parseGitVersion()).is.undefined;
        processExecMethod.restore();
    });

    describe('When Git is present', async function () {

        const mockGit = '26e689d<##>26e689d8769908329a145201be5081233c711663<##>subject line<##>sanitized subject line<##>this is the body<##>1437984178<##>1437984179<##>Author1<##>author@gmail.com<##>Committer1<##>committer@gmail.com<##>note 1<##>master\nR2\nR1';

        // partially borrowed from https://github.com/seymen/git-last-commit/blob/master/test/unit.js
        let processExecMethod;

        beforeEach(function () {
            processExecMethod = sinon.stub(childProcess, 'exec');
        });

        afterEach(function () {
            processExecMethod.restore();
        });

        it('Should find git info', async function () {
            processExecMethod.yields(null, mockGit);

            const version = await parseGitVersion();
            expect(version).is.eq('master-26e689d');
        });

        it('Should use template', async function () {
            processExecMethod.yields(null, mockGit);

            const version = await parseGitVersion({gitTemplate: '{branch}-{shortHash}-{hash}-{tag}'});
            expect(version).is.eq('master-26e689d-26e689d8769908329a145201be5081233c711663-R2');
        });
    });
});

describe('Program', async function() {

    const mockGit = '26e689d<##>26e689d8769908329a145201be5081233c711663<##>subject line<##>sanitized subject line<##>this is the body<##>1437984178<##>1437984179<##>Author1<##>author@gmail.com<##>Committer1<##>committer@gmail.com<##>note 1<##>master\nR2\nR1';

    // partially borrowed from https://github.com/seymen/git-last-commit/blob/master/test/unit.js
    let processExecMethod;

    beforeEach(function () {
        processExecMethod = sinon.stub(childProcess, 'exec');
        for (const name of envTestPropNames) {
            delete process.env[name];
        }
    });

    afterEach(function () {
        processExecMethod.restore();
    });

    it('Uses default priority', async function () {

        processExecMethod.yields(null, mockGit);
        process.env.APP_VERSION = 'test';
        const version = await getVersion();
        expect(version).is.eq('test');
    });

    it('Uses user-defined priority', async function () {

        processExecMethod.yields(null, mockGit);
        process.env.APP_VERSION = 'test';
        const version = await getVersion({priority: ['git','env']});
        expect(version).is.eq('master-26e689d');
    });

    it('Uses fallback when no version is found', async function () {
        const version = await getVersion({priority: ['env']});
        expect(version).is.undefined;
    });

    it('Uses user-defined fallback when no version is found', async function () {
        const version = await getVersion({priority: ['env'], fallback: 'fall'});
        expect(version).is.eq('fall');
    });
});
