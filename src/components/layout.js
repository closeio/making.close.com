import React from 'react';
import { Link } from 'gatsby';
import Navigation from './navigation';
import useSiteMetadata from './siteMetadata';

const Layout = ({ children, title }) => {
  return (
    <div className="site-wrapper">
      <header className="site-header">
        <div className="site-title">
          <Link to="/">{title}</Link>
        </div>
        <Navigation />
      </header>
      {children}
      <footer className="site-footer">
        <p>
          &copy; {new Date().getFullYear()} Close &bull;{' '}
          <a href="https://engineering.close.com/">Making of Close</a> &bull;
          <a href="https://developer.close.com/">API</a> &bull;
          <a href="https://jobs.close.com/">Jobs</a>
        </p>
      </footer>
    </div>
  );
};

// Previews can't contain any graphql queries
export const PreviewLayout = ({ children }) => {
  return <Layout title="Previewing...">{children}</Layout>;
};

export default ({ children }) => {
  const { title } = useSiteMetadata();
  return <Layout title={title}>{children}</Layout>;
};
