/* Z-Index Reference Guide 
 * استخدم هذه القيم في جميع المكونات لضمان الترتيب الصحيح
 */

export const zIndex = {
  // Calendar specific layers
  calendarGrid: 0,       // الشبكة الأساسية
  hourLines: 1,          // خطوط الساعات
  prayerBackground: 2,   // خلفيات أوقات الصلاة (شفافة جداً)
  prayerLines: 3,        // خطوط أوقات الصلاة
  eventBubble: 10,       // البطاقات العادية
  eventHover: 15,        // البطاقات عند التمرير
  eventDrag: 20,         // البطاقات أثناء السحب
  prayerBadge: 25,       // بطاقات الصلاة الصغيرة (خارج grid)
  currentTimeLine: 30,   // خط الوقت الحالي
  
  // UI layers
  base: 0,
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  overlay: 1000,
  modalBackdrop: 1100,
  modal: 1200,
  popover: 1300,
  toast: 1400,
  tooltip: 1500,
  max: 9999,
} as const;

export type ZIndexKey = keyof typeof zIndex;
