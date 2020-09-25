import React from 'react';

const TagList = ({ tags }) => (
  <ul className="taglist">
    {tags.map((tag) => (
      <li className="taglist-item" key={tag.index}>
        <span className="tag">{tag}</span>
      </li>
    ))}
  </ul>
);

export default TagList;
