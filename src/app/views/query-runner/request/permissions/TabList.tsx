import { DetailsList, DetailsListLayoutMode, IColumn, Label, Link, SelectionMode } from 'office-ui-fabric-react';
import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { IPermission } from '../../../../../types/permissions';
import { IRootState } from '../../../../../types/root';
import { togglePermissionsPanel } from '../../../../services/actions/permissions-panel-action-creator';
import { setConsentedStatus } from './util';

interface ITabList {
  columns: any[];
  classes: any;
  renderItemColumn: Function;
  renderDetailsHeader: Function;
  maxHeight: string;
}

const TabList = ({ columns, classes, renderItemColumn, renderDetailsHeader, maxHeight }: ITabList) => {
  const dispatch = useDispatch();
  const { consentedScopes, scopes, authToken } = useSelector((state: IRootState) => state);
  const permissions: IPermission[] = scopes.hasUrl ? scopes.data : [];
  const tokenPresent = !!authToken.token;
  const [isHoverOverPermissionsList, setIsHoverOverPermissionsList] = useState(false);

  setConsentedStatus(tokenPresent, permissions, consentedScopes);

  const openPermissionsPanel = () => {
    dispatch(togglePermissionsPanel(true));
  }

  const displayNoPermissionsFoundMessage = () => {
    return (<Label className={classes.permissionLabel}>
      <FormattedMessage id='permissions not found in permissions tab' />
      <Link onClick={openPermissionsPanel}>
        <FormattedMessage id='open permissions panel' />
      </Link>
      <FormattedMessage id='permissions list' />
    </Label>);
  }

  const displayNotSignedInMessage = () => {
    return (<Label className={classes.permissionLabel}>
      <FormattedMessage id='sign in to view a list of all permissions' />
    </Label>)
  }

  if (tokenPresent && !scopes.hasUrl) {
    return displayNoPermissionsFoundMessage();
  }

  if (!tokenPresent && !scopes.hasUrl) {
    return displayNotSignedInMessage();
  }



  return (
    <>
      <Label className={classes.permissionLength}>
        <FormattedMessage id='Permissions' />&nbsp;({permissions.length})
      </Label>
      <Label className={classes.permissionText}>
        {!tokenPresent && <FormattedMessage id='sign in to consent to permissions' />}
        {tokenPresent && <FormattedMessage id='permissions required to run the query' />}
      </Label>
      <div
        onMouseEnter={() => setIsHoverOverPermissionsList(true)}
        onMouseLeave={() => setIsHoverOverPermissionsList(false)}>
        <DetailsList
          styles={isHoverOverPermissionsList ? { root: { maxHeight } } : { root: { maxHeight, overflow: "hidden" } }}
          items={permissions}
          columns={columns}
          onRenderItemColumn={(item?: any, index?: number, column?: IColumn) => renderItemColumn(item, index, column)}
          selectionMode={SelectionMode.none}
          layoutMode={DetailsListLayoutMode.justified}
          onRenderDetailsHeader={(props?: any, defaultRender?: any) => renderDetailsHeader(props, defaultRender)} />
      </div>
      {permissions && permissions.length === 0 &&
        displayNoPermissionsFoundMessage()
      }
    </>
  );
};

export default TabList;




