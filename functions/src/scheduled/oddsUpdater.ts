import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import {
  getActiveSportTags,
  writeOddsToFirebase,
} from "./utils/firestoreAccessors";
import { getOdds } from "./utils/oddsApiAccessors";
import { CombinedOddsData } from "./types";

const oddsApiUrl = defineString("ODDS_API_URL");

/**
 * Updates the odds data in the Firebase Realtime Database
 */
export const oddsUpdater = onSchedule(
  {
    schedule: "0 0 * * *", // Runs at midnight every day (UTC)
    // or "0 8 * * *" for 8 AM UTC
    timeZone: "Ameriaa/New_York", // Optional: specify timezone
    retryCount: 3, // Optional: number of retry attempts if the function fails
    memory: "256MiB",
    secrets: ["ODDS_API_KEY"],
  },
  async (event) => {
    const apiKey = process.env.ODDS_API_KEY;

    // Validate inputs
    if (!apiKey || !oddsApiUrl) {
      throw new Error("Missing required parameters: apiKey or oddsApiUrl");
    }

    try {
      const combinedOddsData: CombinedOddsData = {};

      // Fetch active sport tags from Firestore
      const activeSportTags = await getActiveSportTags();

      if (activeSportTags.length === 0) {
        logger.warn("No active sports found");
        return;
      }

      for (const sportTag of activeSportTags) {
        // Fetch odds for each active sport
        const odds = await getOdds(apiKey, oddsApiUrl.value(), sportTag);
        combinedOddsData[sportTag] = odds;
      }

      // Write combined odds data to Firestore
      await writeOddsToFirebase(combinedOddsData);
    } catch (error) {
      logger.error("Daily task failed", { error });
      throw error; // Rethrow to trigger retry if needed
    }
  }
);
