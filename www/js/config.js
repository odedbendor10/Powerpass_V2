/* POWERPASS – הגדרות האפליקציה.
   הערכים API_BASE ו-STORE_MODE ניתנים להחלפה בזמן הבנייה ב-GitHub Actions (קלט ה-Workflow), בלי לגעת בקוד. */
window.PP_CONFIG = {
	APP_NAME: 'POWERPASS',
	APP_VERSION: '1.1.0',
	/* כתובת ה-API של תוסף הוורדפרס (moeqs/v1) */
	API_BASE: 'https://www.powerpass.co.il/wp-json/moeqs/v1',
	SITE_URL: 'https://www.powerpass.co.il',
	/* מצב חנות (Reader App): true = בלי קישורי רכישה/מחירים באפליקציה, לפי כללי Google Play / App Store.
	   false = מסך מסלולים עם מעבר לרכישה מאובטחת באתר (להפצת APK ישירה). */
	STORE_MODE: false,
	/* כמה זמן (בשעות) מותר לשעון המכשיר לחזור אחורה לפני שהרישיון האופליין ננעל (הגנה מפני שינוי שעון) */
	CLOCK_TOLERANCE_H: 6,
	/* הורדות שרטוטים במקביל */
	IMG_PARALLEL: 6
};
