import React from 'react';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';
import { graphql } from 'gatsby';
import Layout from '../components/layout';
import PostLink from '../components/postLink';
import HeroHeader from '../components/heroHeader';
import { TinaProvider, TinaCMS } from 'tinacms';

const IndexPage = ({ data }) => {
  const { site, allMarkdownRemark } = data;
  const Posts = allMarkdownRemark.nodes.map((node) => (
    <PostLink key={node.id} post={node} />
  ));

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
    allMarkdownRemark(sort: { fields: [fields___date], order: DESC }) {
      nodes {
        id
        excerpt(pruneLength: 250)
        fields {
          date(formatString: "MMMM DD, YYYY")
          slug
        }
        frontmatter {
          title
          thumbnail
          author
          tags
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
      nodes: PropTypes.array.isRequired,
    }),
  }),
};
