'use strict';

const { resolve } = require('path');

module.exports = async ({ graphql, actions }) => {
  const { createPage } = actions;

  const blogTemplate = resolve(
    __dirname,
    '../src/templates/blogPostTemplate.js'
  );

  const allMarkdown = await graphql(
    `
      {
        allMarkdownRemark(limit: 1000) {
          edges {
            node {
              fields {
                slug
              }
            }
          }
        }
      }
    `
  );

  if (allMarkdown.errors) {
    console.error(allMarkdown.errors);

    throw Error(allMarkdown.errors);
  }

  allMarkdown.data.allMarkdownRemark.edges.forEach((edge) => {
    const slug = edge.node.fields.slug;

    createPage({
      path: slug,
      component: blogTemplate,
      context: {
        slug,
      },
    });
  });
};
