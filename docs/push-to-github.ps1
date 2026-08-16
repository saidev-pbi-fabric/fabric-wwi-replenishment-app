# push-to-github.ps1
#
# What this does: authenticates the GitHub CLI (if needed), creates a new
# public repo under your personal GitHub account, and pushes the local repo
# (already git-initialized with a baseline commit) to it.
#
# Prerequisites: GitHub CLI (`gh`) installed. Run this from PowerShell.
#
# How to run:
#   1. Open PowerShell in this folder (C:\RayfinApps\fabric-wwi-replenishment-app)
#   2. Run: .\docs\push-to-github.ps1
#   3. If prompted by `gh auth login`, follow the browser login flow.
#
# Expected output: a new public repo at github.com/<your-username>/fabric-wwi-replenishment-app,
# with the local commit pushed to its main branch.

gh auth status
if (-not $?) {
    gh auth login
}

gh repo create fabric-wwi-replenishment-app --public --source=. --remote=origin

git branch -M main
git push -u origin main
