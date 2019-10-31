# Close Engineering Blog

https://engineering.close.com

## Overview

This is an extremely simple [Jekyll](https://jekyllrb.com/) blog. Jekyll was chosen because of the built-in support with GitHub Pages, so we don't even need a build step. We're using the default [minima](https://github.com/jekyll/minima) theme which we've customized only slightly.

## Run in dev

Dependencies: Docker

```sh
docker run --rm --volume="$PWD:/srv/jekyll" -p 4000:4000 -it jekyll/jekyll jekyll serve
```

Open:

https://localhost:4000/