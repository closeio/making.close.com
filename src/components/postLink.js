import React from 'react';
import { Link } from 'gatsby';
import TagList from './tagList';
import PropTypes from 'prop-types';
import styles from '../styles/post.module.scss';

const PostLink = ({ post }) => (
  <article className={styles.card}>
    {Boolean(post.frontmatter.thumbnail) && (
      <Link to={post.frontmatter.permalink}>
        <img
          src={post.frontmatter.thumbnail}
          alt={post.frontmatter.title + '- Featured Shot'}
        />
      </Link>
    )}
    <header className={styles.header}>
      <div className={styles.meta}>{post.frontmatter.date}</div>

      <h2 className={styles.title}>
        <Link to={post.frontmatter.permalink} className={styles.link}>
          {post.frontmatter.title}
        </Link>
      </h2>

      {Boolean(post.frontmatter.author) && (
        <div className={styles.author}>by {post.frontmatter.author}</div>
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
