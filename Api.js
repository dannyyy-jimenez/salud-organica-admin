import axios from 'axios';
import qs from 'qs';
import env from './env';
import * as SecureStore from 'expo-secure-store';

const headers = {
  'content-type': 'application/x-www-form-urlencoded',
  'X-Requested-With': 'XMLHttpRequest'
};

const client = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000
});

const onSuccess = (res) => {
  if (res.data._hE) {
    return {
      isError: true,
      responseCode: res.status,
      response: res.data._e,
      data: res.data._body,
      date: new Date().getTime()
    }
  }

  return {
    isError: false,
    responseCode: res.status,
    response: 'success',
    data: res.data._body,
    date: new Date().getTime()
  }
};

const onError = (error) => {
  if (!error.response) {
    error.response = {
      status: 500
    };
  }
  return {
    isError: true,
    responseCode: error.response.status,
    response: error.response.data ? error.response.data._e : 'error',
    data: null,
    date: new Date().getTime()
  }
};

export default {
  get: async (query, data) => {
    try {
      const uuid = await SecureStore.getItemAsync('SSPK');
      const res = await client.get(query, {
        params: {...data, uuid},
        headers: headers
      });
      return onSuccess(res);
    } catch (error) {
      return onError(error);
    }
  },
  post: async (uri, data) => {
    try {
      const uuid = await SecureStore.getItemAsync('SSPK');
      const res = await client({
        method: 'post',
        headers: headers,
        responseType: 'json',
        url: uri,
        params: {uuid},
        data: qs.stringify({...data, uuid})
      });
      return onSuccess(res);
    } catch (error) {
      return onError(error);
    }
  }
}
