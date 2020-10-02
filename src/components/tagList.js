import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'gatsby';
import slugify from 'slugify';
import styles from '../styles/taglist.module.scss';

const TagList = ({ tags }) => (
  <ul className={styles.taglist}>
    {tags.map((tag, index) => (
      <li className={styles.item} key={index}>
        <Link to={`/tags/${slugify(tag)}/`} className={styles.tag}>
          {tag}
        </Link>
      </li>
    ))}
  </ul>
);

export default TagList;

TagList.propTypes = {
  tags: PropTypes.array.isRequired,
};
