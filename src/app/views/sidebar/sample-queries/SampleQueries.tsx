import {
  Announced,
  DetailsList,
  DetailsRow,
  FontSizes,
  FontWeights,
  getId,
  GroupHeader,
  IColumn,
  Icon,
  MessageBar,
  MessageBarType,
  SearchBox,
  SelectionMode,
  Spinner,
  SpinnerSize,
  styled,
  TooltipHost,
  IDetailsRowStyles,
} from 'office-ui-fabric-react';
import React, { Component } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { geLocale } from '../../../../appLocale';
import { componentNames, eventTypes, telemetry } from '../../../../telemetry';
import {
  IQuery,
  ISampleQueriesProps,
  ISampleQuery,
} from '../../../../types/query-runner';
import { IRootState } from '../../../../types/root';
import * as queryActionCreators from '../../../services/actions/query-action-creators';
import * as queryInputActionCreators from '../../../services/actions/query-input-action-creators';
import * as queryStatusActionCreators from '../../../services/actions/query-status-action-creator';
import * as samplesActionCreators from '../../../services/actions/samples-action-creators';
import { GRAPH_URL } from '../../../services/graph-constants';
import { getStyleFor } from '../../../utils/badge-color';
import { validateExternalLink } from '../../../utils/external-link-validation';
import { generateGroupsFromList } from '../../../utils/generate-groups';
import { sanitizeQueryUrl } from '../../../utils/query-url-sanitization';
import { substituteTokens } from '../../../utils/token-helpers';
import { classNames } from '../../classnames';
import { sidebarStyles } from '../Sidebar.styles';
import { isJsonString } from './sample-query-utils';

export class SampleQueries extends Component<ISampleQueriesProps, any> {
  resetCollapse: boolean;
  groups: any[];
  constructor(props: ISampleQueriesProps) {
    super(props);
    this.resetCollapse = true;
    this.groups = [];
    this.state = {
      sampleQueries: [],
      selectedQuery: null,
    };
  }

  public componentDidMount = () => {
    const { queries } = this.props.samples;
    if (queries && queries.length > 0) {
      this.setState({ sampleQueries: queries });
    } else {
      this.props.actions!.fetchSamples();
    }
  };

  public componentDidUpdate = (prevProps: ISampleQueriesProps) => {
    const { sampleQueries } = this.state;
    if (prevProps.samples.queries !== this.props.samples.queries) {
      this.groups = generateGroupsFromList(sampleQueries, 'category');
      this.setState({ sampleQueries: this.props.samples.queries });
    }
  };

  public searchValueChanged = (event: any, value?: string): void => {
    const { queries } = this.props.samples;
    let sampleQueries = queries;
    if (value) {
      const keyword = value.toLowerCase();
      sampleQueries = queries.filter((sample: any) => {
        const name = sample.humanName.toLowerCase();
        const category = sample.category.toLowerCase();
        return name.includes(keyword) || category.includes(keyword);
      });
    }
    this.setState({ sampleQueries });
  };

  public onDocumentationLinkClicked = (item: ISampleQuery) => {
    window.open(item.docLink, '_blank');
    this.trackDocumentLinkClickedEvent(item);
  };

  private async trackDocumentLinkClickedEvent(item: ISampleQuery): Promise<void> {
    const properties: { [key: string]: any } = {
      ComponentName: componentNames.DOCUMENTATION_LINK,
      SampleId: item.id,
      SampleName: item.humanName,
      SampleCategory: item.category,
      Link: item.docLink
    };
    telemetry.trackEvent(eventTypes.LINK_CLICK_EVENT, properties);

    // Check if link throws error
    validateExternalLink(item.docLink || '', componentNames.DOCUMENTATION_LINK, item.id);
  }

  public renderItemColumn = (
    item: any,
    index: number | undefined,
    column: IColumn | undefined
  ) => {
    const classes = classNames(this.props);
    const {
      tokenPresent,
      intl: { messages },
    }: any = this.props;

    if (column) {
      const queryContent = item[column.fieldName as keyof any] as string;
      const signInText = messages['Sign In to try this sample'];

      switch (column.key) {
        case 'authRequiredIcon':
          if (item.method !== 'GET' && !tokenPresent) {
            return (
              <TooltipHost
                tooltipProps={{
                  onRenderContent: () => (
                    <div style={{ paddingBottom: 3 }}>
                      <FormattedMessage id={signInText} />
                    </div>
                  ),
                }}
                id={getId()}
                calloutProps={{ gapSpace: 0 }}
                styles={{ root: { display: 'inline-block' } }}
              >
                <Icon
                  iconName='Lock'
                  title={signInText}
                  style={{
                    fontSize: 15,
                    height: 10,
                    width: 10,
                    verticalAlign: 'center',
                  }}
                />
              </TooltipHost>
            );
          } else {
            return null;
          }

        case 'button':
          return (
            <TooltipHost
              tooltipProps={{
                onRenderContent: () => (
                  <div style={{ paddingBottom: 3 }}>{item.docLink}</div>
                ),
              }}
              id={getId()}
              calloutProps={{ gapSpace: 0 }}
            >
              <Icon
                iconName='NavigateExternalInline'
                onClick={() => this.onDocumentationLinkClicked(item)}
                className={classes.docLink}
                style={{
                  marginRight: '20%',
                }}
              />
            </TooltipHost>
          );

        case 'method':
          return (
            <TooltipHost
              tooltipProps={{
                onRenderContent: () => (
                  <div style={{ paddingBottom: 3 }}>{queryContent}</div>
                ),
              }}
              id={getId()}
              calloutProps={{ gapSpace: 0 }}
              styles={{ root: { display: 'inline-block' } }}
            >
              <span
                className={classes.badge}
                style={{
                  background: getStyleFor(item.method),
                  textAlign: 'center',
                }}
              >
                {item.method}
              </span>
              ;
            </TooltipHost>
          );

        default:
          return (
            <TooltipHost
              tooltipProps={{
                onRenderContent: () => (
                  <div style={{ paddingBottom: 3 }}>
                    {item.method} {queryContent}{' '}
                  </div>
                ),
              }}
              id={getId()}
              calloutProps={{ gapSpace: 0 }}
            >
              <span aria-label={queryContent} className={classes.queryContent}>
                {queryContent}
              </span>
            </TooltipHost>
          );
      }
    }
  };

  public renderRow = (props: any): any => {
    const { tokenPresent } = this.props;
    const classes = classNames(this.props);
    let selectionDisabled = false;
    const customStyles: Partial<IDetailsRowStyles> = {};
    if (this.state.selectedQuery === props.item.id) {
      customStyles.root = { backgroundColor: '#8D8D8D' };
    }

    if (props) {
      if (!tokenPresent && props.item.method !== 'GET') {
        selectionDisabled = true;
      }
      return (
        <div className={classes.groupHeader}>
          <DetailsRow
            {...props}
            styles={customStyles}
            onClick={() => {
              if (!selectionDisabled) {
                this.querySelected(props.item);
              }
              this.resetCollapse = false;
              this.setState({ selectedQuery: props.item.id })
            }}
            className={
              classes.queryRow +
              ' ' +
              (selectionDisabled ? classes.rowDisabled : '')
            }
            data-selection-disabled={selectionDisabled}
          />
        </div>
      );
    }
  };

  private querySelected = (query: any) => {
    const { actions, tokenPresent, profile } = this.props;
    const selectedQuery = query;
    if (!selectedQuery) {
      return;
    }

    const queryVersion = selectedQuery.requestUrl.substring(1, 5);
    const sampleQuery: IQuery = {
      sampleUrl: GRAPH_URL + selectedQuery.requestUrl,
      selectedVerb: selectedQuery.method,
      sampleBody: selectedQuery.postBody,
      sampleHeaders: selectedQuery.headers || [],
      selectedVersion: queryVersion,
    };

    substituteTokens(sampleQuery, profile);

    if (actions) {
      if (sampleQuery.selectedVerb === 'GET') {
        sampleQuery.sampleBody = JSON.parse('{}');
        if (tokenPresent) {
          if (selectedQuery.tip) {
            displayTipMessage(actions, selectedQuery);
          } else {
            actions.runQuery(sampleQuery);
          }
        } else {
          actions.runQuery(sampleQuery);
        }
        this.trackSampleQueryClickEvent(selectedQuery);
      } else {
        if (sampleQuery.sampleBody) {
          sampleQuery.sampleBody = isJsonString(sampleQuery.sampleBody)
            ? JSON.parse(sampleQuery.sampleBody)
            : sampleQuery.sampleBody;
        } else {
          sampleQuery.sampleBody = undefined;
        }

        if (selectedQuery.tip) {
          displayTipMessage(actions, selectedQuery);
        }
      }
      actions.setSampleQuery(sampleQuery);
    }
  };

  private trackSampleQueryClickEvent(selectedQuery: ISampleQuery) {
    const sanitizedUrl = sanitizeQueryUrl(GRAPH_URL + selectedQuery.requestUrl);
    telemetry.trackEvent(
      eventTypes.LISTITEM_CLICK_EVENT,
      {
        ComponentName: componentNames.SAMPLE_QUERY_LIST_ITEM,
        SampleId: selectedQuery.id,
        SampleName: selectedQuery.humanName,
        SampleCategory: selectedQuery.category,
        QuerySignature: `${selectedQuery.method} ${sanitizedUrl}`
      });
  }

  public renderGroupHeader = (props: any): any => {
    const onToggleSelectGroup = () => {
      props.onToggleCollapse(props.group);
    };

    return (
      <GroupHeader
        compact={true}
        styles={{
          check: { display: 'none' },
          title: {
            fontSize: FontSizes.medium,
            fontWeight: FontWeights.semibold,
          },
          expand: {
            fontSize: FontSizes.small,
          },
        }}
        {...props}
        onToggleSelectGroup={onToggleSelectGroup}
      />
    );
  };

  private renderDetailsHeader() {
    return <div />;
  }

  public render() {
    const { error, pending } = this.props.samples;
    const {
      intl: { messages },
    }: any = this.props;

    const { sampleQueries } = this.state;
    const classes = classNames(this.props);
    if (this.resetCollapse) {
      this.groups = generateGroupsFromList(sampleQueries, 'category');
    }

    if (pending) {
      return (
        <Spinner
          className={classes.spinner}
          size={SpinnerSize.large}
          label={`${messages['loading samples']} ...`}
          ariaLive='assertive'
          labelPosition='top'
        />
      );
    }

    let maxWidthOfHumanName = 180;
    if (window.innerWidth > 1280) {
      maxWidthOfHumanName = 200;
    }

    window.onresize = () => {
      if (window.innerWidth > 1280) {
        maxWidthOfHumanName = 200;
      }
    };

    const columns = [
      {
        key: 'authRequiredIcon',
        name: '',
        fieldName: 'authRequiredIcon',
        minWidth: 20,
        maxWidth: 20,
      },
      {
        key: 'method',
        name: '',
        fieldName: 'method',
        minWidth: 20,
        maxWidth: 50,
      },
      {
        key: 'humanName',
        name: '',
        fieldName: 'humanName',
        minWidth: 100,
        maxWidth: maxWidthOfHumanName,
      },
      {
        key: 'button',
        name: '',
        fieldName: 'button',
        minWidth: 15,
        maxWidth: 25,
      },
    ];

    return (
      <div>
        <SearchBox
          className={classes.searchBox}
          placeholder={messages['Search sample queries']}
          onChange={this.searchValueChanged}
          styles={{ field: { paddingLeft: 10 } }}
          aria-label={'Search'}
        />
        <hr />
        {error && (
          <MessageBar
            messageBarType={MessageBarType.warning}
            isMultiline={true}
            dismissButtonAriaLabel='Close'
          >
            <FormattedMessage id='viewing a cached set' />
          </MessageBar>
        )}
        <MessageBar
          messageBarType={MessageBarType.info}
          isMultiline={true}
          dismissButtonAriaLabel='Close'
        >
          <FormattedMessage id='see more queries' />
          <a
            target='_blank'
            rel="noopener noreferrer"
            className={classes.links}
            onClick={(e) => telemetry.trackLinkClickEvent(e.currentTarget.href, componentNames.MICROSOFT_GRAPH_API_REFERENCE_DOCS_LINK)}
            href={`https://docs.microsoft.com/${geLocale}/graph/api/overview?view=graph-rest-1.0`}
          >
            <FormattedMessage id='Microsoft Graph API Reference docs' />
          </a>
        </MessageBar>
        <Announced
          message={`${sampleQueries.length} search results available.`}
        />
        <DetailsList
          className={classes.queryList}
          cellStyleProps={{
            cellRightPadding: 0,
            cellExtraRightPadding: 0,
            cellLeftPadding: 0,
          }}
          onRenderItemColumn={this.renderItemColumn}
          items={sampleQueries}
          selectionMode={SelectionMode.none}
          columns={columns}
          groups={this.groups}
          groupProps={{
            showEmptyGroups: true,
            onRenderHeader: this.renderGroupHeader,
          }}
          onRenderRow={this.renderRow}
          onRenderDetailsHeader={this.renderDetailsHeader}
          onItemInvoked={this.querySelected}
        />
      </div>
    );
  }
}

function displayTipMessage(actions: any, selectedQuery: ISampleQuery) {
  actions.setQueryResponseStatus({
    messageType: MessageBarType.warning,
    statusText: 'Tip',
    status: selectedQuery.tip,
  });
}

function mapStateToProps({ authToken, profile, samples, theme }: IRootState) {
  return {
    tokenPresent: !!authToken.token,
    profile,
    samples,
    appTheme: theme
  };
}

function mapDispatchToProps(dispatch: Dispatch): object {
  return {
    actions: bindActionCreators(
      {
        ...queryActionCreators,
        ...queryInputActionCreators,
        ...samplesActionCreators,
        ...queryStatusActionCreators,
      },
      dispatch
    ),
  };
}

// @ts-ignore
const styledSampleQueries = styled(SampleQueries, sidebarStyles);
// @ts-ignore
const IntlSampleQueries = injectIntl(styledSampleQueries);
// @ts-ignore
export default connect(mapStateToProps, mapDispatchToProps)(IntlSampleQueries);
