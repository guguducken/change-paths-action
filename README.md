# Get Changed Paths

This action detects the deepest path of the modified file in PR.It also provides some features to assist in handling pull requests

## Usage

Returns the deepest path to the file changed by the pull request

### First

Create a workflow `paths.yml` file in your repositories `.github/workflows `directory.

### Inputs

#### github-token

The GitHub Actions token. e.g. `secrets.PATHS_TOKEN`. For more information,See this link: [Creating a personal access token](https://docs.github.com/cn/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

#### ignore

The paths what you want to ignore in this repository. Different paths must be separated by commas. For example: 

~~~bash
github.com/user_test/test/
├── go.mod
├── main.go
├── main_test.go
└── src
    ├── git
    │   ├── git.go
    │   └── git_test.go
    ├── src_test.go
    ├── te
    │   └── test.go
    └── ut
        ├── ut.go
        └── ut_test.go
~~~

You can use `/` to ignore the `root` directory. If you use it, the action will not output `github.com/user_test/test`.

You alse can use `github.com/user_test/test/src` or `test/src/ut/` or `/test/src/ut` to ignore `github.com/user_test/test/src` directory. If you use it, the action will not output `github.com/user_test/test/src.`

`warning`: If the corresponding ignore rule is not set, the subdirectory will still be output.

For example: 

- The paths of modified files: `github.com/user_test/test`,` github.com/user_test/test/src`,`github.com/user_test/test/src/ut`
- The ignore rules: `"/,github.com/user_test/test/src"`
- The final output paths: `github.com/user_test/test/src/ut`

### Outputs

#### paths

The final path filtered by the rules set earlier. For Example: `github.com/user_test/test/src/ut`

#### resource

The forked repository that create the now pull request. 

#### branch

The Nnme of the branch used to create the pull request

## Examples

~~~yaml
on:
  pull_request_target:
    types: [opened, synchronize]
    branches: [ "master" ]

  workflow_dispatch:

jobs:
  test-name:
    runs-on: ubuntu-latest
    name: Get Change Paths

    steps:
      - name: Get Changed Paths
        uses: guguducken/ut-pr-action@master
        id: paths-pr
        with:
          github-token: ${{ secrets.YOUR_TOKEN }}
          ignore: ""
      - name: Print Paths
        run: |
          echo ${{ steps.paths-pr.outputs.paths }}
~~~

# License

The scripts and documentation in this project are released under the [MIT License](https://github.com/guguducken/change-paths-action/blob/master/LICENSE)