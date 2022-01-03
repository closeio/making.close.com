---
layout: post
title: 'Learn git rebase - tips & tricks'
date: 2022-01-03
permalink: /posts/rebase-tips-and-tricks/
author: Claudia Oprea
thumbnail: ''
metaDescription: ''
tags: [Engineering, Rebase, Git, Learning, Tips and Tricks]
---

When I joined the Close Engineering team and started my onboarding, I noticed right away that my colleagues' pull requests were clean and easy to review. Each commit was explicit, following one line of thinking from start to end, applying the best solution to the problem at hand. Talking with my team, I learned that they use the `git rebase` command to clean up their commit histories before requesting a review. Of course, I wanted to do the same, but first I had to learn it!

Learning how to rebase has many benefits, but can be confusing (and risky) if you're new to it. This article will present my journey with git rebase, which I use daily now. 

# Why didn't I use rebase before?

Prior to learning how to rebase, I'd add new commits for every little change. I was also used to reviewing changes in a Pull Request all at once, rather than viewing each commit separately. I would sometimes alter a piece of logic multiple times in a single PR. That can be confusing, right? Looking back, I wonder why I didn't start using rebase years ago.

# When can you use rebase?

### Resolving conflicts with a parent branch

When you want to develop a feature or fix a bug, you create a branch from your main branch and make your changes. 

Once you've branched off the main branch, the main branch can change, introducing conflicts. There are multiple ways to resolve those conflicts. One way is to use `git merge`:

```sh
git checkout main
git pull main
git checkout feature-branch
git merge main
```

Another way is to use git rebase to update your feature branch by changing history by applying the latest changes from the main branch. Rebasing rewinds history, applies the latest changes from the main branch, and then re-applies your changes

```sh
git checkout feature-branch
git rebase main
```

The benefit of using rebase is that the git history will be clean, not introducing a new commit for merging. Also, another advantage is that it enables you to resolve conflicts commit by commit, which is easier to track.

### Cleaning up or altering git history for clearer pull requests

When developing a feature, you may end up changing your mind a few times while implementing, maybe due to something that appeared while developing or the part of the project requires to use something else. Another reason could be missed logic when planning or other unpredictable things. When this happens, and you commit each change, you end up having a bunch of commits, or maybe more than a half are not related anymore to the current logic. In this case, you can use an interactive rebase to change your commits in a feature branch.

Interactive rebase — commits in your current branch, pass `-i` option with a particular commit:

```sh
git rebase -i HEAD~{number of commits} 
```

Interactive rebase — from another branch, pass `-i` option with reference to the `main` branch:

```sh
git rebase -i main
```

Rebase is not recommended to use in a public branch. As we know so far, the rebase can change git history and, affect other developers' work. In this case, it is recommended to use merge.

```sh
git checkout staging
git merge main
```

**Note:** Avoid rebasing on a branch that someone else from your team could be working on or is in progress.

After doing a rebase, standard or interactive, requires force-pushing to the remote branch; this happens because git has a conflict between your current branch and the remote branch (due to the changes from the commits, different code by commit). Using force-push will overwrite the remote branch with the new changes.

```sh
git push --force
```

**Note:** Make sure you use `push --force` only when you are sure everything looks good to avoid losing something you've worked on due to overriding.

You can access all interactive rebase actions by typing: `git rebase -i HEAD~{number of commits}`:

```sh

# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup [-C | -c] <commit> = like "squash" but keep only the previous
#                    commit's log message, unless -C is used, in which case
#                    keep only this commit's message; -c is same as -C but
#                    opens the editor
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
# .       create a merge commit using the original merge commit's
# .       message (or the oneline, if no original merge commit was
# .       specified); use -c <commit> to reword the commit message
# .
```

# What happens if I mess up a rebase?

Before force pushing, I highly recommend checking again if everything looks as it should be, commits and code. If something doesn't look right, you can reset your local changes and pull from your pushed branch, or if you are in the middle of a rebase, you can abort it.

Finished rebase, not force pushed, reset your branch to origin:

```sh
git reset --hard origin/feature-branch
```

Rebase in progress:

```sh
git rebase --abort
```

If you force push, there is no way to undo your changes.


# When should you not use it?

As described before, you should avoid using it on a branch that someone else may be working on, public branches, or anything else that may negatively impact the git history.

# How to learn git rebase?

My journey with rebase was straightforward because I've had a great mentor, [Scott](https://github.com/essmahr), who masters rebasing. He explained how interactive rebase works with some coding-showing examples.

After learning the basics, I highly recommend starting with baby steps because rebase may put your current code at risk. I cannot say I've mastered rebase yet, but I've started with baby steps, and now using rebase is part of my daily work.

Tips if you want to start working with rebase:

- Make sure you **push your branch before doing any rebase**. Saving your changes will help if you messed up a rebase and the rebase finished, you can still pull from your feature branch origin and start rebasing again
- Start small, start with interactive rebase to fix up a commit or something tiny


### What changed after introducing rebase?

After getting familiar with rebase, I've noticed I use it very often, and it is part of my work now. I can keep commits clean and make the feature branch history readable and reviewable. Overall, I can say that everything is more pristine and nicer with `rebase`.
My colleagues noticed that rebase had improved my git commits, and I am happy for their help with my journey with rebase. 🚀 