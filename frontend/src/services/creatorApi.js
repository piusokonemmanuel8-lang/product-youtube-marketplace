import api from "./api";

export const getCreatorProfile = async () => {
  const res = await api.get("/creator/profile");
  return res.data;
};

export const createCreatorProfile = async (payload) => {
  const res = await api.post("/creator/profile", payload);
  return res.data;
};

export const getMyChannel = async () => {
  const res = await api.get("/channels/me");
  return res.data;
};