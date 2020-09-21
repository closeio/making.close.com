---
layout: post
title: 'Splitting sub-folder(s) out into a new Git repository'
date: 2020-09-17
permalink: posts/splitting-sub-folders-out-into-new-git-repository
author: Bart Gryszko
---

**TLDR;** This article will answer how you can split a sub-folder out to a new repository preserving it's all historical changes even if it was moved around. Go to the *Third Approach (final)* for a solution.

## The story behind (optional)

At Close, our web application's code lives in a monorepo. It's home both for the UI and the API code. This was due to the historical reason: initially, we kept all of the frontend code in a `/static` folder (Close's web application was started around 2012 and is developed and maintained without major rewrites until now).

At some point, we've realized that having everything baked into a single repo is not the best way for our needs. We've made a decision to split-off the UI folder out of the main repository.

- We wanted Frontend and Backend to be a separate concerns. This makes more sense for the Close now, as we have both the Frontend Engineering Team and the Backend Engineering Team.
- We wanted to have faster CI/CD process. This could be solved in multiple ways, but having Frontend code separated, allows us to give ownership of the particular CI/CD process to the right team.
- There were also multiple other reasons specific to our stack and processes (like simplifying dev environment or serving our UI faster to customers), but that's a topic for another blog post ;)

## Background

Our current repository has a similar structure:
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

Though across 8 years of development, the UI code lived in the `/close/static/` as well as in `/static/`. 

Following commands will relate to this structure.

### First Approach: `git subtree split`

In order to create a new `close-ui` repo (child repo) from the `ui/` folder in `close` repo (parent repo), we could use following commands:

```sh
# split out the ui/ folder onto the ui-split branch
git subtree split --prefix ui --branch ui-split

# get to the top folder and create the close-ui repo
cd .. && mkdir close-ui && cd close-ui && git init .

# pull the close-ui branch from close repo to the newly
# created close-ui repo
git pull ../close ui-split
```

This seems the easiest option. Possibly an ideal for a simple use-case: if you want to split out a folder that wasn't previously moved around (or you don't care about it's earlier history).

In our case it was easy to check that we were missing historic commits:
```sh
git log --reverse
``` 
It should reach back to 2012, though the latest commit was from 2017 (the time when `/ui` was moved to its current place in the folders structure).

It's ease to use, but it has a few downsides:
- It's slow. With more than 34 000 commits in our master branch, the above command took over 12 minutes on my 2.9GHz quad core i7, 8GB, MacBook Pro.
- It handles just a single branch at a time. Since we are actively working on multiple branches that would need to be moved, it's not obvious how we could apply the change to all of them.
- In our case, the `ui/` folder and its content lived in multiple places. By using this technique, we wouldn't be able to track these changes in the git history. Only its last location would be tracked.

### Second Approach: `git filter-branch`

Github has a 
[small article about similar topic](https://docs.github.com/en/github/using-git/splitting-a-subfolder-out-into-a-new-repository). In fact, the title of this article was inspired by it.

The example you can find, relates to a very simple case too:

```sh
# clone parent repo and create a new close-ui repo from it
git clone https://github.com/closeio/close.git . close-ui && cd close-ui

# split out the ui/ folder
git filter-branch --prune-empty --subdirectory-filter ui 
```

It's a powerful tool and potentially could solve our problem, but when reading `git filter-branch` docs, you can find:
> git filter-branch has a plethora of pitfalls that can produce non-obvious manglings of the intended history rewrite (and can leave you with little time to investigate such problems since it has such abysmal performance) 

Since this approach produced similar results to the first one (and had similar downsides), I moved on to the third approach. Git's recommended way to handle history rewrites. In the `git filter-branch` docs you can later read:

> Please use an alternative history filtering tool such as [git filter-repo](https://github.com/newren/git-filter-repo/). 

### Third Approach (final): `git filter-repo`

Similarly to the previous tool `git filter-repo` is a powerful git history rewriting tool but its API is relatively simple. Just keep in mind that it's not in the git's core, and you have to [install it manually](https://github.com/newren/git-filter-repo#how-do-i-install-it).

To achieve similar result as in previous approaches, we would clone the parent repo and use:
```sh
git filter-repo --path ui/ --path-rename ui/:
```

This method, immediately shows two advantages:
- It's fast. It took around 20s (comparing to 12 minutes!)
- It apply changes to all branches

Still, only commit history related to the `ui/` folder survived. Last commit that we could see was when `ui/` was created. We couldn't see changes related to files that existed before and were moved to the `ui/` folder later.

To solve this, we can include multiple paths that previously included UI code and rewrite the `ui/` to become a root folder:
```sh
git filter-repo --path ui/ --path static/ --path close/static/ --path-rename ui/:
```

But this wasn't enough in our case. We still use `close/static` directory to keep few files there needed for the backend code. If we'd compare content of the final result against the `ui/` folder in the parent repository, we'd see unwanted files. 

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

`git filter-repo` allow us to specify the path rules in a configuration file, so let's create it:
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

That's it! We've split out a `ui/` sub-folder into its own repository and preserved its whole history.
