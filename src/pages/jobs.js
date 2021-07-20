import React from 'react';
import Helmet from 'react-helmet';
import Layout from '../components/layout';
import Job from '../components/job';
import { graphql } from 'gatsby';

const Jobs = ({ data }) => {
  const { allLever } = data;

  const Jobs = allLever.nodes.map((job) => <Job key={job.id} job={job} />);

  return (
    <Layout>
      <Helmet>
        <title>Jobs at Close</title>
      </Helmet>
      <h1>Engineering & Product Jobs at Close</h1>
      <img
        alt="Collage of the Close Team"
        src="https://close.com/static/img/team/close-collage.jpg?h=16c37832"
      />
      <div className="leading">
        <h2>
          At Close, we’re building the sales communication platform of the
          future. We’ve built a next-generation CRM that eliminates manual data
          entry and helps sales teams close more deals.
        </h2>
        <p>
          We are hiring top talent to help us unify the world's sales calls and
          emails into one beautiful workflow and to keep crushing the world of
          sales software.
        </p>
        {Jobs}
      </div>
    </Layout>
  );
};

export const query = graphql`
  query JobsQuery {
    allLever(
      filter: { categories: { team: { in: ["engineering", "Product"] } } }
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
