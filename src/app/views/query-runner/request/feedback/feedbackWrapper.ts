import '@ms-ofb/officebrowserfeedbacknpm/intl/en/officebrowserfeedbackstrings';
import { getTheme } from 'office-ui-fabric-react';

import { geLocale } from '../../../../../../src/appLocale';
import { translateMessage } from '../../../../utils/translate-messages';

const currentTheme = getTheme();
const { NODE_ENV } = process.env;

export async function loadAndInitialize(
    officeBrowserFeedback: any,
    onSurveyActivated: (launcher: any, survey: any) => void): Promise<void> {
    officeBrowserFeedback.initOptions = {
        appId: 2256,
        stylesUrl: ' ', // Mandatory field
        environment: (NODE_ENV === 'development') ? 1 : 0, // 0 - Prod, 1 - Int
        locale: geLocale,
        onError: (error: string) => { throw error; },
        primaryColour: currentTheme.palette.themePrimary,
        secondaryColour: currentTheme.palette.themeSecondary,
        telemetryGroup: {
            audienceGroup: 'Graph Explorer',
        },
        userEmail: '',  // Replaced by the user email
        userEmailConsentDefault: false, // Should the email checkbox be checked
        customResourcesSetExternally: 2 // None = 0, Css = 1, Strings = 2, CssAndStrings = 3
    };

    officeBrowserFeedback.floodgate.initOptions = {
        surveyEnabled: true,
        onSurveyActivatedCallback: {  //callback implementation
            onSurveyActivated
        },
        onDismiss: (campaignId: string, submitted: string) => {
            console.log("Floodgate survey dismissed. campaignId: " + campaignId + ", submitted: " + submitted);
        },
    }

    // Setting the UI strings here before initialization.
    officeBrowserFeedback.setUiStrings({
        "PrivacyStatement": translateMessage("Privacy Statement"),
        "Form": {
            "EmailPlaceholder": translateMessage("Email (optional)"),
            "RatingLabel": translateMessage("Rating"),
            "Submit": translateMessage("Submit"),
            "Cancel": translateMessage("Cancel"),
            "EmailCheckBoxLabel": translateMessage("You can contact me about this feedback"),
        },
        "CloseLabel": translateMessage("Close")
    });

    officeBrowserFeedback.floodgate.initialize().then(
        function () {
            officeBrowserFeedback.floodgate.start();
        },
        function (err: string) { throw err; });

    window.onfocus = function () {
        if (officeBrowserFeedback.floodgate) {
            officeBrowserFeedback.floodgate.start();
        }
    }

    window.onblur = function () {
        if (officeBrowserFeedback.floodgate) {
            officeBrowserFeedback.floodgate.stop();
        }
    }

    window.onunload = function () {
        if (officeBrowserFeedback.floodgate) {
            officeBrowserFeedback.floodgate.stop();
        }
    }

}
