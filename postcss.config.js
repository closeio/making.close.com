module.exports = () => ({
  parser: require('postcss-comment'),
  plugins: [
    require('postcss-import'),
    require('postcss-preset-env')({ stage: 1 }),
  ],
});
