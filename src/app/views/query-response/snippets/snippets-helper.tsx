import { IconButton, Label, PivotItem } from 'office-ui-fabric-react';
import React, { useEffect } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import { FormattedMessage } from 'react-intl';
import { getSnippet } from '../../../services/actions/snippet-action-creator';
import { Monaco } from '../../common';
import { genericCopy } from '../../common/copy';

import { telemetry } from '../../../../telemetry';
import { BUTTON_CLICK_EVENT } from '../../../../telemetry/event-types';
import { IQuery } from '../../../../types/query-runner';

interface ISnippetProps {
  language: string;
}

export function renderSnippets(supportedLanguages: string[]) {
  return supportedLanguages.map((language: string) => (
    <PivotItem
      key={language}
      headerText={language}
    >
      <Snippet language={language} />
    </PivotItem>
  ));
}

function Snippet(props: ISnippetProps) {
  let { language } = props;

  /**
   * Converting language lowercase so that we won't have to call toLowerCase() in multiple places.
   *
   * Ie the monaco component expects a lowercase string for the language prop and the graphexplorerapi expects
   * a lowercase string for the param value.
   */
  language = language.toLowerCase();

  const sampleQuery = useSelector((state: any) => state.sampleQuery, shallowEqual);
  const snippets = useSelector((state: any) => (state.snippets));
  const { data, pending: loadingState } = snippets;
  const snippet = (!loadingState && data) ? data[language] : null;

  const dispatch = useDispatch();

  const copyIcon = {
    iconName: 'copy',
  };

  useEffect(() => {
    dispatch(getSnippet(language));
  }, [sampleQuery.sampleUrl]);

  return (
    <div style={{ display: 'block' }}>
      {loadingState &&
        <Label style={{ padding: 10 }}>
          <FormattedMessage id ='Fetching code snippet' />...
        </Label>
      }
      {!loadingState && snippet &&
        <>
          <IconButton
            style={{ float: 'right', zIndex: 1 }}
            iconProps={copyIcon}
            onClick={async () => {
              genericCopy(snippet);
              trackCopyEvent(language);
            }}
          />
          <Monaco
            body={snippet}
            language={language}
            readOnly={true}
          />
        </>
      }
      {!loadingState && !snippet &&
        <Label style={{ padding: 10 }}>
          <FormattedMessage id ='Snippet not available' />
        </Label>
      }
    </div>
  );
}

function trackCopyEvent(language: string) {
  telemetry.trackEvent(BUTTON_CLICK_EVENT,
    {
      ComponentName: 'Code snippets copy button',
      SelectedLanguage: language,
      QuerySignature: ''
    });
}
