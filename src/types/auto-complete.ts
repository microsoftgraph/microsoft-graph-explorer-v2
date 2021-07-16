import { IApiResponse } from './action';
import { IParsedOpenApiResponse } from './open-api';
import { IQuery } from './query-runner';

export interface IAutoCompleteProps {
  suggestions: string[];
  contentChanged: Function;
  runQuery: Function;
  sampleQuery: IQuery;
  fetchingSuggestions: boolean;
  autoCompleteError: any;
  autoCompleteOptions: {
    url: string;
    parameters: any[];
  };
  actions?: {
    fetchAutoCompleteOptions: Function;
  };
}

export interface IAutoCompleteState {
  activeSuggestion: number;
  filteredSuggestions: string[];
  suggestions: string[];
  showSuggestions: boolean;
  userInput: string;
  compare: string;
  queryUrl: string;
  multiline: boolean;
}

export interface ISuggestionsList {
  activeSuggestion: number;
  filteredSuggestions: string[];
  onClick: Function;
}

export interface IAutocompleteResponse extends IApiResponse {
  data: IParsedOpenApiResponse | null
}