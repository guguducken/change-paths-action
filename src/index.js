const core = require('@actions/core');
const github = require('@actions/github');

const accessToken = core.getInput('github-token');
const ignoreStr = core.getInput('ignore');
const path_source = core.getInput('source-path');

const oc = github.getOctokit(accessToken);

let ignoreRoot = false;

async function getSourcePaths() {
    if (path_source.length == 0) {
        return null;
    }
    let t = "";
    let package_go = new Array();
    for (let i = 0; i < path_source.length; i++) {
        const e = path_source[i];
        if (e == " ") {
            if (t.length != 0) {
                package_go.push(t);
                t = "";
            }
        } else {
            t += e;
        }
    }
    if (t.length != 0``) {
        package_go.push(t);
    }
    return package_go;
}

function sourceCheck(sourceRes, t) {
    if (sourceRes.length === null) {
        return true;
    }
    for (const re of sourceRes) {
        if (re == t) {
            return true;
        }
    }
    return false;
}

async function getPaths(repo, owner, num) {

    let path_re = new Array();
    const { data: paths } = await oc.rest.pulls.listFiles(
        {
            ...github.context.repo,
            pull_number: num
        }
    );
    for (const path of paths) {
        path_re.push(path.filename);
    }

    const igRes = await getIgnorePathRe(ignoreStr, repo, owner);
    const sourceRes = await getSourcePaths();

    if (igRes === null) {
        core.info("Ignore ALL paths!!!!!!!!!!!!!!");
        return ""
    }
    if (ignoreStr !== undefined) {
        core.info("--------------------The ignore paths--------------------");
    }


    if (ignoreRoot) {
        core.info("Ignore path: /");
    }

    let paths_set = new Set();
    for (let index = 0; index < path_re.length; index++) {
        let element = path_re[index];
        let i = element.length - 1;
        for (; i >= 0; i--) {
            if (element[i] == '/') {
                break
            }
        }
        if (i != -1) {
            let t = `github.com` + `/` + owner + `/` + repo + `/` + element.substring(0, i);
            if (!ignoreCheck(igRes, t) && sourceCheck(sourceRes, t)) {
                paths_set.add(t);
                continue
            }
            core.info("Ignore path: " + t);
        } else {
            if (!ignoreRoot) {
                paths_set.add(`github.com` + `/` + owner + `/` + repo);
            }
        }
    }

    core.info("-------------------- The goal paths --------------------");
    for (const it of paths_set) {
        core.info("Goal path: " + it);
    }
    let path_ans = Array.from(paths_set).join(" ");

    return path_ans
}

async function reParse(str) {
    let ans = "";
    for (let index = 0; index < str.length; index++) {
        const e = str[index];
        if (e == "/" || e == "{" || e == "}" || e == "[" || e == "]" ||
            e == "(" || e == ")" || e == "^" || e == "$" || e == "+" ||
            e == "\\" || e == "." || e == "*" || e == "|" || e == "?") {
            ans += "\\";
        }
        ans += e;
    }
    return ans
}

async function getIgnorePathRe(str, repo, owner) {
    if (str == "") {
        return undefined
    }
    let front = "github.com/" + owner + "/" + repo + "/";
    let ans = new Set();
    let ignore_set = new Set();
    let t = "";
    for (let index = 1; index < str.length - 1; index++) {
        const e = str[index];
        if (e == ",") {
            if (t.length >= 1) {
                if (t != "/") {
                    if (t[t.length - 1] == '/') {
                        t = t.substring(0, t.length - 1);
                        if (t == '/') {
                            return null;
                        }
                        ignore_set.add(front + t);
                    }
                    ans.add(front + t);
                } else {
                    ignoreRoot = true;
                }
            }
            t = "";
        } else {
            t += e;
        }
    }
    if (t.length >= 1) {
        if (t != "/") {
            if (t[t.length - 1] == '/') {
                t = t.substring(0, t.length - 1);
                if (t == '/') {
                    return null;
                }
                ignore_set.add(front + t);
            }
            ans.add(front + t);
        } else {
            ignoreRoot = true;
        }
    }

    if (ans.size == 0) {
        return undefined
    }

    let ans_re = [];
    for (let item of Array.from(ans)) {
        ans_re.push(
            {
                fullIgnore: ignore_set.has(item),
                re: new RegExp((await reParse(item)), "igm"),
            }
        );
    }

    return ans_re;
}

function ignoreCheck(igRes, str) {
    if (igRes === undefined) {
        return false;
    }
    for (let index = 0; index < igRes.length; index++) {
        let { re, fullIgnore } = igRes[index];
        re.lastIndex = 0;
        if (re.test(str)) {
            if (fullIgnore || re.lastIndex == str.length) {
                return true;
            }
        }
    }
    return false;
}


async function run() {
    try {

        core.info("--------------------Start find paths--------------------");
        const context = github.context;
        const num = context.payload?.pull_request?.number;
        const owner = context.repo.owner;
        const repo = context.repo.repo;
        core.info(`The origin repository name is: ` + repo);
        core.info(`The owner of origin repository is: ` + owner);

        if (num == undefined) {
            core.info(`This is no workflow with PR create`)
            core.info("-------------------- End find paths --------------------");
            return
        }
        core.info(`The target pull request id is: ` + num);

        let path_ans = await getPaths(repo, owner, num);
        core.setOutput('paths', path_ans.substring(0, path_ans.length));

        core.info("-------------------- End find paths --------------------");
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();