import React, { Fragment } from 'react';
import Helmet from 'react-helmet';
import { graphql, Link } from 'gatsby';
import Layout from '../components/layout';
import HeroHeader from '../components/heroHeader';
import Job from '../components/job';
import HeroImage from '../assets/close-collage.jpg';
import PropTypes from 'prop-types';
import jobsStyles from '../styles/jobs.module.scss';
import postStyles from '../styles/post.module.scss';

const Jobs = ({ data }) => {
  const { site, allLever } = data;

  const Content = () => {
    if (allLever.totalCount) {
      return (
        <Fragment>
          <div className={jobsStyles.intro}>
            <p>
              We are hiring top talent to help us unify the world&apos;s sales
              calls and emails into one beautiful workflow and to keep crushing
              the world of sales software.
            </p>
          </div>
          <ul className={jobsStyles.jobslist}>
            {allLever.nodes.map((job) => (
              <Job className={jobsStyles.jobs} key={job.id} job={job} />
            ))}
          </ul>
        </Fragment>
      );
    } else {
      return (
        <div className={jobsStyles.intro}>
          <p>There are no jobs currently advertised.</p>
        </div>
      );
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Jobs at Close | {site.siteMetadata.title}</title>
      </Helmet>
      <HeroHeader
        title="Engineering & Product Jobs at Close"
        description="We're building the sales communication platform of the future."
      />
      <Link to="https://close.com/about/">
        <img
          src={HeroImage}
          className={jobsStyles.image}
          alt="Collage of the Close Team"
          loading="eager"
          layout="fullWidth"
        />
      </Link>
      <div className={postStyles.content}>
        <h2>
          At Close, we&apos;ve built a next-generation CRM that eliminates
          manual data entry and helps sales teams close more deals.
        </h2>
        <Content />
      </div>
    </Layout>
  );
};

export const query = graphql`
  query JobsQuery {
    site {
      siteMetadata {
        title
      }
    }
    allLever(
      filter: { categories: { team: { in: ["Engineering", "Product"] } } }
    ) {
      nodes {
        categories {
          location
          team
          commitment
        }
        applyUrl
        text
        hostedUrl
        id
      }
      totalCount
    }
  }
`;

export default Jobs;

Jobs.propTypes = {
  data: PropTypes.shape({
    allLever: PropTypes.shape({
      nodes: PropTypes.any.isRequired,
      totalCount: PropTypes.number.isRequired,
    }),
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
  }),
};
