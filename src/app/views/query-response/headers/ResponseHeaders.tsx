
import { IconButton } from 'office-ui-fabric-react';
import React from 'react';
import { useSelector } from 'react-redux';

import { Monaco } from '../../common';
import { genericCopy } from '../../common/copy';
import { convertVhToPx } from '../../common/dimensions-adjustment';

const ResponseHeaders = () => {
  const { dimensions, graphResponse } = useSelector((state: any) => state);
  const { headers } = graphResponse;
  const height = convertVhToPx(dimensions.response.height, 100);

  if (headers) {
    return (
      <div>
        <IconButton
          style={{ float: 'right', zIndex: 1 }}
          iconProps={{ iconName: 'copy' }}
          onClick={async () => genericCopy(JSON.stringify(headers))}
        />
        <Monaco body={headers} height={height} />
      </div>
    );
  }

  return (
    <div />
  );
}

export default ResponseHeaders;
