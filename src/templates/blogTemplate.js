import React, { Fragment } from 'react';
import Helmet from 'react-helmet';
import { graphql } from 'gatsby';
import Content, { HTMLContent } from '../components/content';
import Layout from '../components/layout';

export const BlogPostTemplate = ({
  content,
  contentComponent,
  date,
  title,
  thumbnail,
  author,
  helmet,
}) => {
  const PostContent = contentComponent || Content;

  const style = thumbnail ? `backgroundImage: url(${thumbnail})` : '';

  return (
    <Fragment>
      {helmet || ''}
      <div className="blog-post-container">
        <article className="post">
          <div className={`post-thumbnail ${style}`}>
            <div className="post-meta">{date}</div>
            <h1 className="post-title">{title}</h1>
            {!!author && (
              <div className="post-meta post-author">by {author}</div>
            )}
          </div>
          <PostContent content={content} className="blog-post-content" />
        </article>
      </div>
    </Fragment>
  );
};

const BlogPost = ({ data }) => {
  const { site, markdownRemark } = data;
  const { siteMetadata } = site;
  const { frontmatter, html } = markdownRemark;

  return (
    <Layout>
      <BlogPostTemplate
        content={html}
        contentComponent={HTMLContent}
        helmet={
          <Helmet>
            <title>
              {frontmatter.title} | {siteMetadata.title}
            </title>
            <meta name="description" content={frontmatter.metaDescription} />
          </Helmet>
        }
        title={frontmatter.title}
        thumbnail={frontmatter.thumbnail}
        author={frontmatter.author}
        date={frontmatter.date}
      />
    </Layout>
  );
};

export default BlogPost;

export const pageQuery = graphql`
  query BlogPostByPath($path: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(frontmatter: { permalink: { eq: $path } }) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        author
        permalink
        title
        thumbnail
        metaDescription
      }
    }
  }
`;
