import { PrimaryButton, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { ISubmitButtonControl } from '../../../../types/submit-button';

const SubmitButtonControl = ({
  handleOnClick,
  submitting,
  className,
  text,
  ariaLabel,
  role,
  disabled
}: ISubmitButtonControl) => {

  return (
    <div className={className}>
      <PrimaryButton disabled={submitting || disabled }
        onClick={() => handleOnClick()}
        ariaLabel={ariaLabel}
        role={role}
      >
        <FormattedMessage
          id={text}
        />
        {submitting && <>&nbsp;
            <Spinner size={SpinnerSize.small} />
        </>}
      </PrimaryButton>
    </div>
  );
};

export default SubmitButtonControl;
