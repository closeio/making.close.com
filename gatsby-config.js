module.exports = {
  siteMetadata: require('./site-meta-data.json'),
  plugins: [
    'gatsby-plugin-postcss',
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-lever',
      options: {
        // Your Lever site instance name.
        site: 'close.io',
        // Set verboseOutput to true to display a verbose output on `npm run develop` or `npm run build`
        // It can help you debug specific API Endpoints problems
        verboseOutput: false,
      },
    },
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
              quality: 100,
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
      resolve: 'gatsby-plugin-manifest',
      options: {
        icon: 'src/assets/logo.png',
      },
    },
    'gatsby-plugin-sass',
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-dark-mode',
    'gatsby-plugin-sitemap',
    'gatsby-plugin-offline',
  ],
};
