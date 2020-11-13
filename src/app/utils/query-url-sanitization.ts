import { GRAPH_URL } from '../services/graph-constants';
import { parseSampleUrl } from './sample-url-generation';

/**
 * @param url - query url to be sanitized e.g. https://graph.microsoft.com/v1.0/users/{user-id}
 */
export function sanitizeQueryUrl(url: string): string {
  url = decodeURIComponent(url);

  const { search, queryVersion, requestUrl } = parseSampleUrl(url);
  const queryString: string = search ? sanitizeQueryParameters(search) : '';

  // Split requestUrl into segments that can be sanitized individually
  let resourceUrl = requestUrl;
  const urlSegments = requestUrl.split('/');

  // Skipped segments: entities, entity sets
  // 1. Entities/entity sets and navigation properties, expected to contain alphabetic letters only
  // 2. Deprecated entities in the form <entity>_v2
  // The remaining URL segments are assumed to be variable Ids that need to be sanitized
  urlSegments.forEach(segment => {
    if (isAllAlpha(segment) || isDeprecation(segment)) {
      return;
    }

    // Check if segment is in this example form: users('<some-id> | <UPN>') and tranform to users({users-id})
    if (hasIdWithinBracket(segment)) {
      const textPrecedingBracket = segment.substring(0, segment.indexOf('('));
      const replacementItemWithPrefix = `${textPrecedingBracket}(${textPrecedingBracket}-id)`;
      resourceUrl = resourceUrl.replace(segment, replacementItemWithPrefix);
    }
    else {
      const index = urlSegments.indexOf(segment);
      const replacementItemWithPrefix = `{${urlSegments[index - 1]}-id}`;
      resourceUrl = resourceUrl.replace(segment, replacementItemWithPrefix);
    }
  });

  return `${GRAPH_URL}/${queryVersion}/${resourceUrl}${queryString}`;
}

/**
 * Split individual query parameters and sanitize with respect to expected format and arbitrary data
 * @param queryString
 */
function sanitizeQueryParameters(queryString: string): string {
  // remove leading ? from query string
  queryString = queryString.substring(1);

  const params = queryString.split('&');
  let sanitizedQueryParams: string = '';
  if (params.length) {
    params.forEach(param => {
      sanitizedQueryParams += sanitizeQueryParameterValue(param) + '&';
    });
    sanitizedQueryParams = sanitizedQueryParams.slice(0, -1);
  }
  return `?${sanitizedQueryParams}`;
}

/**
 * Redact variable segments of query parameters
 * @param param e.g. $top=5, $search="pizza", $filter=startswith(displayName, 'J')
 */
export function sanitizeQueryParameterValue(param: string) {
  if (!param.includes('=')) {
    return param;
  }
  let key: string = param.split('=')[0].toLowerCase().trim();
  let value: string = param.substring(param.indexOf('=') + 1).trim();
  switch (key) {
    case '$top': {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        value = '<unexpected-value>';
      }
      break;
    }

    case '$skip': {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        value = '<unexpected-value>';
      }
      break;
    }

    case '$count': {
      if (value !== 'true' && value !== 'false') {
        value = '<unexpected-value>';
      }
      break;
    }

    case '$select': {
      value = sanitizeSelectQueryParameterValue(value);
      break;
    }

    case '$format': {
      value = sanitizeFormatQueryParameterValue(value);
      break;
    }

    case '$orderby': {
      value = sanitizeOrderQueryParameterValue(value);
      break;
    }

    case '$search': {
      value = sanitizeSearchQueryParameterValue(value);
      break;
    }

    case '$expand': {
      value = sanitizeExpandQueryParameterValue(value);
      break;
    }

    case '$filter': {
      value = sanitizeFilterQueryParameterValue(value);
      break;
    }

    // Redact $skiptoken and $deltatoken values without processing.
    case '$skiptoken':
    case '$deltatoken': {
      value = '<value>';
      break;
    }

    default: {
      if (!isAllAlpha(key)) {
        key = '<key>';
      }
      value = '<value>';
      break;
    }
  }
  return `${key}=${value}`;
}

/**
 * Split $filter value into chuncks in the below categories then process independeently
 * Functions e.g. startWith(<property>, '<value>'),
 * Operators e.g. and, not, eq,
 * Properties e.g Surname, UserPrincipalName,
 * Variables, likely to be enclosed within single quotes
 *
 * Examples:
 * GET /users?$filter=startsWith(displayName,'J')
 * GET /me/messages?$filter=from/emailAddress/address eq 'no-reply@microsoft.com'
 * @param value
 */
function sanitizeFilterQueryParameterValue (queryParameterValue: string): string
{
  let sanitizedQueryString: string = '';

  /**
   * Our interest is only in the functions that take the form `functionName(<property>,<value>)
   *  e.g. endsWith(mail,'@hotmail.com')
   */
  const queryFunctions: string[] = ['startswith', 'endswith', 'contains', 'substring', 'indexof', 'concat'];

  const filterSegments = queryParameterValue.match(filterSegmentRegex);
  // This means $filter value is empty
  if (filterSegments === null) {
    return sanitizedQueryString;
  }

  const numberOfFilterSegments = filterSegments.length;
  for (let index = 0; index < numberOfFilterSegments; index++) {
    const segment = filterSegments[index];

    // No processing needed for operators; append operator to query string.
    if (logicalOperators.includes(segment) || comparisonOperators.includes(segment)) {
      sanitizedQueryString += ` ${segment}`;
      continue;
    }

    // Check if segment is a query function then transform query functions to look like this,
    // 'startswith(userPrincipalName,<value>)' as an example
    let queryFunctionPrefix: string = '';
    queryFunctions.forEach(funcName => {
      if (segment.toLowerCase().startsWith(funcName)) {
        queryFunctionPrefix = funcName;
        return;
      }
    });
    if (queryFunctionPrefix) {

      const commaIndex = segment.indexOf(',');
      const openingBracketIndex = segment.indexOf('(');
      const closingBracketIndex = segment.indexOf(')');

      if (openingBracketIndex > 0) {
        // End of property name is when we encounter a comma, bracket or end of segment, in that order
        const endIndex  = commaIndex > 0 ? commaIndex :
          closingBracketIndex > 0 ? closingBracketIndex : segment.length;
        let propertyName: string = segment.substring(openingBracketIndex + 1, endIndex).trim();

        if (!isAllAlpha(propertyName)) {
          propertyName = '<property>';
        }
        sanitizedQueryString += `${queryFunctionPrefix}(${propertyName}${commaIndex > 0 ? ',<value>' : ''})`;
      }
      else {
        sanitizedQueryString += `${queryFunctionPrefix}(<unknown>)`;
        break;
      }
      continue;
    }

    // Property names, (standing on their own) should be succeeded by comparison operators
    if (segment.match(propertyNameRegex)) {
      // check if succeeded by comparison operator
      if (index < numberOfFilterSegments - 2 &&
        comparisonOperators.includes(filterSegments[index + 1].toLowerCase())) {
        sanitizedQueryString += `${segment} ${filterSegments[index + 1]} <value>`;
        index += 2;
        continue;
      }
    }

    // Anything that get's here is unknown
    sanitizedQueryString += ' <unknown>';
  }
  return sanitizedQueryString;
}

/**
 * Examples:
 * GET /products?$select=rating,releaseDate
 * GET /products?$select=*
 * GET /products?$select=demoservice.*
 * @param queryParameterValue
 */
function sanitizeSelectQueryParameterValue (queryParameterValue: string): string {
  const selectedProperties = queryParameterValue.split(',');
  selectedProperties.forEach((property, index) => {
    if (!isAllAlpha(property.trim()) && property !== '*' && !property.match(actionsForEachEntityRegex)) {
      selectedProperties[index] = '<unexpected-value>';
    }
  });
  queryParameterValue = selectedProperties.join(',');
  return queryParameterValue;
}

/**
 * Examples:
 * GET /products?$orderby=releasedate asc,rating desc
 * @param queryParameterValue
 */
function sanitizeOrderQueryParameterValue (queryParameterValue: string): string {
  const sortingExpressions = queryParameterValue.split(',');
  sortingExpressions.forEach((expression, index) => {
    let sanitizedExpression: string = '';
    const expressionParts = expression.split(' ') // i.e. property name and sort order
    .filter(x => x !== '');

    expressionParts.forEach(exprPart => {
      if (!isAllAlpha(exprPart)) {
        sanitizedExpression += '<unexpected-value> ';
        return;
      }
      sanitizedExpression += `${exprPart} `;
    });
    sortingExpressions[index] = sanitizedExpression.trim();
  });
  queryParameterValue = sortingExpressions.join(',');
  return queryParameterValue;
}

/**
 * Examples:
 * GET /orders?$format=application/json;metadata=full
 * GET /orders?$format=json
 * @param queryParameterValue
 */
function sanitizeFormatQueryParameterValue (queryParameterValue: string): string {
  const formattingExpressions = queryParameterValue.split(';');
  formattingExpressions.forEach((expression, index) => {
    const trimmed = expression.trim();
    if (!trimmed.match(formatSegmentRegex)) {
      formattingExpressions[index] = '<unexpected-value>';
    }
  });
  queryParameterValue = formattingExpressions.join(';');
  return queryParameterValue;
}

/**
 * Examples:
 * GET /me/drive/root?$expand=children($select=id,name)
 * GET /employees?$expand=directreports($filter=firstName eq 'mary'))
 * GET /orders?$expand=Items($expand=product),customer
 * @param segment
 */
function sanitizeExpandQueryParameterValue (queryParameterValue: string): string {
  let sanitizedQueryString: string = '';

  // Split comma separated list of navigation properties
  const expandSegments = queryParameterValue.split(expandSegmentRegex);

  for (let segment of expandSegments) {
    segment = segment.trim();

    if (isAllAlpha(segment)) {
      sanitizedQueryString += ` ${segment},`;
      continue;
    }

    const openingBracketIndex = segment.indexOf('(');
    if (openingBracketIndex > 0) {
      let propertyName = segment.substring(0, openingBracketIndex).trim();
      if (!isAllAlpha(propertyName)) {
        propertyName = '<property>';
      }
      // Sanitize text within brackets which should be key-value pairs of OData query options
      const textWithinBrackets = segment.substring(openingBracketIndex + 1, segment.length - 1).trim();
      const sanitizedText = sanitizeQueryParameterValue(textWithinBrackets);
      sanitizedQueryString += `${propertyName}(${sanitizedText})`;
      continue;
    }

    // Anything that get's here is unknown
    sanitizedQueryString += ' <unknown>';
  }

  return sanitizedQueryString;
}

/**
 * Examples:
 * GET /me/messages?$search="pizza"
 * GET /me/messages?$search="body:excitement"
 * GET /groups?$search="description:One" AND ("displayName:Video" OR "displayName:Drive")
 * @param queryParameterValue
 */
function sanitizeSearchQueryParameterValue(queryParameterValue: string): string {
  let sanitizedQueryString: string = '';
  const searchSegments = queryParameterValue.match(searchSegmentRegex);
  // This means $search value is empty
  if (searchSegments === null) {
    return sanitizedQueryString;
  }

  for (let segment of searchSegments) {
    segment = segment.trim();

    // No processing needed for logicalOperators operators; append operator to query string.
    if (logicalOperators.includes(segment.toLowerCase())) {
      sanitizedQueryString += ` ${segment}`;
      continue;
    }

    // Sanitize segment in the form of "pizza" and "body:excitement"
    if (quotedTextRegex.test(segment)) {
      if (!segment.includes(':')) {
        sanitizedQueryString += ` <value>`;
      }
      else {
        // Extract property name
        let propertyName = segment.substring(1, segment.indexOf(':')).trim();
        if (!isAllAlpha(propertyName)) {
          propertyName = '<property>';
        }
        sanitizedQueryString += ` "${propertyName}:<value>"`;
      }
      continue;
    }

    // Sanitize segments within brackets
    if (segment.startsWith('(')) {
      const textWithinBrackets = segment.substr(1, segment.length - 2);
      const sanitizedText = sanitizeSearchQueryParameterValue(textWithinBrackets);
      sanitizedQueryString += ` (${sanitizedText})`;
      continue;
    }

    // Anything that get's here is unknown
    sanitizedQueryString += ' <unknown>';

  }
  return sanitizedQueryString.trim();
}


/**
 * @param segment - part of the url string to test
 * Currently, non-Id strings are all alphabetic characters
 * @returns boolean
 */
export function isAllAlpha(segment: string): boolean {
  return !!segment.match(allAlphaRegex);
}

/**
 * @param segment part of the url string to test
 * deprecated resources may have `_v2` temporarily
 * @returns boolean
 */
export function isDeprecation(segment: string): boolean {
  return !!segment.match(deprecationRegex);
}

/**
 * Matches patterns like users('MeganB@M365x214355.onmicrosoft.com').
 * Characters before bracket must be letters only
 * @param segment
 */
export function hasIdWithinBracket(segment: string): boolean {
  return !!segment.match(idWithinBracketRegex);
}

const logicalOperators: string[] = ['and', 'or', 'not'];

const comparisonOperators: string[] = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];

// Matches pattterns within quotes e.g "displayName: Gupta"
const quotedTextRegex = /^["']([^"]*)['"]$/;

// Matches strings that are all letters. Will match abc, won't match ab2c
const allAlphaRegex = /^[A-Za-z]+$/;

// Matches strings with deprecation identifier
const deprecationRegex = /^[A-Za-z]+_v2$/gi;

// Matches property name patterns e.g. displayName or from/emailAddress/address
const propertyNameRegex = /^[a-zA-Z]+(\/?\b[a-zA-Z]+\b)+$|^[a-zA-Z]+$/i;

// Matches segments of $filter query option values e.g. isRead eq false will match isRead, eq and false
const filterSegmentRegex = /([a-z]+\(.*?\))|(['"][\w\s]+['"])|[^\s]+/gi;

// Matches application/json or metadata=full
const formatSegmentRegex = /^([a-z]+(\/|\=){0,1}[a-z]+)$/;

// Matches segments of $search query option
const searchSegmentRegex = /\(.*\)|(['"][\w\s]+['"])|[^\s]+/g;

// Matches segments of $expand query option
const expandSegmentRegex = /,(?![^()]*\))/g;

// Matches text that ends with .* e.g. DemoService.*
const actionsForEachEntityRegex = /^[A-Za-z]*\.\*$/;

// Matches patterns like users('MeganB@M365x214355.onmicrosoft.com')
const idWithinBracketRegex  = /^[a-z]+\(.*(\))*/i;
