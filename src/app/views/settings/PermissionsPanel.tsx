import { DefaultButton, Label, Panel, PanelType, PrimaryButton } from 'office-ui-fabric-react';
import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { IRootState } from '../../../types/root';
import { consentToScopes } from '../../services/actions/permissions-action-creator';
import { translateMessage } from '../../utils/translate-messages';
import { Permission } from '../query-runner/request/permissions';

export const PermissionsPanel = ({ changePanelState }: any) => {
  const dispatch = useDispatch();

  const { permissionsPanelOpen } = useSelector((state: IRootState) => state);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const setPermissions = (permissions: []) => {
    setSelectedPermissions(permissions);
  };

  const closePanel = () => {
    setSelectedPermissions([]);
    changePanelState();
  }

  const handleConsent = () => {
    dispatch(consentToScopes(selectedPermissions));
    setSelectedPermissions([]);
  };

  const getSelectionDetails = () => {
    const selectionCount = selectedPermissions.length;

    switch (selectionCount) {
      case 0:
        return '';
      case 1:
        return `1 ${translateMessage('selected')}: ` + selectedPermissions[0];
      default:
        return `${selectionCount} ${translateMessage('selected')}`;
    }
  };

  const onRenderFooterContent = () => {
    return (
      <div>
        <Label>{getSelectionDetails()}</Label>
        <PrimaryButton
          disabled={selectedPermissions.length === 0}
          onClick={() => handleConsent()}
          style={{ marginRight: 10 }}
        >
          <FormattedMessage id='Consent' />
        </PrimaryButton>
        <DefaultButton onClick={() => closePanel()}>
          <FormattedMessage id='Cancel' />
        </DefaultButton>
      </div>
    );
  };

  return (
    <Panel
      isOpen={permissionsPanelOpen}
      onDismiss={() => closePanel()}
      type={PanelType.medium}
      hasCloseButton={true}
      headerText={translateMessage('Permissions')}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
      closeButtonAriaLabel='Close'
    >
      <Permission panel={true} setPermissions={setPermissions} />
    </Panel>
  )
}
