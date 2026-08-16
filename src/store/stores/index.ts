// #21 — `authStore` dan `uiStore` DIHAPUS 16 Agu 2026.
//
// Keduanya menganggur: satu-satunya pemakainya adalah hook `useAuthState` dan
// `useUIState` di folder ini juga, dan hook itu sendiri tidak dipakai satu
// berkas pun di luar `src/store`. Otentikasi sesungguhnya hidup di
// `src/hooks/useAuth.ts`, dan keadaan UI di `useAppStore`.
//
// Store yang menganggur lebih berbahaya daripada berkas kosong: ia terlihat
// seperti sumber kebenaran, dan orang berikutnya bisa menulis ke sana lalu
// bingung kenapa antarmuka tidak berubah.
export { useProjectStore } from "./projectStore";
export { useNotificationStore } from "./notificationStore";
