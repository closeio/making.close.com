# Making Close

How we think about building products at Close.

## Developing the site

The site uses the Gatsby static site genreator.

```
git clone git@github.com:closeio/making.close.com.git
cd making.close.com
npm i
npm run dev
```

## Using Netlify CMS

The site uses Netlif CMS (standalone) which provides a GUI by which you can edit markdown files.
To access it go to https://making.close.com/admin and log in using your GitHub account.

**Note:** Syntax highlighting currenrly doesn't work in the CMS preview but does work in the live site.

## Using Netlify CMS Locally

While the admin area is available on the live site, you can also run it locally.

```
npm start
```

This runs a proxy server for Netlify CMS and uses the local git repo for files.
Publishing/deleting creates/removes files from the local filesystem and commits ready for pushing.
