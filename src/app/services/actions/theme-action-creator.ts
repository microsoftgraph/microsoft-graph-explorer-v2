import { Dispatch } from 'redux';

import { saveTheme } from '../../../themes/theme-utils';
import { IAction } from '../../../types/action';
import { CHANGE_THEME_SUCCESS } from '../redux-constants';

export function changeThemeSuccess(response: string): IAction {
  return {
    type: CHANGE_THEME_SUCCESS,
    response,
  };
}

export function changeTheme(theme: string): Function {
  saveTheme(theme);

  return (dispatch: Dispatch) => {
    dispatch(changeThemeSuccess(theme));
  };
}
