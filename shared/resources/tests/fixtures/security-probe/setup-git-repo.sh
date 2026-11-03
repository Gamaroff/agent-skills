#!/usr/bin/env bash
# A --fixture-setup that builds a scratch git repository with one commit in the
# case directory ($1) and nothing else (task.254). The sandbox HOME holds no
# global git config, so the identity is set here, locally, and every git call
# runs inside "$1".
set -e
cd "$1"
git init -q
git config user.email "probe@example.invalid"
git config user.name "probe"
git config commit.gpgsign false
git add -A
git commit -q --allow-empty -m "scratch"
