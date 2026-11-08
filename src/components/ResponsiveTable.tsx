import React from "react";

/**
 * ResponsiveTable membungkus tabel HTML standar dengan wadah gulir horizontal
 * dan menjaga kepala tabel tetap terlihat (#825).
 *
 * Props:
 *  - className: kelas Tailwind tambahan untuk elemen <table>.
 *  - children : thead, tbody, dan isi tabel lain.
 *  - scroll   : `false` bila pemanggil sudah menyediakan wadah gulirnya sendiri.
 *               Dua wadah gulir bersarang membuat `th` sticky tidak pernah
 *               lengket, karena sticky mengikuti wadah terdalam.
 */
export const ResponsiveTable: React.FC<{
  className?: string;
  children: React.ReactNode;
  scroll?: boolean;
}> = ({ className = "", children, scroll = true }) => {
  const tabel = (
    <table
      className={`min-w-full border-collapse text-left [&>thead>tr>th]:sticky [&>thead>tr>th]:top-0 [&>thead>tr>th]:bg-surface-sunken ${className}`}
    >
      {children}
    </table>
  );

  if (!scroll) return tabel;
  return <div className="w-full overflow-x-auto">{tabel}</div>;
};
