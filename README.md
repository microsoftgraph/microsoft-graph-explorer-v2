# Microsoft Graph Explorer V4
[![Build Status](https://dev.azure.com/japhethobalak/japhethobalak/_apis/build/status/microsoftgraph.microsoft-graph-explorer-v2?branchName=dev)](https://dev.azure.com/japhethobalak/japhethobalak/_build/latest?definitionId=4&branchName=dev)

The [Microsoft Graph Explorer V4](https://developer.microsoft.com/graph/graph-explorer) lets developers quickly navigate and test API endpoints.

The Graph Explorer is written in [TypeScript](https://www.typescriptlang.org/) and powered by:
* [React](https://reactjs.org/)
* [Office Fabric](https://dev.office.com/fabric)


## Running the explorer locally

* `npm install` to install project dependencies. `npm` is installed by default with [Node.js](https://nodejs.org/).
* `npm start` starts the TypeScript compiler in watch mode and the local server. It should open your browser automatically with the Graph Explorer at [http://localhost:3000/](http://localhost:3000).

#### Enabling authentication with your own credentials
* Sign in to your Microsoft account (or Create one) at the [Microsoft Azure Portal](https://ms.portal.azure.com/).
* Find the Azure service named App registrations. If you haven't used this service before, you might need to search for it in the search bar. 
* In the App registrations page, click `+ New registration`. You will be redirected to a form in the Microsoft Azure portal where you Register an application. Fill out the form and set the Redirect URI to a `Single-page application (SPA)` with `http://localhost:3000`. You can also set it from authentication tab in the app you have just created.
* Create a `.env` file at the root of the project/repo and add the following keys.
    - REACT_APP_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    - REACT_APP_INSTRUMENTATION_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Where `REACT_APP_CLIENT_ID` is the `Application (client) ID` from the Azure portal and `REACT_APP_INSTRUMENTATION_KEY` is the `Object ID` from the portal.

## Other commands
* `npm test` to run tests from the command line for scenarios like parsing metadata and functional explorer tests.
* `npm run ci` to run accessibility tests from the command line
* `npm run lint` linting your files

## Contributing
Please see the [contributing guidelines](CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Testing Accessbility
* Download the latest stable chromedriver from [here](https://chromedriver.chromium.org/).
* In your `.env` file, create a variable `REACT_APP_CHROMEDRIVER_PATH` and save the path to your `chromedriver.exe` file.
    For example (on a Windows PC)  it would be : `REACT_APP_CHROMEDRIVER_PATH=C:\\SeleniumWebDrivers\\ChromeDriver\\chromedriver.exe`
    Take note of the format.
* Save your changes.
* On your terminal run the command `npm install`.
* Once the installation is complete run the command `npm run ci`.

## Known issues
* You cannot remove permissions by using the Graph Explorer UI. You will need to [remove the application consent](http://shawntabrizi.com/aad/revoking-consent-azure-active-directory-applications/) and then re-consent to remove permissions. I know, this is far from a good experience.

## Additional resources
* [Microsoft Graph website](https://graph.microsoft.io)
* [Office Dev Center](http://dev.office.com/)
* [Graph Explorer releases](https://github.com/microsoftgraph/microsoft-graph-explorer/releases)

## Copyright
Copyright (c) 2017 Microsoft. All rights reserved.
