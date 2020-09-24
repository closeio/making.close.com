import React from 'react';
import { Link } from 'gatsby';
import Navigation from './navigation';
import useSiteMetadata from './siteMetadata';
import Logo from '../assets/logo.svg';

const Layout = ({ children, title }) => {
  const siteTitle = useSiteMetadata().title;
  return (
    <div className="site-wrapper">
      <header className="site-header">
        <Link to="/">
          <Logo className="site-logo" />
        </Link>
        <Navigation />
      </header>
      {children}
      <footer className="site-footer">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <a href="https://close.com">Close</a> &bull;{' '}
          <a href="/">{siteTitle}</a> &bull;{' '}
          <a href="https://developer.close.com/">API</a> &bull;{' '}
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
