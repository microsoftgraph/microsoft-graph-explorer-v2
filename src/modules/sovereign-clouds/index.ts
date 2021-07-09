import { AUTH_URL, GRAPH_URL } from '../../app/services/graph-constants';
import { geLocale } from '../../appLocale';
import { ICloud } from '../../types/cloud';

const storageKey = 'cloud';

export const clouds: ICloud[] = [
  {
    locale: 'en-us',
    name: 'China',
    baseUrl: 'https://microsoftgraph.chinacloudapi.cn',
    loginUrl: 'https://login.chinacloudapi.cn'
  },
  {
    locale: 'global',
    name: 'Canary',
    baseUrl: 'https://canary.graph.microsoft.com',
    loginUrl: 'https://login.microsoftonline.com'
  }
];

export const globalCloud: ICloud = {
  baseUrl: GRAPH_URL,
  locale: 'global',
  loginUrl: AUTH_URL,
  name: 'Global'
}

export function getCurrentCloud(): ICloud | null {
  const cloudName = localStorage.getItem(storageKey);
  if (cloudName && cloudName === globalCloud.name) {
    return globalCloud;
  }
  return (cloudName) ? getCloudProperties(cloudName) : null;
}

export function getEligibleCloud(): ICloud | null {
  const localeValue = geLocale.toLowerCase();
  return clouds.find(cloud => cloud.locale === localeValue) || null;
}

export function getCloudProperties(cloudName: string): ICloud | null {
  return clouds.find(cloud => cloud.name === cloudName) || null;
}

export function replaceBaseUrl(url: string): string {
  const { origin } = new URL(url);
  const currentCloud = getCurrentCloud() || null;
  const baseUrl = (currentCloud) ? currentCloud.baseUrl : globalCloud.baseUrl;
  return url.replace(origin, baseUrl);
}

export function storeCloudValue(value: string): void {
  localStorage.removeItem(storageKey);
  localStorage.setItem(storageKey, value);
}