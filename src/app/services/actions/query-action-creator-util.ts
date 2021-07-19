import {
  AuthenticationHandlerOptions,
  ResponseType,
} from '@microsoft/microsoft-graph-client';
import { MSALAuthenticationProviderOptions } from '@microsoft/microsoft-graph-client/lib/src/MSALAuthenticationProviderOptions';

import { IAction } from '../../../types/action';
import { ContentType } from '../../../types/enums';
import { IQuery } from '../../../types/query-runner';
import { IRequestOptions } from '../../../types/request';
import { encodeHashCharacters } from '../../utils/query-url-sanitization';
import { authProvider, GraphClient } from '../graph-client';
import { DEFAULT_USER_SCOPES } from '../graph-constants';
import { QUERY_GRAPH_SUCCESS } from '../redux-constants';
import { queryRunningStatus } from './query-loading-action-creators';

export function queryResponse(response: object): IAction {
  return {
    type: QUERY_GRAPH_SUCCESS,
    response,
  };
}

export async function anonymousRequest(
  dispatch: Function,
  query: IQuery,
  getState: Function
) {
  dispatch(queryRunningStatus(true));
  const { proxyUrl } = getState();
  const { graphUrl, options } = createAnonymousRequest(query, proxyUrl);
  return fetch(graphUrl, options);
}

export function createAnonymousRequest(query: IQuery, proxyUrl: string) {
  const escapedUrl = encodeURIComponent(query.sampleUrl);
  const graphUrl = `${proxyUrl}?url=${escapedUrl}`;
  const sampleHeaders: any = {};

  if (query.sampleHeaders && query.sampleHeaders.length > 0) {
    query.sampleHeaders.forEach((header) => {
      sampleHeaders[header.name] = header.value;
    });
  }

  const authToken = '{token:https://graph.microsoft.com/}';
  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    SdkVersion: 'GraphExplorer/4.0',
    ...sampleHeaders,
  };

  const options: IRequestOptions = {
    method: query.selectedVerb,
    headers,
    redirect: 'manual',
  };
  return { graphUrl, options };
}

export function authenticatedRequest(
  dispatch: Function,
  query: IQuery,
  scopes: string[] = DEFAULT_USER_SCOPES.split(' ')
) {
  return makeRequest(query.selectedVerb, scopes)(dispatch, query);
}

export function isImageResponse(contentType: string | undefined) {
  if (!contentType) {
    return false;
  }
  return (
    contentType === 'application/octet-stream' || contentType.includes('image/')
  );
}

export function isBetaURLResponse(json: any) {
  return !!json?.account?.[0]?.source?.type?.[0];
}

export function getContentType(headers: Headers) {
  const contentType = headers.get('content-type');
  if (contentType) {
    const delimiterPos = contentType.indexOf(';');
    if (delimiterPos !== -1) {
      return contentType.substr(0, delimiterPos);
    } else {
      return contentType;
    }
  }
}

export function parseResponse(response: any, respHeaders: any): Promise<any> {
  if (response && response.headers) {
    response.headers.forEach((val: any, key: any) => {
      respHeaders[key] = val;
    });

    const contentType = getContentType(response.headers);
    switch (contentType) {
      case ContentType.Json:
        return response.json();

      case ContentType.XML:
      case ContentType.HTML:
      case ContentType.TextPlain:
        return response.text();

      default:
        return response;
    }
  }
  return response;
}

const makeRequest = (httpVerb: string, scopes: string[]): Function => {
  return async (dispatch: Function, query: IQuery) => {
    const sampleHeaders: any = {};
    sampleHeaders.SdkVersion = 'GraphExplorer/4.0';

    if (query.sampleHeaders && query.sampleHeaders.length > 0) {
      query.sampleHeaders.forEach((header) => {
        sampleHeaders[header.name] = header.value;
      });
    }

    const msalAuthOptions = new MSALAuthenticationProviderOptions(scopes);
    const middlewareOptions = new AuthenticationHandlerOptions(
      authProvider,
      msalAuthOptions
    );
    const client = GraphClient.getInstance()
      .api(encodeHashCharacters(query))
      .middlewareOptions([middlewareOptions])
      .headers(sampleHeaders)
      .option('redirect', 'manual')
      .responseType(ResponseType.RAW);

    let response;

    dispatch(queryRunningStatus(true));

    switch (httpVerb) {
      case 'GET':
        response = await client.get();
        break;
      case 'POST':
        response = await client.post(query.sampleBody);
        break;
      case 'PUT':
        response = await client.put(query.sampleBody);
        break;
      case 'PATCH':
        response = await client.patch(query.sampleBody);
        break;
      case 'DELETE':
        response = await client.delete();
        break;
      default:
        return;
    }

    return Promise.resolve(response);
  };
};
