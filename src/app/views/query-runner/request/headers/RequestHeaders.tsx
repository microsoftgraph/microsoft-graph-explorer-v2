import { Announced, PrimaryButton, styled, TextField } from 'office-ui-fabric-react';
import React, { useState } from 'react';
import { FormattedMessage, injectIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import * as queryInputActionCreators from '../../../../services/actions/query-input-action-creators';
import { convertVhToPx } from '../../../common/dimensions-adjustment';
import { translateMessage } from '../../../../utils/translate-messages';
import { classNames } from '../../../classnames';
import { headerStyles } from './Headers.styles';
import HeadersList from './HeadersList';
import { IRootState } from '../../../../../types/root';

interface IHeader {
  name: string;
  value: string;
}

const RequestHeaders = (props: any) => {
  const { sampleQuery, dimensions: { request: { height } } } = useSelector((state: IRootState) => state);
  const [headerName, setHeaderName] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [announcedMessage, setAnnouncedMessage] = useState('');
  const [isHoverOverHeadersList, setIsHoverOverHeadersList] = useState(false);

  const { intl: { messages } } = props;
  const sampleQueryHeaders = sampleQuery.sampleHeaders;

  const dispatch = useDispatch();
  const classes = classNames(props);

  const handleOnHeaderNameChange = (name?: string) => {
    if (name) {
      setHeaderName(name);
    }
  };

  const handleOnHeaderValueChange = (value?: string) => {
    if (value) {
      setHeaderValue(value);
    }
  };

  const handleOnHeaderDelete = (header: IHeader) => {
    let headers = [...sampleQuery.sampleHeaders];
    headers = headers.filter(head => head.name !== header.name);

    const query = { ...sampleQuery };
    query.sampleHeaders = headers;

    dispatch(queryInputActionCreators.setSampleQuery(query));
    setAnnouncedMessage(translateMessage('Request Header deleted'));
  };

  const handleOnHeaderAdd = () => {
    if (headerName) {
      let { sampleHeaders } = sampleQuery;
      const header = { name: headerName, value: headerValue };

      if (!sampleHeaders) {
        sampleHeaders = [{
          name: '',
          value: ''
        }];
      }

      const newHeaders = [header, ...sampleHeaders];

      setHeaderName('');
      setHeaderValue('');
      setAnnouncedMessage(translateMessage('Request Header added'));

      const query = { ...sampleQuery };
      query.sampleHeaders = newHeaders;
      dispatch(queryInputActionCreators.setSampleQuery(query));
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHoverOverHeadersList(true)}
      onMouseLeave={() => setIsHoverOverHeadersList(false)}
      className={classes.container}
      style={isHoverOverHeadersList ? { height: convertVhToPx(height, 60) } : { height: convertVhToPx(height, 60), overflow: "hidden" }}>
      <Announced message={announcedMessage} />
      <div className='row'>
        <div className='col-sm-5'>
          <TextField className='header-input'
            placeholder={messages.Key}
            value={headerName}
            onChange={(event, name) => handleOnHeaderNameChange(name)}
          />
        </div>
        <div className='col-sm-5'>
          <TextField
            className='header-input'
            placeholder={messages.Value}
            value={headerValue}
            onChange={(event, value) => handleOnHeaderValueChange(value)}
          />
        </div>
        <div className='col-sm-2 col-md-2'>
          <PrimaryButton
            style={{ width: '100%' }}
            onClick={handleOnHeaderAdd}>
            <FormattedMessage id='Add' />
          </PrimaryButton>
        </div>
      </div>
      <hr />
      <HeadersList
        messages={messages}
        handleOnHeaderDelete={(event: any, header: IHeader) => handleOnHeaderDelete(header)}
        headers={sampleQueryHeaders}
      />
    </div>
  );
};
// @ts-ignore
const styledRequestHeaders = styled(injectIntl(RequestHeaders), headerStyles);
export default styledRequestHeaders;
