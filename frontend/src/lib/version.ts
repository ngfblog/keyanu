import packageJson from "../../package.json";

export const appVersion = import.meta.env.VITE_APP_VERSION || packageJson.version;
