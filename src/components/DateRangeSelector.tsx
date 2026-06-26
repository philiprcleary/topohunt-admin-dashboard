import { useMemo } from 'react';
import { DateRange, type RangeKeyDict } from 'react-date-range';
import { enGB } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}

export default function DateRangeSelector({
  startDate,
  endDate,
  onChange,
}: DateRangeSelectorProps) {
  const selection = useMemo(
    () => ({
      startDate,
      endDate,
      key: 'selection',
    }),
    [startDate, endDate],
  );

  const handleChange = (ranges: RangeKeyDict) => {
    const next = ranges.selection;
    if (!next.startDate || !next.endDate) {
      return;
    }
    onChange(next.startDate, next.endDate);
  };

  return (
    <div className="date-range-selector">
      <DateRange
        ranges={[selection]}
        onChange={handleChange}
        moveRangeOnFirstSelection={false}
        dragSelectionEnabled
        months={2}
        direction="horizontal"
        showDateDisplay={false}
        rangeColors={['#2563eb']}
        locale={enGB}
        maxDate={new Date()}
      />
    </div>
  );
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

export function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));
}
