const path = require('path');
const slugify = require('slugify');
const { slugifyConfig } = require('./src/utils/slugify.config');

// Posts & Tags to show per page
const POSTS_PER_PAGE = 12;

exports.createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions;

  const result = await graphql(`
    {
      postsRemark: allMarkdownRemark(
        sort: { fields: [frontmatter___date], order: DESC }
        limit: 1000
      ) {
        nodes {
          id
          frontmatter {
            permalink
            tags
          }
        }
      }
      tagsGroup: allMarkdownRemark(limit: 1000) {
        group(field: frontmatter___tags) {
          fieldValue
          totalCount
        }
      }
    }
  `);

  if (result.errors) {
    reporter.panicOnBuild('Error while running GraphQL query.');
    result.errors.forEach((e) => console.error(e.toString()));
    return Promise.reject(result.errors);
  }

  // Create individual post pages
  const posts = result.data.postsRemark.nodes;
  const postTemplate = path.resolve('./src/templates/blogTemplate.js');

  posts.forEach((post) => {
    createPage({
      path: post.frontmatter.permalink,
      component: postTemplate,
    });
  });

  // Create paginated index pages
  const numPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const indexTemplate = path.resolve('./src/templates/blogListTemplate.js');

  Array.from({ length: numPages }).forEach((_, i) => {
    createPage({
      path: i === 0 ? '/' : `${i + 1}`,
      component: indexTemplate,
      context: {
        limit: POSTS_PER_PAGE,
        skip: i * POSTS_PER_PAGE,
        numPages: numPages,
        currentPage: i + 1,
        tags: result.data.tagsGroup.group,
      },
    });
  });

  // Create paginated tag list pages
  const tags = result.data.tagsGroup.group;
  const tagTemplate = path.resolve('./src/templates/tagListTemplate.js');

  /// Need to paginate
  tags.forEach((tag) => {
    const numPages = Math.ceil(tag.totalCount / POSTS_PER_PAGE);
    Array.from({ length: numPages }).forEach((_, i) => {
      createPage({
        path:
          i === 0
            ? `/tags/${slugify(tag.fieldValue, slugifyConfig)}`
            : `/tags/${slugify(tag.fieldValue, slugifyConfig)}/${i + 1}`,
        component: tagTemplate,
        context: {
          limit: POSTS_PER_PAGE,
          skip: i * POSTS_PER_PAGE,
          numPages: numPages,
          currentPage: i + 1,
          tag: tag.fieldValue,
          totalCount: tags.totalCount,
        },
      });
    });
  });
};
