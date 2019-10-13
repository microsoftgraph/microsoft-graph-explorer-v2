import {
  FocusTrapZone,
  FontSizes,
  IconButton,
  IStackTokens,
  ITheme,
  Label,
  MessageBar,
  MessageBarType,
  Stack,
  styled
} from 'office-ui-fabric-react';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { FormattedMessage } from 'react-intl';
import { loadGETheme } from '../../themes';
import { ThemeContext } from '../../themes/theme-context';
import { Mode } from '../../types/action';
import { IInitMessage, IThemeChangedMessage } from '../../types/query-runner';
import { ISidebarProps } from '../../types/sidebar';
import { clearQueryError } from '../services/actions/error-action-creator';
import { runQuery } from '../services/actions/query-action-creators';
import { setSampleQuery } from '../services/actions/query-input-action-creators';
import { addRequestHeader } from '../services/actions/request-headers-action-creators';
import { clearTermsOfUse } from '../services/actions/terms-of-use-action-creator';
import { changeTheme } from '../services/actions/theme-action-creator';
import { toggleSidebar } from '../services/actions/toggle-sidebar-action-creator';
import { appStyles } from './App.styles';
import { Authentication } from './authentication';
import { classNames } from './classnames';
import { Banner } from './opt-in-out-banner';
import { QueryResponse } from './query-response';
import { QueryRunner } from './query-runner';
import { parse } from './query-runner/util/iframe-message-parser';
import { Sidebar } from './sidebar/Sidebar';

interface IAppProps {
  theme?: ITheme;
  styles?: object;
  error: object | null;
  termsOfUse: boolean;
  graphExplorerMode: Mode;
  sidebarProperties: ISidebarProps;
  actions: {
    addRequestHeader: Function;
    clearQueryError: Function;
    clearTermsOfUse: Function;
    setSampleQuery: Function;
    runQuery: Function;
    toggleSidebar: Function;
  };
}

interface IAppState {
  selectedVerb: string;
  showToggle: boolean;
}

class App extends Component<IAppProps, IAppState> {

  private mediaQueryList = window.matchMedia('(max-width: 767px)');

  constructor(props: IAppProps) {
    super(props);
    this.state = {
      selectedVerb: 'GET',
      showToggle: false,
    };
  }

  public componentDidMount = () => {
    this.displayToggleButton(this.mediaQueryList);
    this.mediaQueryList.addListener(this.displayToggleButton);

    const { actions } = this.props;
    const whiteListedDomains = [
      'https://docs.microsoft.com',
      'https://review.docs.microsoft.com',
      'https://ppe.docs.microsoft.com',
      'https://docs.azure.cn'
    ];

    // Notify host document that GE is ready to receive messages
    const hostOrigin = new URLSearchParams(location.search).get('host-origin');
    const originIsWhitelisted =
      hostOrigin && whiteListedDomains.indexOf(hostOrigin) !== -1;

    if (hostOrigin && originIsWhitelisted) {
      window.parent.postMessage({ type: 'ready' }, hostOrigin);
    }

    // Listens for messages from host document
    window.addEventListener('message', this.receiveMessage, false);

    const urlParams = new URLSearchParams(window.location.search);
    const base64Token = urlParams.getAll('query')[0];

    if (!base64Token) {
      return;
    }

    const data = JSON.parse(atob(base64Token));
    const { sampleVerb, sampleHeaders, sampleUrl, sampleBody } = data;

    const query = {
      sampleUrl,
      sampleBody,
      sampleHeaders,
      selectedVerb: sampleVerb
    };

    if (actions) {
      actions.setSampleQuery(query);
    }
  };

  public componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage);
    this.mediaQueryList.removeListener(this.displayToggleButton);
  }

  private handleThemeChangeMsg = (msg: IThemeChangedMessage) => {
    loadGETheme(msg.theme);

    // @ts-ignore
    this.props.actions!.changeTheme(msg.theme);
  };

  private receiveMessage = (event: MessageEvent): void => {
    const msgEvent: IThemeChangedMessage | IInitMessage = event.data;

    switch (msgEvent.type) {
      case 'init':
        this.handleInitMsg(msgEvent);
        break;
      case 'theme-changed':
        this.handleThemeChangeMsg(msgEvent);
        break;
      default:
        return;
    }
  };

  private handleInitMsg = (msg: IInitMessage) => {
    const { actions } = this.props;
    const { verb, headers, url, body }: any = parse(msg.code);

    if (actions) {
      actions.setSampleQuery({
        sampleUrl: url,
        selectedVerb: verb
      });
    }

    // Sets selected verb in App Component
    this.handleSelectVerb(verb);

    /**
     * We are delaying this by 1 second here so that we give Monaco's formatter time to initialize.
     * If we don't put this delay, the body won't be formatted.
     */
    setTimeout(() => {
      if (actions) {
        actions.setSampleQuery({
          sampleUrl: url,
          selectedVerb: verb,
          sampleBody: body
        });
      }
    }, 1000);

    if (actions) {
      const requestHeaders = headers.map((header: any) => {
        return {
          name: Object.keys(header)[0],
          value: Object.values(header)[0]
        };
      });
      actions.addRequestHeader(requestHeaders);
    }
  };

  public handleSelectVerb = (verb: string) => {
    this.setState({
      selectedVerb: verb
    });
  };

  public toggleSidebar = (): void => {
    const { sidebarProperties } = this.props;
    const properties = { ...sidebarProperties };
    properties.showSidebar = !properties.showSidebar;
    this.props.actions!.toggleSidebar(properties);
  }

  public displayToggleButton = (mediaQueryList: any) => {
    const showToggle = mediaQueryList.matches;
    let showSidebar = true;
    if (showToggle) {
      showSidebar = false;
    }

    const properties = {
      showToggle,
      showSidebar
    };

    this.props.actions!.toggleSidebar(properties);
  }

  public optOut = () => {
    const path = location.href;
    const urlObject: URL = new URL(path);
    const { protocol, hostname, pathname, port } = urlObject;
    const url = `${protocol}//${hostname}${(port) ? ':' + port : ''}${pathname}`;
    window.location.href = url.includes('localhost') ? 'http://localhost:3000' : `${url.replace('preview', '')}`;
  }

  public render() {
    const classes = classNames(this.props);
    const { graphExplorerMode, error, termsOfUse, actions, sidebarProperties }: any = this.props;
    const { showToggle, showSidebar } = sidebarProperties;
    const language = navigator.language  || 'en-US';

    let displayContent = true;
    if (graphExplorerMode === Mode.Complete) {
      if (showToggle && showSidebar) {
        displayContent = false;
      }
    }

    const stackTokens: IStackTokens = {
      childrenGap: 10,
      padding: 10
    };

    const layout =
      graphExplorerMode === Mode.TryIt
        ? 'col-xs-12 col-sm-12'
        : 'col-xs-12 col-sm-12 col-lg-9 col-md-8';
    return (
      // @ts-ignore
      <ThemeContext.Provider value={this.props.appTheme}>
        <FocusTrapZone>
          <div className={`container-fluid ${classes.app}`}>
            <div className='row'>
              {graphExplorerMode === Mode.Complete && (
                <div className={`col-sm-12 col-lg-3 col-md-4 ${classes.sidebar}`}>

                  <Stack horizontal={true} disableShrink={true} tokens={stackTokens}>
                      {showToggle &&
                        <IconButton
                          iconProps={{ iconName: 'GlobalNavButton' }}
                          className={classes.sidebarToggle}
                          title='Remove sidebar'
                          ariaLabel='Remove sidebar'
                          onClick={this.toggleSidebar}
                        />
                      }
                      <Label style={{
                        fontSize: FontSizes.xLarge,
                        fontWeight: 600,
                        marginBottom: '10px'
                      }}>
                        Graph Explorer
                      </Label>
                      { showToggle &&
                        <span style={{
                          position: 'absolute',
                          marginLeft: '75%',
                        }}>

                        <Authentication />
                        </span>
                      }
                    </Stack>

                  {!showToggle && <Authentication /> }

                  {showSidebar && <>
                    {
                      // @ts-ignore
                      <Banner optOut={this.optOut} />
                    }
                  <Sidebar />
                  </>}
                </div>
              )}
              <div className={layout}>
                {graphExplorerMode === Mode.TryIt && (
                  <div style={{ marginBottom: 8 }}>
                    <MessageBar
                      messageBarType={MessageBarType.warning}
                      isMultiline={true}
                    >
                      <p>
                        To try operations other than GET or to access your own data, sign in to
                      <a className={classes.links}
                          tabIndex={0}
                          href='https://developer.microsoft.com/en-us/graph/graph-explorer' target='_blank'>
                          Graph Explorer.
                      </a>
                      </p>
                    </MessageBar>
                  </div>
                )}

                {displayContent && <>
                  <div style={{ marginBottom: 8 }}>
                    <QueryRunner onSelectVerb={this.handleSelectVerb} />
                  </div>
                  {error && (
                    <MessageBar
                      messageBarType={MessageBarType.error}
                      isMultiline={false}
                      onDismiss={actions.clearQueryError}
                    >
                      {`${error.statusText} - ${error.status}`}
                    </MessageBar>
                  )}
                  {graphExplorerMode === Mode.Complete && termsOfUse && (
                    <MessageBar
                      messageBarType={MessageBarType.info}
                      isMultiline={true}
                      onDismiss={actions.clearTermsOfUse}
                    >
                      <FormattedMessage id='Use the Microsoft Graph API' />
                      <br /><br />
                      <div>
                        <a className={classes.links}
                        href={'https://docs.microsoft.com/' + language +
                        '/legal/microsoft-apis/terms-of-use?context=graph/context'}
                          target='_blank'>
                          <FormattedMessage id='Terms of use' /></a>
                        <br />
                        <a  className={classes.links}
                        href={'https://privacy.microsoft.com/' + language + '/privacystatement'}
                          target='_blank'>
                          <FormattedMessage id='Microsoft Privacy Statement' /></a>
                      </div>
                    </MessageBar>
                  )}
                  {
                    // @ts-ignore
                    <QueryResponse verb={this.state.selectedVerb} />
                  }
                </>}
              </div>
            </div>
          </div>
        </FocusTrapZone>
      </ThemeContext.Provider>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    error: state.queryRunnerError,
    termsOfUse: state.termsOfUse,
    receivedSampleQuery: state.sampleQuery,
    graphExplorerMode: state.graphExplorerMode,
    appTheme: state.theme,
    sidebarProperties: state.sidebarProperties,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    actions: bindActionCreators({
      clearQueryError,
      clearTermsOfUse,
      runQuery,
      setSampleQuery,
      addRequestHeader,
      toggleSidebar,
      changeTheme: (newTheme: string) => {
        return (disp: Function) => disp(changeTheme(newTheme));
      }
    }, dispatch)
  };
};

const StyledApp = styled(App, appStyles);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StyledApp);
