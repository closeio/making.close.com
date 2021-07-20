import React, { Children } from 'react';
import { Link } from 'gatsby';
import PropTypes from 'prop-types';
import styles from '../styles/banner.module.scss';

const Banner = ({ title, url, children }) => {
  return (
    <Link className={styles.banner} to={url}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {children}
      </div>
      <span className={styles.arrow}>&rarr;</span>
    </Link>
  );
};

export default Banner;

Banner.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string,
  url: PropTypes.string.isRequired,
  children: PropTypes.node,
};
