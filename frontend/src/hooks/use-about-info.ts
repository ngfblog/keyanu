import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AboutInfo } from "@/types";

let cachedAboutInfo: AboutInfo | null = null;
let aboutInfoRequest: Promise<AboutInfo> | null = null;

function loadAboutInfo(): Promise<AboutInfo> {
  if (cachedAboutInfo) return Promise.resolve(cachedAboutInfo);

  aboutInfoRequest ??= api.get<AboutInfo>("/settings/about").then((info) => {
    cachedAboutInfo = info;
    return info;
  });

  return aboutInfoRequest;
}

export function useAboutInfo(): AboutInfo | null {
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(cachedAboutInfo);

  useEffect(() => {
    let cancelled = false;

    loadAboutInfo()
      .then((info) => {
        if (!cancelled) setAboutInfo(info);
      })
      .catch(() => {
        if (!cancelled) setAboutInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return aboutInfo;
}
