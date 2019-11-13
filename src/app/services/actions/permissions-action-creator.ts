import { IAction } from '../../../types/action';
import { IRequestOptions } from '../../../types/request';
import { FETCH_SCOPES_ERROR, FETCH_SCOPES_SUCCESS } from '../redux-constants';

export function fetchScopesSuccess(response: object): IAction {
  return {
    type: FETCH_SCOPES_SUCCESS,
    response,
  };
}

export function fetchScopesError(response: object): IAction {
  return {
    type: FETCH_SCOPES_ERROR,
    response,
  };
}

export function fetchScopes(): Function {
  return async (dispatch: Function, getState: Function) => {
    const { sampleQuery: { sampleUrl, selectedVerb } } = getState();
    const urlObject: URL = new URL(sampleUrl);
    const createdAt = new Date().toISOString();
    // remove the prefix i.e. beta or v1.0 and any possible extra '/' character at the end
    const requestUrl = urlObject.pathname.substr(5).replace(/\/$/, '');
    const permissionsUrl = 'https://graphexplorerapi.azurewebsites.net/api/GraphExplorerPermissions?requesturl=' +
      requestUrl + '&method=' + selectedVerb;

    const headers = {
      'Content-Type': 'application/json',
    };

    const options: IRequestOptions = { headers };

    return fetch(permissionsUrl, options)
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          throw (res.error);
        }
        dispatch(fetchScopesSuccess(res));
      })
      .catch(() => {
        const duration = (new Date()).getTime() - new Date(createdAt).getTime();
        const response = {
          /* Return 'Forbidden' regardless of error, as this was a
           permission-centric operation with regards to user context */
          statusText: 'Forbidden',
          status: '403',
          duration
        };
        return dispatch(fetchScopesError(response));
      });
  };
}
