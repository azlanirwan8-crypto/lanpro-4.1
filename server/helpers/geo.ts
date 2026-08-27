import { Request } from "express";

export interface GeoLocationInfo {
  ip: string;
  city: string;
  country: string;
  location: string;
}

export function extractGeoLocation(req: Request): GeoLocationInfo {
  const forwarded = req.headers["x-forwarded-for"];
  let ip = "127.0.0.1";

  if (typeof forwarded === "string") {
    ip = forwarded.split(",")[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // Normalisasi IPv6 localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }

  const isLocal =
    ip === "127.0.0.1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.");

  const cityHeader =
    (req.headers["x-vercel-ip-city"] as string) || (req.headers["cf-ipcity"] as string) || "";
  const countryHeader =
    (req.headers["x-vercel-ip-country"] as string) || (req.headers["cf-ipcountry"] as string) || "";

  let city = cityHeader ? decodeURIComponent(cityHeader) : "";
  let country = countryHeader ? decodeURIComponent(countryHeader) : "";
  let location = "";

  if (isLocal) {
    city = "Local";
    country = "Localhost";
    location = "Local Network (Development)";
  } else if (city && country) {
    location = `${city}, ${country}`;
  } else if (country) {
    location = country;
  } else {
    city = "Jakarta";
    country = "Indonesia";
    location = "Jakarta, Indonesia";
  }

  return {
    ip,
    city,
    country,
    location,
  };
}
