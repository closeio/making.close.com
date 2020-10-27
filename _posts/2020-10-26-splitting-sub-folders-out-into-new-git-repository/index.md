---
layout: post
title: 'Splitting sub-folder(s) out into a new Git repository'
date: 2020-10-26
permalink: /posts/splitting-sub-folders-out-into-new-git-repository
author: Bart Gryszko
thumbnail: ''
metaDescription: ''
tags: [Engineering, Git]
---

**TL;DR** This article explains various ways of splitting a sub-folder out to a new Git repository and preserving all its historical changes even if moved around. 

If you're interested only in the final working solution that fits our use case, go to the *[Third Approach (final)](#third-approach-final)*.

## Background

At Close, our web application's code lived in a monorepo. It was home both to the UI and the API code. Initially, we kept all of the frontend code in a `/static`, then in a `/close/static/` (Close was started around 2012 and has been developed and maintained without major rewrites).

At a certain point, we realized that having both UI and backend in a single repo no longer suits our needs. We decided to split the UI folder out of the main repository.

- We wanted the Frontend team to fully own the UI part of the app, including CI/CD.
- We wanted to have a faster CI/CD process. This could be solved in multiple ways, but having the UI code in a separate repository allows us to give ownership of the UI-specific CI/CD processes to the frontend team.
- There were also multiple other reasons specific to our stack and processes (like simplifying the dev environment or serving our UI faster to customers).

Our current repository has the following structure:
```bash
close/
├── close/          # backend code
├── ...
├── tests/          # backend tests
├── ui/             # frontend code
│   ├── js/
│   ├── ...
│   ├── package.json
│   ├── ...
└── ...
    
```

The following commands all rely on this directory structure.

### First Approach: `git subtree split`

In order to create a new `close-ui` repo (child repo) from the `ui/` folder in the `close` repo (parent repo), we could use the following commands:

```sh
# split out the ui/ folder onto the ui-split branch
git subtree split --prefix ui --branch ui-split

# get to the top folder and create the close-ui repo
cd .. && mkdir close-ui && cd close-ui && git init .

# pull the ui-split branch from close repo to the newly
# created close-ui repo
git pull ../close ui-split
```

If you want to split out a folder that wasn't previously moved around (or you don't care about its earlier history), then this looks like the easiest option.

In our case it was easy to check that we were missing historical commits:
```sh
git log --reverse
``` 
It should reach back to 2012, though the latest commit was from 2017 (the time when `/ui` was moved to its current place in the folders structure).

`git subtree split` is easy to use, but it has a few downsides:
- It's slow. With more than 34 000 commits in our master branch, the command took over 12 minutes on my 2.9GHz quad core i7, 8GB, MacBook Pro.
- It handles only a single branch at a time. Since we are actively working on multiple branches that would need to be moved, it's not obvious how we could apply the command to all of them.
- In our case, the `ui/` folder and its content lived in multiple places. By using this technique, we wouldn't be able to track these changes in the git history.

### Second Approach: `git filter-branch`

GitHub has a 
[small article about a similar topic](https://docs.github.com/en/github/using-git/splitting-a-subfolder-out-into-a-new-repository). In fact, the title of this article was inspired by it.

The example you can find relates to a very simple case too:

```sh
# clone parent repo and create a new close-ui repo from it
git clone https://github.com/closeio/close.git . close-ui && cd close-ui

# split out the ui/ folder
git filter-branch --prune-empty --subdirectory-filter ui 
```

It's a powerful tool and it could potentially solve our problem, but when reading `git filter-branch` docs, you can find the following comment:
> git filter-branch has a plethora of pitfalls that can produce non-obvious manglings of the intended history rewrite (and can leave you with little time to investigate such problems since it has such abysmal performance) 

Since this approach produced similar results to the first one (and had similar downsides), I moved on to the third approach — Git's recommended way to handle history rewrites. In the `git filter-branch` docs you can later read:

> Please use an alternative history filtering tool such as [git filter-repo](https://github.com/newren/git-filter-repo/). 

### <a name="third-approach-final"></a> Third Approach (final): `git filter-repo`

Similar to the `git filter-branch` command, `git filter-repo` is a powerful git history rewriting tool but with a relatively simple API. Just keep in mind that it's not in git's core, and you have to [install it manually](https://github.com/newren/git-filter-repo#how-do-i-install-it).

To achieve a similar result as in previous approaches, we would clone the parent repo and use:
```sh
git filter-repo --path ui/ --path-rename ui/:
```

This method immediately shows two advantages:
- It's fast. It took around 20s (compared to 12 minutes!)
- It applies changes to all branches

Still, only commit history related to the `ui/` folder survived. The oldest commit that we could see was when `ui/` was created. We couldn't see changes related to files that existed before and were moved to the `ui/` folder later.

To solve this, we can include multiple paths that previously included UI code and rewrite the `ui/` to become a root folder:
```sh
git filter-repo --path ui/ --path static/ --path close/static/ --path-rename ui/:
```

But this wasn't enough in our case. We still use `close/static` directory to keep a few files there that are needed by the backend code. If we'd compare the content of the final result against the `ui/` folder in the parent repository, we'd see unwanted files. 

We can dry-run `rsync` to compare two folders.

```sh
$ rsync --recursive --checksum --verbose --delete --dry-run close-ui/ close/ui
building file list ... done
...  
closeio/                    # We don't want these files.
closeio/static/             #
closeio/static/.gitignore   #
closeio/static/img          #
...
```

`git filter-repo` allows us to specify the path rules in a configuration file (you can read more about the syntax in the [`git filter-repo` docs](https://github.com/newren/git-filter-repo/blob/b1606ba8ac8393d704ba41319c0bba3e334f3341/Documentation/git-filter-repo.txt#L716-L745)), so let's create it:
```sh
# ~/close-ui-paths.txt

# track historic static/ folder
static/

# track historic close/static except for few files
# which are still in use on the backend
regex:^closeio/static/(?!img/|\.gitignore|some-other-folder/).*

# the folder we want to split out
ui/

# make ui/ the root folder
ui/==>
```

And do a final split:

```sh
git filter-repo --paths-from-file ~/close-ui-paths.txt
```

If we run the same `rsync` command once again, we'll see no difference in our files (except for the .git/* changes that are expected).

That's it! We've split out a `ui/` subfolder into its own repository and preserved its whole commit history.
