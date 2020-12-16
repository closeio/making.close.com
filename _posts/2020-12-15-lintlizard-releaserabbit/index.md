---
title: Introducing LintLizard and ReleaseRabbit
date: 2020-12-15
permalink: /posts/lintlizard-releaserabbit
author: Vyacheslav Tverskoy
thumbnail: ''
metaDescription: ''
tags: [Engineering, Open Source, Python]
---

The Engineering team at Close is very lean and highly productive at the same time. An important ingredient is ensuring that we don’t waste time on repetitive tasks while maintaining excellent and consistent code quality across the entire codebase.

We’ve already set up a lot of tools that help with code quality, like Black, Flake8, Mypy and others for our main application code. But in addition to that, we support a number of separate Open Source projects that are heavily used. But if a project is not set up the same way as the majority of the code, it causes additional friction if linting settings are different or some tools are not set up in this project at all.

To reduce this friction, we made [LintLizard](https://github.com/closeio/lintlizard/). It’s an umbrella project that includes all the code quality tools we use as its own dependencies. It also provides a single entry point that runs all the tools without having to set them up in CI over and over again in each new project. All you need to do is install it and run `lintlizard`. With LintLizard, we manage the tools in one single place. The main application codebase and all of our Open Source projects depend only on LintLizard instead of individual tools. In the future, we’re going to add automatic tool configuration management as well, so `setup.cfg` and `pyproject.toml` files will be kept up to date automatically.

Paired with Dependabot to update LintLizard in downstream repos, we already saved days of engineering work that typically comes with maintaining a dozen dependencies one by one in a number of separate packages. But releasing new versions of LintLizard itself (and other our open source Python packages) is another common source of friction for developers. It used to be a manual process of changing version numbers, pushing, tagging git commits, packaging and uploading to PyPi. It can be tempting to just use git repo paths in `requirements.txt` files just to avoid the extra administrative work. However, this way is significantly worse in the long run, since git-based dependencies are significantly slower to install and you can’t use automatic dependency update tools like Dependabot for them.

To make the releasing process less painful, we’re also releasing [ReleaseRabbit](https://github.com/closeio/releaserabbit/) (pun intended). After a simple initial setup to make the version number of your package editable by an automatic process, all you need to do to release and upload a new version is run `releaserabbit 1.2.3` to make a specific version or `releaserabbit minor` to bump a specific version component. In fact, it’s now easier to release a new Open Source package than to keep the code private, so look forward to more exciting announcements!
