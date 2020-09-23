// https://github.com/netlify-templates/gatsby-starter-netlify-cms/blob/master/src/templates/blog-post.js

import React from 'react';
import PropTypes from 'prop-types';
import { BlogPostTemplate } from '../../templates/blogTemplate';
import { PreviewLayout } from '../../components/layout';

const BlogPostPreview = ({ entry, widgetFor, document }) => {
  // Add a dark class manually while previewing
  document.body.classList.add('dark');

  return (
    <PreviewLayout title="Home">
      <BlogPostTemplate
        content={widgetFor('body')}
        data={entry.getIn(['data', 'date'])}
        thumbnail={entry.getIn(['data', 'thumbnail'])}
        title={entry.getIn(['data', 'title'])}
      />
    </PreviewLayout>
  );
};

BlogPostPreview.propTypes = {
  entry: PropTypes.shape({
    getIn: PropTypes.func,
  }),
  widgetFor: PropTypes.func,
};

export default BlogPostPreview;