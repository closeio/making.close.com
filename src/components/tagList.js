import React from 'react';
import PropTypes from 'prop-types';

const TagList = ({ tags }) => (
  <ul className="taglist">
    {tags.map((tag, index) => (
      <li className="taglist-item" key={index}>
        <span className="tag">{tag}</span>
      </li>
    ))}
  </ul>
);

export default TagList;

TagList.propTypes = {
  tags: PropTypes.array.isRequired,
};
