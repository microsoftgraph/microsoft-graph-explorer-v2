import { ITelemetryItem } from '@microsoft/applicationinsights-web';
import { errorTypes } from '.';
import {
  DEVX_API_URL,
  GRAPH_API_SANDBOX_URL,
  GRAPH_URL,
  HOME_ACCOUNT_KEY,
  ADAPTIVE_CARD_URL,
} from '../app/services/graph-constants';
import { sanitizeGraphAPISandboxUrl, sanitizeQueryUrl } from '../app/utils/query-url-sanitization';
import { clouds } from '../modules/sovereign-clouds';

export function filterTelemetryTypes(envelope: ITelemetryItem) {
  const baseType = envelope.baseType || '';
  const telemetryTypesToInclude = [
    'EventData',
    'MetricData',
    'PageviewData',
    'ExceptionData',
    'RemoteDependencyData',
  ];
  return telemetryTypesToInclude.includes(baseType);
}

export function filterRemoteDependencyData(envelope: ITelemetryItem): boolean {
  if (envelope.baseType === 'RemoteDependencyData') {
    const baseData = envelope.baseData || {};
    const targetsToInclude = [
      GRAPH_URL,
      DEVX_API_URL,
      new URL(GRAPH_API_SANDBOX_URL).origin,
      new URL(ADAPTIVE_CARD_URL).origin,
    ].concat(getCloudUrls());

    const { origin } = new URL(baseData.target || '');
    if (!targetsToInclude.includes(origin)) {
      return false;
    }

    const target = baseData.target || '';
    switch (origin) {
      case GRAPH_URL:
        baseData.name = sanitizeQueryUrl(target);
        break;
      case GRAPH_API_SANDBOX_URL:
        baseData.name = sanitizeGraphAPISandboxUrl(target);
      default:
        if (getCloudUrls().includes(origin)) {
          baseData.name = sanitizeQueryUrl(target);
        }
        break;
    }
    return true;
  }
  return false;
}

function getCloudUrls() {
  const urls: string[] = [];
  clouds.forEach(cloud => {
    urls.push(cloud.baseUrl);
  });
  return urls;
}

export function addCommonTelemetryItemProperties(envelope: ITelemetryItem) {
  const telemetryItem = envelope.baseData || {};
  telemetryItem.properties = telemetryItem.properties || {};

  // Identifies the source of telemetry events
  telemetryItem.properties.ApplicationName = 'Graph Explorer v4';

  // Checks if user is authenticated
  const accessTokenKey = HOME_ACCOUNT_KEY;
  const accessToken = localStorage.getItem(accessTokenKey);
  telemetryItem.properties.IsAuthenticated = !!accessToken;

  return true;
}

export function sanitizeTelemetryItemUriProperty(envelope: ITelemetryItem) {
  // Remove access token from URI
  const telemetryItem = envelope.baseData || {};
  const uri = telemetryItem.uri;
  if (uri) {
    const startOfFragment = uri.indexOf('#');
    const sanitisedUri = uri.substring(0, startOfFragment);
    telemetryItem.uri = sanitisedUri;
  }
  return true;
}

export function sanitizeStackTrace(envelope: ITelemetryItem) {
  if (envelope.baseType === 'ExceptionData') {
    const telemetryItem = envelope.baseData || {};
    telemetryItem.properties = telemetryItem.properties || {};

    if (telemetryItem.exceptions && telemetryItem.exceptions.length > 0) {
      const exception = telemetryItem.exceptions[0];
      const parsedStack = exception.parsedStack[0];

      // Only capture errors coming from our source code and not dependencies, to reduce noise
      if (!parsedStack.fileName.startsWith('webpack-internal')) {
        return false;
      }

      // Add properties for unhandled exceptions only
      if (!telemetryItem.properties.ComponentName) {
        telemetryItem.properties.ComponentName = parsedStack.assembly;
        telemetryItem.properties.Message = exception.stack.split('\n')[0]; // Read first line only
        exception.message = errorTypes.UNHANDLED_ERROR;
      }

      exception.hasFullStack = false;
      exception.stack = null;
      exception.parsedStack = [parsedStack];
      telemetryItem.exceptions = [exception];
    }
  }
  return true;
}
