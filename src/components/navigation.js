import React from 'react';
import { Link } from 'gatsby';
import ThemeChanger from '../components/themeChanger';

export default () => (
  <nav className="navigation">
    <p>
      <Link to="/engineering/">Engineering Posts</Link> &bull;{' '}
      <Link to="/design/">Design Posts</Link> &bull;{' '}
      <Link to="/open-source/">Open Source Projects</Link>
    </p>
    <ThemeChanger />
  </nav>
);
