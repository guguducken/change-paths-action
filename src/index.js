const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require("@octokit/graphql");

const accessToken = core.getInput('github-token');
const ignoreStr = JSON.stringify(core.getInput('ignore'));

const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization: `bearer ` + accessToken,
    },
});

let ignoreRoot = false;

async function getPaths(repo, owner, num) {
    core.info("-------------------- The goal paths --------------------");
    let paths_pr = await graphqlWithAuth(
        `
            query prPaths($owner_name: String!, $repo_name: String!,$id_pr: Int!, $lnum: Int = 100){
                repository(name: $repo_name, owner: $owner_name) {
                    pullRequest(number: $id_pr) {
                        files(first: $lnum) {
                            edges {
                                node {
                                    path
                                }
                            }
                        }
                    }
                }
            }
        `,
        {
            repo_name: repo,
            owner_name: owner,
            id_pr: num,

        });
    const str = JSON.stringify(paths_pr)

    const re = /\{"path":"(.+?)"\}\}/igm;
    let path_re = [];
    let res = re.exec(str);
    while (res) {
        path_re.push(res[1]);
        res = re.exec(str);
    }

    const igRes = await getIgnorePathRe(ignoreStr);

    if (ignoreRoot) {
        core.info("Ignore the root path");
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
            if (ignoreCheck(igRes, t)) {
                core.info("The Ignore path: " + t);
                continue
            }
            paths_set.add(t);
        } else {
            if (!ignoreRoot) {
                paths_set.add(`github.com` + `/` + owner + `/` + repo);
            }
        }
    }



    let path_ans = Array.from(paths_set).join(" ");

    core.info(path_ans);
    core.info("-------------------- End find paths --------------------");
    return path_ans
}

async function getSourceOwner(repo, owner, num) {
    let source = await graphqlWithAuth(
        `
            query prSource($owner_name: String!, $repo_name: String!,$id_pr: Int!){
                repository(name: $repo_name, owner: $owner_name) {
                    pullRequest(number: $id_pr) {
                        author {
                            login
                        }
                        headRefName
                    }
                }
            }
        `,
        {
            repo_name: repo,
            owner_name: owner,
            id_pr: num,

        });
    const str = JSON.stringify(source);

    const re = /\{"login":"(.+?)"\}/igm;

    const re1 = /"headRefName":"(.+?)"/igm;

    return [re.exec(str)[1] + `/` + repo, re1.exec(str)[1]];
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

async function getIgnorePathRe(str) {
    if (str == "") {
        return null
    }
    let ans = new Set();
    let t = "";
    for (let index = 1; index < str.length - 1; index++) {
        const e = str[index];
        if (e == ",") {
            if (t != '/') {
                if (t.length >= 1) {
                    ans.add(t);
                }
            } else {
                ignoreRoot = true;
            }
            t = "";
        } else {
            t += e;
        }
    }
    if (t != "") {
        ans.add(t);
    }
    if (ans.size == 0) {
        return null
    }
    let ans_re = new Array();
    for (let item of Array.from(ans)) {
        ans_re.push(new RegExp((await reParse(item)), "igm"));
    }
    return ans_re;
}

function ignoreCheck(igRes, str) {
    if (igRes == null) {
        return false;
    }
    for (let index = 0; index < igRes.length; index++) {
        const re = igRes[index];
        if (re.test(str)) {
            return true;
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
        core.info(`The repository name is: ` + repo);
        core.info(`The owner of this repository is: ` + owner);

        if (num == undefined) {
            core.info(`This is no workflow with PR create`)
            core.info("-------------------- End find paths --------------------");
            return
        }
        core.info(`The target pull request id is: ` + num);

        let path_ans = await getPaths(repo, owner, num);
        core.setOutput('paths', path_ans.substring(0, path_ans.length));

        let [sourceRepo, sourceBranch] = await getSourceOwner(repo, owner, num);
        core.setOutput('resource', sourceRepo);
        core.setOutput('branch', sourceBranch);

    } catch (err) {
        core.setFailed(err.message);
    }
}

run();