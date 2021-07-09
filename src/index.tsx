import { AuthenticationResult } from '@azure/msal-browser';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import React from 'react';
import ReactDOM from 'react-dom';
import { addLocaleData, IntlProvider } from 'react-intl';

import de from 'react-intl/locale-data/de';
import en from 'react-intl/locale-data/en';
import es from 'react-intl/locale-data/es';
import fr from 'react-intl/locale-data/fr';
import jp from 'react-intl/locale-data/ja';
import pt from 'react-intl/locale-data/pt';
import ru from 'react-intl/locale-data/ru';
import zh from 'react-intl/locale-data/zh';
import { Provider } from 'react-redux';
import { getAuthTokenSuccess, getConsentedScopesSuccess } from './app/services/actions/auth-action-creators';
import { setDevxApiUrl } from './app/services/actions/devxApi-action-creators';
import { setGraphExplorerMode } from './app/services/actions/explorer-mode-action-creator';
import { addHistoryItem } from './app/services/actions/request-history-action-creators';
import { changeThemeSuccess } from './app/services/actions/theme-action-creator';
import { getCurrentCloud, globalCloud } from './modules/sovereign-clouds';
import { isValidHttpsUrl } from './app/utils/external-link-validation';
import App from './app/views/App';
import { readHistoryData } from './app/views/sidebar/history/history-utils';
import { geLocale } from './appLocale';
import messages from './messages';
import { authenticationWrapper } from './modules/authentication';
import { store } from './store';
import './styles/index.scss';
import { telemetry } from './telemetry';
import ITelemetry from './telemetry/ITelemetry';
import { loadGETheme } from './themes';
import { readTheme } from './themes/theme-utils';
import { IDevxAPI } from './types/devx-api';
import { Mode } from './types/enums';
import { IHistoryItem } from './types/history';

// removes the loading spinner from GE html after the app is loaded
const spinner = document.getElementById('spinner');
if (spinner !== null) {
  (spinner as any).parentElement.removeChild(spinner);
}

// removes the loading spinner from the portal team html after GE loads
const apiExplorer = document.getElementsByTagName('api-explorer')[0];
if (apiExplorer) {
  (apiExplorer as any).parentElement.removeChild(apiExplorer);
}

initializeIcons();

const currentTheme = readTheme();
loadGETheme(currentTheme);

const currentCloud = getCurrentCloud() || null;
const { baseUrl } = (currentCloud) ? currentCloud : globalCloud;

const appState: any = store({
  authToken: { token: false, pending: false },
  consentedScopes: [],
  isLoadingData: false,
  profile: null,
  queryRunnerStatus: null,
  sampleQuery: {
    sampleUrl: `${baseUrl}/v1.0/me`,
    selectedVerb: 'GET',
    sampleBody: undefined,
    sampleHeaders: [],
    selectedVersion: 'v1.0',
  },
  termsOfUse: true,
  theme: currentTheme,
});

function refreshAccessToken() {
  authenticationWrapper.getToken().then((authResponse: AuthenticationResult) => {
    if (authResponse && authResponse.accessToken) {
      appState.dispatch(getAuthTokenSuccess(true));
      appState.dispatch(getConsentedScopesSuccess(authResponse.scopes));
    }
  }).catch(() => {
    // ignore the error as it means that a User login is required
  });
}
refreshAccessToken();

setInterval(refreshAccessToken, 1000 * 60 * 10); // refresh access token every 10 minutes

addLocaleData([
  ...pt,
  ...de,
  ...en,
  ...fr,
  ...jp,
  ...ru,
  ...zh,
  ...es,
]);

const theme = new URLSearchParams(location.search).get('theme');

if (theme) {
  loadGETheme(theme);
  appState.dispatch(changeThemeSuccess(theme));
}

if (theme) {
  appState.dispatch(setGraphExplorerMode(Mode.TryIt));
}

const devxApiUrl = new URLSearchParams(location.search).get('devx-api');

if (devxApiUrl && isValidHttpsUrl(devxApiUrl)) {
  const org = new URLSearchParams(location.search).get('org');
  const branchName = new URLSearchParams(location.search).get('branchName');

  const devxApi: IDevxAPI = {
    baseUrl: devxApiUrl,
    parameters: ''
  };

  if (org && branchName) {
    devxApi.parameters = `org=${org}&branchName=${branchName}`;
  }
  appState.dispatch(setDevxApiUrl(devxApi));
}

readHistoryData().then((data: any) => {
  if (data.length > 0) {
    data.forEach((element: IHistoryItem) => {
      appState.dispatch(addHistoryItem(element));
    });
  }
});

/**
 * Set's up Monaco Editor's Workers.
 */
enum Workers {
  Json = 'json',
  Editor = 'editor'
}

(window as any).MonacoEnvironment = {
  getWorkerUrl(moduleId: any, label: string) {
    if (label === 'json') {
      return getWorkerFor(Workers.Json);
    }
    return getWorkerFor(Workers.Editor);
  }
};

function getWorkerFor(worker: string): string {
  // tslint:disable-next-line:max-line-length
  const WORKER_PATH = 'https://graphstagingblobstorage.blob.core.windows.net/staging/vendor/bower_components/explorer-v2/build';

  return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
	    importScripts('${WORKER_PATH}/${worker}.worker.js');`
  )}`;
}

const telemetryProvider: ITelemetry = telemetry;
telemetryProvider.initialize();

const Root = () => {
  return (
    <Provider store={appState}>
      <IntlProvider locale={geLocale} messages={(messages as { [key: string]: object })[geLocale]}>
        <App />
      </IntlProvider>
    </Provider>
  );
};

ReactDOM.render(<Root />, document.getElementById('root'));
