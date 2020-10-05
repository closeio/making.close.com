import React from 'react';
import { graphql } from 'gatsby';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';
import generateTagSlug from '../utils/generateTagSlug';
import _ from 'lodash';

import Layout from '../components/layout';
import PostLink from '../components/postLink';
import HeroHeader from '../components/heroHeader';
import Pagination from '../components/pagination';

const TagListTemplate = ({ data, pageContext }) => {
  const { tag, numPages, currentPage } = pageContext;
  const { site, allMarkdownRemark } = data;

  const pageNumberString = currentPage > 1 ? ` (Page ${currentPage})` : '';
  const title = `${tag} Posts${pageNumberString}`;

  const Posts = allMarkdownRemark.nodes
    .filter((node) => Boolean(node.frontmatter.date))
    .map((node) => <PostLink key={node.id} post={node} />);

  return (
    <Layout>
      <Helmet>
        <title>
          {title} | {site.siteMetadata.title}
        </title>
      </Helmet>
      <HeroHeader title={title} description={site.siteMetadata.description} />

      <div className="grids">{Posts}</div>

      {numPages > 1 && (
        <Pagination
          numPages={numPages}
          currentPage={currentPage}
          basePath={`/tags/${generateTagSlug(tag)}/`}
        />
      )}
    </Layout>
  );
};

export default TagListTemplate;

export const pageQuery = graphql`
  query TagListQuery($tag: String, $skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
        description
      }
    }
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { frontmatter: { tags: { in: [$tag] } } }
      limit: $limit
      skip: $skip
    ) {
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
      nodes {
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
`;

TagListTemplate.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      }),
    }),
    allMarkdownRemark: PropTypes.shape({
      nodes: PropTypes.object.isRequired,
      frontmatter: PropTypes.shape({
        date: PropTypes.string.isRequired,
        permalink: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        thumbnail: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        tags: PropTypes.array,
      }),
    }),
  }),
  pageContext: PropTypes.shape({
    tag: PropTypes.string.isRequired,
    numPages: PropTypes.number.isRequired,
    currentPage: PropTypes.number.isRequired,
  }),
};
