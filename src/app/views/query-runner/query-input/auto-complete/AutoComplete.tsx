import { getId, getTheme, Icon, ITextField, KeyCodes, Spinner, TooltipHost } from 'office-ui-fabric-react';
import { ITooltipHostStyles } from 'office-ui-fabric-react/lib/components/Tooltip/TooltipHost.types';
import React, { Component } from 'react';
import { TextField } from '@fluentui/react/lib/TextField';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { componentNames, eventTypes, telemetry } from '../../../../../telemetry';
import { IAutoCompleteProps, IAutoCompleteState } from '../../../../../types/auto-complete';
import { SortOrder } from '../../../../../types/enums';
import { IRootState } from '../../../../../types/root';
import * as autoCompleteActionCreators from '../../../../services/actions/autocomplete-action-creators';
import { dynamicSort } from '../../../../utils/dynamic-sort';
import { sanitizeQueryUrl } from '../../../../utils/query-url-sanitization';
import { parseSampleUrl } from '../../../../utils/sample-url-generation';
import { translateMessage } from '../../../../utils/translate-messages';
import { queryInputStyles } from '../QueryInput.styles';
import {
  cleanUpSelectedSuggestion, getLastCharacterOf,
  getLastSymbolInUrl,
  getParametersWithVerb
} from './auto-complete.util';
import SuggestionsList from './SuggestionsList';

class AutoComplete extends Component<IAutoCompleteProps, IAutoCompleteState> {
  private autoCompleteRef: React.RefObject<ITextField>;
  private element: HTMLDivElement | null | undefined;

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
      compare: '',
      multiline: false
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

  public updateUrlContent = (e: any) => {
    const userInput = e.target.value;
    this.props.contentChanged(userInput);
  };

  public isOverflowing = (input: string) => {

    function getTextWidth(text: string) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context === null) {
        return 0;
      }

      context.font = getComputedStyle(document.body).font;
      return context.measureText(text).width + 5;
      
    }

    return !!this.element
      && getTextWidth(input) > this.element.scrollWidth;

  }

  public onChange = (e: any) => {
    const { suggestions, showSuggestions, userInput: previousUserInput, compare } = this.state;
    const userInput = e.target.value;

    this.setState({
      userInput,
      queryUrl: userInput,
      multiline: this.isOverflowing(userInput)
    });

    if (showSuggestions && suggestions.length) {
      this.filterSuggestions(userInput, previousUserInput, compare, suggestions);
    }
    this.initialiseAutoComplete(userInput);
  };

  public selectSuggestion = (e: any) => {
    const selected = e.currentTarget.innerText;
    this.appendSuggestionToUrl(selected);
  };

  private initialiseAutoComplete = (url: string) => {
    const isSlashPreceed = url.substring(url.length - 1, url.length - 2);
    if (isSlashPreceed === '/') {
      return;
    }
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
      const lastSymbol = getLastSymbolInUrl(userInput);
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
    const parametersWithVerb = getParametersWithVerb(this.props);
    if (!parametersWithVerb) {
      return;
    }

    this.setSuggestions(parametersWithVerb.links);
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
          userInput: newUrl,
          multiline: this.isOverflowing(newUrl)
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
        if (!this.props.autoCompleteOptions || `${requestUrl}` !== this.props.autoCompleteOptions.url) {
          this.props.actions!.fetchAutoCompleteOptions(requestUrl, queryVersion);
        } else {
          this.performLocalSearch(url);
        }
      }
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
    telemetry.trackEvent(eventTypes.DROPDOWN_CHANGE_EVENT,
      {
        ComponentName: componentNames.QUERY_URL_AUTOCOMPLETE_DROPDOWN,
        QuerySignature: sanitizeQueryUrl(this.state.queryUrl),
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

  closeSuggestionDialog = (event: any) => {
    const { currentTarget, relatedTarget } = event;
    if (!currentTarget.contains(relatedTarget as Node) && this.state.showSuggestions) {
      this.setState({
        showSuggestions: false
      })
    }
  }

  public render() {
    const {
      activeSuggestion,
      filteredSuggestions,
      showSuggestions,
      userInput,
      queryUrl,
      multiline
    } = this.state;

    const currentTheme = getTheme();
    const {
      input: autoInput,
    }: any = queryInputStyles(currentTheme).autoComplete;

    return (
      <div onBlur={this.closeSuggestionDialog}>
        <div ref={(el) => {this.element = el}}>
          <TextField 
            className={autoInput}
            multiline={multiline}
            autoAdjustHeight 
            resizable={false}
            type='text'
            autoComplete='off'
            onChange={this.onChange}
            onBlur={this.updateUrlContent}
            onKeyDown={this.onKeyDown}
            value={queryUrl}
            componentRef={this.autoCompleteRef}
            onRenderSuffix={(this.renderSuffix()) ? this.renderSuffix : undefined}
            ariaLabel={translateMessage('Query Sample Input')}
            role='textbox'
            errorMessage={!queryUrl ? translateMessage('Missing url') : ''}
          />
        </div>
        {showSuggestions && userInput && filteredSuggestions.length > 0 &&
          <SuggestionsList
            filteredSuggestions={filteredSuggestions}
            activeSuggestion={activeSuggestion}
            onClick={(e: any) => this.selectSuggestion(e)} />}
      </div>
    );
  }
}

function mapStateToProps({ sampleQuery, theme, autoComplete }: IRootState) {
  return {
    sampleQuery,
    appTheme: theme,
    autoCompleteOptions: autoComplete.data,
    fetchingSuggestions: autoComplete.pending,
    autoCompleteError: autoComplete.error
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

// @ts-ignore
export default connect(mapStateToProps, mapDispatchToProps)(AutoComplete);
