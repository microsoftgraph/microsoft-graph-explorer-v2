import { MessageBarType } from 'office-ui-fabric-react';
import { writeData } from '../../../store/cache';
import { IHistoryItem } from '../../../types/history';
import { IQuery } from '../../../types/query-runner';
import {
  anonymousRequest, authenticatedRequest,
  isImageResponse, parseResponse, queryResponse
} from './query-action-creator-util';
import { setQueryResponseStatus } from './query-status-action-creator';
import { addHistoryItem } from './request-history-action-creators';

export function runQuery(query: IQuery): Function {
  return (dispatch: Function, getState: Function) => {
    const tokenPresent = getState().authToken;
    const respHeaders: any = {};
    const createdAt = new Date().toISOString();

    if (tokenPresent) {
      return authenticatedRequest(dispatch, query).then(async (response: Response) => {
        await processResponse(response, respHeaders, dispatch, createdAt);
      });
    }

    return anonymousRequest(dispatch, query).then(async (response: Response) => {
      await processResponse(response, respHeaders, dispatch, createdAt);
    });
  };

  async function processResponse(response: Response, respHeaders: any, dispatch: Function,
    createdAt: any) {

    const result = await parseResponse(response, respHeaders);
    const duration = (new Date()).getTime() - new Date(createdAt).getTime();
    createHistory(response, respHeaders, query, createdAt, dispatch, result, duration);

    const status: any = {
      messageType: MessageBarType.error,
      ok : false,
      duration,
    };

    if (response) {
      status.status = response.status;
      status.statusText = response.statusText;
    }

    if (response && response.ok) {

      status.ok = true;
      status.messageType = MessageBarType.success;

      dispatch(setQueryResponseStatus(status));

      return dispatch(queryResponse({
        body: result,
        headers: respHeaders
      }));
    }
    else {
      dispatch(queryResponse({
        body: result,
        headers: respHeaders
      }));
      return dispatch(setQueryResponseStatus(status));
    }

  }
}

async function createHistory(response: Response, respHeaders: any, query: IQuery,
  createdAt: any, dispatch: Function, result: any, duration: number) {
  const status = response.status;
  const statusText = response.statusText;

  const contentType = respHeaders['content-type'];

  const isImageResult = isImageResponse(contentType);
  if (isImageResult) {
    result = {
      message: 'Run the query to view the image'
    };
  }


  const historyItem: IHistoryItem = {
    url: query.sampleUrl,
    method: query.selectedVerb,
    headers: query.sampleHeaders,
    body: query.sampleBody,
    responseHeaders: respHeaders,
    createdAt,
    status,
    statusText,
    duration,
    result,
    har: ''
  };

  writeData(historyItem);

  dispatch(addHistoryItem(historyItem));
  return result;
}

