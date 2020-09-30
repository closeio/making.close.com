import React from 'react';
import { Link } from 'gatsby';
import TagList from './tagList';
import PropTypes from 'prop-types';

const PostLink = ({ post }) => {
  const { frontmatter, fields } = post;
  return (
    <article className="card ">
      {Boolean(frontmatter.thumbnail) && (
        <Link to={fields.slug}>
          <img
            src={frontmatter.thumbnail}
            alt={frontmatter.title + '- Featured Shot'}
          />
        </Link>
      )}
      <header>
        <div className="post-meta">{fields.date}</div>

        <h2 className="post-title">
          <Link to={fields.slug} className="post-link">
            {frontmatter.title}
          </Link>
        </h2>

        {Boolean(frontmatter.author) && (
          <div className="post-meta post-author">by {frontmatter.author}</div>
        )}

        {Boolean(frontmatter.tags) && <TagList tags={frontmatter.tags} />}
      </header>
    </article>
  );
};
export default PostLink;

PostLink.propTypes = {
  post: PropTypes.shape({
    frontmatter: PropTypes.exact({
      thumbnail: PropTypes.any,
      title: PropTypes.string.isRequired,
      author: PropTypes.string.isRequired,
      tags: PropTypes.array,
    }),
  }),
};
