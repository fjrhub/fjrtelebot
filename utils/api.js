const APIs = {
    waifuim: "https://api.waifu.im",
    waifupics: "https://api.waifu.pics",
};

/**
 * Build a full URL from the base API and path
 * @param {string} name - API name from the APIs list
 * @param {string} path - endpoint path (can include query string)
 * @returns {string} - complete URL ready to be used with axios
 */
function createUrl(name, path) {
    if (!APIs[name]) throw new Error(`API '${name}' not found in APIs list`);
    return `${APIs[name]}${path}`;
}

module.exports = {
    APIs,
    createUrl
};
