// @ts-ignore
import { Guid } from 'guid-typescript';
import { IToken } from '../../../../types/sidebar';

/**
 * This produces an unordered list of all tokens that can supply
 * values for POST body templates and URL endpoints for both the demo
 * tenant and authenticated users. The demoTenantValue and
 * authenticatedUserValue fields are checked first, and then the
 * defaultValue fields.
 */

export function getTokens(user?: any) {
  let emailAddress = '';

  if (user) {
    emailAddress = user.mail || user.userPrincipalName;
  }

  const tokens: IToken[] = [
    {
      placeholder: 'group-id',
      demoTenantValue: '02bd9fd6-8f93-4758-87c3-1fb73740a315',
    },
    {
      placeholder: 'drive-item-id',
      demoTenantValue: '01BYE5RZZ5OJSCSRM6BZDY7ZEFZ3NJ2QAY',
    },
    {
      placeholder: 'section-id',
      demoTenantValue: '1-fb22b2f1-379f-4da4-bf7b-be5dcca7b99a',
    },
    {
      placeholder: 'notebook-id',
      demoTenantValue: '1-fb22b2f1-379f-4da4-bf7b-be5dcca7b99a',
    },
    {
      placeholder: 'group-id-with-plan',
      demoTenantValue: '1e770bc2-3c5f-487f-871f-16fbdf1c8ed8',
    },
    {
      placeholder: 'plan-id',
      demoTenantValue: 'CONGZUWfGUu4msTgNP66e2UAAySi',
    },
    {
      placeholder: '{bucket-id}',
      demoTenantValue: '1m6FwcAAZ0eW5J1Abe7ndWUAJ1ca',
    },
    {
      placeholder: '{bucket-name}',
      demoTenantValue: 'New Bucket',
    },
    {
      placeholder: 'task-id',
      demoTenantValue: 'oIx3zN98jEmVOM-4mUJzSGUANeje',
    },
    {
      placeholder: 'task-title',
      defaultValue: 'New Task',
    },
    {
      placeholder: 'extension-id',
      demoTenantValue: 'com.contoso.roamingSettings',
    },
    {
      placeholder: 'host-name',
      demoTenantValue: 'M365x214355.sharepoint.com',
    },
    {
      placeholder: 'server-relative-path',
      demoTenantValue: 'sites/contoso/Departments/SM/MarketingDocuments',
    },
    {
      placeholder: 'group-id-for-teams',
      demoTenantValue: '02bd9fd6-8f93-4758-87c3-1fb73740a315',
    },
    {
      placeholder: 'team-id',
      demoTenantValue: '02bd9fd6-8f93-4758-87c3-1fb73740a315',
    },
    {
      placeholder: 'channel-id',
      demoTenantValue: '19:d0bba23c2fc8413991125a43a54cc30e@thread.skype',
    },
    {
      placeholder: 'chat-id',
      demoTenantValue: '19:2a395c1dfe36431fb6e4cd5b225c17ee@thread.v2',
    },
    {
      placeholder: 'message-id',
      demoTenantValue: '1501527481624',
    },
    {
      placeholder: 'reply-id',
      demoTenantValue: '1501527483334',
    },
    {
      placeholder: 'application-id',
      demoTenantValue: '03c2bc3d-adaf-45b9-86e2-e95bddc6ad3d',
    },
    {
      placeholder: 'destination-address',
      demoTenantValue: '1.2.3.5',
    },
    {
      placeholder: 'user-id',
      demoTenantValue: 'd4957c9d-869e-4364-830c-d0c95be72738',
    },
    {
      placeholder: 'membership-id',
      demoTenantValue: 'MCMjMCMjZGNkMjE5ZGQtYmM2OC00YjliLWJmMGItNGEzM2E3OTZiZTM1IyMxOToyYTM5NWMxZGZlMzY0MzFmYjZlNGNkNWIyMjVjMTdlZUB0aHJlYWQudjIjIzQ4ZDMxODg3LTVmYWQtNGQ3My1hOWY1LTNjMzU2ZTY4YTAzOA==',
    },
    {
      placeholder: 'today',
      defaultValueFn: () => {
        return (new Date()).toISOString();
      },
    },
    {
      placeholder: 'todayMinusHour',
      defaultValueFn: () => {
        const todayMinusHour = new Date();
        todayMinusHour.setHours(new Date().getHours() - 1);
        return todayMinusHour.toISOString();
      },
    },
    {
      placeholder: 'coworker-mail',
      demoTenantValue: 'meganb@M365x214355.onmicrosoft.com',
      authenticatedUserValueFn: () => {
        return emailAddress;
      },
    },
    {
      placeholder: 'next-week',
      defaultValueFn: () => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        return nextWeek.toISOString();
      },
    },
    {
      placeholder: 'user-mail',
      demoTenantValue: 'MiriamG@M365x214355.onmicrosoft.com',
      authenticatedUserValueFn: () => {
        return emailAddress;
      },
    },
    {
      placeholder: 'domain',
      defaultValueFn: () => {
        return 'contoso.com';
      },
      authenticatedUserValueFn: () => {
        return emailAddress.split('@')[1];
      },
    },
    {
      placeholder: 'Placeholder Password',
      defaultValue: Guid.create().toString(),
    },
    {
      placeholder: 'list-id',
      defaultValue: 'd7689e2b-941a-4cd3-bb24-55cddee54294',
    },
    {
      placeholder: 'list-title',
      defaultValue: 'Contoso Home',
    },
  ];

  return tokens;
}

