/**
 * Global UTM & Meta Ad Parameter Tracking Utility
 * 
 * Captures campaign tracking parameters (utm_source, utm_sub_source, utm_campaign, fbclid, gclid)
 * on initial landing and persists them in sessionStorage/localStorage so they survive page navigation
 * (e.g. Landing on Home -> Navigating to /subscribe).
 */

const STORAGE_KEY = "bhookr_utm_data_v1";

export interface UtmData {
  utmSource?: string;
  utmSubSource?: string;
  capturedAt?: string;
}

/**
 * Inspects the current URL search parameters for Meta / Google ad tracking parameters
 * and updates persistent storage if parameters are detected.
 */
export function captureUtms(): UtmData {
  if (typeof window === "undefined") return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const rawSource = searchParams.get("utm_source");
    const rawSubSource =
      searchParams.get("utm_sub_source") ||
      searchParams.get("utm_campaign") ||
      searchParams.get("utm_content");
    const fbclid = searchParams.get("fbclid");
    const gclid = searchParams.get("gclid");

    let source = rawSource ? rawSource.trim() : "";
    let subSource = rawSubSource ? rawSubSource.trim() : "";

    // Auto-detect Meta / Instagram traffic if fbclid is present
    if (!source && fbclid) {
      source = "meta";
      subSource = subSource || "fb_ad";
    }

    // Auto-detect Google Ads traffic if gclid is present
    if (!source && gclid) {
      source = "google";
      subSource = subSource || "g_ad";
    }

    // If new UTM parameters are present in the URL, save them
    if (source || subSource) {
      const data: UtmData = {
        utmSource: source || undefined,
        utmSubSource: subSource || undefined,
        capturedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }

    // Otherwise, retrieve existing stored UTM parameters
    return getStoredUtms();
  } catch (err) {
    console.warn("[utm] Error capturing UTM parameters:", err);
    return {};
  }
}

/**
 * Retrieves persisted UTM tracking data from storage.
 */
export function getStoredUtms(): UtmData {
  if (typeof window === "undefined") return {};

  try {
    const sessionRaw = sessionStorage.getItem(STORAGE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && typeof parsed === "object") return parsed;
    }

    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (err) {
    console.warn("[utm] Error reading stored UTM data:", err);
  }

  return {};
}
