import { useState, useEffect } from 'react';

export function useCountdown(targetDate: string | Date) {
  const [timeLeft, setTimeLeft] = useState<{
    total: number;
    hours: number;
    minutes: number;
    isNegative: boolean;
    formattedShort: string;
    formattedLong: string;
  }>(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 60000); // تحديث كل دقيقة

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function calculateTimeLeft(targetDate: string | Date) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  const isNegative = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formattedShort = '';
  let formattedLong = '';

  if (isNegative) {
    if (hours > 0) {
      formattedShort = `منذ ${hours}س ${minutes}د`;
      formattedLong = `انتهى منذ ${hours} ساعة و ${minutes} دقيقة`;
    } else if (minutes > 0) {
      formattedShort = `منذ ${minutes}د`;
      formattedLong = `انتهى منذ ${minutes} دقيقة`;
    } else {
      formattedShort = 'انتهى الآن';
      formattedLong = 'انتهى للتو';
    }
  } else {
    if (totalMinutes === 0) {
      formattedShort = 'الآن';
      formattedLong = 'يبدأ الآن';
    } else if (hours > 0) {
      formattedShort = `بعد ${hours}س ${minutes}د`;
      formattedLong = `يبدأ بعد ${hours} ساعة و ${minutes} دقيقة`;
    } else {
      formattedShort = `بعد ${minutes}د`;
      formattedLong = `يبدأ بعد ${minutes} دقيقة`;
    }
  }

  return {
    total: totalMinutes,
    hours,
    minutes,
    isNegative,
    formattedShort,
    formattedLong
  };
}
