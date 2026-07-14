export interface VaultPilotSettings {
  projectsFolder: string;
  inboxFolder: string;
  ideasFolder: string;
  orphanThresholdDays: number;
  groqApiKey: string;
  fastConnectMinConfidence: number;
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
  fastConnectMinConfidence: 0.6,
  userEmail: "",
  vaultId: "",
  accessToken: "",
  refreshToken: "",
};
