import {
  Announced,
  ContextualMenuItemType, DefaultButton, DetailsList, DetailsRow, Dialog,
  DialogFooter, DialogType, getId, getTheme, IColumn, IconButton,
  Label, MessageBar, MessageBarType, PrimaryButton, SearchBox, SelectionMode, styled, TooltipHost
} from 'office-ui-fabric-react';
import React, { Component } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { componentNames, eventTypes, telemetry } from '../../../../telemetry';
import { SortOrder } from '../../../../types/enums';
import { IHarPayload } from '../../../../types/har';
import { IHistoryItem, IHistoryProps } from '../../../../types/history';
import { IQuery } from '../../../../types/query-runner';
import { IRootState } from '../../../../types/root';
import * as queryActionCreators from '../../../services/actions/query-action-creators';
import * as queryInputActionCreators from '../../../services/actions/query-input-action-creators';
import * as queryStatusActionCreators from '../../../services/actions/query-status-action-creator';
import * as requestHistoryActionCreators from '../../../services/actions/request-history-action-creators';
import { GRAPH_URL } from '../../../services/graph-constants';
import { dynamicSort } from '../../../utils/dynamic-sort';
import { generateGroupsFromList } from '../../../utils/generate-groups';
import { sanitizeQueryUrl } from '../../../utils/query-url-sanitization';
import { parseSampleUrl } from '../../../utils/sample-url-generation';
import { translateMessage } from '../../../utils/translate-messages';
import { classNames } from '../../classnames';
import { sidebarStyles } from '../Sidebar.styles';
import { createHarPayload, exportQuery, generateHar } from './har-utils';

export class History extends Component<IHistoryProps, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      historyItems: [],
      hideDialog: true,
      category: '',
    };
  }

  public componentDidMount = () => {
    this.setState({ historyItems: this.props.history });
  }
  public componentDidUpdate = (prevProps: IHistoryProps) => {
    if (prevProps.history !== this.props.history) {
      this.setState({ historyItems: this.props.history });
    }
  };

  public searchValueChanged = (event: any, value?: string): void => {
    const { history } = this.props;
    let historyItems = history;
    if (value) {
      const keyword = value.toLowerCase();
      historyItems = history.filter((sample: any) => {
        const name = sample.url.toLowerCase();
        return name.toLowerCase().includes(keyword);
      });
    }

    this.setState({ historyItems });
  }


  public formatDate = (date: any) => {
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    month = (month < 10 ? '0' : '') + month;
    let day = date.getDate();
    day = (day < 10 ? '0' : '') + day;
    return `${year}-${month}-${day}`;
  };

  public getItems(history: any[]) {
    const {
      intl: { messages },
    }: any = this.props;

    const items: any[] = [];

    // tslint:disable-next-line:no-string-literal
    const olderText = messages.older;
    // tslint:disable-next-line:no-string-literal
    const todayText = messages.today;
    // tslint:disable-next-line:no-string-literal
    const yesterdayText = messages.yesterday;

    let date = olderText;
    const today = this.formatDate(new Date());
    const yesterdaysDate = new Date();
    yesterdaysDate.setDate(yesterdaysDate.getDate() - 1);
    const yesterday = this.formatDate(yesterdaysDate);

    history.forEach((element: any) => {
      if (element.createdAt.includes(today)) {
        date = todayText;
      } else if (element.createdAt.includes(yesterday)) {
        date = yesterdayText;
      }
      element.category = date;
      items.push(element);
    });
    items
      .sort(dynamicSort('createdAt', SortOrder.DESC))
      .forEach((value, index) => {
        value.index = index;
      });
    return items;
  }

  public renderRow = (props: any): any => {
    const classes = classNames(this.props);
    return (
      <div className={classes.groupHeader}>
        <DetailsRow
          {...props}
          className={classes.queryRow}
          onClick={() => this.onViewQueryListItem(props.item)}
        />
      </div>
    );
  };

  public renderItemColumn = (
    item: any,
    index: number | undefined,
    column: IColumn | undefined
  ) => {
    const classes = classNames(this.props);
    const hostId: string = getId('tooltipHost');
    const currentTheme = getTheme();

    const {
      intl: { messages },
    }: any = this.props;
    // tslint:disable
    const actionsText = messages.actions;
    const runQueryText = messages['Run Query'];
    const viewText = messages.view;
    const removeText = messages.Delete;
    const exportQueryText = messages.Export;
    // tslint:enable

    if (column) {
      const queryContent = item[column.fieldName as keyof any] as string;
      let color = currentTheme.palette.green;
      if (item.status > 300) {
        color = currentTheme.palette.red;
      }

      switch (column.key) {
        case 'status':
          return (
            <span style={{ color }} className={classes.badge}>
              {item.status}
            </span>
          );

        case 'button':
          const buttonActions = [
            {
              key: 'actions',
              itemType: ContextualMenuItemType.Header,
              text: actionsText,
            },
            {
              key: 'view',
              text: viewText,
              iconProps: {
                iconName: 'View',
              },
              onClick: () => this.onViewQueryButton(item),
            },
            {
              key: 'runQuery',
              text: runQueryText,
              iconProps: {
                iconName: 'Refresh',
              },
              onClick: () => this.onRunQuery(item),
            },
            {
              key: 'exportQuery',
              text: exportQueryText,
              iconProps: {
                iconName: 'Download',
              },
              onClick: () => this.onExportQuery(item),
            },
            {
              key: 'remove',
              text: removeText,
              iconProps: {
                iconName: 'Delete',
              },
              onClick: () => this.deleteQuery(item),
            },
          ];

          return (
            <IconButton
              className={classes.docLink}
              title='Actions'
              ariaLabel='Actions'
              menuIconProps={{ iconName: 'More' }}
              menuProps={{
                shouldFocusOnMount: true,
                items: buttonActions,
              }}
            />
          );

        default:
          return (
            <>
              <TooltipHost
                content={`${item.method} - ${queryContent}`}
                id={hostId}
                calloutProps={{ gapSpace: 0 }}
                styles={{ root: { display: 'inline-block' } }}
              >
                <span
                  aria-describedby={hostId}
                  className={classes.queryContent}
                >
                  {queryContent.replace(GRAPH_URL, '')}
                </span>
              </TooltipHost>
            </>
          );
      }
    }
  };

  public renderGroupHeader = (props: any): any => {
    const classes = classNames(this.props);
    const expandText = translateMessage('Expand');
    const collapseText = translateMessage('Collapse');
    const groupName: string = props.group!.name;
    const groupCount: string = props.group!.count;
    const collapseButtonLabel: string = props.group!.isCollapsed ? `${expandText} ${groupName}` : `${collapseText} ${groupName}`;

    return (
      <div
        aria-label={`${groupName} has ${groupCount} items`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div className={'col-md-8'}>
          <div
            className={classes.groupHeaderRow}
            onClick={this.onToggleCollapse(props)}
          >
            <TooltipHost
              content={collapseButtonLabel}
              id={getId()}
              calloutProps={{ gapSpace: 0 }}
              styles={{ root: { display: 'inline-block' } }}>
              <IconButton
                className={`${classes.pullLeft} ${classes.groupHeaderRowIcon}`}
                iconProps={{
                  iconName: props.group!.isCollapsed
                    ? 'ChevronRightSmall'
                    : 'ChevronDownSmall',
                }}
                ariaLabel={collapseButtonLabel}
                onClick={() => this.onToggleCollapse(props)}
              />
            </TooltipHost>
            <div className={classes.groupTitle}>
              <span>{groupName}</span>
              <span className={classes.headerCount}>
                ({groupCount})
              </span>
            </div>
          </div>
        </div>
        <div className={'col-md-4'} style={{ display: 'inline-block' }}>
          <div className={`${classes.pullRight}`}>
            <TooltipHost
              content={`${translateMessage('Export')} ${groupName} queries`}
              id={getId()}
              calloutProps={{ gapSpace: 0 }}>
              <IconButton
                className={`${classes.groupHeaderRowIcon}`}
                iconProps={{ iconName: 'Download' }}
                ariaLabel={`${translateMessage('Export')} ${groupName} queries`}
                onClick={() => this.exportHistoryByCategory(groupName)}
              />
            </TooltipHost>
            <TooltipHost
              content={`${translateMessage('Delete')} ${groupName} queries`}
              id={getId()}
              calloutProps={{ gapSpace: 0 }} >
              <IconButton
                className={`${classes.groupHeaderRowIcon}`}
                iconProps={{ iconName: 'Delete' }}
                ariaLabel={`${translateMessage('Delete')} ${groupName} queries`}
                onClick={() => this.showDialog(groupName)}
              />
            </TooltipHost>

          </div>
        </div>
      </div>
    );
  };

  private onToggleCollapse(props: any): () => void {
    return () => {
      props!.onToggleCollapse!(props!.group!);
    };
  }

  private showDialog = (category: string): void => {
    this.setState({ hideDialog: false, category });
  };

  private closeDialog = (): void => {
    this.setState({ hideDialog: true, category: '' });
  };

  private deleteHistoryCategory = (): any => {
    const { category, historyItems } = this.state;
    const { actions } = this.props;
    const itemsToDelete = historyItems.filter((query: IHistoryItem) => query.category === category);

    if (actions) {
      actions.bulkRemoveHistoryItems(itemsToDelete);
    }

    this.closeDialog();
  };

  private exportHistoryByCategory = (category: string) => {
    const { historyItems } = this.state;
    const itemsToExport = historyItems.filter((query: IHistoryItem) => query.category === category);
    const entries: IHarPayload[] = [];

    itemsToExport.forEach((query: IHistoryItem) => {
      const harPayload = createHarPayload(query);
      entries.push(harPayload);
    });

    const generatedHarData = generateHar(entries);
    const { origin } = new URL(itemsToExport[0].url);
    const exportTitle = `${origin}/${category.toLowerCase()}/${itemsToExport[0].createdAt.substr(
      0,
      10
    )}/`;

    exportQuery(generatedHarData, exportTitle);
  };

  private renderDetailsHeader() {
    return <div />;
  }

  private onRunQuery = (query: IHistoryItem) => {
    const { actions } = this.props;
    const { sampleUrl, queryVersion } = parseSampleUrl(query.url);
    const sampleQuery: IQuery = {
      sampleUrl,
      selectedVerb: query.method,
      sampleBody: query.body,
      sampleHeaders: query.headers,
      selectedVersion: queryVersion,
    };

    if (actions) {
      if (sampleQuery.selectedVerb === 'GET') {
        sampleQuery.sampleBody = JSON.parse('{}');
      }
      actions.setSampleQuery(sampleQuery);
      actions.runQuery(sampleQuery);
    }
    this.trackHistoryItemEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      componentNames.RUN_HISTORY_ITEM_BUTTON,
      query
    );
  };

  private onExportQuery = (query: IHistoryItem) => {
    const harPayload = createHarPayload(query);
    const generatedHarData = generateHar([harPayload]);
    exportQuery(generatedHarData, `${query.url}/`);
    this.trackHistoryItemEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      componentNames.EXPORT_HISTORY_ITEM_BUTTON,
      query
    );
  };

  private deleteQuery = async (query: IHistoryItem) => {
    const { actions } = this.props;
    if (actions) {
      actions.removeHistoryItem(query);
    }
    this.trackHistoryItemEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      componentNames.DELETE_HISTORY_ITEM_BUTTON,
      query
    );
  };

  private onViewQueryButton = (query: IHistoryItem) => {
    this.onViewQuery(query);
    this.trackHistoryItemEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      componentNames.VIEW_HISTORY_ITEM_BUTTON,
      query
    );
  };

  private onViewQueryListItem = (query: IHistoryItem) => {
    this.onViewQuery(query);
    this.trackHistoryItemEvent(
      eventTypes.LISTITEM_CLICK_EVENT,
      componentNames.HISTORY_LIST_ITEM,
      query
    );
  };

  private onViewQuery = (query: IHistoryItem) => {
    const { actions } = this.props;
    const { sampleUrl, queryVersion } = parseSampleUrl(query.url);
    const sampleQuery: IQuery = {
      sampleUrl,
      selectedVerb: query.method,
      sampleBody: query.body,
      sampleHeaders: query.headers,
      selectedVersion: queryVersion,
    };
    const { duration, status, statusText } = query;
    if (actions) {
      actions.setSampleQuery(sampleQuery);
      actions.viewHistoryItem({
        body: query.result,
        headers: query.responseHeaders,
      });
      actions.setQueryResponseStatus({
        duration,
        messageType:
          status < 300 ? MessageBarType.success : MessageBarType.error,
        ok: status < 300,
        status,
        statusText,
      });
    }
  };

  private trackHistoryItemEvent = (eventName: string, componentName: string, query: IHistoryItem) => {
    const sanitizedUrl = sanitizeQueryUrl(query.url);
    telemetry.trackEvent(
      eventName,
      {
        ComponentName: componentName,
        ItemIndex: query.index,
        QuerySignature: `${query.method} ${sanitizedUrl}`
      });
  }

  public render() {
    const { hideDialog, category, historyItems } = this.state;
    const {
      intl: { messages },
    }: any = this.props;
    const classes = classNames(this.props);
    const columns = [
      {
        key: 'status',
        name: '',
        fieldName: 'status',
        minWidth: 20,
        maxWidth: 50,
      },
      { key: 'url', name: '', fieldName: 'url', minWidth: 100, maxWidth: 200 },
      { key: 'button', name: '', fieldName: '', minWidth: 20, maxWidth: 20 },
    ];

    if (!historyItems) {
      return (
        <Label className={classes.spinner}>
          <FormattedMessage id='We did not find any history items' />
        </Label>
      );
    }

    const items = this.getItems(historyItems);
    const groups = generateGroupsFromList(items, 'category');

    return (
      <>
        <div>
          <SearchBox
            placeholder={messages['Search history items']}
            className={classes.searchBox}
            onChange={this.searchValueChanged}
            styles={{ field: { paddingLeft: 10 } }}
          />
          <hr />
          <MessageBar
            messageBarType={MessageBarType.info}
            isMultiline={true}
            dismissButtonAriaLabel='Close'
          >
            <FormattedMessage id='Your history includes queries made in the last 30 days' />
            .
          </MessageBar>
          {items.length === 0 && <Label className={classes.spinner}>
            <FormattedMessage id='We did not find any history items' />
          </Label>}
          <Announced
            message={`${items.length} search results available.`}
          />
          {items.length > 0 &&
            <div
              onMouseEnter={() => this.setState({ isHoverOverHistoryList: true })}
              onMouseLeave={() => this.setState({ isHoverOverHistoryList: false })}>
              <DetailsList
                styles={this.state.isHoverOverHistoryList ? { root: { overflow: 'scroll' } } : { root: { overflow: 'hidden' } }}
                className={classes.queryList}
                onRenderItemColumn={this.renderItemColumn}
                items={items}
                columns={columns}
                selectionMode={SelectionMode.none}
                groups={groups}
                groupProps={{
                  showEmptyGroups: true,
                  onRenderHeader: this.renderGroupHeader,
                }}
                onRenderRow={this.renderRow}
                onRenderDetailsHeader={this.renderDetailsHeader}
              />
            </div>}
        </div>
        <Dialog
          hidden={hideDialog}
          onDismiss={this.closeDialog}
          dialogContentProps={{
            type: DialogType.normal,
            title: `${messages['Delete requests']} : ${category}`,
            closeButtonAriaLabel: 'Close',
            subText: `${messages['Are you sure you want to delete these requests?']}`,
          }}
          modalProps={{
            titleAriaId: getId(),
            subtitleAriaId: getId(),
            isBlocking: false,
            styles: { main: { maxWidth: 450 } },
          }}
        >
          <DialogFooter>
            <PrimaryButton
              onClick={this.deleteHistoryCategory}
              text={messages.Delete}
            />
            <DefaultButton onClick={this.closeDialog} text={messages.Cancel} />
          </DialogFooter>
        </Dialog>
      </>
    );
  }
}

function mapStateToProps({ history, theme }: IRootState) {
  return {
    history,
    appTheme: theme
  };
}

function mapDispatchToProps(dispatch: Dispatch): object {
  return {
    actions: bindActionCreators(
      {
        ...queryActionCreators,
        ...queryInputActionCreators,
        ...requestHistoryActionCreators,
        ...queryStatusActionCreators,
      },
      dispatch
    ),
  };
}

const trackedComponent = telemetry.trackReactComponent(History, componentNames.HISTORY_TAB);
// @ts-ignore
const styledHistory = styled(trackedComponent, sidebarStyles);
const IntlHistory = injectIntl(styledHistory);
export default connect(mapStateToProps, mapDispatchToProps)(IntlHistory);
