import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants';
import {
  getDaysInMonth,
  getFirstDayOfWeek,
  formatAmountShort,
  isTodayTashkent,
} from '@/utils/date';

interface Props {
  year: number;
  month: number; // 1-12
  selectedDate: string | null; // YYYY-MM-DD
  dailyTotals: Record<string, number>;
  onSelectDate: (date: string) => void;
}

const WEEKDAY_LABELS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

export function CalendarGrid({ year, month, selectedDate, dailyTotals, onSelectDate }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month); // 0=Sun

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push({ day: d, dateStr: `${year}-${mm}-${dd}` });
  }

  return (
    <View style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.headerRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.headerCell}>
            <Text style={styles.headerText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell.day || !cell.dateStr) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }

          const isToday = isTodayTashkent(cell.dateStr);
          const isSelected = cell.dateStr === selectedDate;
          const total = dailyTotals[cell.dateStr] ?? 0;
          const hasExpense = total > 0;

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                isToday && !isSelected && styles.cellToday,
              ]}
              onPress={() => onSelectDate(cell.dateStr!)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                ]}
              >
                {cell.day}
              </Text>
              {hasExpense && (
                <Text
                  style={[
                    styles.totalText,
                    isSelected && styles.totalTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {formatAmountShort(total)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    minHeight: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  totalText: {
    fontSize: 9,
    color: Colors.expense,
    marginTop: 1,
  },
  totalTextSelected: {
    color: Colors.white,
  },
});
