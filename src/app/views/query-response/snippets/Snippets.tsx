import { Pivot, PivotItem } from 'office-ui-fabric-react';
import React from 'react';
import { renderSnippets } from './snippets-helper';

export function Snippets() {
  const supportedLanguages = ['CSharp', 'Javascript', 'Java', 'Objective-C'];

  return (
    <Pivot>
      {renderSnippets(supportedLanguages)}
    </Pivot>
  );
}
