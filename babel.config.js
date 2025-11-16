module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      ['@babel/preset-typescript', {
        allowDeclareFields: true,
        isTSX: true,
        allExtensions: true,
        onlyRemoveTypeImports: true,
      }],
      'babel-preset-expo',
    ],
    plugins: [],
  };
};
