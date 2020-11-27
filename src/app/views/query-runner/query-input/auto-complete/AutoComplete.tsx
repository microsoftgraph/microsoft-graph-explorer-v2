import { getId, getTheme, Icon, ITextField, KeyCodes, Spinner, TextField, TooltipHost } from 'office-ui-fabric-react';
import { ITooltipHostStyles } from 'office-ui-fabric-react/lib/components/Tooltip/TooltipHost.types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { telemetry } from '../../../../../telemetry';
import { DROPDOWN_CHANGE_EVENT } from '../../../../../telemetry/event-types';
import { IAutoCompleteProps, IAutoCompleteState } from '../../../../../types/auto-complete';
import { SortOrder } from '../../../../../types/enums';
import * as autoCompleteActionCreators from '../../../../services/actions/autocomplete-action-creators';
import { dynamicSort } from '../../../../utils/dynamic-sort';
import { sanitizeQueryUrl } from '../../../../utils/query-url-sanitization';
import { parseSampleUrl } from '../../../../utils/sample-url-generation';
import { translateMessage } from '../../../../utils/translate-messages';
import { queryInputStyles } from '../QueryInput.styles';


import {
  cleanUpSelectedSuggestion, getLastCharacterOf,
  getParametersWithVerb
} from './auto-complete.util';
import SuggestionsList from './SuggestionsList';


class AutoComplete extends Component<IAutoCompleteProps, IAutoCompleteState> {
  private autoCompleteRef: React.RefObject<ITextField>;

  constructor(props: IAutoCompleteProps) {
    super(props);

    this.autoCompleteRef = React.createRef();

    this.state = {
      activeSuggestion: 0,
      filteredSuggestions: [],
      suggestions: [],
      showSuggestions: false,
      userInput: this.props.sampleQuery.sampleUrl,
      queryUrl: this.props.sampleQuery.sampleUrl,
      compare: ''
    };
  }

  private getRef(): ITextField | null {
    return this.autoCompleteRef.current;
  }

  public setFocus() {
    this.getRef()!.blur();
    // Gives the chance for the focus to take effect
    setTimeout(() => {
      this.getRef()!.focus();
    }, 10);
  }

  public onBlur = (e: any) => {
    const userInput = e.target.value;
    this.props.contentChanged(userInput);
  };

  public onChange = (e: any) => {
    const { suggestions, showSuggestions, userInput: previousUserInput, compare } = this.state;
    const userInput = e.target.value;

    this.setState({
      userInput,
      queryUrl: userInput
    });

    if (showSuggestions && suggestions.length) {
      this.filterSuggestions(userInput, previousUserInput, compare, suggestions);
    }
    this.initialiseAutoComplete(userInput);
  };

  public onClick = (e: any) => {
    const selected = e.currentTarget.innerText;
    this.appendSuggestionToUrl(selected);
  };

  private initialiseAutoComplete = (url: string) => {
    switch (getLastCharacterOf(url)) {
      case '/':
      case '?':
        this.requestForAutocompleteOptions(url);
        break;

      case '=':

        if (url.includes('?$')) {
          this.getParameterEnums(url);
        }

        break;

      case ',':
        this.getParameterEnums(url);
        break;

      case '&':
        this.getQueryParameters();
        break;

      default:
        break;
    }
  }

  public onKeyDown = (event: any) => {
    const { activeSuggestion, filteredSuggestions,
      showSuggestions, queryUrl, suggestions } = this.state;

    switch (event.keyCode) {
      case KeyCodes.enter:
        if (showSuggestions) {
          const selected = filteredSuggestions[activeSuggestion];
          this.appendSuggestionToUrl(selected);
        } else {
          this.props.contentChanged(queryUrl);
          this.props.runQuery();
        }
        break;

      case KeyCodes.tab:
        if (showSuggestions) {
          event.preventDefault();
          const selected = filteredSuggestions[activeSuggestion];
          this.appendSuggestionToUrl(selected);
        }
        break;

      case KeyCodes.up:
        event.preventDefault();
        if (showSuggestions) {
          let active = activeSuggestion - 1;
          if (activeSuggestion === 0) {
            active = filteredSuggestions.length - 1;
          }
          this.setState({ activeSuggestion: active });
        }
        break;

      case KeyCodes.down:
        event.preventDefault();
        if (showSuggestions) {
          let active = activeSuggestion + 1;
          if (activeSuggestion === filteredSuggestions.length - 1) {
            active = 0;
          }
          this.setState({ activeSuggestion: active });
        }
        break;

      case KeyCodes.escape:
        if (showSuggestions) {
          this.setState({ showSuggestions: false });
        }
        break;

      default:
        break;
    }

    const controlSpace = event.ctrlKey && event.keyCode === KeyCodes.space;
    const controlPeriod = event.ctrlKey && event.keyCode === KeyCodes.period;
    if (controlSpace || controlPeriod) {
      const userInput = event.target.value;
      const lastSymbol = this.getLastSymbolInUrl(userInput);
      const previousUserInput = userInput.substring(0, lastSymbol.value + 1);
      if (lastSymbol.key === '/' || lastSymbol.key === '?') {
        const compare = userInput.replace(previousUserInput, '');
        this.setState({
          compare,
          userInput: previousUserInput
        });
        this.requestForAutocompleteOptions(previousUserInput);
      } else {
        const filtered = this.filterSuggestions(userInput, previousUserInput, '', suggestions);
        this.setSuggestions(filtered, userInput.replace(previousUserInput, ''));
      }
    }
  };

  public displayLinkOptions = () => {
    const { compare } = this.state;
    const parametersWithVerb = getParametersWithVerb(this.props);
    if (!parametersWithVerb) {
      return;
    }

    let filteredSuggestions = parametersWithVerb.links;
    if (compare) {
      filteredSuggestions = filteredSuggestions.filter((suggestion: string) => {
        return suggestion.toLowerCase().indexOf(compare.toLowerCase()) > -1;
      });
    }

    this.setSuggestions(filteredSuggestions);
  }

  public getQueryParameters = () => {
    const { compare } = this.state;
    const parametersWithVerb = getParametersWithVerb(this.props);
    if (!parametersWithVerb) {
      return;
    }

    let filteredSuggestions = parametersWithVerb.values.map((value: { name: any; }) => value.name);
    if (compare) {
      filteredSuggestions = filteredSuggestions.filter((suggestion: string) => {
        return suggestion.toLowerCase().indexOf(compare.toLowerCase()) > -1;
      });
    }

    this.setSuggestions(filteredSuggestions);
  }

  private getParameterEnums = (url: string) => {
    const parametersWithVerb = getParametersWithVerb(this.props);
    if (!parametersWithVerb) {
      return;
    }
    const param = url.split('$').pop()!.split('=')[0];
    const section = parametersWithVerb.values.find((k: { name: string; }) => {
      return k.name === `$${param}`;
    });

    if (section && section.items && section.items.length > 0) {
      this.setSuggestions(section.items);
    }
  }

  private setSuggestions(suggestions: string[], compare?: string) {
    const sortedSuggestions = suggestions.sort(dynamicSort(null, SortOrder.ASC));
    this.setState({
      filteredSuggestions: sortedSuggestions,
      suggestions: sortedSuggestions,
      showSuggestions: (suggestions.length > 0),
      compare: compare || ''
    });
  }

  public componentDidUpdate = (prevProps: IAutoCompleteProps) => {
    if (prevProps.autoCompleteOptions !== this.props.autoCompleteOptions) {
      if (this.props.autoCompleteOptions) {
        this.performLocalSearch(this.state.userInput);
      }
    }

    const newUrl = this.props.sampleQuery.sampleUrl;
    if ((this.state.queryUrl === prevProps.sampleQuery.sampleUrl) && newUrl !== this.state.queryUrl) {
      if (newUrl !== this.state.queryUrl) {
        this.setState({
          queryUrl: newUrl,
          userInput: newUrl
        });
      }
    }
  }

  private filterSuggestions(userInput: string, previousUserInput: string, compare: string, suggestions: string[]) {
    let compareString = userInput.replace(previousUserInput, '');
    if (compare) {
      compareString = compare + compareString;
    }
    // Filter our suggestions that don't contain the user's input
    const filteredSuggestions = suggestions.filter((suggestion: string) => {
      return suggestion.toLowerCase().indexOf(compareString.toLowerCase()) > -1;
    });
    this.setState({
      filteredSuggestions,
      compare: compareString
    });
    return filteredSuggestions;
  }

  private requestForAutocompleteOptions(url: string) {
    const signature = sanitizeQueryUrl(url);
    const { requestUrl, queryVersion } = parseSampleUrl(signature);
    if (queryVersion) {
      if (!requestUrl) {
        this.props.actions!.fetchAutoCompleteOptions('', queryVersion);
      } else {
        this.props.actions!.fetchAutoCompleteOptions(requestUrl, queryVersion);
      }
      this.performLocalSearch(url);
    }
  }

  private performLocalSearch(url: string) {
    switch (getLastCharacterOf(url)) {
      case '/':
        this.displayLinkOptions();
        break;

      case '?':
        this.getQueryParameters();
        break;

      default:
        break;
    }
  }

  public trackSuggestionSelectionEvent = (suggestion: string) => {
    telemetry.trackEvent(DROPDOWN_CHANGE_EVENT,
      {
        ComponentName: 'Query URL autocomplete dropdown',
        SelectedSuggestion: suggestion
      });
  }

  private appendSuggestionToUrl(selected: string) {
    if (!selected) { return; }
    const { userInput, compare } = this.state;
    if (selected.startsWith('$')) {
      selected += '=';
    }
    const selectedSuggestion = cleanUpSelectedSuggestion(compare, userInput, selected);
    this.setState({
      activeSuggestion: 0,
      filteredSuggestions: [],
      showSuggestions: false,
      userInput: selectedSuggestion,
      compare: '',
      queryUrl: selectedSuggestion,
    });
    this.props.contentChanged(selectedSuggestion);
    this.setFocus();
    this.initialiseAutoComplete(selectedSuggestion);
    this.trackSuggestionSelectionEvent(selected);
  }

  private renderSuffix = () => {
    const { fetchingSuggestions, autoCompleteError } = this.props;

    const calloutProps = { gapSpace: 0 };
    const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };

    if (fetchingSuggestions) {
      return (<TooltipHost
        content={translateMessage('Fetching suggestions')}
        id={getId()}
        calloutProps={calloutProps}
        styles={hostStyles}
      >
        <Spinner />
      </TooltipHost>
      );
    }

    if (autoCompleteError) {
      return (
        <TooltipHost
          content={translateMessage('No auto-complete suggestions available')}
          id={getId()}
          calloutProps={calloutProps}
          styles={hostStyles}
        >
          <Icon iconName='MuteChat' />
        </TooltipHost>);
    }

    return null;
  }

  private getLastSymbolInUrl(url: string) {
    const availableSymbols = [
      {
        key: '/',
        value: 0
      },
      {
        key: ',',
        value: 0
      },
      {
        key: '$',
        value: 0
      },
      {
        key: '=',
        value: 0
      },
      {
        key: '&',
        value: 0
      },
      {
        key: '?',
        value: 0
      }
    ];

    availableSymbols.forEach(element => {
      element.value = url.lastIndexOf(element.key);
    });
    const max = availableSymbols.reduce((prev, current) => (prev.value > current.value) ? prev : current);
    return max;
  }


  public render() {
    const {
      activeSuggestion,
      filteredSuggestions,
      showSuggestions,
      userInput,
      queryUrl
    } = this.state;

    const currentTheme = getTheme();
    const {
      input: autoInput,
    }: any = queryInputStyles(currentTheme).autoComplete;

    return (
      <>
        <TextField
          className={autoInput}
          type='text'
          autoComplete='off'
          onChange={this.onChange}
          onBlur={this.onBlur}
          onKeyDown={this.onKeyDown}
          value={queryUrl}
          componentRef={this.autoCompleteRef}
          onRenderSuffix={(this.renderSuffix()) ? this.renderSuffix : undefined}
        />
        {showSuggestions && userInput && filteredSuggestions.length > 0 &&
          <SuggestionsList
            filteredSuggestions={filteredSuggestions}
            activeSuggestion={activeSuggestion}
            onClick={(e: any) => this.onClick(e)} />}
      </>
    );
  }
}

function mapStateToProps(state: any) {
  return {
    sampleQuery: state.sampleQuery,
    appTheme: state.theme,
    autoCompleteOptions: state.autoComplete.data,
    fetchingSuggestions: state.autoComplete.pending,
    autoCompleteError: state.autoComplete.error
  };
}

function mapDispatchToProps(dispatch: Dispatch): object {
  return {
    actions: bindActionCreators(
      {
        ...autoCompleteActionCreators,
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoComplete);
