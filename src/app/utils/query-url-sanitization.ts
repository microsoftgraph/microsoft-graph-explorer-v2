/* eslint-disable no-useless-escape */
import { IQuery } from '../../types/query-runner';
import {
  isAllAlpha,
  sanitizeQueryParameter,
} from './query-parameter-sanitization';
import { parseSampleUrl } from './sample-url-generation';

// Matches strings with deprecation identifier
const DEPRECATION_REGEX = /^[a-z]+_v2$/gi;
// Matches patterns like users('MeganB@M365x214355.onmicrosoft.com')
const FUNCTION_CALL_REGEX = /^[a-z]+\(.*\)$/i;
// Matches entity and entity set name patterns like microsoft.graph.group or all letters
const ENTITY_NAME_REGEX = /^((microsoft.graph(.[a-z]+)+)|[a-z]+)$/i;
// Matches folder/file path which is part of url  e.g. /root:/FolderA/FileB.txt:/
const ITEM_PATH_REGEX = /(?:\/)[\w]+:[\w\/.]+(:(?=\/)|$)/g;
// Matches patterns like root: <value>
const SANITIZED_ITEM_PATH_REGEX = /^[a-z]+:<value>$/i;

/**
 * @param segment part of the url string to test
 * deprecated resources may have `_v2` temporarily
 * @returns boolean
 */
export function isDeprecation(segment: string): boolean {
  return DEPRECATION_REGEX.test(segment);
}

/**
 * Matches patterns like users('MeganB@M365x214355.onmicrosoft.com').
 * Characters before bracket must be letters only
 * @param segment
 */
export function isFunctionCall(segment: string): boolean {
  return FUNCTION_CALL_REGEX.test(segment);
}

/**
 * Sanitize Graph API Sandbox URL used when a user is not signed in
 * @param url - URL to be sanitized
 */
export function sanitizeGraphAPISandboxUrl(url: string): string {
  const urlObject = new URL(url);
  const queryParams = urlObject.searchParams;
  // This query parameter holds Graph query URL
  const queryUrl = queryParams.get('url');
  if (queryUrl) {
    queryParams.set('url', sanitizeQueryUrl(queryUrl));
  }
  return urlObject.toString();
}

/**
 * @param url - query URL to be sanitized e.g. https://graph.microsoft.com/v1.0/users/{user-id}
 */
export function sanitizeQueryUrl(url: string): string {
  url = decodeURIComponent(url);
  const { origin } = new URL(url);

  const { search, queryVersion, requestUrl } = parseSampleUrl(url);
  const queryString: string = search
    ? `?${sanitizeQueryParameters(search)}`
    : '';

  // Sanitize item path specified in query url
  let resourceUrl = requestUrl;
  if (resourceUrl) {
    resourceUrl = requestUrl.replace(
      ITEM_PATH_REGEX,
      (match: string): string => {
        return `${match.substring(0, match.indexOf(':'))}:<value>`;
      }
    );

    // Split requestUrl into segments that can be sanitized individually
    const urlSegments = resourceUrl.split('/');
    urlSegments.forEach((segment, index) => {
      const sanitizedSegment = sanitizePathSegment(
        urlSegments[index - 1],
        segment
      );
      resourceUrl = resourceUrl.replace(segment, sanitizedSegment);
    });
  }

  return `${origin}/${queryVersion}/${resourceUrl}${queryString}`;
}

/**
 * Skipped segments:
 * - Entities, entity sets and navigation properties, expected to contain alphabetic letters only
 * - Deprecated entities in the form <entity>_v2
 * The remaining URL segments are assumed to be variables that need to be sanitized
 * @param segment
 */
function sanitizePathSegment(previousSegment: string, segment: string): string {
  const segmentsToIgnore = ['$value', '$count', '$ref', '$batch'];

  if (
    isAllAlpha(segment) ||
    isDeprecation(segment) ||
    SANITIZED_ITEM_PATH_REGEX.test(segment) ||
    segmentsToIgnore.includes(segment.toLowerCase()) ||
    ENTITY_NAME_REGEX.test(segment)
  ) {
    return segment;
  }

  // Check if segment is in this form: users('<some-id>|<UPN>') and tranform to users(<value>)
  if (isFunctionCall(segment)) {
    const openingBracketIndex = segment.indexOf('(');
    const textWithinBrackets = segment.substr(
      openingBracketIndex + 1,
      segment.length - 2
    );
    const sanitizedText = textWithinBrackets
      .split(',')
      .map((text) => {
        if (text.includes('=')) {
          let key = text.split('=')[0];
          key = !isAllAlpha(key) ? '<key>' : key;
          return `${key}=<value>`;
        }
        return '<value>';
      })
      .join(',');
    return `${segment.substring(0, openingBracketIndex)}(${sanitizedText})`;
  }

  if (!isAllAlpha(previousSegment) && !isDeprecation(previousSegment)) {
    previousSegment = 'unknown';
  }

  return `{${previousSegment}-id}`;
}

/**
 * Remove variable data from each query parameter
 * @param queryString
 */
function sanitizeQueryParameters(queryString: string): string {
  // remove leading ? from query string
  queryString = queryString.substring(1);
  return queryString.split('&').map(sanitizeQueryParameter).join('&');
}

export function encodeHashCharacters(query: IQuery): string {
  return query.sampleUrl.replace(/#/g, '%2523');
}
