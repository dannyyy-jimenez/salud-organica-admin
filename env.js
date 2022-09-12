import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const ENV = {
  dev: {
    baseUrl: 'http://10.1.10.103:80', // 10.0.0.102 10.1.10.102
    apiUrl: "http://10.1.10.103:80/api/"
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

function getEnvVars() {
  if (Updates.releaseChannel.startsWith('staging')) return ENV.staging;
  if (Updates.releaseChannel.startsWith('prod')) return ENV.prod;

  return ENV.dev;
}

export default getEnvVars();
