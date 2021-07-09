import {
  Announced, IStackTokens,
  ITheme, styled
} from 'office-ui-fabric-react';
import React, { Component } from 'react';
import { InjectedIntl, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { geLocale } from '../../appLocale';
import { authenticationWrapper } from '../../modules/authentication';
import { getCurrentCloud, getEligibleCloud } from '../../modules/sovereign-clouds';
import { componentNames, eventTypes, telemetry } from '../../telemetry';
import { loadGETheme } from '../../themes';
import { ThemeContext } from '../../themes/theme-context';
import { Mode } from '../../types/enums';
import { IInitMessage, IQuery, IThemeChangedMessage } from '../../types/query-runner';
import { IRootState } from '../../types/root';
import { ISharedQueryParams } from '../../types/share-query';
import { ISidebarProps } from '../../types/sidebar';
import * as authActionCreators from '../services/actions/auth-action-creators';
import { runQuery } from '../services/actions/query-action-creators';
import { setSampleQuery } from '../services/actions/query-input-action-creators';
import { clearQueryStatus } from '../services/actions/query-status-action-creator';
import { clearTermsOfUse } from '../services/actions/terms-of-use-action-creator';
import { changeThemeSuccess } from '../services/actions/theme-action-creator';
import { toggleSidebar } from '../services/actions/toggle-sidebar-action-creator';
import { GRAPH_URL } from '../services/graph-constants';
import { parseSampleUrl } from '../utils/sample-url-generation';
import { substituteTokens } from '../utils/token-helpers';
import { translateMessage } from '../utils/translate-messages';
import { appTitleDisplayOnFullScreen, appTitleDisplayOnMobileScreen } from './app-sections/AppTitle';
import { headerMessaging } from './app-sections/HeaderMessaging';
import { statusMessages } from './app-sections/StatusMessages';
import { termsOfUseMessage } from './app-sections/TermsOfUseMessage';
import { appStyles } from './App.styles';
import { Authentication } from './authentication';
import { classNames } from './classnames';
import { createShareLink } from './common/share';
import { QueryResponse } from './query-response';
import { QueryRunner } from './query-runner';
import { parse } from './query-runner/util/iframe-message-parser';
import { Settings } from './settings';
import { SovereignClouds } from './settings/SovereignClouds';
import { Sidebar } from './sidebar/Sidebar';

interface IAppProps {
  theme?: ITheme;
  styles?: object;
  intl: InjectedIntl;
  profile: object;
  queryState: object | null;
  termsOfUse: boolean;
  graphExplorerMode: Mode;
  sidebarProperties: ISidebarProps;
  sampleQuery: IQuery;
  authenticated: boolean;
  actions: {
    clearQueryStatus: Function;
    clearTermsOfUse: Function;
    setSampleQuery: Function;
    runQuery: Function;
    toggleSidebar: Function;
    signIn: Function;
    storeScopes: Function;
  };
}

interface IAppState {
  selectedVerb: string;
  mobileScreen: boolean;
  hideDialog: boolean;
  showCloudDialog: boolean;
}

class App extends Component<IAppProps, IAppState> {
  private mediaQueryList = window.matchMedia('(max-width: 992px)');

  constructor(props: IAppProps) {
    super(props);
    this.state = {
      selectedVerb: 'GET',
      mobileScreen: false,
      showCloudDialog: false,
      hideDialog: true
    };
  }

  public componentDidMount = async () => {
    this.displayToggleButton(this.mediaQueryList);
    this.mediaQueryList.addListener(this.displayToggleButton);

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sid');

    if (sessionId) {
      const authResp = await authenticationWrapper.logIn(sessionId);
      if (authResp) {
        // @ts-ignore
        this.props.actions!.signIn(authResp.accessToken);
        // @ts-ignore
        this.props.actions!.storeScopes(authResp.scopes);
      }
    }

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
    this.handleSharedQueries();
    this.toggleConfirmCloud();
  };

  public toggleConfirmCloud = () => {
    if (this.state.showCloudDialog) {
      this.setState({
        showCloudDialog: false
      })
    } else {
      const currentCloud = getCurrentCloud();
      const eligibleCloud = getEligibleCloud();
      if (!currentCloud && eligibleCloud) {
        this.setState({
          showCloudDialog: true,
        })
      }
    }
  }

  public handleSharedQueries() {
    const { actions } = this.props;
    const queryStringParams = this.getQueryStringParams();
    const query = this.generateQueryObjectFrom(queryStringParams);

    if (query) {
      // This timeout waits for monaco to initialize it's formatter.
      setTimeout(() => {
        actions!.setSampleQuery(query);
      }, 700);
    }
  }

  private getQueryStringParams(): ISharedQueryParams {
    const urlParams = new URLSearchParams(window.location.search);

    const request = urlParams.get('request');
    const method = this.validateHttpMethod(urlParams.get('method') || '');
    const version = urlParams.get('version');
    const graphUrl = urlParams.get('GraphUrl') || GRAPH_URL;
    const requestBody = urlParams.get('requestBody');
    const headers = urlParams.get('headers');

    return { request, method, version, graphUrl, requestBody, headers };
  }

  private generateQueryObjectFrom(queryParams: any) {
    const { request, method, version, graphUrl, requestBody, headers } = queryParams;

    if (!request) {
      return null;
    }

    return {
      sampleUrl: `${graphUrl}/${version}/${request}`,
      selectedVerb: method,
      selectedVersion: version,
      sampleBody: requestBody ? this.hashDecode(requestBody) : null,
      sampleHeaders: (headers) ? JSON.parse(this.hashDecode(headers)) : [],
    };
  }

  private validateHttpMethod(method: string): string {
    method = method.toUpperCase();
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (!validMethods.includes(method)) {
      method = 'GET';
    }
    return method;
  }

  private hashDecode(requestBody: string): string {
    const decodedBody = atob(requestBody);

    if (decodedBody === 'undefined') {
      return '';
    }

    return decodedBody;
  }

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
    const { actions, profile } = this.props;
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
        const { queryVersion } = parseSampleUrl(url);

        const requestHeaders = headers.map((header: any) => {
          return {
            name: Object.keys(header)[0],
            value: Object.values(header)[0]
          };
        });

        const query: IQuery = {
          sampleUrl: url,
          selectedVerb: verb,
          sampleBody: body,
          selectedVersion: queryVersion,
          sampleHeaders: requestHeaders
        };

        substituteTokens(query, profile);

        actions.setSampleQuery(query);
      }
    }, 1000);

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
    telemetry.trackEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      {
        ComponentName: componentNames.SIDEBAR_HAMBURGER_BUTTON
      });
  }

  public displayToggleButton = (mediaQueryList: any) => {
    const mobileScreen = mediaQueryList.matches;
    let showSidebar = true;
    if (mobileScreen) {
      showSidebar = false;
    }

    const properties = {
      mobileScreen,
      showSidebar
    };

    this.props.actions!.toggleSidebar(properties);
  }

  public displayAuthenticationSection = (minimised: boolean) => {
    return <div style={{
      display: minimised ? 'block' : 'flex',
      justifyContent: minimised ? '' : 'center',
      alignItems: minimised ? '' : 'center',
      marginLeft: minimised ? '' : '-0.9em',
    }}>
      <div className={minimised ? '' : 'col-10'}>
        <Authentication />
      </div>
      <div className={minimised ? '' : 'col-2'}>
        <Settings />
      </div>
    </div>;
  }

  public render() {
    const { showCloudDialog } = this.state;
    const classes = classNames(this.props);
    const { authenticated, graphExplorerMode, queryState, minimised, termsOfUse, sampleQuery,
      actions, sidebarProperties, intl: { messages } }: any = this.props;
    const query = createShareLink(sampleQuery, authenticated);
    const sampleHeaderText = messages['Sample Queries'];
    // tslint:disable-next-line:no-string-literal
    const historyHeaderText = messages.History;
    const { mobileScreen, showSidebar } = sidebarProperties;

    let displayContent = true;
    if (graphExplorerMode === Mode.Complete) {
      if (mobileScreen && showSidebar) {
        displayContent = false;
      }
    }

    const stackTokens: IStackTokens = {
      childrenGap: 10,
      padding: 10
    };

    let sidebarWidth = `col-sm-12 col-lg-3 col-md-4 ${classes.sidebar}`;

    let layout =
      graphExplorerMode === Mode.TryIt
        ? 'col-xs-12 col-sm-12'
        : 'col-xs-12 col-sm-12 col-lg-9 col-md-8';

    if (minimised) {
      sidebarWidth = `${classes.sidebarMini}`;
      layout = `col-xs-12 col-sm-12 col-lg-11 col-md-11 ${classes.layoutExtra}`;
    }

    if (mobileScreen) {
      sidebarWidth = layout = 'col-xs-12 col-sm-12';
    }

    return (
      // @ts-ignore
      <ThemeContext.Provider value={this.props.appTheme}>
        <div className={`container-fluid ${classes.app}`}>
          <Announced message={!showSidebar ?
            translateMessage('Sidebar minimized') : translateMessage('Sidebar maximized')} />
          <div className='row'>
            {graphExplorerMode === Mode.Complete && (
              <div className={sidebarWidth}>
                {mobileScreen && appTitleDisplayOnMobileScreen(
                  stackTokens,
                  classes,
                  this.toggleSidebar)}

                {!mobileScreen && appTitleDisplayOnFullScreen(
                  classes,
                  minimised,
                  this.toggleSidebar
                )}

                <hr className={classes.separator} />

                {this.displayAuthenticationSection(minimised)}
                <hr className={classes.separator} />

                {showSidebar && <>
                  <Sidebar sampleHeaderText={sampleHeaderText} historyHeaderText={historyHeaderText} />
                </>}
              </div>
            )}
            <div className={layout}>
              {graphExplorerMode === Mode.TryIt && headerMessaging(classes, query)}

              {displayContent && <>
                <div style={{ marginBottom: 8 }}>
                  <QueryRunner onSelectVerb={this.handleSelectVerb} />
                </div>
                {statusMessages(queryState, sampleQuery, actions)}
                {termsOfUseMessage(termsOfUse, actions, classes, geLocale)}
                {
                  // @ts-ignore
                  <QueryResponse verb={this.state.selectedVerb} />
                }
              </>}
            </div>
          </div>
        </div>
        <SovereignClouds
          prompt={true}
          cloudSelectorOpen={showCloudDialog}
          toggleCloudSelector={this.toggleConfirmCloud}
        />
      </ThemeContext.Provider>
    );
  }
}

const mapStateToProps = ({ sidebarProperties, theme,
  queryRunnerStatus, profile, sampleQuery, termsOfUse, authToken, graphExplorerMode
}: IRootState) => {
  const mobileScreen = !!sidebarProperties.mobileScreen;
  const showSidebar = !!sidebarProperties.showSidebar;

  return {
    appTheme: theme,
    graphExplorerMode,
    profile,
    queryState: queryRunnerStatus,
    receivedSampleQuery: sampleQuery,
    sidebarProperties,
    termsOfUse,
    minimised: !mobileScreen && !showSidebar,
    sampleQuery,
    authenticated: !!authToken.token
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    actions: bindActionCreators({
      clearQueryStatus,
      clearTermsOfUse,
      runQuery,
      setSampleQuery,
      toggleSidebar,
      ...authActionCreators,
      changeTheme: (newTheme: string) => {
        return (disp: Function) => disp(changeThemeSuccess(newTheme));
      }
    }, dispatch)
  };
};

const StyledApp = styled(App, appStyles as any);
const IntlApp = injectIntl(StyledApp);

//@ts-ignore
export default connect(mapStateToProps, mapDispatchToProps)(IntlApp);