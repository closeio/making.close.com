import React from 'react';
import Helmet from 'react-helmet';
import Layout from '../components/layout';
import { graphql, Link } from 'gatsby';

const Jobs = ({ data }) => {
  const { allLever } = data;

  // Add component that renders Job details
  const Job = ({ job }) => {
    console.log(job);
    return <h1>{job.text}</h1>;
  };

  const Jobs = allLever.edges.map((job) => (
    <Job key={job.node.id} job={job.node} />
  ));

  return (
    <Layout>
      <Helmet>
        <title>Jobs at Close</title>
      </Helmet>
      <h1>Jobs at Close</h1>
      {Jobs}
    </Layout>
  );
};

export const query = graphql`
  query JobsQuery {
    allLever {
      edges {
        node {
          id
          hostedUrl
          createdAt
          applyUrl
          text
        }
      }
    }
  }
`;

export default Jobs;
