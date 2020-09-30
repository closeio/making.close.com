import React from 'react';
import { Link } from 'gatsby';
import TagList from './tagList';
import PropTypes from 'prop-types';

const PostLink = ({ post }) => (
  <article className="card ">
    {Boolean(post.frontmatter.thumbnail) && (
      <Link to={post.frontmatter.permalink}>
        <img
          src={post.frontmatter.thumbnail}
          alt={post.frontmatter.title + '- Featured Shot'}
        />
      </Link>
    )}
    <header>
      <div className="post-meta">{post.frontmatter.date}</div>

      <h2 className="post-title">
        <Link to={post.frontmatter.permalink} className="post-link">
          {post.frontmatter.title}
        </Link>
      </h2>

      {Boolean(post.frontmatter.author) && (
        <div className="post-meta post-author">
          by {post.frontmatter.author}
        </div>
      )}

      {Boolean(post.frontmatter.tags) && (
        <TagList tags={post.frontmatter.tags} />
      )}
    </header>
  </article>
);
export default PostLink;

PostLink.propTypes = {
  post: PropTypes.shape({
    frontmatter: PropTypes.exact({
      thumbnail: PropTypes.any,
      permalink: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      author: PropTypes.string.isRequired,
      tags: PropTypes.array,
    }),
  }),
};
