import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';

import App from '../../app/views/App';
import messages from '../../messages';
import { store } from '../../store/index';

const Wrapper = () => {
  const appState: any = store({});
  return (
    <Provider store={appState}>
      <IntlProvider locale='en-US' messages={(messages as { [key: string]: object })['en-US']}>
        <App />
      </IntlProvider>
    </Provider>
  )
}
jest.mock('@microsoft/applicationinsights-react-js', () => ({
  ReactPlugin: jest.fn(),
  // eslint-disable-next-line react/display-name
  withAITracking: (_reactPlugin: any, _component: any) => (<Component />),
}));

describe(`Components`, () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    })
  });

  it('App renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<Wrapper />, div);
    ReactDOM.unmountComponentAtNode(div);
  })
});