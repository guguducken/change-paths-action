#Get Changed Paths of New PR
This action detects the farthest path of the modified file in PR

##Usage
Create a workflow .yml file in your repositories .github/workflows directory.
###inputs
GitHub Personal Token

###outputs
The paths which file changed in this PR

##Examples

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
      - name: Print Paths
        run: |
          echo ${{ steps.paths-pr.outputs.paths }}
~~~