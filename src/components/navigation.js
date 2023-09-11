import React from 'react';
import { Link } from 'gatsby';
import * as styles from '../styles/navigation.module.scss';

const Navigation = () => {
  return (
    <nav className={styles.navigation}>
      <ul className={styles.navlist}>
        <li>
          <Link className={styles.link} to="/" title="Home">
            Home
          </Link>
        </li>
        <li>
          <Link
            className={styles.link}
            to="/tags/engineering/"
            title="Engineering Posts"
          >
            Engineering Posts
          </Link>
        </li>
        <li>
          <Link className={styles.link} to="/tags/design/" title="Design Posts">
            Design Posts
          </Link>
        </li>
        <li>
          <Link
            className={styles.link}
            to="/tags/open-source/"
            title="Open Source Projects"
          >
            Open Source Projects
          </Link>
        </li>
        <li>
          <Link className={styles.link} to="/jobs/" title="Jobs at Close">
            Jobs at Close
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
