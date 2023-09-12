import React from 'react';
import { Link } from 'gatsby';
import PropTypes from 'prop-types';
import * as styles from '../styles/job.module.scss';

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
    </li>
  );
};

export default Job;

Job.propTypes = {
  job: PropTypes.shape({
    categories: PropTypes.shape({
      location: PropTypes.string.isRequired,
      team: PropTypes.string.isRequired,
      commitment: PropTypes.string.isRequired,
    }),
    applyUrl: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    hostedUrl: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
  }),
};
