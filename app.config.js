module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    }
  };
};
