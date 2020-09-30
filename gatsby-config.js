module.exports = {
  siteMetadata: require('./site-meta-data.json'),
  plugins: [
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'posts',
        path: `${__dirname}/_posts`,
      },
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-copy-linked-files',
            options: {
              ignoreFileExtensions: ['png', 'jpg', 'jpeg'],
            },
          },
          {
            resolve: 'gatsby-remark-images',
            options: {
              quality: 80,
              maxWidth: 768,
              withWebp: true,
            },
          },
          {
            resolve: 'gatsby-remark-prismjs',
            options: {
              classPrefix: 'language-',
              inlineCodeMarker: null,
              aliases: {},
              showLineNumbers: false,
              noInlineHighlight: false,
            },
          },
          {
            resolve: 'gatsby-remark-emojis',
          },
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-react-svg',
      options: {
        rule: {
          include: /assets\/.*\.svg/,
        },
      },
    },
    {
      resolve: 'gatsby-plugin-segment-js',
      options: {
        prodKey: 'Ak24tvTW8u6qHxyE4Gk5mOXXXdmsxQHt',
        trackPage: true,
        trackPageDelay: 50,
        delayLoad: true,
        delayLoadTime: 1000,
        manualLoad: false,
      },
    },
    {
      resolve: 'gatsby-plugin-tinacms',
      options: {
        enabled: process.env.NODE_ENV !== 'production',
        sidebar: true,
        plugins: ['gatsby-tinacms-git', 'gatsby-tinacms-remark'],
      },
    },
    'gatsby-plugin-manifest',
    'gatsby-plugin-sass',
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-dark-mode',
    'gatsby-plugin-sitemap',
    'gatsby-plugin-offline',
  ],
};
