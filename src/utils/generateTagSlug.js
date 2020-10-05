const slugify = require('slugify');

const config = {
  lower: true,
  replacement: '-',
};

const generateTagSlug = (tag) => slugify(tag, config);

module.exports = generateTagSlug;
