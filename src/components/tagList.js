import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'gatsby';
import generateTagSlug from '../utils/generateTagSlug';
import * as styles from '../styles/taglist.module.scss';

const TagList = ({ tags }) => (
  <ul className={styles.taglist}>
    {tags.map((tag, index) => (
      <li className={styles.item} key={index}>
        <Link to={`/tags/${generateTagSlug(tag)}/`} className={styles.tag}>
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
