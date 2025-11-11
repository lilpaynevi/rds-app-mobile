import api from "@/scripts/fetch.api";

export const getMyTVs = async () => {
  const TV = await api.get("/televisions/me");
  return TV.data;
};
