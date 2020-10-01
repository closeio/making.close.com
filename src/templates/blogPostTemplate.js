import React from 'react';
import Helmet from 'react-helmet';
import { graphql } from 'gatsby';
import Layout from '../components/layout';
import PropTypes from 'prop-types';
import { useForm, usePlugin } from 'tinacms';
import { remarkForm } from 'gatsby-tinacms-remark';

const BlogPostForm = {
  label: 'Blog Post',
  fields: [
    {
      name: 'frontmatter.title',
      label: 'Title',
      component: 'text',
    },
    {
      name: 'frontmatter.thumbnail',
      label: 'Featured Image',
      component: 'image',
    },
    {
      name: 'frontmatter.author',
      label: 'Author Name',
      component: 'text',
    },
    {
      name: 'rawMarkdownBody',
      label: 'Body',
      component: 'markdown',
    },
    {
      name: 'frontmatter.tags',
      label: 'Tags',
      component: 'tags',
    },
    {
      name: 'frontmatter.metaDescription',
      label: 'Description',
      component: 'textarea',
      description: 'Used in Google search results.',
    },
  ],
};

const BlogPostTemplate = ({ data, pageContext }) => {
  const { site, markdownRemark } = data;
  const { siteMetadata } = site;
  const { frontmatter, html } = markdownRemark;
  const { date } = pageContext;

  const style = frontmatter.thumbnail
    ? `backgroundImage: url(${frontmatter.thumbnail})`
    : '';

  return (
    <Layout>
      <Helmet>
        <title>
          {markdownRemark.frontmatter.title} | {siteMetadata.title}
        </title>
        {Boolean(markdownRemark.frontmatter.metaDescription) && (
          <meta
            name="description"
            content={markdownRemark.frontmatter.metaDescription}
          />
        )}
      </Helmet>

      <div className="blog-post-container">
        <article className="post">
          <div className={`post-thumbnail ${style}`}>
            <div className="post-meta">{date}</div>
            <h1 className="post-title">{markdownRemark.frontmatter.title}</h1>
            {Boolean(markdownRemark.frontmatter.author) && (
              <div className="post-meta post-author">
                by {markdownRemark.frontmatter.author}
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
  query BlogPostByPath($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      fields {
        date(formatString: "MMMM DD, YYYY")
        slug
      }
      frontmatter {
        author
        title
        thumbnail
        metaDescription
        tags
      }
      ...TinaRemark
    }
  }
`;

export default remarkForm(BlogPostTemplate, BlogPostForm);

BlogPostTemplate.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
    markdownRemark: PropTypes.shape({
      frontmatter: PropTypes.shape({
        title: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        thumbnail: PropTypes.string,
        metaDescription: PropTypes.string,
      }),
      html: PropTypes.string.isRequired,
    }),
  }),
  pageContext: PropTypes.shape({
    date: PropTypes.string.isRequired,
  }),
};
