import React from 'react';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';
import { graphql } from 'gatsby';
import Layout from '../components/layout';
import PostLink from '../components/postLink';
import HeroHeader from '../components/heroHeader';
import { TinaProvider, TinaCMS } from 'tinacms';

const IndexPage = ({
  data: {
    site,
    allMarkdownRemark: { edges },
  },
}) => {
  const Posts = edges
    .filter((edge) => Boolean(edge.node.frontmatter.date)) // You can filter your posts based on some criteria
    .map((edge) => <PostLink key={edge.node.id} post={edge.node} />);

  return (
    <Layout>
      <Helmet>
        <title>{site.siteMetadata.title}</title>
        <meta name="description" content={site.siteMetadata.description} />
      </Helmet>
      <HeroHeader />
      <div className="grids">{Posts}</div>
    </Layout>
  );
};

export default IndexPage;
export const pageQuery = graphql`
  query indexPageQuery {
    site {
      siteMetadata {
        title
        description
      }
    }
    allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date] }) {
      edges {
        node {
          id
          excerpt(pruneLength: 250)
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            permalink
            title
            thumbnail
            author
            tags
          }
        }
      }
    }
  }
`;

IndexPage.propTypes = {
  data: PropTypes.exact({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      }),
    }),
    allMarkdownRemark: PropTypes.exact({
      edges: PropTypes.array.isRequired,
    }),
  }),
};
