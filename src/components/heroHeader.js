import React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/heroHeader.module.scss';

const HeroHeader = ({ title, description }) => (
  <div className={styles.heroHeader}>
    <div className={styles.headline}>{title}</div>
    {description && (
      <div
        className={styles.primaryContent}
        dangerouslySetInnerHTML={{
          __html: description,
        }}
      />
    )}
  </div>
);

export default HeroHeader;

HeroHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
};
