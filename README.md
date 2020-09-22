# Close Engineering Blog

https://engineering.close.com

## Overview

This is an extremely simple [Jekyll](https://jekyllrb.com/) blog. Jekyll was chosen because of the built-in support with GitHub Pages, so we don't even need build or deployment scripts. We're using the default [minima](https://github.com/jekyll/minima) theme which we've customized only slightly.

To write a new blog post, simply follow the existing pattern inside [_posts/](_posts/). GitHub will automatically build and deploy anything in `master`, thanks to GitHub Pages. Note: It may take a bit for changes to appear live.

## Development

Optionally, you can build and serve the site locally to preview your work, make changes to the layout, etc.

Dependencies: Docker, docker-compose

```sh
docker-compose up -d
```

Open:

https://localhost:4000/

When done, shut it down with `docker-compose down`.

### Alternative without docker-compose

```sh
docker run --rm --volume="$PWD:/srv/jekyll" -p 4000:4000 -it jekyll/jekyll jekyll serve
```
