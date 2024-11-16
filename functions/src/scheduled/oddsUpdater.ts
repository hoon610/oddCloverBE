import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import {
  getActiveSportTags,
  writeOddsToFirebase,
} from "./utils/firestoreAccessors";
import { batchFetchOdds } from "./utils/oddsApiAccessors";

const oddsApiUrl = defineString("ODDS_API_URL");

/**
 * Updates the odds data in the Firebase Realtime Database
 */
export const oddsUpdater = onSchedule(
  {
    schedule: "0 0 * * *", // Runs at midnight every day (UTC)
    // or "0 8 * * *" for 8 AM UTC
    timeZone: "America/New_York", // Optional: specify timezone
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
      // Fetch active sport tags from Firestore
      const activeSportTags = await getActiveSportTags();

      if (activeSportTags.length === 0) {
        logger.warn("No active sports found");
        return;
      }

      const combinedOddsData = await batchFetchOdds(
        apiKey,
        oddsApiUrl.value(),
        activeSportTags,
        5, // Process 5 sports at a time
        1000 // Wait 1 second between batches
      );
      // Write combined odds data to Firestore
      if (Object.keys(combinedOddsData).length > 0) {
        // Write combined odds data to Firestore
        await writeOddsToFirebase(combinedOddsData);
        logger.info("Odds data was successfully written to Firebase");
      } else {
        logger.warn("No odds data was collected to write to Firebase");
      }
    } catch (error) {
      logger.error("Daily task failed", { error });
      throw error; // Rethrow to trigger retry if needed
    }
  }
);
