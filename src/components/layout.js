import React from 'react';
import { Link } from 'gatsby';
import useSiteMetadata from './siteMetadata';
import Logo from '../assets/logo.svg';
import ThemeChanger from '../components/themeChanger';

const Layout = ({ children }) => {
  const { title } = useSiteMetadata();
  return (
    <div className="site-wrapper">
      <header className="site-header">
        <Link className="site-logo" to="/">
          <Logo />
        </Link>
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
