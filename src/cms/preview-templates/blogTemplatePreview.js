// https://github.com/netlify-templates/gatsby-starter-netlify-cms/blob/master/src/templates/blog-post.js

import React from 'react'
import PropTypes from 'prop-types'
import BlogPostTemplate from '../../templates/blogTemplate'

const BlogPostPreview = ({ entry, widgetFor }) => {
  const tags = entry.getIn(['data'])
  return (
    <BlogPostTemplate
      content={widgetFor('body')}
      data={entry.getIn(['data', 'date'])}
      thumbnail={entry.getIn(['data', 'thumbnail'])}
      title={entry.getIn(['data', 'title'])}
    />
  )
}

BlogPostPreview.propTypes = {
  entry: PropTypes.shape({
    getIn: PropTypes.func,
  }),
  widgetFor: PropTypes.func,
}

export default BlogPostPreview
