# Microsoft Graph Explorer V2
[![Build Status](https://dev.azure.com/japhethobalak/japhethobalak/_apis/build/status/microsoftgraph.microsoft-graph-explorer-v2?branchName=dev)](https://dev.azure.com/japhethobalak/japhethobalak/_build/latest?definitionId=4&branchName=dev)

The [Microsoft Graph Explorer V2](https://developer.microsoft.com/graph/graph-explorer) lets developers quickly navigate and test API endpoints.

The Graph Explorer is written in [TypeScript](https://www.typescriptlang.org/) and powered by:
* [React](https://reactjs.org/)
* [Office Fabric](https://dev.office.com/fabric)


## Running the explorer locally

* `npm install` to install project dependencies. `npm` is installed by default with [Node.js](https://nodejs.org/).
* `npm start` starts the TypeScript compiler in watch mode and the local server. It should open your browser automatically with the Graph Explorer at [http://localhost:3000/](http://localhost:3000).

#### Enabling authentication with your own credentials
* You'll need to register an app on [https://portal.azure.com/](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) to configure the login page for your local Graph Explorer.  Under `Azure services` which is located [here](https://portal.azure.com/#home) click `App registrations` and set the name of the application, make sure **Redirect URI** dropdown is set to Web and set `http://localhost:3000` as the redirect URL.
* Copy the **Application (client) ID** and create a `.env` file in the project root and insert your client ID to this REACT_APP_CLIENT_ID in the `.env` file.

## Other commands
* `npm test` to run tests from the command line for scenarios like parsing metadata and functional explorer tests.
* `npm run lint` linting your files

## Contributing
Please see the [contributing guidelines](CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Known issues
* You cannot remove permissions by using the Graph Explorer UI. You will need to [remove the application consent](http://shawntabrizi.com/aad/revoking-consent-azure-active-directory-applications/) and then re-consent to remove permissions. I know, this is far from a good experience.

## Additional resources
* [Microsoft Graph website](https://graph.microsoft.io)
* [Office Dev Center](http://dev.office.com/)
* [Graph Explorer releases](https://github.com/microsoftgraph/microsoft-graph-explorer/releases)

## Copyright
Copyright (c) 2017 Microsoft. All rights reserved.
