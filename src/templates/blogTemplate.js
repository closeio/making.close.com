import React from 'react';
import Helmet from 'react-helmet';
import { graphql } from 'gatsby';
import Layout from '../components/layout';

const BlogPostTemplate = ({ data }) => {
  const { site, markdownRemark } = data;
  const { siteMetadata } = site;
  const { frontmatter, html } = markdownRemark;

  const style = frontmatter.thumbnail
    ? `backgroundImage: url(${frontmatter.thumbnail})`
    : '';

  return (
    <Layout>
      <Helmet>
        <title>
          {frontmatter.title} | {siteMetadata.title}
        </title>
        {Boolean(frontmatter.metaDescription) && (
          <meta name="description" content={frontmatter.metaDescription} />
        )}
      </Helmet>

      <div className="blog-post-container">
        <article className="post">
          <div className={`post-thumbnail ${style}`}>
            <div className="post-meta">{frontmatter.date}</div>
            <h1 className="post-title">{frontmatter.title}</h1>
            {Boolean(frontmatter.author) && (
              <div className="post-meta post-author">
                by {frontmatter.author}
              </div>
            )}
          </div>
          <div
            className="blog-post-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </Layout>
  );
};

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

export default BlogPostTemplate;
