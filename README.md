# Making Close

How we think about building products at Close.

To write a new blog post, simply follow the existing pattern inside [`_posts`](https://github.com/closeio/engineering.close.com/blob/master/_posts).
GitHub will automatically build and deploy to GitHub Pages when something is pushed to master.

## Writing a Post

1. Create a new branch (named to indicate the post content).
1. Create an `index.md` file in a new folder within the `_posts` directory
1. Name the folder according to the date and slug of the post e.g. `2020-09-22-my-super-post/index.md`.\*
1. Add any images to the same folder and insert them using a `./filename.png` relative path. **Don't worry about resizing or optimizing**: Gatsby does that at build time.
1. **Don't link images to their originals**: Gatsby will autolink at build time.
1. Complete the frontmatter details (below).
1. Commit then push changes, and create a PR.

```yaml
---
title: 'My Super Post'
date: 2019-11-06
permalink: /posts/my-super-post
author: Alex Prokop
thumbnail: ''
metaDescription: ''
tags: [engineering, some, other, tags]
---

```

\*while not necessary for creating the post (which relies on the slug in the frontmatter) it helps file organization.

## Developing the site

The site uses the Gatsby static site genreator and is deployed with Vercel.

```bash
git clone git@github.com:closeio/engineering.close.com.git making.close.com
cd making.close.com
npm i
npm run dev
```

Open http://localhost:8000
