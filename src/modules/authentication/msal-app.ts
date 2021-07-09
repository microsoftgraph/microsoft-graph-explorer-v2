import { Configuration, PublicClientApplication } from '@azure/msal-browser';
import { getCurrentCloud } from '../sovereign-clouds';

function getClientIdFromWindow() {
  return (window as any).ClientId;
}

function getClientIdFromEnv(): string {
  const cloud = getCurrentCloud();
  if (cloud?.name === 'China') {
    return process.env.REACT_APP_CLIENT_ID_CHINA || '';
  }
  return process.env.REACT_APP_CLIENT_ID || '';
}

const windowHasClientId = getClientIdFromWindow();
const clientId = windowHasClientId ? getClientIdFromWindow() : getClientIdFromEnv();
const configuration: Configuration = {
  auth: {
    clientId
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  }
};

export const msalApplication = new PublicClientApplication(configuration);
