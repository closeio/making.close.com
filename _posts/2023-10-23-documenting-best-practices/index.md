---
title: 'Documenting Best Practices'
date: 2023-10-23
permalink: /posts/documenting-best-practices
author: Trey Cucco
thumbnail: ''
metaDescription: ''
tags: [Engineering, Documentation, Open Source]
---

Documentation.

We all know we need it. When done well it can be incredibly valuable. Few
engineers enjoy writing it, and no one wants to maintain it. Is there a better
way?

At Close we've been working on a new approach to how we create and maintain
documentation in our code.

In this article I'll discuss the documentation problems we set out to solve, and
the process and library we created to solve it. If you want to go straight to
the code, check out
[this npm package](https://www.npmjs.com/package/@closeio/best-practices-documentation)
which came out of our efforts toward solving this problem.

## Why We Need Documentation

If you have a small tenured team or a small codebase maybe you can get by
without documenting your processes and coding practices. There's no audience for
the documentation because everyone on the team already knows everything. Why
waste your time building something nobody will use?

But what if you have a big team? Or a big codebase that has been through many
iterations of libraries, frameworks, and approaches? What if your team is
growing and you keep having new engineers ask question like "How do we like to
do X?" or "I see we've done X three different ways, what is our preferred
approach today?"

## The Typical Process

Here at Close we do have a big codebase, and our team is growing. We have a
great onboarding process where new engineers are exposed to our codebase in an
orderly and progressive fashion, but we can't cover every detail.

When new engineers have questions about our preferred approach to doing things
(especially if there are several different approaches existing in our code) we
typically have a conversation in Slack and then someone (usually) adds the
information to our docs.

## But Documentation _Still_ Gets Stale

Even with our best efforts our documentation can still get stale. We migrate to
new libraries, or learn new techniques, or try out new approaches to old
problems and we change our best practices, but we forget to update the
documentation.

Even though we try to be careful and intentional about this we still end up back
where we started.

So what can we do?

## Documenting Our Best Practices

Ideally, documenting our coding practices should:

1. Live as close to the code as possible, to decrease the chance it will get out
   of sync
2. Not require us to write example code in markdown files
3. Be discoverable
4. Update automatically when the associated code changes
5. Be readable outside of a code editor

To achieve these goals, we came up with a process and tooling that allows us to
identify, tag, and maintain our coding best practices.

## The Process

The process goes like this:

1. Someone on the team asks "How should I do X" or "We've done X several
   different ways in the past, what is the preferred method now?"
2. They check the best practices docs to see if that question is answered
3. If the question isn't answered by our docs, we discuss as a team and decide
   on an approach
4. The engineer who asked the question finishes their code using the best
   practice, and then adds "Best Practice" tags to the code, to mark that code
   as a good example of how we like to accomplish this task
5. The engineer runs a program to add their updates to our best practices
   documentation and includes that with their PR

## The Tooling

To support this process we first defined a commenting standard that lets us tag
sections of code as a best practice, it looks like this:

    { /* @BestPractice General */ }
    { /* @BestPractice.subtitle Conditional Rendering pt. 1 - Simple Cases */ }
    { /* @BestPractice.description */ }
    { /*   For conditional rendering in JSX we prefer to use `&&` over `?:`. */ }
    <span className={styles.icon}>
      {isCollapsed && <IconSVG svg={expandIcon} />}
      {!isCollapsed && <IconSVG svg={collapseIcon} />}
    </span>;
    { /* @BestPractice.end */ }

And then we wrote a program that will scan through our code, extract the Best
Practice blocks, and write these to markdown files in a special section of our
docs.

Best practices are put into a file based on their title (so in this case
"General") and then sectioned off and ordered by their subtitle. This allows us
to have several blocks of code that are related to the same concept co-located
in the same file, and put in a deterministic order.

It ends up looking something like this:

    ---
    title: General
    ---

    ### Conditional Rendering pt. 1 - Simple Cases

    For conditional rendering in JSX we prefer to use `&&` over `?:`.

    [components/leadActivities/TimeSection/index.tsx lines 35-43](https://github.com/closeio/close-ui/tree/master/js/components/leadActivities/TimeSection/index.tsx#L35-L43)

    ```tsx
    <span className={styles.icon}>
      {isCollapsed && <IconSVG svg={expandIcon} />}
      {!isCollapsed && <IconSVG svg={collapseIcon} />}
    </span>
    ```

Those generated markdown files then show up on our internal documentation site!

### Embedded Code Blocks

After working with "fully owned" documentation for a while, we realized that
many times we want to embed code snippets in long-form documentation, and we
don't want to have the long-form documentation as comments in our code.

So, we added functionality to scan through our existing static docs and mark
spots to insert code blocks. In our code we can add an "id" to a best practice:

    // @BestPractice.id advancedSearchRequest

And then in our static documentation file, add an insert comment. For `.md`
files it's:

    <!-- @BestPractice.insert advancedSearchRequest -->
    <!-- @BestPractice.end -->

And in `.mdx` files it's:

    {/* @BestPractice.insert advancedSearchRequest */}
    {/* @BestPractice.end */}

Our tooling will copy the code block tagged with the `advancedSearchRequest` id
between the `.insert` and `.end` tags in the static documentation. The best
practices tooling will "own" the lines between the tags, but leave everything
else alone.

### Keeping Docs Up-to-Date

With this, we can run a simple command and keep all of our best practices
documentation up to date with our code. If the code changes, or the descriptions
change, or we add or remove sections, it is all auto generated and fresh.

However, we do still have to run the command. So what if an engineer updates
something related to best practices and forgets to run the command? Have we
still not truly solved the problem?

One approach we could take is to use a pre-commit hook in git. Every time you
commit the best practices documentation is generated. This is easy and straight
forward, but to this point our Front End team has avoided adding pre-commit
hooks, preferring instead to push that work off to our CI system.

To keep with that preference, we added the ability for the CI system to check to
make sure our docs are up-to-date. It works like this:

1. When we generate our best practices doc, we take a textual representation of
   the docs and generate a digest
2. We write that digest to a file that is committed to our repository
3. We added a `check` sub-command to our docs generation program that will build
   the docs and generate a digest, and compare it to the stored digest
4. If the digests differ, the CI run fails

Then when the engineer sees CI fail on the documentation step, they can run the
build step and push up the changes.

We used that process for a while, but found it lacking for our process – since
we generate links to the code in GitHub, and since that requires line numbers,
changing code in a file _above_ a best practice block would cause the best
practices structure to change. This led to unexpected CI failures for our best
practices check.

So, we decided to make the best practices docs generation be part of the static
site generation for our docs. Now, the docs are generated by CI when we deploy
our code, and they're always up to date without any extra developer work.

## What's Next

This process and tooling is still new for the team, so we're still working on
identifying and tagging what should be a best practice, and we're still getting
used to the process of adding things as best practices. However, since it makes
creating and updating docs a natural part of writing code, we're hopeful that it
will go a long way towards making our docs higher quality, fresher, and easier
to maintain!

## You Can Try it Too!

If you like the idea behind this, you're welcome to try it out! We took our
documentation building and checking code and turned it into a library:

https://www.npmjs.com/package/@closeio/best-practices-documentation

This package provides a `best-practices` executable that you can use to generate
your own docs. It also exports all the functionality we use in the executable so
you can customize the behavior if the default behavior doesn't work well for
you!

There are a few limitations on this library that you should be aware of:

1. It currently does not support multi-line comments. So use `//` for JavaScript
   and `TypeScript`, and `{/* ... */}` for `JSX`. Using an `AST` rather than a
   line parser is a logical next iteration.
2. It only looks at files with `.js`. , `.jsx`, `.ts`, and `.tsx` file
   extensions. This is easily configurable, but for the sake of simplicity we
   didn't include that in the first version.

These are all issues we're eager to solve for ourselves, but for this first pass
we decided not to tackle those issues.
