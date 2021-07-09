import { ITheme } from 'office-ui-fabric-react';
import { ICloud } from './cloud';

export interface IProfileProps {
    intl: {
        message: object;
    };
    theme?: ITheme;
    styles?: object;
    mobileScreen: boolean;
    cloud: ICloud;
    actions?: {
        getProfileInfo: Function;
        signOut: Function;
    };
}

export interface IProfileState {
    user: IUser;
}


export interface IUser {
    displayName: string;
    emailAddress: string;
    profileImageUrl: string;
}
