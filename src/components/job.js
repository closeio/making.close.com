import React from 'react';
import { Link } from 'gatsby';
import styles from '../styles/job.module.scss';

// Add component that renders Job details
const Job = ({ job }) => {
  return (
    <li className={styles.job}>
      <h3 className={styles.title}>
        <Link to={job.hostedUrl}>{job.text}</Link>
      </h3>
      <ul className={styles.meta}>
        <li className={styles.metaItem}>{job.categories.commitment}</li>
        <li className={styles.metaItem}>{job.categories.team}</li>
      </ul>
      <p>{job.descriptionPlain}</p>
    </li>
  );
};

export default Job;
