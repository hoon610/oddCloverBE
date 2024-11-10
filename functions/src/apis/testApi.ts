import { onRequest } from "firebase-functions/v2/https";

export const testApi = onRequest((req, res) => {
  res.json({ message: "Test response" });
});
