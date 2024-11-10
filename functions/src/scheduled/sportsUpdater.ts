import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { getSports } from "./utils/oddsApiAccessors";
import { writeSportsToFirebase } from "./utils/firestoreAccessors";

const oddsApiUrl = defineString("ODDS_API_URL");

/**
 * Updates the list of sports in the Firebase Realtime Database
 */
export const sportsUpdater = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/New_York",
    retryCount: 3,
    memory: "256MiB",
    secrets: ["ODDS_API_KEY"],
  },
  async (event) => {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      throw new Error("ODDS_API_KEY is not set");
    }
    try {
      console.log("Fetching sports from Odds API...", event);
      const sports = await getSports(apiKey, oddsApiUrl.value());
      await writeSportsToFirebase(sports);
      logger.info("Sports updated successfully");
    } catch (error) {
      logger.error("Sports update failed", { error });
      throw error;
    }
  }
);
