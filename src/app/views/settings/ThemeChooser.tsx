import {
  Dialog, DialogType, ChoiceGroup,
  DialogFooter, DefaultButton
} from 'office-ui-fabric-react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { componentNames, eventTypes, telemetry } from '../../../telemetry';
import { loadGETheme } from '../../../themes';
import { AppTheme } from '../../../types/enums';
import { IRootState } from '../../../types/root';
import { changeTheme } from '../../services/actions/theme-action-creator';
import { translateMessage } from '../../utils/translate-messages';

interface IThemeChooser {
  dialogHidden: boolean;
  toggleThemeChooserDialogState: Function;
}

export const ThemeChooser = ({ dialogHidden, toggleThemeChooserDialogState }: IThemeChooser) => {
  const dispatch = useDispatch();
  const { theme: appTheme } = useSelector((state: IRootState) => (state));

  const handleChangeTheme = (selectedTheme: any) => {
    const newTheme: AppTheme = selectedTheme.key;
    dispatch(changeTheme(newTheme));
    loadGETheme(newTheme);
    telemetry.trackEvent(
      eventTypes.BUTTON_CLICK_EVENT,
      {
        ComponentName: componentNames.SELECT_THEME_BUTTON,
        SelectedTheme: selectedTheme.text
      });
  };

  return (
    <Dialog
      hidden={dialogHidden}
      onDismiss={() => toggleThemeChooserDialogState()}
      dialogContentProps={{
        type: DialogType.normal,
        title: translateMessage('Change theme'),
        isMultiline: false,
      }}
    >

      <ChoiceGroup
        label='Pick one theme'
        defaultSelectedKey={appTheme}
        options={[
          {
            key: AppTheme.Light,
            iconProps: { iconName: 'Light' },
            text: translateMessage('Light')
          },
          {
            key: AppTheme.Dark,
            iconProps: { iconName: 'CircleFill' },
            text: translateMessage('Dark')
          },
          {
            key: AppTheme.HighContrast,
            iconProps: { iconName: 'Contrast' },
            text: translateMessage('High Contrast'),
          }
        ]}
        onChange={(event, selectedTheme) => handleChangeTheme(selectedTheme)}
      />
      <DialogFooter>
        <DefaultButton
          text={translateMessage('Close')}
          onClick={() => toggleThemeChooserDialogState()} />
      </DialogFooter>
    </Dialog>
  )
}
