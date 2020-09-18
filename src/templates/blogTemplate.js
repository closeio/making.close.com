// https://github.com/netlify-templates/gatsby-starter-netlify-cms/blob/master/src/templates/blog-post.js

import React from "react";
import Helmet from "react-helmet";
import { graphql } from "gatsby";
import Content, { HTMLContent } from '../components/content'
import Layout from "../components/layout";
import { Fragment } from "react";

export const BlogPostTemplate = ({
  content,
  contentComponent,
  date,
  title,
  thumbnail,
  helmet,
}) => {
  const PostContent = contentComponent || Content

  return (
    <React.Fragment>
      {helmet || ''}
      <div className="blog-post-container">
        <article className="post">
          {!thumbnail && (
            <div className="post-thumbnail">
              <h1 className="post-title">{title}</h1>
              <div className="post-meta">{date}</div>
            </div>
          )}
          {!!thumbnail && (
            <div
              className="post-thumbnail"
              style={{ backgroundImage: `url(${thumbnail})` }}
            >
              <h1 className="post-title">{title}</h1>
              <div className="post-meta">{date}</div>
            </div>
          )}
          <PostContent content={content} className="blog-post-content" />
        </article>
      </div>
    </React.Fragment>
  )
}

const BlogPost = ({ data }) => {
  const { site, markdownRemark } = data
  const { siteMetadata } = site;
  const { frontmatter, html } = markdownRemark;

  return (
    <Layout>
      <BlogPostTemplate
        content={html}
        contentComponent={HTMLContent}
        helmet={
          <Helmet>
            <title>{frontmatter.title} | {siteMetadata.title}</title>
            <meta name="description" content={frontmatter.metaDescription} />
          </Helmet>
        }
        title={frontmatter.title}
      />
    </Layout>
  )
}

export default BlogPost;

export const pageQuery = graphql`
  query($path: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(frontmatter: { permalink: { eq: $path } }) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        permalink
        title
        thumbnail
        metaDescription
      }
    }
  }
`;
