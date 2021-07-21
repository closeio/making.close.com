import React from 'react';
import Helmet from 'react-helmet';
import { graphql } from 'gatsby';
import PropTypes from 'prop-types';
import Layout from '../components/layout';
import Banner from '../components/banner';
import styles from '../styles/post.module.scss';

const BlogTemplate = ({ data }) => {
  const { site, markdownRemark, allLever } = data;
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

      <div className={styles.container}>
        {allLever.totalCount && (
          <Banner title="We’re hiring" url="/jobs/">
            <p>Find out about the roles currently available at Close.</p>
          </Banner>
        )}

        <article className={styles.post}>
          <div className={`${styles.thumbnail} ${style}`}>
            <div className={styles.meta}>{frontmatter.date}</div>
            <h1 className={styles.title}>{frontmatter.title}</h1>
            <div className={styles.author}>by {frontmatter.author}</div>
          </div>
          <div
            className={styles.content}
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
    allLever(
      filter: { categories: { team: { in: ["engineering", "Product"] } } }
    ) {
      totalCount
    }
  }
`;

export default BlogTemplate;

BlogTemplate.propTypes = {
  data: PropTypes.exact({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
    markdownRemark: PropTypes.exact({
      frontmatter: PropTypes.shape({
        title: PropTypes.string.isRequired,
        metaDescription: PropTypes.string,
        thumbnail: PropTypes.string,
        date: PropTypes.string.isRequried,
        author: PropTypes.string.isRequried,
      }),
      html: PropTypes.string.isRequired,
    }),
    allLever: PropTypes.shape({
      totalCount: PropTypes.number.isRequired,
    }),
  }),
};
