export function replaceLinks(message: string): string {
  const urls = extractUrl(message);
  if (urls) {
    for (let index = 0; index < urls.length; index++) {
      const url = urls[index];
      message = message.replace(url, `$${index}`);
    }
  }
  return message;
}

export function convertArrayToObject(array: any[]): object {
  const initialValue = {};
  return array.reduce((obj, item, index) => {
    return {
      ...obj,
      [`$${index}`]: item,
    };
  }, initialValue);
};

export function extractUrl(value: string): string[] | null {
  return value.toString().match(/\bhttps?:\/\/\S+(?<!\.)/gi);
}

export function matchIncludesLink(matches: RegExpMatchArray, part: string) {
  const includes = matches.includes(part);
  const dollarSignWithNumber = /[$]\d+/;
  const hasDollarSign = part.match(dollarSignWithNumber);
  return includes && hasDollarSign;
}

export function getMatchesAndParts(message: string) {
  message = message.toString();
  const numberPattern = /([$0-9]+)/g;
  const matches: RegExpMatchArray | null = message.match(numberPattern);
  const parts: string[] = message.split(numberPattern);
  return { matches, parts };
}
