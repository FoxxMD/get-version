/** @type { import('typedoc').TypeDocOptionMap } */
module.exports ={
    name: "@foxxmd/get-version Docs",
    entryPoints: [
        "./src/index.ts"
    ],
    sort: ["source-order"],
    categorizeByGroup: false,
    searchGroupBoosts: {
        "Functions": 1.5
    },
    navigationLinks: {
        "Docs": "http://foxxmd.github.io/get-version",
        "GitHub": "https://github.com/foxxmd/get-version"
    },
    plausibleSiteDomain: process.env.ANALYTICS ?? '',
    plausibleSiteOrigin: process.env.ANALYTICS_DOMAIN ?? '',
}
