import { TimeInterval } from "../models/pt_all.interface";

export class DateHelpers {
  // 2021-06-03 21:38:04
  public static formatDate(d: Date) {
    const date_parts = [
      d.getFullYear(),
      '-',
      ('00' + (d.getMonth() + 1)).slice(-2),
      '-',
      ('00' + d.getDate()).slice(-2),
      ' ',
      ('00' + d.getHours()).slice(-2),
      ':',
      ('00' + d.getMinutes()).slice(-2),
      ':',
      ('00' + d.getSeconds()).slice(-2)
    ];

    return date_parts.join('');
  }

  // 21:38
  public static formatTimeHHMM(d: Date): string {
    const dateFormatted = DateHelpers.formatDate(d)
    return dateFormatted.substring(11,16);
  }

  public static formatDayHHMM(d: Date): string {
    const dateFormatted = DateHelpers.formatDate(d)
    return dateFormatted.substring(0,16);
  }

  public static formatDistance(distanceMeters: number): string {
    if (distanceMeters > 1000) {
      const distanceKmS = (distanceMeters / 1000).toFixed(1) + 'km'
      return distanceKmS
    }

    return distanceMeters + 'm'
  }

  public static initDateFromString(dateS: string | null | undefined): Date | null {
    if (dateS === null || dateS === undefined) {
      return null;
    }

    const date = new Date(dateS);
    if (typeof date.getMonth !== 'function') {
      return null;
    }

    return date;
  }

  public static formatValidityPeriodDuration(validityPeriod: TimeInterval) {
    const fromS = DateHelpers.formatDayHHMM(validityPeriod.startDate);
    const toS = DateHelpers.formatDayHHMM(validityPeriod.endDate);

    const fromDayS = fromS.substring(0, 10);
    const toDayS = toS.substring(0, 10);

    if (fromDayS === toDayS) {
        const fromHHMM = fromS.substring(11, 16);
        const toHHMM = toS.substring(11, 16);

        return fromDayS + ' ' + fromHHMM + ' - ' + toHHMM;
    } else {
        return fromS + ' - ' + toS;
    }
  }
}
