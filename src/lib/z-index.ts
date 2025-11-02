/* Z-Index Reference Guide 
 * استخدم هذه القيم في جميع المكونات لضمان الترتيب الصحيح
 */

export const zIndex = {
  base: 0,           // العناصر الأساسية
  dropdown: 50,      // القوائم المنسدلة
  sticky: 100,       // العناصر الثابتة
  fixed: 200,        // العناصر المثبتة
  overlay: 1000,     // الطبقات الشفافة
  modalBackdrop: 1100, // خلفيات النوافذ المنبثقة
  modal: 1200,       // النوافذ المنبثقة
  popover: 1300,     // القوائم المنبثقة
  toast: 1400,       // الإشعارات
  tooltip: 1500,     // التلميحات
  max: 9999,         // الحد الأقصى (للحالات الخاصة فقط)
} as const;

export type ZIndexKey = keyof typeof zIndex;
