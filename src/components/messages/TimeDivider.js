import React, { memo } from 'react';
import { formatMessageTime } from '../../utils/format';

export const TimeDivider = memo(function TimeDivider({ date }) {
  return (
    <div className="flex justify-center py-3">
      <span className="text-xs text-muted-foreground">{formatMessageTime(date)}</span>
    </div>
  );
});

export default TimeDivider;

