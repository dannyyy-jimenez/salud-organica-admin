module.exports = ({ config }) => {
  return {
    android: {
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    },
    ...config,
  };
};
