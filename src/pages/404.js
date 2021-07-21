import React from 'react';
import Helmet from 'react-helmet';
import Layout from '../components/layout';
import HeroHeader from '../components/heroHeader';
import { Link } from 'gatsby';

const notFound = () => {
  return (
    <Layout>
      <Helmet>
        <title>Page not found</title>
      </Helmet>
      <HeroHeader title="404: Page not found" />
      <p>
        This page does not exist. Head to our <Link to="/">home page</Link> or{' '}
        <a href="mailto:making@close.com">let us know</a> if something seems
        wrong.
      </p>
    </Layout>
  );
};

export default notFound;
