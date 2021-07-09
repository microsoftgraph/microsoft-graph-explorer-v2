import { parseSampleUrl } from '../../app/utils/sample-url-generation';

describe('Sample Url Generation', () => {

  it('destructures sample url', () => {
    const url = 'https://graph.microsoft.com/v1.0/me/messages';

    const expectedUrl = {
      requestUrl: 'me/messages',
      queryVersion: 'v1.0',
      sampleUrl: url,
      search: ''
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('destructures sample url with search parameters', () => {
    const search = `?$select=subject`;
    const url = `https://graph.microsoft.com/v1.0/me/messages${search}`;

    const expectedUrl = {
      requestUrl: 'me/messages',
      queryVersion: 'v1.0',
      sampleUrl: url,
      search
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('destructures sample url with % sign', () => {
    const name = 'DiegoS%40m365x214355.onmicrosoft.com';
    const search = `?$select=displayName,mail&$filter=mail eq '${name}'`;
    const url = `https://graph.microsoft.com/v1.0/users${search}`;

    const expectedUrl = {
      requestUrl: 'users',
      queryVersion: 'v1.0',
      sampleUrl: url,
      search
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('returns empty properties when url is empty', () => {
    const url = '';

    const expectedUrl = {
      requestUrl: '',
      queryVersion: '',
      sampleUrl: url,
      search: ''
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('returns empty properties when url is invalid', () => {
    const url = 'I am an invalid url';

    const expectedUrl = {
      requestUrl: '',
      queryVersion: '',
      sampleUrl: '',
      search: ''
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('returns appropriate version number', () => {
    const url = `https://graph.microsoft.com/v1.0/users`;
    const expectedVersion = 'v1.0';
    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl.queryVersion).toEqual(expectedVersion);
  });

  it('destructures sample url with long version number', () => {
    const url = `https://graph.microsoft.com/longversionnumberv2/me/messages`;

    const expectedUrl = {
      requestUrl: 'me/messages',
      queryVersion: 'longversionnumberv2',
      sampleUrl: url,
      search: ''
    };

    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl).toEqual(expectedUrl);
  });

  it('returns appropriate request url for long version number', () => {
    const version = 'longversionnumberv2';
    const requestUrl = 'me/messages';
    const url = `https://graph.microsoft.com/${version}/${requestUrl}`;
    const parsedUrl = parseSampleUrl(url);
    expect(parsedUrl.requestUrl).toEqual(requestUrl);
  });

  it('replace version number with new one', () => {
    const version = 'beta';
    const requestUrl = 'me/messages';
    const url = `https://graph.microsoft.com/v1.0/${requestUrl}`;

    const expectedUrl = {
      requestUrl,
      queryVersion: version,
      sampleUrl: `https://graph.microsoft.com/${version}/${requestUrl}`,
      search: ''
    };

    const parsedUrl = parseSampleUrl(url, version);
    expect(parsedUrl).toEqual(expectedUrl);
  });

});
