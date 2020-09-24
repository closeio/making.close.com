import React from 'react';
import { Link } from 'gatsby';
import TagList from './tagList';

const PostLink = ({ post }) => (
  <article className="card ">
    {!!post.frontmatter.thumbnail && (
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
      {!!post.frontmatter.author && (
        <div className="post-meta post-author">
          by {post.frontmatter.author}
        </div>
      )}
      <TagList tags={post.frontmatter.tags} />
    </header>
  </article>
);
export default PostLink;
