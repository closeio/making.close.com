import React from 'react';
import Navigation from '../components/navigation';
import useSiteMetadata from './siteMetadata';
import Logo from '../components/logo';
import ThemeChanger from '../components/themeChanger';
import PropTypes from 'prop-types';

const Layout = ({ children }) => {
  const { title } = useSiteMetadata();
  return (
    <div className="site-wrapper">
      <header className="site-header">
        <a
          href="https://close.com"
          className="site-logo"
          title="Visit Close.com"
        >
          <Logo />
        </a>
        <Navigation />
        <ThemeChanger />
      </header>
      {children}
      <footer className="site-footer">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <a href="https://close.com">Close</a> &bull; <a href="/">{title}</a>{' '}
          &bull; <a href="https://developer.close.com/">API</a> &bull;{' '}
          <a href="https://jobs.close.com/">Jobs</a>
        </p>
      </footer>
    </div>
  );
};

export default Layout;

Layout.propTypes = {
  children: PropTypes.node,
};
