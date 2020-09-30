'use strict';

// Parse date information out of blog post filename.
const BLOG_POST_FILENAME_REGEX = /([0-9]+)\-([0-9]+)\-([0-9]+)\-(.+)\/(.+)$/;

// Add custom fields to MarkdownRemark nodes.
module.exports = exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  switch (node.internal.type) {
    case 'MarkdownRemark':
      const { relativePath } = getNode(node.parent);

      // Blog posts don't have embedded permalinks.
      // Their slugs follow a pattern: /blog/<year>/<month>/<day>/<slug>.html
      // The date portion comes from the file name: <date>-<title>.md
      const match = BLOG_POST_FILENAME_REGEX.exec(relativePath);
      const year = match[1];
      const month = match[2];
      const day = match[3];
      const filename = match[4];

      const slug = `/posts/${filename}/`;
      // slug = `/posts/${year}/${month}/${day}/${filename}/`;

      const date = new Date(year, month - 1, day);

      // Blog posts are sorted by date and display the date in their header.
      createNodeField({
        node,
        name: 'date',
        value: date.toJSON(),
      });

      // Used to generate URL to view this content.
      createNodeField({
        node,
        name: 'slug',
        value: slug,
      });

      return;
  }
};
