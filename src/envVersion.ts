import createDebug from 'debug';

const debug = createDebug('get-version:env');

export interface EnvOpts {
    /**
     * @default true
     * */
    enable?: boolean
    /**
     * The name or names of ENV variables to parse
     *
     * @default "APP_VERSION"
     * */
    name?: string | string[]
}

export const parseEnvVersion = (opts: EnvOpts = {}): string | undefined => {

    const {
        enable = true,
        name: envNames = ['APP_VERSION']
    } = opts;

    if (!enable) {
        return;
    }

    const names = Array.isArray(envNames) ? envNames : [envNames];
    for(const name of names) {
        let envVersion: string | undefined = process.env[name];
        if (envVersion !== undefined && envVersion.trim() !== '') {
            return envVersion.trim();
        }
        debug(`No non-empty value exists for ENV '${name}'`);
    }

    return;
}
