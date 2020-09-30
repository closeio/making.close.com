import React from 'react';
import Helmet from 'react-helmet';
import Layout from '../components/layout';
import { Link } from 'gatsby';

const notFound = () => {
  return (
    <Layout>
      <Helmet>
        <title>Page not found</title>
      </Helmet>
      <h1>404: Page not found</h1>
      <p>
        This page does not exist. Head to our <Link to="/">home page</Link> or{' '}
        <a href="mailto:making@close.com">let us know</a> if something seems
        wrong.
      </p>
    </Layout>
  );
};

export default notFound;
