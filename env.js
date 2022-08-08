import Constants from 'expo-constants';

const ENV = {
  dev: {
    baseUrl: 'http://192.168.1.122:80', // 10.0.0.102 10.1.10.102
    apiUrl: "http://192.168.1.122:80/api/"
  },
  staging: {
    baseUrl: 'http://10.1.10.102:80',  //10.0.0.102  10.1.10.103
    apiUrl: "http://10.1.10.102:80"
  },
  prod: {
    baseUrl: 'https://www.cbdsaludsativa.com',
    apiUrl: "https://www.cbdsaludsativa.com/api/"
  }
};

function getEnvVars(env = "") {
  if (!env || env === null || env === undefined || env === "") return ENV.dev;
  if (env.indexOf("dev") !== -1) return ENV.dev;
  if (env.indexOf("staging") !== -1) return ENV.staging;
  if (env.indexOf("prod") !== -1) return ENV.prod;
  return ENV.prod;
}

export default getEnvVars(Constants.manifest.releaseChannel);
