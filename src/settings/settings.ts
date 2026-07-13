export interface VaultPilotSettings {
  projectsFolder: string;
  inboxFolder: string;
  ideasFolder: string;
  orphanThresholdDays: number;
  groqApiKey: string;
  userEmail: string;
  vaultId: string;
  accessToken: string;
  refreshToken: string;
}

export const DEFAULT_SETTINGS: VaultPilotSettings = {
  projectsFolder: "projects/",
  inboxFolder: "inbox/",
  ideasFolder: "ideas/",
  orphanThresholdDays: 30,
  groqApiKey: "",
  userEmail: "",
  vaultId: "",
  accessToken: "",
  refreshToken: "",
};
