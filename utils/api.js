const APIs = {
    waifuim: "https://api.waifu.im",
    waifupics: "https://api.waifu.pics",
    siputzx: "https://api.siputzx.my.id",
    myquran: "https://api.myquran.com",
    diioffc: "https://api.diioffc.web.id"
};

function createUrl(name, path) {
    if (!APIs[name]) throw new Error(`API '${name}' not found in APIs list`);
    return `${APIs[name]}${path}`;
}

global.APIs = APIs;
global.createUrl = createUrl;