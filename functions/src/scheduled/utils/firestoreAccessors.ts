import * as admin from "firebase-admin";
import { Sport, ProcessedSport, CombinedOddsData } from "../types";
import { logger } from "firebase-functions/v2";

interface UpdateData {
  data: CombinedOddsData;
  metadata: {
    lastUpdated: number;
    count: number;
  };
}

/**
 * Writes the list of sports to the Firebase Realtime Database
 * @param {Sport[]} sports The list of sports to write to Firebase
 * @return {Promise<void>}
 */
export const writeSportsToFirebase = async (sports: Sport[]): Promise<void> => {
  try {
    const db = admin.database();
    const processedSports: Record<string, ProcessedSport> = {};

    for (const sport of sports) {
      // Only include defined values
      const cleanSport: ProcessedSport = {
        group: sport.group || "",
        title: sport.title || "",
        description: sport.description || "",
        active: Boolean(sport.active),
        has_outrights: Boolean(sport.has_outrights),
        lastUpdated: Date.now(),
      };

      // Validate that all required fields are present and non-empty
      if (!cleanSport.group || !cleanSport.title) {
        logger.warn(
          `Skipping sport with missing required fields: ${sport.key}`
        );
        continue;
      }

      processedSports[sport.key] = cleanSport;
    }

    const updateData = {
      data: processedSports,
      metadata: {
        lastUpdated: Date.now(),
        count: Object.keys(processedSports).length,
      },
    };

    // Write to Firebase
    await db.ref("sports").set(updateData);
    logger.info("Sports write completed successfully");
  } catch (error) {
    logger.error("Sports write failed", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};

/**
 * Gets the list of active sport tags from the Firebase Realtime Database
 * @return {Promise<string[]>} The list of active sport tags
 */
export const getActiveSportTags = async (): Promise<string[]> => {
  try {
    logger.info("Fetching active sport tags...");
    const db = admin.database();

    // Get snapshot of sports data
    const snapshot = await db.ref("sports/data").once("value");
    const sportsData = snapshot.val() as Record<string, ProcessedSport>;

    if (!sportsData) {
      logger.warn("No sports data found");
      return [];
    }

    // Filter and map to get active sport keys
    // Sport must me in season (active) and not have outrights
    const activeSportTags = Object.entries(sportsData)
      .filter(
        ([_, sportData]) =>
          sportData.active === true && sportData.has_outrights === false
      )
      .map(([sportKey]) => sportKey);

    logger.info(`Found ${activeSportTags.length} active sports`);

    return activeSportTags;
  } catch (error) {
    logger.error("Error fetching active sport tags", error);
    throw error;
  }
};

/**
 * Writes the combined odds data to the Firebase Realtime Database
 * @param {CombinedOddsData} oddsData The odds data to write to Firebase
 * @return {Promise<void>}
 */
export const writeOddsToFirebase = async (
  oddsData: CombinedOddsData
): Promise<void> => {
  const db = admin.database();
  try {
    // Validate input data
    if (!oddsData || typeof oddsData !== "object") {
      throw new Error("Invalid odds data format");
    }

    // Filter out any undefined or null values
    const sanitizedData = Object.entries(oddsData).reduce((acc, [sport, data]) => {
      if (Array.isArray(data) && data.length > 0) {
        acc[sport] = data;
      } else {
        logger.warn(`Skipping invalid data for sport: ${sport}`);
      }
      return acc;
    }, {} as CombinedOddsData);

    const updateData: UpdateData = {
      data: sanitizedData,
      metadata: {
        lastUpdated: Date.now(),
        count: Object.keys(sanitizedData).length,
      },
    };

    // Write to both Realtime Database and Firestore for redundancy
    await Promise.all([
      db.ref("odds").set(updateData),
    ]);

    logger.info("Sports write completed successfully", {
      sportsCount: updateData.metadata.count,
      timestamp: new Date(updateData.metadata.lastUpdated).toISOString(),
    });
  } catch (error) {
    logger.error("Sports write failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
