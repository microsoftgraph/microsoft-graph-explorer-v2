import {
  DropdownMenuItemType,
  getId, IconButton, TooltipHost
} from 'office-ui-fabric-react';
import React, { useEffect, useState } from 'react';
import { injectIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import '../../utils/string-operations';
import { geLocale } from '../../../appLocale';
import { Sovereign } from '../../../modules/sovereign-clouds/cloud-options';
import { componentNames, eventTypes, telemetry } from '../../../telemetry';
import { IRootState } from '../../../types/root';
import { ISettingsProps } from '../../../types/settings';
import { signOut } from '../../services/actions/auth-action-creators';
import { togglePermissionsPanel } from '../../services/actions/permissions-panel-action-creator';
import { PermissionsPanel } from './PermissionsPanel';
import { SovereignClouds } from './SovereignClouds';
import { ThemeChooser } from './ThemeChooser';

function Settings(props: ISettingsProps) {
  const dispatch = useDispatch();

  const { permissionsPanelOpen, profile, authToken } = useSelector((state: IRootState) => state);
  const [items, setItems] = useState<any[]>([]);
  const authenticated = authToken.token;
  const [themeChooserDialogHidden, hideThemeChooserDialog] = useState(true);
  const [cloudSelectorOpen, setCloudSelectorOpen] = useState(false);

  const cloudOptions = new Sovereign(profile).getOptions();

  const {
    intl: { messages }
  }: any = props;

  const toggleThemeChooserDialogState = () => {
    let hidden = themeChooserDialogHidden;
    hidden = !hidden;
    hideThemeChooserDialog(hidden);
    telemetry.trackEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      {
        ComponentName: componentNames.THEME_CHANGE_BUTTON
      });
  };

  const handleSignOut = () => {
    dispatch(signOut());
  };

  useEffect(() => {
    let menuItems: any[] = [
      {
        key: 'office-dev-program',
        text: messages['Office Dev Program'],
        href: `https://developer.microsoft.com/${geLocale}/office/dev-program`,
        target: '_blank',
        iconProps: {
          iconName: 'CommandPrompt',
        },
        onClick: () => trackOfficeDevProgramLinkClickEvent(),
      },
      {
        key: 'report-issue',
        text: messages['Report an Issue'],
        href: 'https://github.com/microsoftgraph/microsoft-graph-explorer-v4/issues/new/choose',
        target: '_blank',
        iconProps: {
          iconName: 'ReportWarning',
        },
        onClick: () => trackReportAnIssueLinkClickEvent(),
      },
      {
        key: 'divider',
        text: '-',
        itemType: DropdownMenuItemType.Divider
      },
      {
        key: 'change-theme',
        text: messages['Change theme'],
        iconProps: {
          iconName: 'Color',
        },
        onClick: () => toggleThemeChooserDialogState(),
      },
      {
        key: 'select-cloud',
        text: messages['Select cloud'],
        iconProps: {
          iconName: 'Cloud',
        },
        onClick: () => toggleCloudSelector(),
      }
    ];

    if (authenticated) {
      menuItems.push(
        {
          key: 'view-all-permissions',
          text: messages['view all permissions'],
          iconProps: {
            iconName: 'AzureKeyVault',
          },
          onClick: () => changePanelState(),
        },
        {
          key: 'sign-out',
          text: messages['sign out'],
          iconProps: {
            iconName: 'SignOut',
          },
          onClick: () => handleSignOut(),
        },
      );
    }

    if (cloudOptions.length === 1) {
      menuItems = menuItems.filter(k => k.key !== 'select-cloud');
    }

    setItems(menuItems);
  }, [authenticated, profile]);

  const changePanelState = () => {
    let open = !!permissionsPanelOpen;
    open = !open;
    dispatch(togglePermissionsPanel(open));
    trackSelectPermissionsButtonClickEvent();
  };

  const toggleCloudSelector = () => {
    let open = !!cloudSelectorOpen;
    open = !open;
    setCloudSelectorOpen(open);
  }

  const trackSelectPermissionsButtonClickEvent = () => {
    telemetry.trackEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      {
        ComponentName: componentNames.VIEW_ALL_PERMISSIONS_BUTTON
      });
  }

  const trackReportAnIssueLinkClickEvent = () => {
    telemetry.trackEvent(
      eventTypes.LINK_CLICK_EVENT,
      {
        ComponentName: componentNames.REPORT_AN_ISSUE_LINK
      });
  }

  const trackOfficeDevProgramLinkClickEvent = () => {
    telemetry.trackEvent(
      eventTypes.LINK_CLICK_EVENT,
      {
        ComponentName: componentNames.OFFICE_DEV_PROGRAM_LINK
      });
  };

  const menuProperties = {
    shouldFocusOnMount: true,
    alignTargetEdge: true,
    items
  };

  return (
    <div>
      <TooltipHost
        content={messages['More actions']}
        id={getId()}
        calloutProps={{ gapSpace: 0 }}>
        <IconButton
          ariaLabel={messages['More actions']}
          role='button'
          styles={{
            label: { marginBottom: -20 },
            menuIcon: { fontSize: 20 }
          }}
          menuIconProps={{ iconName: 'More' }}
          menuProps={menuProperties} />

      </TooltipHost>
      <div>

        <ThemeChooser
          dialogHidden={themeChooserDialogHidden}
          toggleThemeChooserDialogState={toggleThemeChooserDialogState}
        />

        <PermissionsPanel changePanelState={changePanelState} />

        {cloudSelectorOpen && <SovereignClouds
          cloudSelectorOpen={cloudSelectorOpen}
          toggleCloudSelector={toggleCloudSelector}
        />}

      </div>
    </div>
  );
}

export default injectIntl(Settings);

