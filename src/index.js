const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require("@octokit/graphql");

const accessToken = core.getInput('github-token');


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
        core.info("-------------------- The goal paths --------------------");


        const graphqlWithAuth = graphql.defaults({
            headers: {
                authorization: `bearer ` + accessToken,
            },
        });
        var pr_paths = await graphqlWithAuth(
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
        const str = JSON.stringify(pr_paths)

        const re = /\{"path":"(.+?)"\}\}/igm;
        let path_re = [];
        let res = re.exec(str);
        while (res) {
            let [big, small] = res;
            path_re.push(small);
            res = re.exec(str);
        }

        var path_ans = ``;
        for (let index = 0; index < path_re.length; index++) {
            let element = path_re[index];
            let i = element.length - 1
            for (; i >= 0; i--) {
                if (element[i] == '/') {
                    break
                }
            }
            if (i != -1) {
                path_ans += `github.com` + `/` + owner + `/` + repo + `/` + element.substring(0, i) + `\n`;
            }
        }
        if (path_ans == ``) {
            path_ans = `github.com` + `/` + owner + `/` + repo + `/` + `\n`;
        }


        core.info(path_ans);
        core.info("-------------------- End find paths --------------------");
        core.setOutput('paths', path_ans);
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();