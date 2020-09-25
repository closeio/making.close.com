import React from 'react';
import { Link } from 'gatsby';

const Navigation = () => (
  <nav className="navigation">
    <ul className="navlist">
      <li className="navlist-item">
        <Link to="/engineering/">Engineering Posts</Link>
      </li>
      <li className="navlist-item">
        <Link to="/design/">Design Posts</Link>
      </li>
      <li className="navlist-item">
        <Link to="/open-source/">Open Source Projects</Link>
      </li>
    </ul>
  </nav>
);

export default Navigation;
